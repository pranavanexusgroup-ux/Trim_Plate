import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, initializeDatabase } from './src/server/db.ts';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'trimplate_dev_secret_change_in_prod';
const PORT = Number(process.env.PORT) || 3000;

initializeDatabase();

interface AuthPayload {
  userId: number;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

function getSettingsMap(): Record<string, string> {
  const rows = db.prepare('SELECT setting_key, setting_value FROM website_settings').all() as Array<{
    setting_key: string;
    setting_value: string;
  }>;
  const map: Record<string, string> = {};
  for (const r of rows) map[r.setting_key] = r.setting_value;
  return map;
}

function enrichProducts(rows: any[]) {
  const settings = getSettingsMap();
  const newArrivalDays = Number(settings.new_arrival_days || 14);
  const cutoffMs = Date.now() - newArrivalDays * 86400 * 1000;

  const variantStmt = db.prepare('SELECT id, variant_name, price, is_default FROM product_variants WHERE product_id = ?');
  const nutrStmt = db.prepare(
    'SELECT calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, is_verified FROM nutritional_information WHERE product_id = ?'
  );
  const imgStmt = db.prepare('SELECT id, image_url, is_primary, sort_order FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC');
  const ratingStmt = db.prepare(
    'SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ? AND is_approved = 1'
  );

  return rows.map((p) => {
    const variants = variantStmt.all(p.id);
    const nutrition = nutrStmt.get(p.id) || null;
    const images = imgStmt.all(p.id) as Array<{ id: number; image_url: string; is_primary: number }>;
    const ratingRow = ratingStmt.get(p.id) as { avg_rating: number | null; review_count: number };

    let dietTypes: string[] = [];
    let displayLabels: string[] = [];
    try {
      dietTypes = JSON.parse(p.diet_types || '[]');
    } catch {
      dietTypes = [];
    }
    try {
      displayLabels = JSON.parse(p.display_labels || '[]');
    } catch {
      displayLabels = [];
    }

    // Automatically add 'New Arrival' if created within configurable window unless manually overridden with 'No Auto Label'
    const createdMs = new Date(p.created_at.replace(' ', 'T')).getTime();
    if (!Number.isNaN(createdMs) && createdMs >= cutoffMs && !displayLabels.includes('New Arrival') && !displayLabels.includes('Hide New Arrival')) {
      displayLabels = ['New Arrival', ...displayLabels];
    }
    if (p.stock_qty > 0 && p.stock_qty <= 10 && !displayLabels.includes('Limited Stock')) {
      displayLabels = [...displayLabels, 'Limited Stock'];
    }

      const primaryImgRow = images.find((img) => Number(img.is_primary) === 1);

    return {
      ...p,
      is_veg: Boolean(p.is_veg),
      is_available: Boolean(p.is_available) && p.stock_qty > 0,
      diet_types: dietTypes,
      display_labels: displayLabels,
      variants,
      nutrition,
      images,
      custom_image_url: primaryImgRow?.image_url || images[0]?.image_url || '',
      avg_rating: ratingRow?.avg_rating || null,
      review_count: ratingRow?.review_count || 0,
    };
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json({ limit: '20mb' }));

  const clients = new Set<WebSocket>();
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  function broadcastEvent(event: string, payload: unknown) {
    const message = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  function logAudit(actorId: number | null, action: string, entityType: string, entityId: string, details: string) {
    db.prepare('INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(
      actorId,
      action,
      entityType,
      entityId,
      details
    );
  }

  // ==================== ROBOTS.TXT & DYNAMIC SITEMAP.XML ====================
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const staticRoutes = ['', '/cafe-menu', '/green-menu', '/diet-menu', '/gym-menu', '/subscriptions', '/offers'];
    const pages = db.prepare('SELECT slug FROM pages WHERE is_published = 1').all() as Array<{ slug: string }>;
    const prods = db.prepare('SELECT slug FROM products WHERE is_available = 1').all() as Array<{ slug: string }>;
    const customMenuSlugs = db
      .prepare('SELECT slug FROM custom_menus WHERE is_active = 1')
      .all() as Array<{ slug: string }>;

    const urls = [
      ...staticRoutes.map((r) => `${baseUrl}${r}`),
      ...customMenuSlugs.map((m) => `${baseUrl}/menu/${m.slug}`),
      ...pages.map((p) => `${baseUrl}/page/${p.slug}`),
      ...prods.map((p) => `${baseUrl}/product/${p.slug}`),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  // ==================== PUBLIC SITE BOOTSTRAP ====================
  app.get('/api/site/bootstrap', (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString().slice(0, 16);

    const settings = getSettingsMap();
    const navigation = db
      .prepare('SELECT * FROM navigation_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
      .all();

    const heroSlides = db
      .prepare(
        `SELECT * FROM hero_slides
         WHERE is_active = 1
           AND (start_date IS NULL OR start_date = '' OR start_date <= ?)
           AND (end_date IS NULL OR end_date = '' OR end_date >= ?)
         ORDER BY sort_order ASC, id ASC`
      )
      .all(today, today);

    const sectionsRaw = db
      .prepare('SELECT * FROM homepage_sections ORDER BY sort_order ASC, id ASC')
      .all() as any[];
    const secProdStmt = db.prepare('SELECT product_id FROM homepage_section_products WHERE section_id = ? ORDER BY sort_order ASC');
    const homepageSections = sectionsRaw.map((s) => ({
      ...s,
      is_enabled: Boolean(s.is_enabled),
      config: JSON.parse(s.config_json || '{}'),
      curated_product_ids: secProdStmt.all(s.id).map((r: any) => r.product_id),
    }));

    const banners = db.prepare('SELECT * FROM banners WHERE is_active = 1').all();

    // Automatically exclude expired offers!
    const activeOffers = db
      .prepare(
        `SELECT * FROM offers
         WHERE is_active = 1
           AND start_datetime <= ?
           AND end_datetime >= ?
         ORDER BY id DESC`
      )
      .all(nowIso, nowIso);

    const testimonials = db
      .prepare('SELECT * FROM testimonials WHERE is_approved = 1 ORDER BY sort_order ASC, id DESC')
      .all();

    const approvedReviews = db
      .prepare(
        `SELECT r.*, p.name as product_name, p.slug as product_slug
         FROM reviews r
         LEFT JOIN products p ON p.id = r.product_id
         WHERE r.is_approved = 1 AND r.show_on_home = 1
         ORDER BY r.id DESC`
      )
      .all();

    const statRow = db
      .prepare(
        `SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as total_count
         FROM (
           SELECT rating FROM reviews WHERE is_approved = 1
           UNION ALL
           SELECT rating FROM testimonials WHERE is_approved = 1
         )`
      )
      .get() as { avg_rating: number | null; total_count: number };

    const googleCountRow = db
      .prepare("SELECT COUNT(*) as cnt FROM reviews WHERE is_approved = 1 AND review_source = 'Google'")
      .get() as { cnt: number };

    const gallery = db
      .prepare('SELECT * FROM gallery WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
      .all();

    const plans = db
      .prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY duration_days ASC')
      .all()
      .map((pl: any) => ({
        ...pl,
        is_active: Boolean(pl.is_active),
        benefits: JSON.parse(pl.benefits_json || '[]'),
      }));

    const dietitians = db
      .prepare('SELECT * FROM dietitians WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
      .all()
      .map((d: any) => ({
        ...d,
        is_active: Boolean(d.is_active),
        free_with_subscription: Boolean(d.free_with_subscription),
      }));

    const customMenus = db
      .prepare(
        `SELECT m.*,
                (SELECT COUNT(*) FROM categories c WHERE c.menu_division = m.division_name AND c.is_active = 1) as category_count,
                (SELECT COUNT(*) FROM products p WHERE p.menu_division = m.division_name AND p.is_available = 1) as product_count
         FROM custom_menus m
         WHERE m.is_active = 1
         ORDER BY m.sort_order ASC, m.id ASC`
      )
      .all()
      .map((m: any) => ({
        ...m,
        is_active: Boolean(m.is_active),
        show_in_header: Boolean(m.show_in_header),
        show_on_home: Boolean(m.show_on_home),
      }));

    const categories = db
      .prepare(
        `SELECT c.*, p.name as parent_name,
                (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id AND pr.is_available = 1) as product_count
         FROM categories c
         LEFT JOIN categories p ON p.id = c.parent_id
         WHERE c.is_active = 1
         ORDER BY c.sort_order ASC, c.id ASC`
      )
      .all();

    res.json({
      settings,
      navigation,
      customMenus,
      categories,
      heroSlides,
      homepageSections,
      banners,
      activeOffers,
      testimonials,
      approvedReviews,
      reviewStats: {
        avgRating: statRow?.avg_rating || 4.9,
        totalApprovedCount: statRow?.total_count || 0,
        googleReviewCount: googleCountRow?.cnt || 0,
      },
      gallery,
      plans,
      dietitians,
    });
  });

  // ==================== AUTH ROUTES ====================
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: 'Email/Mobile and password are required' });
      return;
    }
    const user = db
      .prepare(
        `SELECT u.*, r.name as role_name FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.email = ? OR u.mobile = ?`
      )
      .get(identifier.trim(), identifier.trim()) as any;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials. Check your mobile/email or password.' });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role_name, name: user.name });
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(user.id);
    const customerProfile = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role_name,
        addresses,
        customerProfile,
      },
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, mobile, password, dietary_preference } = req.body;
    if (!name || !mobile || !password) {
      res.status(400).json({ error: 'Name, mobile number, and password are required' });
      return;
    }

    const existing = db
      .prepare('SELECT id FROM users WHERE mobile = ? OR (email IS NOT NULL AND email = ?)')
      .get(mobile.trim(), email ? email.trim() : '__none__');
    if (existing) {
      res.status(409).json({ error: 'An account with this mobile or email already exists' });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare('INSERT INTO users (role_id, name, email, mobile, password_hash) VALUES (2, ?, ?, ?, ?)')
      .run(name.trim(), email ? email.trim() : null, mobile.trim(), hash);
    const userId = Number(result.lastInsertRowid);

    db.prepare('INSERT INTO customers (user_id, dietary_preference, fitness_goal) VALUES (?, ?, ?)').run(
      userId,
      dietary_preference || 'Both',
      'Eat Smart & Stay Trim'
    );
    db.prepare(
      'INSERT INTO addresses (user_id, label, recipient_name, mobile, line1, area, city, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
    ).run(userId, 'Home', name.trim(), mobile.trim(), '12A Camac Street', 'Central Kolkata', 'Kolkata', '700017');

    const token = signToken({ userId, role: 'customer', name: name.trim() });
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(userId);
    const customerProfile = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(userId);

    broadcastEvent('new_customer', { name: name.trim(), mobile: mobile.trim() });

    res.status(201).json({
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email || '',
        mobile: mobile.trim(),
        role: 'customer',
        addresses,
        customerProfile,
      },
    });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { identifier, new_password } = req.body;
    if (!identifier || !new_password || String(new_password).length < 6) {
      res.status(400).json({ error: 'Registered email/mobile and a new password (min 6 chars) are required' });
      return;
    }
    const user = db
      .prepare('SELECT id FROM users WHERE email = ? OR mobile = ?')
      .get(String(identifier).trim(), String(identifier).trim()) as { id: number } | undefined;
    if (!user) {
      res.status(404).json({ error: 'No account found with that email or mobile number' });
      return;
    }
    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    res.json({ success: true, message: 'Password updated successfully. You may now sign in.' });
  });

  app.post('/api/auth/quick-access', (req, res) => {
    const { mode } = req.body;
    const targetEmail = mode === 'admin' ? 'admin@trimplate.in' : 'ananya@trimplate.in';
    const user = db
      .prepare('SELECT u.*, r.name as role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ?')
      .get(targetEmail) as any;

    const token = signToken({ userId: user.id, role: user.role_name, name: user.name });
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC').all(user.id);
    const customerProfile = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role_name,
        addresses,
        customerProfile,
      },
    });
  });

  app.get('/api/auth/me', authenticate, (req, res) => {
    const user = db
      .prepare('SELECT u.*, r.name as role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?')
      .get(req.user!.userId) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(user.id);
    const customerProfile = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(user.id);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role_name,
      addresses,
      customerProfile,
    });
  });

  app.put('/api/auth/profile', authenticate, (req, res) => {
    const { name, email, mobile, dietary_preference, fitness_goal } = req.body;
    db.prepare('UPDATE users SET name = ?, email = ?, mobile = ? WHERE id = ?').run(
      name,
      email || null,
      mobile,
      req.user!.userId
    );
    db.prepare('UPDATE customers SET dietary_preference = ?, fitness_goal = ? WHERE user_id = ?').run(
      dietary_preference || 'Both',
      fitness_goal || 'Stay Trim & Balanced',
      req.user!.userId
    );
    res.json({ success: true });
  });

  // ==================== ADDRESSES ====================
  app.post('/api/addresses', authenticate, (req, res) => {
    const { label, recipient_name, mobile, line1, area, city, pincode, is_default } = req.body;
    if (is_default) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user!.userId);
    }
    const result = db
      .prepare(
        'INSERT INTO addresses (user_id, label, recipient_name, mobile, line1, area, city, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        req.user!.userId,
        label || 'Home',
        recipient_name,
        mobile,
        line1,
        area,
        city || 'Kolkata',
        pincode || '700001',
        is_default ? 1 : 0
      );
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user!.userId);
    res.status(201).json({ id: result.lastInsertRowid, addresses });
  });

  app.delete('/api/addresses/:id', authenticate, (req, res) => {
    db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.userId);
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user!.userId);
    res.json({ addresses });
  });

  // ==================== CATEGORIES & PRODUCTS ====================
  app.get('/api/categories', (req, res) => {
    const includeHidden = req.query.all === '1';
    const sql = includeHidden
      ? `SELECT c.*, p.name as parent_name, (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id) as product_count
         FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
         ORDER BY c.sort_order ASC, c.id ASC`
      : `SELECT c.*, p.name as parent_name, (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id AND pr.is_available = 1) as product_count
         FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
         WHERE c.is_active = 1
         ORDER BY c.sort_order ASC, c.id ASC`;
    res.json(db.prepare(sql).all());
  });

  app.post('/api/categories', authenticate, requireAdmin, (req, res) => {
    const { name, parent_id, menu_division, description, image_key, custom_image_url, diet_tag, sort_order, is_active } = req.body;
    const slug =
      String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString().slice(-3);
    const info = db
      .prepare(
        `INSERT INTO categories (parent_id, name, slug, menu_division, description, image_key, custom_image_url, diet_tag, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        parent_id ? Number(parent_id) : null,
        name,
        slug,
        menu_division || 'Green Menu',
        description || '',
        image_key || 'hero_bowl',
        custom_image_url || '',
        diet_tag || 'all',
        Number(sort_order || 20),
        is_active === false ? 0 : 1
      );
    logAudit(req.user!.userId, 'CREATE_CATEGORY', 'category', String(info.lastInsertRowid), name);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/categories/:id', authenticate, requireAdmin, (req, res) => {
    const { name, parent_id, menu_division, description, image_key, custom_image_url, diet_tag, sort_order, is_active } = req.body;
    db.prepare(
      `UPDATE categories
       SET parent_id = ?, name = ?, menu_division = ?, description = ?, image_key = ?, custom_image_url = ?, diet_tag = ?, sort_order = ?, is_active = ?
       WHERE id = ?`
    ).run(
      parent_id ? Number(parent_id) : null,
      name,
      menu_division,
      description || '',
      image_key || 'hero_bowl',
      custom_image_url || '',
      diet_tag || 'all',
      Number(sort_order || 0),
      is_active === false ? 0 : 1,
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/categories/:id', authenticate, requireAdmin, (req, res) => {
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM products WHERE category_id = ?').get(req.params.id) as any).cnt;
    if (count > 0) {
      res.status(400).json({ error: 'Move or delete products in this category before removing it.' });
      return;
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // ==================== DYNAMIC CUSTOM MENUS ====================
  app.get('/api/menus', (_req, res) => {
    const menus = db
      .prepare(
        `SELECT m.*,
                (SELECT COUNT(*) FROM categories c WHERE c.menu_division = m.division_name AND c.is_active = 1) as category_count,
                (SELECT COUNT(*) FROM products p WHERE p.menu_division = m.division_name AND p.is_available = 1) as product_count
         FROM custom_menus m
         WHERE m.is_active = 1
         ORDER BY m.sort_order ASC, m.id ASC`
      )
      .all()
      .map((m: any) => ({
        ...m,
        is_active: Boolean(m.is_active),
        show_in_header: Boolean(m.show_in_header),
        show_on_home: Boolean(m.show_on_home),
      }));
    res.json(menus);
  });

  app.get('/api/menus/:slug', (req, res) => {
    const menu = db
      .prepare(
        `SELECT m.*,
                (SELECT COUNT(*) FROM categories c WHERE c.menu_division = m.division_name AND c.is_active = 1) as category_count,
                (SELECT COUNT(*) FROM products p WHERE p.menu_division = m.division_name AND p.is_available = 1) as product_count
         FROM custom_menus m
         WHERE m.slug = ? AND m.is_active = 1
         LIMIT 1`
      )
      .get(req.params.slug) as any;

    if (!menu) {
      res.status(404).json({ error: 'Menu not found or currently inactive' });
      return;
    }

    res.json({
      ...menu,
      is_active: Boolean(menu.is_active),
      show_in_header: Boolean(menu.show_in_header),
      show_on_home: Boolean(menu.show_on_home),
    });
  });

  app.get('/api/admin/menus', authenticate, requireAdmin, (_req, res) => {
    const menus = db
      .prepare(
        `SELECT m.*,
                (SELECT COUNT(*) FROM categories c WHERE c.menu_division = m.division_name) as category_count,
                (SELECT COUNT(*) FROM products p WHERE p.menu_division = m.division_name) as product_count
         FROM custom_menus m
         ORDER BY m.sort_order ASC, m.id ASC`
      )
      .all()
      .map((m: any) => ({
        ...m,
        is_active: Boolean(m.is_active),
        show_in_header: Boolean(m.show_in_header),
        show_on_home: Boolean(m.show_on_home),
      }));
    res.json(menus);
  });

  app.post('/api/admin/menus', authenticate, requireAdmin, (req, res) => {
    const {
      name,
      slug,
      subtitle,
      description,
      image_url,
      bg_color,
      badge_text,
      show_in_header,
      show_on_home,
      sort_order,
      is_active,
      starter_category_name,
    } = req.body;

    const cleanName = String(name || '').trim();
    if (!cleanName) {
      res.status(400).json({ error: 'Menu name is required' });
      return;
    }

    const reservedNames = ['green menu', 'cafe menu', 'diet menu', 'gym menu'];
    if (reservedNames.includes(cleanName.toLowerCase())) {
      res.status(400).json({
        error: `"${cleanName}" is already a built-in core menu. Choose a distinct name for your new menu (e.g. Keto Menu, Corporate Lunch, Smoothie Bar).`,
      });
      return;
    }

    const baseSlug = String(slug || cleanName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    if (!baseSlug) {
      res.status(400).json({ error: 'Valid menu URL slug is required' });
      return;
    }

    const existing = db
      .prepare('SELECT id FROM custom_menus WHERE LOWER(slug) = LOWER(?) OR LOWER(division_name) = LOWER(?)')
      .get(baseSlug, cleanName);
    if (existing) {
      res.status(409).json({ error: 'A custom menu with this name or URL slug already exists' });
      return;
    }

    const info = db
      .prepare(
        `INSERT INTO custom_menus (
          name, slug, division_name, subtitle, description, image_url, bg_color, badge_text,
          show_in_header, show_on_home, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        cleanName,
        baseSlug,
        cleanName,
        String(subtitle || '').trim() || 'Freshly Crafted Specialty Selection',
        String(description || '').trim() ||
          `Explore chef-curated healthy dishes from our ${cleanName}, prepared fresh daily in the TrimPlate kitchen.`,
        image_url || 'hero_bowl',
        bg_color || '#123B16',
        String(badge_text || 'Specialty Menu').trim(),
        show_in_header === false || show_in_header === 0 ? 0 : 1,
        show_on_home === false || show_on_home === 0 ? 0 : 1,
        Number(sort_order ?? 10),
        is_active === false || is_active === 0 ? 0 : 1
      );

    // Ensure at least one starter category exists for this new Menu Division so Admin can add products right away!
    const existingCat = db
      .prepare('SELECT id FROM categories WHERE menu_division = ? LIMIT 1')
      .get(cleanName);
    if (!existingCat) {
      const catTitle = String(starter_category_name || `${cleanName} Specials`).trim();
      const catSlug =
        catTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString().slice(-3);
      db.prepare(
        `INSERT INTO categories (name, slug, menu_division, description, image_key, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, 1, 1)`
      ).run(
        catTitle,
        catSlug,
        cleanName,
        `Signature selections under ${cleanName}`,
        image_url || 'hero_bowl'
      );
    }

    logAudit(req.user!.userId, 'CREATE_CUSTOM_MENU', 'custom_menu', String(info.lastInsertRowid), cleanName);
    broadcastEvent('site_settings_updated', { customMenuCreated: cleanName });
    res.status(201).json({ id: Number(info.lastInsertRowid), slug: baseSlug, division_name: cleanName });
  });

  app.put('/api/admin/menus/:id', authenticate, requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM custom_menus WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Custom menu not found' });
      return;
    }

    const {
      name,
      slug,
      subtitle,
      description,
      image_url,
      bg_color,
      badge_text,
      show_in_header,
      show_on_home,
      sort_order,
      is_active,
    } = req.body;

    const cleanName = String(name || existing.name).trim();
    const cleanSlug =
      String(slug || cleanName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || existing.slug;

    const conflict = db
      .prepare(
        'SELECT id FROM custom_menus WHERE (LOWER(slug) = LOWER(?) OR LOWER(division_name) = LOWER(?)) AND id != ?'
      )
      .get(cleanSlug, cleanName, existing.id);
    if (conflict) {
      res.status(409).json({ error: 'Another menu already uses that name or URL slug' });
      return;
    }

    db.prepare(
      `UPDATE custom_menus SET
        name = ?, slug = ?, division_name = ?, subtitle = ?, description = ?, image_url = ?,
        bg_color = ?, badge_text = ?, show_in_header = ?, show_on_home = ?, sort_order = ?, is_active = ?
       WHERE id = ?`
    ).run(
      cleanName,
      cleanSlug,
      cleanName,
      subtitle ?? existing.subtitle,
      description ?? existing.description,
      image_url || existing.image_url,
      bg_color || existing.bg_color,
      badge_text ?? existing.badge_text,
      show_in_header === false || show_in_header === 0 ? 0 : 1,
      show_on_home === false || show_on_home === 0 ? 0 : 1,
      Number(sort_order ?? existing.sort_order),
      is_active === false || is_active === 0 ? 0 : 1,
      existing.id
    );

    if (cleanName !== existing.division_name) {
      db.prepare('UPDATE categories SET menu_division = ? WHERE menu_division = ?').run(
        cleanName,
        existing.division_name
      );
      db.prepare('UPDATE products SET menu_division = ? WHERE menu_division = ?').run(
        cleanName,
        existing.division_name
      );
    }

    broadcastEvent('site_settings_updated', { customMenuUpdated: cleanName });
    res.json({ success: true, slug: cleanSlug, division_name: cleanName });
  });

  app.patch('/api/admin/menus/:id/toggle', authenticate, requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM custom_menus WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Custom menu not found' });
      return;
    }
    const nextActive = existing.is_active ? 0 : 1;
    db.prepare('UPDATE custom_menus SET is_active = ? WHERE id = ?').run(nextActive, existing.id);
    broadcastEvent('site_settings_updated', { customMenuToggled: existing.id, is_active: Boolean(nextActive) });
    res.json({ success: true, is_active: Boolean(nextActive) });
  });

  app.delete('/api/admin/menus/:id', authenticate, requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM custom_menus WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Custom menu not found' });
      return;
    }
    const prodCount = (
      db
        .prepare('SELECT COUNT(*) as cnt FROM products WHERE menu_division = ?')
        .get(existing.division_name) as { cnt: number }
    ).cnt;
    if (prodCount > 0) {
      res.status(400).json({
        error: `Move or delete the ${prodCount} product(s) inside "${existing.name}" before removing this menu.`,
      });
      return;
    }
    db.prepare('DELETE FROM categories WHERE menu_division = ?').run(existing.division_name);
    db.prepare('DELETE FROM custom_menus WHERE id = ?').run(existing.id);
    broadcastEvent('site_settings_updated', { customMenuDeleted: existing.id });
    res.json({ success: true });
  });

  app.get('/api/products', (req, res) => {
    const { division, menu_slug, category, diet, label, search, include_unavailable } = req.query;
    let resolvedDivision = division ? String(division) : '';
    if (!resolvedDivision && menu_slug) {
      const mRow = db
        .prepare('SELECT division_name FROM custom_menus WHERE slug = ? LIMIT 1')
        .get(String(menu_slug)) as { division_name: string } | undefined;
      if (mRow) resolvedDivision = mRow.division_name;
    }

    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.product_id = p.id), 0) as sold_count
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (include_unavailable !== '1') {
      sql += ' AND p.is_available = 1 AND c.is_active = 1';
    }
    if (resolvedDivision && resolvedDivision !== 'all') {
      sql += ' AND p.menu_division = ?';
      params.push(resolvedDivision);
    }
    if (category && category !== 'all' && category !== 'All') {
      sql += ' AND (c.slug = ? OR LOWER(c.name) = LOWER(?) OR LOWER(p.meal_time) = LOWER(?))';
      params.push(category, category, category);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }
    sql += ' ORDER BY p.id DESC';

    let rows = enrichProducts(db.prepare(sql).all(...params));
    if (diet && diet !== 'all') {
      rows = rows.filter((p) => p.diet_types.includes(String(diet)));
    }
    if (label && label !== 'all') {
      rows = rows.filter((p) => p.display_labels.includes(String(label)));
    }
    res.json(rows);
  });

  app.get('/api/products/:slugOrId', (req, res) => {
    const key = req.params.slugOrId;
    const row = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p JOIN categories c ON c.id = p.category_id
         WHERE p.slug = ? OR CAST(p.id AS TEXT) = ? LIMIT 1`
      )
      .get(key, key);
    if (!row) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const [enriched] = enrichProducts([row]);
    const reviews = db
      .prepare('SELECT * FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY id DESC')
      .all(enriched.id);

    const related = enrichProducts(
      db
        .prepare(
          `SELECT p.*, c.name as category_name, c.slug as category_slug
           FROM products p JOIN categories c ON c.id = p.category_id
           WHERE p.category_id = ? AND p.id != ? AND p.is_available = 1 LIMIT 4`
        )
        .all(enriched.category_id, enriched.id)
    );
    res.json({ ...enriched, reviews, myPendingReviews: [], related });
  });

  app.post('/api/products', authenticate, requireAdmin, (req, res) => {
    const {
      category_id,
      menu_division,
      name,
      description,
      price,
      is_veg,
      stock_qty,
      display_labels,
      diet_types,
      meal_time,
      is_available,
      image_key,
      custom_image_url,
      gallery_urls,
      seo_title,
      seo_description,
      nutrition,
      variants,
    } = req.body;

    const slug =
      String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString().slice(-4);

    const parsedPrice = price === '' || price === null || price === undefined ? null : Number(price);

    const result = db
      .prepare(
        `INSERT INTO products (
          category_id, menu_division, name, slug, description, price, is_veg, stock_qty,
          display_labels, diet_types, meal_time, is_available, image_key, seo_title, seo_description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(category_id),
        menu_division || 'Green Menu',
        name,
        slug,
        description || '',
        parsedPrice,
        is_veg ? 1 : 0,
        stock_qty !== undefined ? Number(stock_qty) : 50,
        JSON.stringify(Array.isArray(display_labels) ? display_labels : ['New Arrival']),
        JSON.stringify(Array.isArray(diet_types) ? diet_types : []),
        meal_time || 'All Day',
        is_available === false ? 0 : 1,
        image_key || 'hero_bowl',
        seo_title || '',
        seo_description || ''
      );

    const productId = Number(result.lastInsertRowid);

    const imgStmt = db.prepare('INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)');
    const primaryUrl = String(custom_image_url || image_key || 'hero_bowl').trim();
    const seenUrls = new Set<string>();
    if (primaryUrl) {
      imgStmt.run(productId, primaryUrl, 1, 0);
      seenUrls.add(primaryUrl);
    }
    if (Array.isArray(gallery_urls)) {
      let sortIdx = 1;
      gallery_urls.forEach((u: string) => {
        const cleanU = String(u || '').trim();
        if (cleanU && !seenUrls.has(cleanU)) {
          imgStmt.run(productId, cleanU, 0, sortIdx++);
          seenUrls.add(cleanU);
        }
      });
    }

    if (nutrition && nutrition.calories_kcal !== undefined && nutrition.calories_kcal !== '' && nutrition.calories_kcal !== null) {
      db.prepare(
        `INSERT INTO nutritional_information (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        productId,
        Number(nutrition.calories_kcal),
        Number(nutrition.protein_g || 0),
        Number(nutrition.carbs_g || 0),
        Number(nutrition.fat_g || 0),
        Number(nutrition.fiber_g || 0),
        Number(nutrition.sugar_g || 0),
        nutrition.is_verified === false ? 0 : 1
      );
    }

    if (Array.isArray(variants) && variants.length > 0) {
      const vStmt = db.prepare('INSERT INTO product_variants (product_id, variant_name, price, is_default) VALUES (?, ?, ?, ?)');
      variants.forEach((v: any, idx: number) => {
        if (v.variant_name && v.price !== '') {
          vStmt.run(productId, v.variant_name, Number(v.price), idx === 0 ? 1 : 0);
        }
      });
    }

    logAudit(req.user!.userId, 'CREATE_PRODUCT', 'product', String(productId), name);
    broadcastEvent('product_updated', { id: productId, action: 'created' });
    res.status(201).json({ id: productId, slug });
  });

  app.put('/api/products/:id', authenticate, requireAdmin, (req, res) => {
    const productId = Number(req.params.id);
    const {
      category_id,
      menu_division,
      name,
      description,
      price,
      is_veg,
      stock_qty,
      display_labels,
      diet_types,
      meal_time,
      is_available,
      image_key,
      custom_image_url,
      gallery_urls,
      seo_title,
      seo_description,
      nutrition,
      variants,
    } = req.body;

    const parsedPrice = price === '' || price === null || price === undefined ? null : Number(price);

    db.prepare(
      `UPDATE products
       SET category_id = ?, menu_division = ?, name = ?, description = ?, price = ?, is_veg = ?, stock_qty = ?,
           display_labels = ?, diet_types = ?, meal_time = ?, is_available = ?, image_key = ?, seo_title = ?, seo_description = ?
       WHERE id = ?`
    ).run(
      Number(category_id),
      menu_division,
      name,
      description || '',
      parsedPrice,
      is_veg ? 1 : 0,
      stock_qty !== undefined ? Number(stock_qty) : 50,
      JSON.stringify(Array.isArray(display_labels) ? display_labels : []),
      JSON.stringify(Array.isArray(diet_types) ? diet_types : []),
      meal_time || 'All Day',
      is_available === false ? 0 : 1,
      image_key || 'hero_bowl',
      seo_title || '',
      seo_description || '',
      productId
    );

    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
    const imgStmt = db.prepare('INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)');
    const primaryUrl = String(custom_image_url || image_key || 'hero_bowl').trim();
    const seenUrls = new Set<string>();
    if (primaryUrl) {
      imgStmt.run(productId, primaryUrl, 1, 0);
      seenUrls.add(primaryUrl);
    }
    if (Array.isArray(gallery_urls)) {
      let sortIdx = 1;
      gallery_urls.forEach((u: string) => {
        const cleanU = String(u || '').trim();
        if (cleanU && !seenUrls.has(cleanU)) {
          imgStmt.run(productId, cleanU, 0, sortIdx++);
          seenUrls.add(cleanU);
        }
      });
    }

    db.prepare('DELETE FROM nutritional_information WHERE product_id = ?').run(productId);
    if (nutrition && nutrition.calories_kcal !== undefined && nutrition.calories_kcal !== '' && nutrition.calories_kcal !== null) {
      db.prepare(
        `INSERT INTO nutritional_information (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        productId,
        Number(nutrition.calories_kcal),
        Number(nutrition.protein_g || 0),
        Number(nutrition.carbs_g || 0),
        Number(nutrition.fat_g || 0),
        Number(nutrition.fiber_g || 0),
        Number(nutrition.sugar_g || 0),
        nutrition.is_verified === false ? 0 : 1
      );
    }

    if (Array.isArray(variants)) {
      db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(productId);
      const vStmt = db.prepare('INSERT INTO product_variants (product_id, variant_name, price, is_default) VALUES (?, ?, ?, ?)');
      variants.forEach((v: any, idx: number) => {
        if (v.variant_name && v.price !== '') {
          vStmt.run(productId, v.variant_name, Number(v.price), idx === 0 ? 1 : 0);
        }
      });
    }

    logAudit(req.user!.userId, 'UPDATE_PRODUCT', 'product', String(productId), name);
    broadcastEvent('product_updated', { id: productId, action: 'updated' });
    res.json({ success: true });
  });

  app.delete('/api/products/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    logAudit(req.user!.userId, 'DELETE_PRODUCT', 'product', String(req.params.id), 'Deleted product');
    broadcastEvent('product_updated', { id: Number(req.params.id), action: 'deleted' });
    res.json({ success: true });
  });

  // ==================== EXCEL IMPORT / EXPORT ====================
  app.post('/api/admin/import-excel', authenticate, requireAdmin, (req, res) => {
    const { base64Workbook } = req.body;
    if (!base64Workbook) {
      res.status(400).json({ error: 'Excel file content is required' });
      return;
    }

    try {
      const buffer = Buffer.from(base64Workbook, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let importedCount = 0;

      for (const sheetName of workbook.SheetNames) {
        const lowerSheet = sheetName.toLowerCase();
        const division: 'Cafe Menu' | 'Green Menu' = lowerSheet.includes('cafe') ? 'Cafe Menu' : 'Green Menu';
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], { defval: '' });

        for (const row of rows) {
          const itemName = String(
            row['Product Name'] || row['Item Name'] || row['Name'] || row['Item'] || row['Menu Item'] || ''
          ).trim();
          if (!itemName) continue;

          const catName = String(
            row['Category'] || row['Section'] || (division === 'Cafe Menu' ? 'Beverages' : 'Healthy Lunch')
          ).trim();
          const rawPrice = row['Price'] ?? row['Rate'] ?? row['Amount'] ?? '';
          // Never invent prices if missing in Excel!
          const parsedPrice = rawPrice !== '' && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
          const desc = String(row['Description'] || row['Ingredients'] || '').trim();
          const variantLabel = String(row['Variant'] || row['Size'] || '').trim();
          const isVeg = String(row['Type'] || row['Veg/Non-Veg'] || 'Veg').toLowerCase().includes('non') ? 0 : 1;

          let cat = db
            .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND menu_division = ?')
            .get(catName, division) as { id: number } | undefined;

          if (!cat) {
            const catSlug =
              catName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 900 + 100);
            const cRes = db
              .prepare('INSERT INTO categories (name, slug, menu_division, sort_order) VALUES (?, ?, ?, 30)')
              .run(catName, catSlug, division);
            cat = { id: Number(cRes.lastInsertRowid) };
          }

          const existingProd = db
            .prepare('SELECT id FROM products WHERE LOWER(name) = LOWER(?) AND menu_division = ?')
            .get(itemName, division) as { id: number } | undefined;

          let productId: number;
          if (existingProd) {
            productId = existingProd.id;
            if (!variantLabel) {
              db.prepare('UPDATE products SET price = ?, category_id = ?, is_veg = ? WHERE id = ?').run(
                parsedPrice,
                cat.id,
                isVeg,
                productId
              );
            }
          } else {
            const prodSlug =
              itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4) + importedCount;
            const imgKey = division === 'Cafe Menu' ? 'cafe_sandwich' : 'hero_bowl';
            const pRes = db
              .prepare(
                `INSERT INTO products (category_id, menu_division, name, slug, description, price, is_veg, meal_time, image_key, display_labels)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '["New Arrival"]')`
              )
              .run(cat.id, division, itemName, prodSlug, desc, parsedPrice, isVeg, catName, imgKey);
            productId = Number(pRes.lastInsertRowid);
          }

          if (variantLabel && parsedPrice !== null) {
            db.prepare('INSERT INTO product_variants (product_id, variant_name, price, is_default) VALUES (?, ?, ?, 0)').run(
              productId,
              variantLabel,
              parsedPrice
            );
          }
          importedCount++;
        }
      }

      logAudit(req.user!.userId, 'IMPORT_EXCEL', 'menu', 'workbook', `Imported ${importedCount} rows`);
      res.json({ success: true, importedCount });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to parse Excel workbook' });
    }
  });

  app.get('/api/admin/export-excel', authenticate, requireAdmin, (_req, res) => {
    const allProducts = db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM products p JOIN categories c ON c.id = p.category_id
         ORDER BY p.menu_division, c.sort_order, p.name`
      )
      .all() as any[];

    const cafeRows = allProducts
      .filter((p) => p.menu_division === 'Cafe Menu')
      .map((p) => ({
        Category: p.category_name,
        'Product Name': p.name,
        Description: p.description,
        Price: p.price ?? '',
        'Veg/Non-Veg': p.is_veg ? 'Veg' : 'Non-Veg',
        Stock: p.stock_qty,
        Available: p.is_available ? 'Yes' : 'No',
      }));

    const greenRows = allProducts
      .filter((p) => p.menu_division === 'Green Menu')
      .map((p) => ({
        Category: p.category_name,
        'Product Name': p.name,
        Description: p.description,
        Price: p.price ?? '',
        'Veg/Non-Veg': p.is_veg ? 'Veg' : 'Non-Veg',
        'Meal Time': p.meal_time,
        Stock: p.stock_qty,
        Available: p.is_available ? 'Yes' : 'No',
      }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cafeRows), 'Trimplate Cafe Menu');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(greenRows), 'Trimplate Green Menu');

    const extraDivisions = Array.from(
      new Set(
        allProducts
          .map((p) => String(p.menu_division))
          .filter((d) => d !== 'Cafe Menu' && d !== 'Green Menu')
      )
    );
    for (const div of extraDivisions) {
      const divRows = allProducts
        .filter((p) => p.menu_division === div)
        .map((p) => ({
          Category: p.category_name,
          'Product Name': p.name,
          Description: p.description,
          Price: p.price ?? '',
          'Veg/Non-Veg': p.is_veg ? 'Veg' : 'Non-Veg',
          'Meal Time': p.meal_time,
          Stock: p.stock_qty,
          Available: p.is_available ? 'Yes' : 'No',
        }));
      if (divRows.length > 0) {
        const safeSheet = div.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Custom Menu';
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(divRows), safeSheet);
      }
    }

    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    res.json({ filename: 'Trimplate_Menus_Catalog.xlsx', base64 });
  });

  // ==================== WEBSITE CMS ENDPOINTS ====================
  // Helper: Sync Hero Slide Promo Code with Checkout Coupons Table
  const syncHeroSlideCoupon = (slideData: {
    title?: string;
    promo_code?: string;
    discount_type?: string;
    discount_value?: number;
    min_order_amount?: number;
    end_date?: string;
    is_active?: number | boolean;
    previous_promo_code?: string;
  }) => {
    const cleanCode = String(slideData.promo_code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .trim();
    const prevCode = String(slideData.previous_promo_code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .trim();

    // If Admin changed or removed an old promo code, check if any other active slide/offer still uses prevCode
    if (prevCode && prevCode !== cleanCode) {
      const stillUsedByHero = db
        .prepare('SELECT id FROM hero_slides WHERE UPPER(promo_code) = ? AND is_active = 1 LIMIT 1')
        .get(prevCode);
      const stillUsedByOffer = db
        .prepare('SELECT id FROM offers WHERE UPPER(coupon_code) = ? AND is_active = 1 LIMIT 1')
        .get(prevCode);
      if (!stillUsedByHero && !stillUsedByOffer) {
        db.prepare('UPDATE coupons SET is_active = 0 WHERE UPPER(code) = ?').run(prevCode);
      }
    }

    const discVal = Number(slideData.discount_value || 0);
    if (!cleanCode || discVal <= 0) return;

    const discType = slideData.discount_type === 'flat' ? 'flat' : 'percentage';
    const minOrder = Math.max(0, Number(slideData.min_order_amount ?? 199));
    const maxDisc = discType === 'flat' ? discVal : Math.max(250, Math.round(discVal * 12));
    const activeInt = slideData.is_active === false || slideData.is_active === 0 ? 0 : 1;
    // Keep coupon active if another active hero slide or offer also shares this code
    const sharedActive =
      activeInt === 1 ||
      Boolean(
        db
          .prepare('SELECT id FROM hero_slides WHERE UPPER(promo_code) = ? AND is_active = 1 LIMIT 1')
          .get(cleanCode)
      ) ||
      Boolean(
        db
          .prepare('SELECT id FROM offers WHERE UPPER(coupon_code) = ? AND is_active = 1 LIMIT 1')
          .get(cleanCode)
      );

    const expiry = slideData.end_date || '2028-12-31';
    const desc = `Hero Offer: ${slideData.title || cleanCode}`;

    db.prepare(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, is_active, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 1000, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
         description = excluded.description,
         discount_type = excluded.discount_type,
         discount_value = excluded.discount_value,
         min_order_amount = excluded.min_order_amount,
         max_discount = excluded.max_discount,
         is_active = excluded.is_active,
         expires_at = excluded.expires_at`
    ).run(cleanCode, desc, discType, discVal, minOrder, maxDisc, sharedActive ? 1 : 0, expiry);
  };

  // A. Hero Slides
  app.get('/api/cms/hero-slides', authenticate, requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM hero_slides ORDER BY sort_order ASC, id ASC').all());
  });

  app.post('/api/cms/hero-slides', authenticate, requireAdmin, (req, res) => {
    const s = req.body;
    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM hero_slides').get() as any).m;
    const cleanPromo = String(s.promo_code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .trim();
    const isActiveInt = s.is_active === false || s.is_active === 0 ? 0 : 1;
    const slideOrder = s.pin_first ? 0 : maxOrder + 1;
    if (s.pin_first) {
      db.prepare('UPDATE hero_slides SET sort_order = sort_order + 1').run();
    }

    const info = db
      .prepare(
        `INSERT INTO hero_slides (
          title, subtitle, cta_primary_text, cta_primary_url, cta_secondary_text, cta_secondary_url,
          desktop_image, mobile_image, text_position, overlay_opacity, sort_order, is_active, start_date, end_date,
          slide_type, badge_text, promo_code, discount_type, discount_value, min_order_amount, linked_product_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        s.title,
        s.subtitle || '',
        s.cta_primary_text || 'Explore Menu',
        s.cta_primary_url || '/green-menu',
        s.cta_secondary_text || '',
        s.cta_secondary_url || '',
        s.desktop_image || 'hero_slide_feast',
        s.mobile_image || s.desktop_image || 'hero_bowl',
        s.text_position || 'left',
        Number(s.overlay_opacity ?? 0.55),
        slideOrder === 0 ? 1 : slideOrder,
        isActiveInt,
        s.start_date || '2026-01-01',
        s.end_date || '2028-12-31',
        s.slide_type || 'standard',
        s.badge_text || '',
        cleanPromo,
        s.discount_type === 'flat' ? 'flat' : 'percentage',
        Number(s.discount_value || 0),
        Number(s.min_order_amount ?? 199),
        s.linked_product_id ? Number(s.linked_product_id) : null
      );

    syncHeroSlideCoupon({
      title: s.title,
      promo_code: cleanPromo,
      discount_type: s.discount_type,
      discount_value: Number(s.discount_value || 0),
      min_order_amount: Number(s.min_order_amount ?? 199),
      end_date: s.end_date || '2028-12-31',
      is_active: isActiveInt,
    });

    broadcastEvent('site_settings_updated', { section: 'hero_slides' });
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/cms/hero-slides/:id', authenticate, requireAdmin, (req, res) => {
    const s = req.body;
    const prevSlide = db
      .prepare('SELECT promo_code FROM hero_slides WHERE id = ?')
      .get(req.params.id) as { promo_code?: string } | undefined;

    const cleanPromo = String(s.promo_code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .trim();
    const isActiveInt = s.is_active === false || s.is_active === 0 ? 0 : 1;

    db.prepare(
      `UPDATE hero_slides SET
        title = ?, subtitle = ?, cta_primary_text = ?, cta_primary_url = ?, cta_secondary_text = ?, cta_secondary_url = ?,
        desktop_image = ?, mobile_image = ?, text_position = ?, overlay_opacity = ?, sort_order = ?, is_active = ?, start_date = ?, end_date = ?,
        slide_type = ?, badge_text = ?, promo_code = ?, discount_type = ?, discount_value = ?, min_order_amount = ?, linked_product_id = ?
       WHERE id = ?`
    ).run(
      s.title,
      s.subtitle || '',
      s.cta_primary_text || '',
      s.cta_primary_url || '',
      s.cta_secondary_text || '',
      s.cta_secondary_url || '',
      s.desktop_image || 'hero_slide_feast',
      s.mobile_image || 'hero_bowl',
      s.text_position || 'left',
      Number(s.overlay_opacity ?? 0.55),
      Number(s.sort_order ?? 1),
      isActiveInt,
      s.start_date || '2026-01-01',
      s.end_date || '2028-12-31',
      s.slide_type || 'standard',
      s.badge_text || '',
      cleanPromo,
      s.discount_type === 'flat' ? 'flat' : 'percentage',
      Number(s.discount_value || 0),
      Number(s.min_order_amount ?? 199),
      s.linked_product_id ? Number(s.linked_product_id) : null,
      req.params.id
    );

    syncHeroSlideCoupon({
      title: s.title,
      promo_code: cleanPromo,
      discount_type: s.discount_type,
      discount_value: Number(s.discount_value || 0),
      min_order_amount: Number(s.min_order_amount ?? 199),
      end_date: s.end_date || '2028-12-31',
      is_active: isActiveInt,
      previous_promo_code: prevSlide?.promo_code || '',
    });

    broadcastEvent('site_settings_updated', { section: 'hero_slides' });
    res.json({ success: true });
  });

  app.patch('/api/cms/hero-slides/:id/toggle', authenticate, requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Hero slide not found' });
      return;
    }
    const nextActive =
      req.body?.is_active !== undefined
        ? req.body.is_active
          ? 1
          : 0
        : existing.is_active
        ? 0
        : 1;
    db.prepare('UPDATE hero_slides SET is_active = ? WHERE id = ?').run(nextActive, req.params.id);

    if (existing.promo_code) {
      syncHeroSlideCoupon({
        title: existing.title,
        promo_code: existing.promo_code,
        discount_type: existing.discount_type,
        discount_value: Number(existing.discount_value || 0),
        min_order_amount: Number(existing.min_order_amount ?? 199),
        end_date: existing.end_date,
        is_active: nextActive,
      });
    }

    broadcastEvent('site_settings_updated', { section: 'hero_slides' });
    res.json({ success: true, is_active: nextActive });
  });

  app.put('/api/cms/hero-slides-reorder', authenticate, requireAdmin, (req, res) => {
    const { orderedIds } = req.body;
    if (Array.isArray(orderedIds)) {
      const stmt = db.prepare('UPDATE hero_slides SET sort_order = ? WHERE id = ?');
      orderedIds.forEach((id: number, idx: number) => stmt.run(idx + 1, id));
    }
    broadcastEvent('site_settings_updated', { section: 'hero_slides' });
    res.json({ success: true });
  });

  app.delete('/api/cms/hero-slides/:id', authenticate, requireAdmin, (req, res) => {
    const prevSlide = db
      .prepare('SELECT promo_code FROM hero_slides WHERE id = ?')
      .get(req.params.id) as { promo_code?: string } | undefined;
    db.prepare('DELETE FROM hero_slides WHERE id = ?').run(req.params.id);
    if (prevSlide?.promo_code) {
      syncHeroSlideCoupon({ promo_code: '', previous_promo_code: prevSlide.promo_code });
    }
    broadcastEvent('site_settings_updated', { section: 'hero_slides' });
    res.json({ success: true });
  });

  // B. Homepage Sections (with drag-and-drop reorder & curated product IDs)
  app.get('/api/cms/homepage-sections', authenticate, requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM homepage_sections ORDER BY sort_order ASC, id ASC').all() as any[];
    const spStmt = db.prepare('SELECT product_id FROM homepage_section_products WHERE section_id = ? ORDER BY sort_order ASC');
    res.json(
      rows.map((s) => ({
        ...s,
        is_enabled: Boolean(s.is_enabled),
        config: JSON.parse(s.config_json || '{}'),
        curated_product_ids: spStmt.all(s.id).map((r: any) => r.product_id),
      }))
    );
  });

  app.put('/api/cms/homepage-sections/:id', authenticate, requireAdmin, (req, res) => {
    const s = req.body;
    const secId = Number(req.params.id);
    db.prepare(
      `UPDATE homepage_sections SET
        title = ?, subtitle = ?, description = ?, image_url = ?, cta_text = ?, cta_url = ?,
        bg_color = ?, product_limit = ?, sort_order = ?, is_enabled = ?, config_json = ?
       WHERE id = ?`
    ).run(
      s.title,
      s.subtitle || '',
      s.description || '',
      s.image_url || '',
      s.cta_text || '',
      s.cta_url || '',
      s.bg_color || '#FFFFFF',
      Number(s.product_limit || 4),
      Number(s.sort_order || 1),
      s.is_enabled === false || s.is_enabled === 0 ? 0 : 1,
      JSON.stringify(s.config || {}),
      secId
    );

    if (Array.isArray(s.curated_product_ids)) {
      db.prepare('DELETE FROM homepage_section_products WHERE section_id = ?').run(secId);
      const ins = db.prepare('INSERT INTO homepage_section_products (section_id, product_id, sort_order) VALUES (?, ?, ?)');
      s.curated_product_ids.forEach((pid: number, idx: number) => ins.run(secId, Number(pid), idx + 1));
    }
    res.json({ success: true });
  });

  app.put('/api/cms/homepage-sections-reorder', authenticate, requireAdmin, (req, res) => {
    const { orderedIds } = req.body;
    if (Array.isArray(orderedIds)) {
      const stmt = db.prepare('UPDATE homepage_sections SET sort_order = ? WHERE id = ?');
      orderedIds.forEach((id: number, idx: number) => stmt.run(idx + 1, id));
    }
    res.json({ success: true });
  });

  // C. Banners
  app.get('/api/cms/banners', authenticate, requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM banners ORDER BY id ASC').all());
  });

  app.post('/api/cms/banners', authenticate, requireAdmin, (req, res) => {
    const b = req.body;
    const key = b.banner_key || `banner_${Date.now()}`;
    const info = db
      .prepare(
        `INSERT INTO banners (banner_key, page_target, title, subtitle, description, image_url, mobile_image_url, cta_text, cta_url, bg_color, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        key,
        b.page_target || 'home',
        b.title,
        b.subtitle || '',
        b.description || '',
        b.image_url || 'meal_prep_tray',
        b.mobile_image_url || '',
        b.cta_text || 'Explore Now',
        b.cta_url || '/subscriptions',
        b.bg_color || '#123B16',
        b.is_active === false ? 0 : 1
      );
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/cms/banners/:id', authenticate, requireAdmin, (req, res) => {
    const b = req.body;
    db.prepare(
      `UPDATE banners SET page_target = ?, title = ?, subtitle = ?, description = ?, image_url = ?, mobile_image_url = ?, cta_text = ?, cta_url = ?, bg_color = ?, is_active = ?
       WHERE id = ?`
    ).run(
      b.page_target || 'home',
      b.title,
      b.subtitle || '',
      b.description || '',
      b.image_url || 'meal_prep_tray',
      b.mobile_image_url || '',
      b.cta_text || '',
      b.cta_url || '',
      b.bg_color || '#123B16',
      b.is_active === false || b.is_active === 0 ? 0 : 1,
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/cms/banners/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // D. Special Offers (Auto-expiring on public queries)
  app.get('/api/offers', (req, res) => {
    const nowIso = new Date().toISOString().slice(0, 16);
    if (req.query.all === '1') {
      res.json(db.prepare('SELECT * FROM offers ORDER BY id DESC').all());
      return;
    }
    const active = db
      .prepare('SELECT * FROM offers WHERE is_active = 1 AND start_datetime <= ? AND end_datetime >= ? ORDER BY id DESC')
      .all(nowIso, nowIso);
    res.json(active);
  });

  app.post('/api/cms/offers', authenticate, requireAdmin, (req, res) => {
    const o = req.body;
    const info = db
      .prepare(
        `INSERT INTO offers (
          title, description, banner_image, discount_type, discount_value, coupon_code,
          start_datetime, end_datetime, applicable_categories, applicable_products,
          min_order_value, max_discount, usage_limit, cta_text, cta_url, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        o.title,
        o.description || '',
        o.banner_image || 'meal_prep_tray',
        o.discount_type || 'percentage',
        Number(o.discount_value || 15),
        String(o.coupon_code || '').toUpperCase().trim(),
        o.start_datetime || '2026-01-01T00:00',
        o.end_datetime || '2027-12-31T23:59',
        o.applicable_categories || 'All',
        o.applicable_products || 'All',
        Number(o.min_order_value || 199),
        Number(o.max_discount || 200),
        Number(o.usage_limit || 500),
        o.cta_text || 'Order Now',
        o.cta_url || '/green-menu',
        o.is_active === false ? 0 : 1
      );

    // Sync coupon code automatically if provided
    if (o.coupon_code) {
      const code = String(o.coupon_code).toUpperCase().trim();
      const exists = db.prepare('SELECT id FROM coupons WHERE code = ?').get(code);
      if (!exists) {
        db.prepare(
          `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          code,
          o.title,
          o.discount_type || 'percentage',
          Number(o.discount_value || 15),
          Number(o.min_order_value || 199),
          Number(o.max_discount || 200),
          Number(o.usage_limit || 500),
          String(o.end_datetime || '2027-12-31').slice(0, 10)
        );
      }
    }

    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/cms/offers/:id', authenticate, requireAdmin, (req, res) => {
    const o = req.body;
    db.prepare(
      `UPDATE offers SET
        title = ?, description = ?, banner_image = ?, discount_type = ?, discount_value = ?, coupon_code = ?,
        start_datetime = ?, end_datetime = ?, applicable_categories = ?, applicable_products = ?,
        min_order_value = ?, max_discount = ?, usage_limit = ?, cta_text = ?, cta_url = ?, is_active = ?
       WHERE id = ?`
    ).run(
      o.title,
      o.description || '',
      o.banner_image || 'meal_prep_tray',
      o.discount_type || 'percentage',
      Number(o.discount_value || 0),
      String(o.coupon_code || '').toUpperCase().trim(),
      o.start_datetime || '2026-01-01T00:00',
      o.end_datetime || '2027-12-31T23:59',
      o.applicable_categories || 'All',
      o.applicable_products || 'All',
      Number(o.min_order_value || 0),
      Number(o.max_discount || 0),
      Number(o.usage_limit || 500),
      o.cta_text || 'Order Now',
      o.cta_url || '/green-menu',
      o.is_active === false || o.is_active === 0 ? 0 : 1,
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/cms/offers/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM offers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // E. Pages Management
  app.get('/api/pages', (req, res) => {
    const sql = req.query.all === '1' ? 'SELECT * FROM pages ORDER BY id ASC' : 'SELECT * FROM pages WHERE is_published = 1 ORDER BY id ASC';
    res.json(db.prepare(sql).all());
  });

  app.get('/api/pages/:slug', (req, res) => {
    const page = db.prepare('SELECT * FROM pages WHERE slug = ? AND is_published = 1').get(req.params.slug);
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json(page);
  });

  app.post('/api/cms/pages', authenticate, requireAdmin, (req, res) => {
    const p = req.body;
    const slug =
      p.slug ||
      String(p.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const info = db
      .prepare(
        `INSERT INTO pages (title, slug, hero_subtitle, content_html, banner_image, seo_title, seo_description, og_image, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        p.title,
        slug,
        p.hero_subtitle || '',
        p.content_html || '',
        p.banner_image || 'hero_slide_green',
        p.seo_title || '',
        p.seo_description || '',
        p.og_image || '',
        p.is_published === false ? 0 : 1
      );
    res.status(201).json({ id: info.lastInsertRowid, slug });
  });

  app.put('/api/cms/pages/:id', authenticate, requireAdmin, (req, res) => {
    const p = req.body;
    db.prepare(
      `UPDATE pages SET title = ?, slug = ?, hero_subtitle = ?, content_html = ?, banner_image = ?, seo_title = ?, seo_description = ?, og_image = ?, is_published = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      p.title,
      p.slug,
      p.hero_subtitle || '',
      p.content_html || '',
      p.banner_image || 'hero_slide_green',
      p.seo_title || '',
      p.seo_description || '',
      p.og_image || '',
      p.is_published === false || p.is_published === 0 ? 0 : 1,
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/cms/pages/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM pages WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // F. Navigation Management
  app.get('/api/cms/navigation', authenticate, requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM navigation_items ORDER BY location ASC, sort_order ASC, id ASC').all());
  });

  app.post('/api/cms/navigation', authenticate, requireAdmin, (req, res) => {
    const n = req.body;
    const info = db
      .prepare('INSERT INTO navigation_items (location, label, url, parent_id, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run(n.location || 'header', n.label, n.url, n.parent_id ? Number(n.parent_id) : null, Number(n.sort_order || 10), n.is_active === false ? 0 : 1);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/cms/navigation/:id', authenticate, requireAdmin, (req, res) => {
    const n = req.body;
    db.prepare('UPDATE navigation_items SET location = ?, label = ?, url = ?, parent_id = ?, sort_order = ?, is_active = ? WHERE id = ?').run(
      n.location || 'header',
      n.label,
      n.url,
      n.parent_id ? Number(n.parent_id) : null,
      Number(n.sort_order || 1),
      n.is_active === false || n.is_active === 0 ? 0 : 1,
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/cms/navigation/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM navigation_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // G. Media Library
  app.get('/api/cms/media', authenticate, requireAdmin, (req, res) => {
    const { folder, search } = req.query;
    let sql = 'SELECT * FROM media_library WHERE 1=1';
    const params: any[] = [];
    if (folder && folder !== 'All') {
      sql += ' AND folder = ?';
      params.push(folder);
    }
    if (search) {
      sql += ' AND (title LIKE ? OR alt_text LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY id DESC';
    res.json(db.prepare(sql).all(...params));
  });

  app.post('/api/cms/media', authenticate, requireAdmin, (req, res) => {
    const { title, file_url, folder, alt_text } = req.body;
    const info = db
      .prepare('INSERT INTO media_library (title, file_url, folder, alt_text) VALUES (?, ?, ?, ?)')
      .run(title || 'Uploaded Asset', file_url, folder || 'Uploads', alt_text || title || '');
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/cms/media/:id', authenticate, requireAdmin, (req, res) => {
    const { title, file_url, folder, alt_text } = req.body;
    db.prepare('UPDATE media_library SET title = ?, file_url = ?, folder = ?, alt_text = ? WHERE id = ?').run(
      title,
      file_url,
      folder || 'Uploads',
      alt_text || '',
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/cms/media/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM media_library WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // H. Testimonials, Gallery & Newsletter
  app.get('/api/cms/testimonials', authenticate, requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM testimonials ORDER BY sort_order ASC, id DESC').all());
  });

  app.post('/api/cms/testimonials', authenticate, requireAdmin, (req, res) => {
    const t = req.body;
    const info = db
      .prepare(
        'INSERT INTO testimonials (customer_name, designation, location, rating, comment, sort_order, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(t.customer_name, t.designation || 'Verified Customer', t.location || 'Kolkata', Number(t.rating || 5), t.comment, Number(t.sort_order || 10), t.is_approved === false ? 0 : 1);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/cms/testimonials/:id', authenticate, requireAdmin, (req, res) => {
    const t = req.body;
    db.prepare(
      'UPDATE testimonials SET customer_name = ?, designation = ?, location = ?, rating = ?, comment = ?, sort_order = ?, is_approved = ? WHERE id = ?'
    ).run(
      t.customer_name,
      t.designation || '',
      t.location || '',
      Number(t.rating || 5),
      t.comment,
      Number(t.sort_order || 1),
      t.is_approved === false || t.is_approved === 0 ? 0 : 1,
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/cms/testimonials/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/cms/gallery', authenticate, requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM gallery ORDER BY sort_order ASC, id ASC').all());
  });

  app.post('/api/cms/gallery', authenticate, requireAdmin, (req, res) => {
    const g = req.body;
    const info = db
      .prepare('INSERT INTO gallery (title, caption, category, image_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run(g.title, g.caption || '', g.category || 'Healthy Bowls', g.image_url, Number(g.sort_order || 10));
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/cms/gallery/:id', authenticate, requireAdmin, (req, res) => {
    const g = req.body;
    db.prepare('UPDATE gallery SET title = ?, caption = ?, category = ?, image_url = ?, sort_order = ?, is_active = ? WHERE id = ?').run(
      g.title,
      g.caption || '',
      g.category || '',
      g.image_url,
      Number(g.sort_order || 1),
      g.is_active === false || g.is_active === 0 ? 0 : 1,
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/cms/gallery/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/newsletter/subscribe', (req, res) => {
    const { email, name } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(cleanEmail);
    if (existing) {
      res.json({ success: true, message: 'You are already subscribed to TrimPlate updates!' });
      return;
    }
    db.prepare('INSERT INTO newsletter_subscribers (email, name) VALUES (?, ?)').run(cleanEmail, name || '');
    res.status(201).json({ success: true, message: 'Subscribed! Welcome to the TrimPlate Wellness Club.' });
  });

  app.get('/api/cms/newsletter', authenticate, requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM newsletter_subscribers ORDER BY id DESC').all());
  });

  app.delete('/api/cms/newsletter/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/contact-inquiry', (req, res) => {
    const { name, email, phone, subject, message, user_id } = req.body;
    if (!name || !message) {
      res.status(400).json({ error: 'Name and message are required' });
      return;
    }
    db.prepare('INSERT INTO notifications (user_id, role_target, title, message, type) VALUES (?, ?, ?, ?, ?)').run(
      user_id ? Number(user_id) : null,
      'admin',
      `Inquiry: ${subject || 'Website Contact'} (${name})`,
      `${message} — Contact: ${phone || ''} ${email || ''}`.trim(),
      'support'
    );
    broadcastEvent('support_inquiry', { name, subject: subject || 'Website Contact' });
    res.status(201).json({ success: true, message: 'Thank you! Our nutrition & hospitality desk will respond shortly.' });
  });

  app.put('/api/auth/password', authenticate, (req, res) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || String(new_password).length < 6) {
      res.status(400).json({ error: 'Current password and a new password (min 6 characters) are required' });
      return;
    }
    const u = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.userId) as { password_hash: string } | undefined;
    if (!u || !bcrypt.compareSync(current_password, u.password_hash)) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }
    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user!.userId);
    res.json({ success: true, message: 'Password updated successfully' });
  });

  // ==================== SUBSCRIPTION PLANS & SUBSCRIPTIONS ====================
  app.get('/api/subscription-plans', (req, res) => {
    const sql =
      req.query.all === '1'
        ? 'SELECT * FROM subscription_plans ORDER BY duration_days ASC'
        : 'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY duration_days ASC';
    res.json(
      db
        .prepare(sql)
        .all()
        .map((pl: any) => ({
          ...pl,
          is_active: Boolean(pl.is_active),
          benefits: JSON.parse(pl.benefits_json || '[]'),
        }))
    );
  });

  app.post('/api/subscription-plans', authenticate, requireAdmin, (req, res) => {
    const p = req.body;
    const info = db
      .prepare(
        `INSERT INTO subscription_plans (
          name, subtitle, duration_days, price, original_price, price_per_person_label,
          badge_text, card_theme, benefits_json, meals_included, delivery_info, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        p.name,
        p.subtitle || 'Custom Plan',
        Number(p.duration_days),
        Number(p.price),
        p.original_price ? Number(p.original_price) : null,
        p.price_per_person_label || 'Per Person',
        p.badge_text || '',
        p.card_theme || 'green',
        JSON.stringify(Array.isArray(p.benefits) ? p.benefits : []),
        p.meals_included || 'Breakfast, Lunch, Snacks, Dinner',
        p.delivery_info || 'Daily fresh delivery',
        p.is_active === false ? 0 : 1
      );
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/subscription-plans/:id', authenticate, requireAdmin, (req, res) => {
    const p = req.body;
    db.prepare(
      `UPDATE subscription_plans SET
        name = ?, subtitle = ?, duration_days = ?, price = ?, original_price = ?, price_per_person_label = ?,
        badge_text = ?, card_theme = ?, benefits_json = ?, meals_included = ?, delivery_info = ?, is_active = ?
       WHERE id = ?`
    ).run(
      p.name,
      p.subtitle,
      Number(p.duration_days),
      Number(p.price),
      p.original_price ? Number(p.original_price) : null,
      p.price_per_person_label || 'Per Person',
      p.badge_text || '',
      p.card_theme || 'green',
      JSON.stringify(Array.isArray(p.benefits) ? p.benefits : []),
      p.meals_included || 'Breakfast, Lunch, Snacks, Dinner',
      p.delivery_info || 'Daily fresh delivery',
      p.is_active === false || p.is_active === 0 ? 0 : 1,
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete('/api/subscription-plans/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM subscription_plans WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/subscriptions', authenticate, (req, res) => {
    const isAdmin = req.user!.role === 'admin' && req.query.scope === 'all';
    const sql = isAdmin
      ? `SELECT s.*, sp.name as plan_name, sp.subtitle as plan_subtitle, sp.duration_days, u.name as customer_name, u.mobile as customer_mobile
         FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.plan_id
         JOIN users u ON u.id = s.user_id
         ORDER BY s.id DESC`
      : `SELECT s.*, sp.name as plan_name, sp.subtitle as plan_subtitle, sp.duration_days
         FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.plan_id
         WHERE s.user_id = ?
         ORDER BY s.id DESC`;

    const rows = (isAdmin ? db.prepare(sql).all() : db.prepare(sql).all(req.user!.userId)).map((s: any) => ({
      ...s,
      is_veg_only: Boolean(s.is_veg_only),
      skipped_dates: JSON.parse(s.skipped_dates_json || '[]'),
    }));
    res.json(rows);
  });

  app.patch('/api/subscriptions/:id/status', authenticate, (req, res) => {
    const { status, skip_date } = req.body;
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id) as any;
    if (!sub) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }
    if (req.user!.role !== 'admin' && sub.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (skip_date) {
      const skipped: string[] = JSON.parse(sub.skipped_dates_json || '[]');
      const nextSkipped = skipped.includes(skip_date)
        ? skipped.filter((d) => d !== skip_date)
        : [...skipped, skip_date];
      db.prepare('UPDATE subscriptions SET skipped_dates_json = ? WHERE id = ?').run(JSON.stringify(nextSkipped), sub.id);
      broadcastEvent('subscription_updated', { id: sub.id, skipped_dates: nextSkipped });
      res.json({ success: true, skipped_dates: nextSkipped });
      return;
    }

    if (status) {
      db.prepare('UPDATE subscriptions SET status = ? WHERE id = ?').run(status, sub.id);
      broadcastEvent('subscription_updated', { id: sub.id, status });
      res.json({ success: true, status });
      return;
    }

    res.json({ success: true });
  });

  app.post('/api/subscriptions/:id/renew', authenticate, (req, res) => {
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id) as any;
    if (!sub || (req.user!.role !== 'admin' && sub.user_id !== req.user!.userId)) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }
    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(sub.plan_id) as any;
    const startDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const endObj = new Date(startDate);
    endObj.setDate(endObj.getDate() + (plan ? plan.duration_days : 7));
    const endDate = endObj.toISOString().slice(0, 10);
    const newCode = 'SUB-TP' + Math.floor(100 + Math.random() * 899);

    const resSub = db
      .prepare(
        `INSERT INTO subscriptions (
          subscription_code, user_id, plan_id, menu_preference, selected_meals, is_veg_only,
          start_date, end_date, delivery_slot, address_id, status, total_paid, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, 'Cash on Delivery')`
      )
      .run(
        newCode,
        sub.user_id,
        sub.plan_id,
        sub.menu_preference,
        sub.selected_meals || 'Breakfast, Lunch, Snacks, Dinner',
        sub.is_veg_only,
        startDate,
        endDate,
        sub.delivery_slot,
        sub.address_id,
        plan ? plan.price : sub.total_paid
      );
    res.status(201).json({ id: resSub.lastInsertRowid, subscription_code: newCode });
  });

  // ==================== COUPONS ====================
  app.get('/api/coupons', (_req, res) => {
    res.json(db.prepare('SELECT * FROM coupons ORDER BY id DESC').all());
  });

  app.post('/api/coupons/validate', (req, res) => {
    const { code, subtotal } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const coupon = db
      .prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1 AND expires_at >= ?')
      .get(String(code || '').trim(), today) as any;

    if (!coupon) {
      res.status(404).json({ error: 'Invalid or expired coupon code' });
      return;
    }
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      res.status(400).json({ error: 'This coupon has reached its maximum usage limit' });
      return;
    }
    if (Number(subtotal) < coupon.min_order_amount) {
      res.status(400).json({ error: `Minimum order value of ₹${coupon.min_order_amount} is required` });
      return;
    }

    let discount =
      coupon.discount_type === 'percentage'
        ? Math.round((Number(subtotal) * coupon.discount_value) / 100)
        : coupon.discount_value;
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }

    res.json({ coupon, discount });
  });

  app.post('/api/coupons', authenticate, requireAdmin, (req, res) => {
    const { code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, expires_at } = req.body;
    const result = db
      .prepare(
        `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(code).toUpperCase().trim(),
        description,
        discount_type || 'percentage',
        Number(discount_value),
        Number(min_order_amount || 199),
        Number(max_discount || 250),
        Number(usage_limit || 500),
        expires_at || '2027-12-31'
      );
    res.status(201).json({ id: result.lastInsertRowid });
  });

  app.delete('/api/coupons/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // ==================== ORDERS & CHECKOUT (HONEST PAYMENT VERIFICATION) ====================
  app.get('/api/orders', authenticate, (req, res) => {
    const isAdmin = req.user!.role === 'admin' && req.query.scope === 'all';
    const sql = isAdmin
      ? `SELECT o.*, u.name as customer_name, u.mobile as customer_mobile, s.name as staff_name, s.mobile as staff_mobile,
                a.line1 as address_line1, a.area as address_area, a.pincode as address_pincode
         FROM orders o
         JOIN users u ON u.id = o.user_id
         LEFT JOIN staff s ON s.id = o.assigned_staff_id
         LEFT JOIN addresses a ON a.id = o.address_id
         ORDER BY o.id DESC`
      : `SELECT o.*, s.name as staff_name, s.mobile as staff_mobile,
                a.line1 as address_line1, a.area as address_area, a.pincode as address_pincode
         FROM orders o
         LEFT JOIN staff s ON s.id = o.assigned_staff_id
         LEFT JOIN addresses a ON a.id = o.address_id
         WHERE o.user_id = ?
         ORDER BY o.id DESC`;

    const orders = isAdmin ? db.prepare(sql).all() : db.prepare(sql).all(req.user!.userId);
    const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const trackStmt = db.prepare('SELECT * FROM delivery_tracking WHERE order_id = ? ORDER BY id ASC');

    res.json(
      orders.map((o: any) => ({
        ...o,
        items: itemsStmt.all(o.id),
        tracking: trackStmt.all(o.id),
      }))
    );
  });

  app.post('/api/orders', authenticate, (req, res) => {
    const {
      items,
      customer_name,
      customer_phone,
      customer_whatsapp,
      address_id,
      delivery_address_text,
      delivery_date,
      subtotal,
      delivery_charge,
      gst_amount,
      coupon_code,
      discount_amount,
      total_amount,
      payment_method,
      payment_reference,
      delivery_notes,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Shopping cart is empty' });
      return;
    }

    // Honest payment verification — never fake gateway approval!
    if (payment_method === 'UPI') {
      const ref = String(payment_reference || '').trim();
      if (ref.length < 8) {
        res.status(400).json({
          error: 'Please enter your 12-digit UPI UTR / Transaction Reference ID after scanning or paying via UPI.',
        });
        return;
      }
    }
    if (payment_method === 'Online Payment Gateway') {
      const gatewayKey = process.env.RAZORPAY_KEY_ID || getSettingsMap().payment_gateway_key || '';
      if (!gatewayKey) {
        res.status(400).json({
          error:
            'Live Online Payment Gateway merchant key is not configured yet in Website Settings. Please choose UPI or Cash on Delivery, or configure your Razorpay/Stripe merchant key in Admin → Website Settings.',
        });
        return;
      }
    }

    const orderCode = 'TP' + Math.floor(100000 + Math.random() * 900000);
    const paymentStatus =
      payment_method === 'Cash on Delivery' ? 'Pending' : 'Verification Pending';
    const cleanPhone = String(customer_phone || '').trim();
    const cleanWhatsapp = String(customer_whatsapp || cleanPhone || '').trim();

    const orderRes = db
      .prepare(
        `INSERT INTO orders (
          order_code, user_id, customer_name_snapshot, customer_phone_snapshot, customer_whatsapp, address_id,
          delivery_address_snapshot, delivery_date, subtotal, delivery_charge, gst_amount,
          coupon_code, discount_amount, total_amount, payment_method, payment_reference,
          payment_status, order_status, delivery_notes, estimated_delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Placed', ?, ?)`
      )
      .run(
        orderCode,
        req.user!.userId,
        customer_name || req.user!.name,
        cleanPhone,
        cleanWhatsapp,
        address_id || null,
        delivery_address_text || '',
        delivery_date || new Date().toISOString().slice(0, 10),
        Number(subtotal),
        Number(delivery_charge),
        Number(gst_amount),
        coupon_code || '',
        Number(discount_amount || 0),
        Number(total_amount),
        payment_method || 'Cash on Delivery',
        payment_reference || '',
        paymentStatus,
        delivery_notes || '',
        delivery_date ? `Scheduled: ${delivery_date}` : 'Within 35 - 45 Mins'
      );

    const orderId = Number(orderRes.lastInsertRowid);
    const itemStmt = db.prepare(
      `INSERT INTO order_items (order_id, item_type, product_id, plan_id, item_name, variant_name, unit_price, quantity, total_price, image_key, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const decStockStmt = db.prepare('UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?');

    for (const item of items) {
      itemStmt.run(
        orderId,
        item.item_type || 'product',
        item.product_id || null,
        item.plan_id || null,
        item.name,
        item.variant_name || '',
        Number(item.unit_price),
        Number(item.quantity),
        Number(item.unit_price) * Number(item.quantity),
        item.image_key || 'hero_bowl',
        JSON.stringify(item.meta || {})
      );

      if (item.item_type === 'product' && item.product_id) {
        decStockStmt.run(Number(item.quantity), Number(item.product_id));
      }

      if (item.item_type === 'subscription' && item.plan_id) {
        const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(item.plan_id) as any;
        const startDate = item.meta?.startDate || delivery_date || new Date().toISOString().slice(0, 10);
        const endObj = new Date(startDate);
        endObj.setDate(endObj.getDate() + (plan ? plan.duration_days : 7));
        const endDate = endObj.toISOString().slice(0, 10);
        const subCode = 'SUB-TP' + Math.floor(100 + Math.random() * 899);

        db.prepare(
          `INSERT INTO subscriptions (
            subscription_code, user_id, plan_id, menu_preference, selected_meals, is_veg_only,
            start_date, end_date, delivery_slot, address_id, status, total_paid, payment_method
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)`
        ).run(
          subCode,
          req.user!.userId,
          item.plan_id,
          item.meta?.menuPreference || 'Diet Menu',
          item.meta?.selectedMeals || 'Breakfast, Lunch, Snacks, Dinner',
          item.meta?.isVegOnly ? 1 : 0,
          startDate,
          endDate,
          item.meta?.deliverySlot || '8:00 AM - 10:00 AM',
          address_id || null,
          Number(item.unit_price) * Number(item.quantity),
          payment_method || 'Cash on Delivery'
        );
      }
    }

    if (coupon_code) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE UPPER(code) = UPPER(?)').run(coupon_code);
      db.prepare('UPDATE offers SET used_count = used_count + 1 WHERE UPPER(coupon_code) = UPPER(?)').run(coupon_code);
    }

    db.prepare(
      'INSERT INTO payments (transaction_id, user_id, order_id, amount, method, gateway_reference, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      'TXN-' + orderCode,
      req.user!.userId,
      orderId,
      Number(total_amount),
      payment_method || 'Cash on Delivery',
      payment_reference || '',
      paymentStatus
    );

    db.prepare('INSERT INTO delivery_tracking (order_id, status, location_note, updated_by) VALUES (?, ?, ?, ?)').run(
      orderId,
      'Placed',
      'Order received by TrimPlate Central Kitchen',
      req.user!.name
    );

    db.prepare('UPDATE customers SET total_orders = total_orders + 1 WHERE user_id = ?').run(req.user!.userId);

    const cleanCustomerName = String(customer_name || req.user!.name || 'Customer').trim();
    const cleanCustomerPhone = cleanPhone;
    const orderItemsMeta = items.map((it: any) => ({
      name: String(it.name || 'Menu Item'),
      variant: String(it.variant_name || ''),
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.unit_price || 0),
    }));
    const itemsSummary = orderItemsMeta
      .map((it) => `${it.quantity}× ${it.name}${it.variant ? ` (${it.variant})` : ''}`)
      .join(', ');
    const totalItemQty = orderItemsMeta.reduce((acc, it) => acc + it.quantity, 0);

    // Build Store & Customer WhatsApp Order Routing Links
    const settingsMap = getSettingsMap();
    const normalizeWa = (raw: string) => {
      const d = String(raw || '').replace(/\D/g, '');
      if (!d) return '';
      if (d.length === 10) return `91${d}`;
      if (d.length === 11 && d.startsWith('0')) return `91${d.slice(1)}`;
      return d;
    };
    const storeWhatsappDigits =
      normalizeWa(settingsMap.whatsapp_order_number || settingsMap.phone) || '919830045120';
    const customerWhatsappDigits = normalizeWa(cleanWhatsapp || cleanCustomerPhone);

    const whatsappReceiptLines = [
      `*TrimPlate Order #${orderCode}*`,
      `Customer: ${cleanCustomerName}`,
      `Phone: ${cleanCustomerPhone || '—'}`,
      `WhatsApp: ${cleanWhatsapp || cleanCustomerPhone || '—'}`,
      `Delivery Date: ${delivery_date || new Date().toISOString().slice(0, 10)}`,
      `Address: ${delivery_address_text || '—'}`,
      ``,
      `*Items (${totalItemQty}):*`,
      ...orderItemsMeta.map(
        (it) =>
          `• ${it.quantity} × ${it.name}${it.variant ? ` (${it.variant})` : ''} — ₹${Math.round(
            it.unit_price * it.quantity
          )}`
      ),
      ``,
      `*Grand Total: ₹${Math.round(Number(total_amount))}*`,
      `Payment: ${payment_method || 'Cash on Delivery'} (${paymentStatus})${
        payment_reference ? ` · Ref: ${payment_reference}` : ''
      }`,
      ...(delivery_notes ? [`Notes: ${delivery_notes}`] : []),
    ];
    const whatsappMessage = whatsappReceiptLines.join('\n');
    const whatsappOrderUrl = `https://wa.me/${storeWhatsappDigits}?text=${encodeURIComponent(
      whatsappMessage
    )}`;
    const customerReplyText = `Hello ${cleanCustomerName}, your TrimPlate Order #${orderCode} (${itemsSummary}) totaling ₹${Math.round(
      Number(total_amount)
    )} has been received by our kitchen! We will notify you once it is out for delivery.`;
    const customerWhatsappReplyUrl = customerWhatsappDigits
      ? `https://wa.me/${customerWhatsappDigits}?text=${encodeURIComponent(customerReplyText)}`
      : '';

    const notifMeta = {
      orderId,
      orderCode,
      customerName: cleanCustomerName,
      customerPhone: cleanCustomerPhone,
      customerWhatsapp: cleanWhatsapp,
      storeWhatsappNumber: storeWhatsappDigits,
      whatsappOrderUrl,
      customerWhatsappReplyUrl,
      totalAmount: Number(total_amount),
      paymentMethod: payment_method || 'Cash on Delivery',
      deliveryAddress: delivery_address_text || '',
      itemCount: totalItemQty,
      itemsSummary,
      items: orderItemsMeta,
    };

    const notifRes = db
      .prepare(
        `INSERT INTO notifications (
          user_id, role_target, title, message, type, reference_type, reference_id, reference_code, is_read, meta_json
        ) VALUES (?, 'admin', ?, ?, 'order', 'order', ?, ?, 0, ?)`
      )
      .run(
        req.user!.userId,
        `New Item Order #${orderCode} · ₹${Number(total_amount)}`,
        `${cleanCustomerName} (WhatsApp: ${cleanWhatsapp || cleanCustomerPhone || 'N/A'}) ordered ${itemsSummary} (${payment_method || 'Cash on Delivery'}).`,
        orderId,
        orderCode,
        JSON.stringify(notifMeta)
      );

    broadcastEvent('order_created', {
      notificationId: Number(notifRes.lastInsertRowid),
      orderId,
      orderCode,
      customer: cleanCustomerName,
      customerPhone: cleanCustomerPhone,
      customerWhatsapp: cleanWhatsapp,
      storeWhatsappNumber: storeWhatsappDigits,
      whatsappOrderUrl,
      customerWhatsappReplyUrl,
      total: Number(total_amount),
      paymentMethod: payment_method || 'Cash on Delivery',
      itemCount: totalItemQty,
      itemsSummary,
      items: orderItemsMeta,
    });

    // Optional non-blocking server-side WhatsApp Webhook / Cloud API bridge dispatch
    const webhookUrl = String(process.env.WHATSAPP_WEBHOOK_URL || '').trim();
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'trimplate.order.placed',
          orderCode,
          storeWhatsappNumber: storeWhatsappDigits,
          customerName: cleanCustomerName,
          customerPhone: cleanCustomerPhone,
          customerWhatsapp: cleanWhatsapp,
          totalAmount: Number(total_amount),
          paymentMethod: payment_method || 'Cash on Delivery',
          paymentStatus,
          deliveryAddress: delivery_address_text || '',
          items: orderItemsMeta,
          formattedMessage: whatsappMessage,
        }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => {
        // Non-blocking: never fail customer checkout if external webhook is unreachable
      });
    }

    res.status(201).json({
      orderId,
      orderCode,
      paymentStatus,
      customerWhatsapp: cleanWhatsapp,
      storeWhatsappNumber: storeWhatsappDigits,
      whatsappMessage,
      whatsappOrderUrl,
    });
  });

  app.patch('/api/orders/:id/status', authenticate, (req, res) => {
    const { order_status, payment_status, assigned_staff_id, note } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (req.user!.role !== 'admin') {
      if (order.user_id !== req.user!.userId || order_status !== 'Cancelled' || order.order_status !== 'Placed') {
        res.status(403).json({ error: 'Orders can only be cancelled before kitchen preparation starts.' });
        return;
      }
    }

    const nextStatus = order_status || order.order_status;
    const nextPayStatus = payment_status || order.payment_status;
    const nextStaff = assigned_staff_id !== undefined ? assigned_staff_id : order.assigned_staff_id;

    db.prepare('UPDATE orders SET order_status = ?, payment_status = ?, assigned_staff_id = ? WHERE id = ?').run(
      nextStatus,
      nextPayStatus,
      nextStaff || null,
      order.id
    );

    if (order_status && order_status !== order.order_status) {
      db.prepare('INSERT INTO delivery_tracking (order_id, status, location_note, updated_by) VALUES (?, ?, ?, ?)').run(
        order.id,
        nextStatus,
        note || `Order status updated to ${nextStatus}`,
        req.user!.name
      );
    }

    if (nextPayStatus === 'Paid') {
      db.prepare("UPDATE payments SET status = 'Completed' WHERE order_id = ?").run(order.id);
    }

    broadcastEvent('order_status_updated', {
      orderId: order.id,
      orderCode: order.order_code,
      status: nextStatus,
      paymentStatus: nextPayStatus,
    });

    res.json({ success: true });
  });

  // ==================== 100% REAL SQL ADMIN ANALYTICS (ZERO STATIC DEMO ARRAYS!) ====================
  app.get('/api/admin/dashboard', authenticate, requireAdmin, (_req, res) => {
    const totalRevenue = (
      db.prepare("SELECT COALESCE(SUM(total_amount), 0) as v FROM orders WHERE order_status != 'Cancelled'").get() as any
    ).v;
    const todayRevenue = (
      db
        .prepare(
          "SELECT COALESCE(SUM(total_amount), 0) as v FROM orders WHERE order_status != 'Cancelled' AND date(created_at) = date('now')"
        )
        .get() as any
    ).v;
    const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
    const pendingOrders = (
      db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status IN ('Placed', 'Preparing', 'Out for Delivery')").get() as any
    ).c;
    const completedOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'Delivered'").get() as any).c;
    const totalCustomers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role_id = 2').get() as any).c;
    const activeSubscriptions = (db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'Active'").get() as any).c;
    const newCustomers = (
      db.prepare("SELECT COUNT(*) as c FROM users WHERE role_id = 2 AND date(created_at) >= date('now', '-30 days')").get() as any
    ).c;

    const dailyRevenue = db
      .prepare(
        `SELECT date(created_at) as day,
                ROUND(SUM(CASE WHEN order_status != 'Cancelled' THEN total_amount ELSE 0 END), 2) as revenue,
                COUNT(*) as orders
         FROM orders
         GROUP BY date(created_at)
         ORDER BY day ASC
         LIMIT 14`
      )
      .all();

    const monthlyRevenue = db
      .prepare(
        `SELECT strftime('%Y-%m', created_at) as month,
                ROUND(SUM(CASE WHEN order_status != 'Cancelled' THEN total_amount ELSE 0 END), 2) as revenue,
                COUNT(*) as orders
         FROM orders
         GROUP BY strftime('%Y-%m', created_at)
         ORDER BY month ASC`
      )
      .all();

    const orderStats = db
      .prepare(
        `SELECT order_status as status, COUNT(*) as count
         FROM orders GROUP BY order_status`
      )
      .all();

    const subscriptionGrowth = db
      .prepare(
        `SELECT strftime('%Y-%m', created_at) as month,
                COUNT(*) as subscriptions,
                ROUND(SUM(total_paid), 2) as revenue
         FROM subscriptions
         GROUP BY strftime('%Y-%m', created_at)
         ORDER BY month ASC`
      )
      .all();

    const topSellingProducts = db
      .prepare(
        `SELECT p.id, p.name, p.menu_division, p.price, p.stock_qty, c.name as category_name,
                COALESCE(SUM(oi.quantity), 0) as units_sold,
                COALESCE(SUM(oi.total_price), 0) as gross_sales
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN order_items oi ON oi.product_id = p.id
         GROUP BY p.id
         ORDER BY units_sold DESC, p.id ASC
         LIMIT 8`
      )
      .all();

    const categoryPerformance = db
      .prepare(
        `SELECT c.name as category, c.menu_division,
                COUNT(DISTINCT p.id) as product_count,
                COALESCE(SUM(oi.total_price), 0) as revenue
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         LEFT JOIN order_items oi ON oi.product_id = p.id
         GROUP BY c.id
         ORDER BY revenue DESC, product_count DESC
         LIMIT 8`
      )
      .all();

    const recentOrders = db
      .prepare(
        `SELECT o.id, o.order_code, o.total_amount, o.order_status, o.payment_status, o.created_at, u.name as customer_name
         FROM orders o JOIN users u ON u.id = o.user_id
         ORDER BY o.id DESC LIMIT 6`
      )
      .all();

    const recentCustomers = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.mobile, u.created_at, c.dietary_preference, c.total_orders
         FROM users u LEFT JOIN customers c ON c.user_id = u.id
         WHERE u.role_id = 2 ORDER BY u.id DESC LIMIT 6`
      )
      .all();

    const latestSubscriptions = db
      .prepare(
        `SELECT s.id, s.subscription_code, s.menu_preference, s.status, s.total_paid, s.start_date,
                sp.name as plan_name, u.name as customer_name
         FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.plan_id
         JOIN users u ON u.id = s.user_id
         ORDER BY s.id DESC LIMIT 6`
      )
      .all();

    const lowStockProducts = db
      .prepare(
        `SELECT p.id, p.name, p.menu_division, p.stock_qty, p.price, c.name as category_name
         FROM products p JOIN categories c ON c.id = p.category_id
         WHERE p.stock_qty <= 15
         ORDER BY p.stock_qty ASC LIMIT 8`
      )
      .all();

    const pendingConsultations = (
      db.prepare("SELECT COUNT(*) as c FROM dietitian_consultations WHERE status = 'Pending'").get() as any
    ).c;
    const totalDietitians = (
      db.prepare('SELECT COUNT(*) as c FROM dietitians WHERE is_active = 1').get() as any
    ).c;

    res.json({
      summary: {
        totalRevenue,
        todayRevenue,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalCustomers,
        activeSubscriptions,
        newCustomers,
        pendingConsultations,
        totalDietitians,
      },
      dailyRevenue,
      monthlyRevenue,
      orderStats,
      subscriptionGrowth,
      topSellingProducts,
      categoryPerformance,
      recentOrders,
      recentCustomers,
      latestSubscriptions,
      lowStockProducts,
    });
  });

  // ==================== CUSTOMERS, PAYMENTS, STAFF, REVIEWS, NOTIFICATIONS, SETTINGS ====================
  app.get('/api/customers', authenticate, requireAdmin, (_req, res) => {
    const customers = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.mobile, u.status, u.created_at,
                c.dietary_preference, c.fitness_goal, c.wallet_balance, c.total_orders,
                (SELECT COUNT(*) FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'Active') as active_subs,
                (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = u.id AND o.order_status != 'Cancelled') as lifetime_spend
         FROM users u
         LEFT JOIN customers c ON c.user_id = u.id
         WHERE u.role_id = 2
         ORDER BY u.id DESC`
      )
      .all();
    res.json(customers);
  });

  app.get('/api/customers/:id/details', authenticate, requireAdmin, (req, res) => {
    const userId = Number(req.params.id);
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(userId);
    const subscriptions = db
      .prepare(
        `SELECT s.*, sp.name as plan_name, sp.subtitle as plan_subtitle
         FROM subscriptions s JOIN subscription_plans sp ON sp.id = s.plan_id
         WHERE s.user_id = ? ORDER BY s.id DESC`
      )
      .all(userId);
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(userId);
    res.json({ orders, subscriptions, addresses });
  });

  app.get('/api/payments', authenticate, (req, res) => {
    const isAdmin = req.user!.role === 'admin' && req.query.scope === 'all';
    const sql = isAdmin
      ? `SELECT p.*, u.name as customer_name, o.order_code
         FROM payments p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN orders o ON o.id = p.order_id
         ORDER BY p.id DESC`
      : `SELECT p.*, o.order_code
         FROM payments p
         LEFT JOIN orders o ON o.id = p.order_id
         WHERE p.user_id = ?
         ORDER BY p.id DESC`;
    res.json(isAdmin ? db.prepare(sql).all() : db.prepare(sql).all(req.user!.userId));
  });

  app.get('/api/staff', authenticate, requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM staff ORDER BY id ASC').all());
  });

  app.post('/api/staff', authenticate, requireAdmin, (req, res) => {
    const { name, role, mobile, email, vehicle_number, zone } = req.body;
    const info = db
      .prepare('INSERT INTO staff (name, role, mobile, email, vehicle_number, zone) VALUES (?, ?, ?, ?, ?, ?)')
      .run(name, role || 'Delivery Partner', mobile, email || '', vehicle_number || '', zone || 'Central Kolkata');
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.delete('/api/staff/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/reviews', (req, res) => {
    const { product_id } = req.query;
    const params: any[] = [];
    let sql = `
      SELECT r.*, p.name as product_name, p.slug as product_slug
      FROM reviews r
      LEFT JOIN products p ON p.id = r.product_id
      WHERE r.is_approved = 1
    `;
    if (product_id) {
      sql += ' AND r.product_id = ?';
      params.push(Number(product_id));
    }
    sql += ' ORDER BY r.id DESC';
    res.json(db.prepare(sql).all(...params));
  });

  app.get('/api/reviews/my', authenticate, (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT r.*, p.name as product_name, p.slug as product_slug, o.order_code
           FROM reviews r
           LEFT JOIN products p ON p.id = r.product_id
           LEFT JOIN orders o ON o.id = r.order_id
           WHERE r.user_id = ?
           ORDER BY r.id DESC`
        )
        .all(req.user!.userId)
    );
  });

  app.post('/api/reviews', authenticate, (req, res) => {
    const authUser = req.user!;
    const { product_id, order_id, order_item_id, reviewer_location, rating, comment } = req.body;
    const cleanName = String(authUser.name || '').trim();
    const rawComment = String(comment || '').trim();
    const cleanLocation = String(reviewer_location || 'Kolkata').trim() || 'Kolkata';
    const numericRating = Math.min(5, Math.max(1, Math.round(Number(rating || 5))));

    if (!order_id || Number.isNaN(Number(order_id))) {
      res.status(400).json({
        error: 'Please select a valid order from your account.',
      });
      return;
    }

    const orderRow = db
      .prepare('SELECT id, order_code, order_status FROM orders WHERE id = ? AND user_id = ?')
      .get(Number(order_id), authUser.userId) as
      | { id: number; order_code: string; order_status: string }
      | undefined;

    if (!orderRow) {
      res.status(403).json({ error: 'Selected order was not found in your account.' });
      return;
    }
    if (orderRow.order_status === 'Cancelled') {
      res.status(400).json({ error: 'Cancelled orders cannot be reviewed.' });
      return;
    }

    // Resolve individual order item & product so each ordered item can be reviewed individually once
    let resolvedOrderItemId: number | null =
      order_item_id && !Number.isNaN(Number(order_item_id)) ? Number(order_item_id) : null;
    let resolvedProductId: number | null =
      product_id && !Number.isNaN(Number(product_id)) ? Number(product_id) : null;

    if (resolvedOrderItemId) {
      const itemRow = db
        .prepare('SELECT id, product_id, item_name FROM order_items WHERE id = ? AND order_id = ?')
        .get(resolvedOrderItemId, orderRow.id) as
        | { id: number; product_id: number | null; item_name: string }
        | undefined;
      if (itemRow) {
        if (!resolvedProductId && itemRow.product_id) {
          resolvedProductId = itemRow.product_id;
        }
      } else {
        resolvedOrderItemId = null;
      }
    } else if (resolvedProductId) {
      const matchingItem = db
        .prepare('SELECT id FROM order_items WHERE order_id = ? AND product_id = ? LIMIT 1')
        .get(orderRow.id, resolvedProductId) as { id: number } | undefined;
      if (matchingItem) {
        resolvedOrderItemId = matchingItem.id;
      }
    } else {
      const firstUnreviewedItem = db
        .prepare(
          `SELECT oi.id, oi.product_id
           FROM order_items oi
           WHERE oi.order_id = ?
             AND NOT EXISTS (
               SELECT 1 FROM reviews r
               WHERE r.user_id = ? AND r.order_id = ?
                 AND (
                   (oi.product_id IS NOT NULL AND r.product_id = oi.product_id)
                   OR (r.order_item_id = oi.id)
                 )
             )
           LIMIT 1`
        )
        .get(orderRow.id, authUser.userId, orderRow.id) as
        | { id: number; product_id: number | null }
        | undefined;
      if (firstUnreviewedItem) {
        resolvedOrderItemId = firstUnreviewedItem.id;
        resolvedProductId = firstUnreviewedItem.product_id;
      }
    }

    // Check individual one-time review lock for this specific item / product in this order
    let alreadyReviewed = false;
    if (resolvedProductId) {
      const dupProd = db
        .prepare('SELECT id FROM reviews WHERE order_id = ? AND user_id = ? AND product_id = ?')
        .get(orderRow.id, authUser.userId, resolvedProductId);
      if (dupProd) alreadyReviewed = true;
    }
    if (!alreadyReviewed && resolvedOrderItemId) {
      const dupItem = db
        .prepare('SELECT id FROM reviews WHERE order_id = ? AND user_id = ? AND order_item_id = ?')
        .get(orderRow.id, authUser.userId, resolvedOrderItemId);
      if (dupItem) alreadyReviewed = true;
    }
    if (!alreadyReviewed && !resolvedProductId && !resolvedOrderItemId) {
      const dupGeneral = db
        .prepare('SELECT id FROM reviews WHERE order_id = ? AND user_id = ? AND product_id IS NULL')
        .get(orderRow.id, authUser.userId);
      if (dupGeneral) alreadyReviewed = true;
    }

    if (alreadyReviewed) {
      res.status(400).json({
        error: 'Thank you — you have already submitted your review for this item in this order.',
      });
      return;
    }

    const prodRow = resolvedProductId
      ? (db.prepare('SELECT id, name FROM products WHERE id = ?').get(resolvedProductId) as
          | { id: number; name: string }
          | undefined)
      : undefined;

    const cleanComment =
      rawComment.length > 0
        ? rawComment
        : prodRow
        ? `Enjoyed ${prodRow.name} — fresh ingredients and balanced flavors.`
        : `Great experience with Order #${orderRow.order_code}.`;

    // Publish immediately (is_approved = 1) — NO "Pending Approval" state!
    const result = db
      .prepare(
        `INSERT INTO reviews (
          user_id, product_id, order_id, order_item_id, customer_name, reviewer_location, review_source,
          rating, comment, show_on_home, is_approved
        ) VALUES (?, ?, ?, ?, ?, ?, 'Website', ?, ?, 1, 1)`
      )
      .run(
        authUser.userId,
        prodRow ? prodRow.id : null,
        orderRow.id,
        resolvedOrderItemId,
        cleanName,
        cleanLocation,
        numericRating,
        cleanComment
      );

    const targetLabel = prodRow ? prodRow.name : `Order #${orderRow.order_code}`;
    broadcastEvent('review_updated', {
      id: result.lastInsertRowid,
      customer_name: cleanName,
      rating: numericRating,
      target: targetLabel,
      order_code: orderRow.order_code,
    });

    res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      status: 'published',
      message: 'Thank you for your review!',
    });
  });

  // Customer reviews are strictly non-editable once submitted
  app.put('/api/reviews/:id', authenticate, (_req, res) => {
    res.status(403).json({
      error: 'Submitted reviews are final and cannot be edited.',
    });
  });
  app.patch('/api/reviews/:id', authenticate, (_req, res) => {
    res.status(403).json({
      error: 'Submitted reviews are final and cannot be edited.',
    });
  });
  app.delete('/api/reviews/:id', authenticate, (_req, res) => {
    res.status(403).json({
      error: 'Submitted reviews are final and cannot be deleted.',
    });
  });

  // Admin Review Moderation & Google Review Management
  app.get('/api/admin/reviews', authenticate, requireAdmin, (_req, res) => {
    const rows = db
      .prepare(
        `SELECT r.*, p.name as product_name, p.slug as product_slug, o.order_code
         FROM reviews r
         LEFT JOIN products p ON p.id = r.product_id
         LEFT JOIN orders o ON o.id = r.order_id
         ORDER BY r.is_approved ASC, r.id DESC`
      )
      .all();
    res.json(rows);
  });

  app.post('/api/admin/reviews', authenticate, requireAdmin, (req, res) => {
    const r = req.body;
    const numericRating = Math.min(5, Math.max(1, Math.round(Number(r.rating || 5))));
    const info = db
      .prepare(
        `INSERT INTO reviews (
          user_id, product_id, customer_name, reviewer_location, review_source,
          rating, comment, admin_reply, show_on_home, is_approved
        ) VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        r.product_id ? Number(r.product_id) : null,
        String(r.customer_name || 'Verified Reviewer').trim(),
        String(r.reviewer_location || 'Kolkata').trim(),
        r.review_source || 'Google',
        numericRating,
        String(r.comment || '').trim(),
        String(r.admin_reply || '').trim(),
        r.show_on_home === 0 || r.show_on_home === false ? 0 : 1,
        r.is_approved === 0 || r.is_approved === false ? 0 : 1
      );
    logAudit(req.user!.userId, 'CREATE_REVIEW', 'review', String(info.lastInsertRowid), r.customer_name);
    broadcastEvent('review_updated', { id: info.lastInsertRowid });
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.patch('/api/admin/reviews/:id', authenticate, requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const nextApproved =
      req.body.is_approved !== undefined ? (req.body.is_approved ? 1 : 0) : existing.is_approved;
    const nextShowHome =
      req.body.show_on_home !== undefined ? (req.body.show_on_home ? 1 : 0) : existing.show_on_home;
    const nextRating =
      req.body.rating !== undefined
        ? Math.min(5, Math.max(1, Math.round(Number(req.body.rating))))
        : existing.rating;
    const nextComment =
      req.body.comment !== undefined ? String(req.body.comment).trim() : existing.comment;
    const nextReply =
      req.body.admin_reply !== undefined ? String(req.body.admin_reply).trim() : existing.admin_reply || '';
    const nextLocation =
      req.body.reviewer_location !== undefined
        ? String(req.body.reviewer_location).trim()
        : existing.reviewer_location || 'Kolkata';
    const nextSource =
      req.body.review_source !== undefined ? String(req.body.review_source) : existing.review_source || 'Website';
    const nextName =
      req.body.customer_name !== undefined ? String(req.body.customer_name).trim() : existing.customer_name;

    db.prepare(
      `UPDATE reviews
       SET customer_name = ?, reviewer_location = ?, review_source = ?, rating = ?, comment = ?,
           admin_reply = ?, show_on_home = ?, is_approved = ?
       WHERE id = ?`
    ).run(
      nextName,
      nextLocation,
      nextSource,
      nextRating,
      nextComment,
      nextReply,
      nextShowHome,
      nextApproved,
      existing.id
    );

    if (existing.is_approved === 0 && nextApproved === 1 && existing.user_id > 0) {
      db.prepare(
        "INSERT INTO notifications (user_id, role_target, title, message, type) VALUES (?, 'customer', ?, ?, 'review')"
      ).run(
        existing.user_id,
        'Your Review is Approved & Live!',
        `Thank you ${nextName}! Your ${nextRating}★ review has been approved by TrimPlate Admin and is now visible on the website.`
      );
    }

    logAudit(
      req.user!.userId,
      nextApproved ? 'APPROVE_REVIEW' : 'HIDE_REVIEW',
      'review',
      String(existing.id),
      `${nextName} (${nextRating}★)`
    );
    broadcastEvent('review_updated', { id: existing.id, is_approved: nextApproved });
    res.json({ success: true, is_approved: nextApproved });
  });

  app.delete('/api/admin/reviews/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    broadcastEvent('review_updated', { id: Number(req.params.id), deleted: true });
    res.json({ success: true });
  });

  // ==================== DIETITIANS & 1-ON-1 CONSULTATIONS ====================
  app.get('/api/dietitians', (_req, res) => {
    const rows = db
      .prepare('SELECT * FROM dietitians WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
      .all()
      .map((d: any) => ({
        ...d,
        is_active: Boolean(d.is_active),
        free_with_subscription: Boolean(d.free_with_subscription),
      }));
    res.json(rows);
  });

  app.post('/api/dietitian-consultations', (req, res) => {
    const {
      dietitian_id,
      customer_name,
      customer_phone,
      customer_email,
      health_goal,
      dietary_preference,
      consultation_mode,
      preferred_date,
      preferred_slot,
      notes,
    } = req.body || {};

    const cleanName = String(customer_name || '').trim();
    const cleanPhone = String(customer_phone || '').trim();
    const cleanEmail = String(customer_email || '').trim();
    const cleanDate = String(preferred_date || '').trim();
    const cleanSlot = String(preferred_slot || '').trim();

    if (!cleanName || cleanPhone.length < 8 || !cleanDate || !cleanSlot) {
      res.status(400).json({
        error: 'Please enter your name, valid phone number, preferred date, and time slot.',
      });
      return;
    }

    // Optional authenticated user detection
    let authUserId: number | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as AuthPayload;
        authUserId = decoded.userId;
      } catch {
        authUserId = null;
      }
    }

    const dietitianRow = dietitian_id
      ? (db.prepare('SELECT * FROM dietitians WHERE id = ?').get(Number(dietitian_id)) as any)
      : (db.prepare('SELECT * FROM dietitians WHERE is_active = 1 ORDER BY sort_order ASC LIMIT 1').get() as any);

    const resolvedDietitianId = dietitianRow ? Number(dietitianRow.id) : null;
    const resolvedDietitianName = dietitianRow ? String(dietitianRow.name) : 'Senior TrimPlate Dietitian';

    // Check if customer has an active 15-day or 30-day (or any active) subscription for complimentary consultation
    let hasActiveSub = 0;
    if (authUserId) {
      const subRow = db
        .prepare("SELECT id FROM subscriptions WHERE user_id = ? AND status = 'Active' LIMIT 1")
        .get(authUserId);
      if (subRow) hasActiveSub = 1;
    }

    const baseFee = dietitianRow ? Number(dietitianRow.consultation_fee || 299) : 299;
    const freeWithSub = dietitianRow ? Boolean(dietitianRow.free_with_subscription) : true;
    const finalFee = hasActiveSub && freeWithSub ? 0 : baseFee;

    const bookingCode = 'DT' + Math.floor(10000 + Math.random() * 90000);
    const cleanGoal = String(health_goal || 'Weight & Fat Loss').trim();
    const cleanPref = String(dietary_preference || 'Both').trim();
    const cleanMode = String(consultation_mode || 'Video Call').trim();
    const cleanNotes = String(notes || '').trim();

    const insertRes = db
      .prepare(
        `INSERT INTO dietitian_consultations (
          booking_code, dietitian_id, dietitian_name, user_id, customer_name, customer_phone,
          customer_email, health_goal, dietary_preference, consultation_mode, preferred_date,
          preferred_slot, has_active_subscription, fee_amount, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`
      )
      .run(
        bookingCode,
        resolvedDietitianId,
        resolvedDietitianName,
        authUserId,
        cleanName,
        cleanPhone,
        cleanEmail,
        cleanGoal,
        cleanPref,
        cleanMode,
        cleanDate,
        cleanSlot,
        hasActiveSub,
        finalFee,
        cleanNotes
      );

    const bookingId = Number(insertRes.lastInsertRowid);
    const metaPayload = {
      bookingId,
      bookingCode,
      customerName: cleanName,
      customerPhone: cleanPhone,
      dietitianName: resolvedDietitianName,
      healthGoal: cleanGoal,
      preferredDate: cleanDate,
      preferredSlot: cleanSlot,
      consultationMode: cleanMode,
      totalAmount: finalFee,
    };

    db.prepare(
      `INSERT INTO notifications (
        user_id, role_target, title, message, type, reference_type, reference_id, reference_code, is_read, meta_json
      ) VALUES (?, 'admin', ?, ?, 'dietitian', 'dietitian', ?, ?, 0, ?)`
    ).run(
      authUserId,
      `New Dietitian Booking #${bookingCode} · ${resolvedDietitianName}`,
      `${cleanName} (${cleanPhone}) booked a ${cleanMode} for ${cleanGoal} on ${cleanDate} (${cleanSlot}).`,
      bookingId,
      bookingCode,
      JSON.stringify(metaPayload)
    );

    broadcastEvent('dietitian_booking_created', metaPayload);

    res.status(201).json({
      success: true,
      id: bookingId,
      bookingCode,
      dietitianName: resolvedDietitianName,
      preferredDate: cleanDate,
      preferredSlot: cleanSlot,
      consultationMode: cleanMode,
      feeAmount: finalFee,
      hasActiveSubscription: Boolean(hasActiveSub),
    });
  });

  app.get('/api/dietitian-consultations/my', authenticate, (req, res) => {
    const rows = db
      .prepare('SELECT * FROM dietitian_consultations WHERE user_id = ? ORDER BY id DESC')
      .all(req.user!.userId);
    res.json(rows);
  });

  app.get('/api/admin/dietitians', authenticate, requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM dietitians ORDER BY sort_order ASC, id ASC').all());
  });

  app.post('/api/admin/dietitians', authenticate, requireAdmin, (req, res) => {
    const d = req.body || {};
    const name = String(d.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Dietitian name is required' });
      return;
    }
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString().slice(-4);
    const maxSort = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM dietitians').get() as any).m;

    const info = db
      .prepare(
        `INSERT INTO dietitians (
          name, slug, credentials, specialization, experience_years, languages, bio,
          consultation_fee, free_with_subscription, available_days, available_slots,
          image_url, rating, consultations_count, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        slug,
        String(d.credentials || 'M.Sc. Clinical Nutrition').trim(),
        String(d.specialization || 'Weight Management & Balanced Nutrition').trim(),
        Number(d.experience_years || 5),
        String(d.languages || 'English, Bengali, Hindi').trim(),
        String(d.bio || '').trim(),
        Number(d.consultation_fee ?? 299),
        d.free_with_subscription === false || d.free_with_subscription === 0 ? 0 : 1,
        String(d.available_days || 'Mon – Sat').trim(),
        String(d.available_slots || '10:00 AM – 2:00 PM, 4:30 PM – 7:30 PM').trim(),
        String(d.image_url || 'dietitian_ananya').trim(),
        Math.min(5, Math.max(4, Number(d.rating || 4.9))),
        Number(d.consultations_count || 120),
        Number(d.sort_order || maxSort + 1),
        d.is_active === false || d.is_active === 0 ? 0 : 1
      );
    logAudit(req.user!.userId, 'CREATE_DIETITIAN', 'dietitian', String(info.lastInsertRowid), name);
    broadcastEvent('site_settings_updated', { section: 'dietitians' });
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/admin/dietitians/:id', authenticate, requireAdmin, (req, res) => {
    const d = req.body || {};
    db.prepare(
      `UPDATE dietitians SET
        name = ?, credentials = ?, specialization = ?, experience_years = ?, languages = ?, bio = ?,
        consultation_fee = ?, free_with_subscription = ?, available_days = ?, available_slots = ?,
        image_url = ?, rating = ?, consultations_count = ?, sort_order = ?, is_active = ?
       WHERE id = ?`
    ).run(
      String(d.name || '').trim(),
      String(d.credentials || '').trim(),
      String(d.specialization || '').trim(),
      Number(d.experience_years || 5),
      String(d.languages || 'English, Bengali, Hindi').trim(),
      String(d.bio || '').trim(),
      Number(d.consultation_fee ?? 299),
      d.free_with_subscription === false || d.free_with_subscription === 0 ? 0 : 1,
      String(d.available_days || 'Mon – Sat').trim(),
      String(d.available_slots || '').trim(),
      String(d.image_url || 'dietitian_ananya').trim(),
      Math.min(5, Math.max(1, Number(d.rating || 4.9))),
      Number(d.consultations_count || 100),
      Number(d.sort_order || 1),
      d.is_active === false || d.is_active === 0 ? 0 : 1,
      req.params.id
    );
    logAudit(req.user!.userId, 'UPDATE_DIETITIAN', 'dietitian', String(req.params.id), String(d.name || ''));
    broadcastEvent('site_settings_updated', { section: 'dietitians' });
    res.json({ success: true });
  });

  app.patch('/api/admin/dietitians/:id/toggle', authenticate, requireAdmin, (req, res) => {
    const row = db.prepare('SELECT id, name, is_active FROM dietitians WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      res.status(404).json({ error: 'Dietitian not found' });
      return;
    }
    const nextActive =
      req.body?.is_active !== undefined ? (req.body.is_active ? 1 : 0) : row.is_active ? 0 : 1;
    db.prepare('UPDATE dietitians SET is_active = ? WHERE id = ?').run(nextActive, row.id);
    broadcastEvent('site_settings_updated', { section: 'dietitians' });
    res.json({ success: true, is_active: nextActive });
  });

  app.delete('/api/admin/dietitians/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM dietitians WHERE id = ?').run(req.params.id);
    broadcastEvent('site_settings_updated', { section: 'dietitians' });
    res.json({ success: true });
  });

  app.get('/api/admin/dietitian-consultations', authenticate, requireAdmin, (_req, res) => {
    res.json(db.prepare('SELECT * FROM dietitian_consultations ORDER BY id DESC').all());
  });

  app.patch('/api/admin/dietitian-consultations/:id', authenticate, requireAdmin, (req, res) => {
    const existing = db
      .prepare('SELECT * FROM dietitian_consultations WHERE id = ?')
      .get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Consultation booking not found' });
      return;
    }
    const nextStatus = req.body.status || existing.status;
    const nextAdminNotes =
      req.body.admin_notes !== undefined ? String(req.body.admin_notes).trim() : existing.admin_notes || '';
    const nextDate = req.body.preferred_date || existing.preferred_date;
    const nextSlot = req.body.preferred_slot || existing.preferred_slot;
    let nextDietitianId =
      req.body.dietitian_id !== undefined ? req.body.dietitian_id : existing.dietitian_id;
    let nextDietitianName = req.body.dietitian_name || existing.dietitian_name;

    if (req.body.dietitian_id !== undefined && req.body.dietitian_id !== existing.dietitian_id) {
      const dRow = db.prepare('SELECT id, name FROM dietitians WHERE id = ?').get(Number(req.body.dietitian_id)) as any;
      if (dRow) {
        nextDietitianId = dRow.id;
        nextDietitianName = dRow.name;
      }
    }

    db.prepare(
      `UPDATE dietitian_consultations
       SET status = ?, admin_notes = ?, preferred_date = ?, preferred_slot = ?, dietitian_id = ?, dietitian_name = ?
       WHERE id = ?`
    ).run(
      nextStatus,
      nextAdminNotes,
      nextDate,
      nextSlot,
      nextDietitianId,
      nextDietitianName,
      existing.id
    );

    if (existing.user_id && nextStatus !== existing.status) {
      db.prepare(
        "INSERT INTO notifications (user_id, role_target, title, message, type) VALUES (?, 'customer', ?, ?, 'dietitian')"
      ).run(
        existing.user_id,
        `Dietitian Consultation #${existing.booking_code} — ${nextStatus}`,
        `Your consultation with ${nextDietitianName} on ${nextDate} (${nextSlot}) is now ${nextStatus}.${
          nextAdminNotes ? ` Note: ${nextAdminNotes}` : ''
        }`
      );
    }

    broadcastEvent('dietitian_booking_updated', { id: existing.id, status: nextStatus });
    res.json({ success: true, status: nextStatus });
  });

  app.delete('/api/admin/dietitian-consultations/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM dietitian_consultations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // ==================== NOTIFICATIONS ====================
  app.get('/api/notifications', authenticate, (req, res) => {
    const rawRows = (
      req.user!.role === 'admin'
        ? db.prepare("SELECT * FROM notifications WHERE role_target = 'admin' ORDER BY id DESC LIMIT 40").all()
        : db
            .prepare(
              "SELECT * FROM notifications WHERE user_id = ? OR (user_id IS NULL AND role_target = 'customer') ORDER BY id DESC LIMIT 30"
            )
            .all(req.user!.userId)
    ) as Array<any>;

    const enriched = rawRows.map((n) => {
      let meta = {};
      try {
        meta = JSON.parse(n.meta_json || '{}');
      } catch {
        meta = {};
      }
      return {
        ...n,
        meta,
      };
    });
    res.json(enriched);
  });

  app.patch('/api/notifications/:id/read', authenticate, (req, res) => {
    if (req.user!.role === 'admin') {
      db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND role_target = 'admin'").run(
        req.params.id
      );
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
        req.params.id,
        req.user!.userId
      );
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/mark-all-read', authenticate, (req, res) => {
    if (req.user!.role === 'admin') {
      db.prepare("UPDATE notifications SET is_read = 1 WHERE role_target = 'admin'").run();
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.userId);
    }
    res.json({ success: true });
  });

  app.delete('/api/notifications/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/settings', (_req, res) => {
    res.json(getSettingsMap());
  });

  app.put('/api/settings', authenticate, requireAdmin, (req, res) => {
    const upsert = db.prepare(
      'INSERT INTO website_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value'
    );
    for (const [k, v] of Object.entries(req.body || {})) {
      upsert.run(k, String(v ?? ''));
    }
    broadcastEvent('site_settings_updated', {});
    res.json({ success: true });
  });

  // ==================== VITE DEV / PROD STATIC ====================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TrimPlate Dynamic E-Commerce & CMS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
