import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'trimplate_cms.sqlite');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      permissions TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL DEFAULT 2,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      mobile TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      reset_token TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      dietary_preference TEXT DEFAULT 'Both',
      fitness_goal TEXT DEFAULT 'Stay Trim & Balanced',
      wallet_balance REAL DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT 'Home',
      recipient_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      line1 TEXT NOT NULL,
      area TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Kolkata',
      pincode TEXT NOT NULL DEFAULT '700001',
      is_default INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      division_name TEXT NOT NULL UNIQUE,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image_url TEXT NOT NULL DEFAULT 'hero_bowl',
      bg_color TEXT NOT NULL DEFAULT '#123B16',
      badge_text TEXT DEFAULT 'Specialty Menu',
      show_in_header INTEGER NOT NULL DEFAULT 1,
      show_on_home INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 10,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER DEFAULT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      menu_division TEXT NOT NULL DEFAULT 'Green Menu',
      description TEXT DEFAULT '',
      image_key TEXT DEFAULT 'hero_bowl',
      custom_image_url TEXT DEFAULT '',
      diet_tag TEXT DEFAULT 'all',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      menu_division TEXT NOT NULL DEFAULT 'Green Menu',
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      price REAL,
      is_veg INTEGER NOT NULL DEFAULT 1,
      stock_qty INTEGER NOT NULL DEFAULT 50,
      display_labels TEXT NOT NULL DEFAULT '[]',
      diet_types TEXT NOT NULL DEFAULT '[]',
      meal_time TEXT NOT NULL DEFAULT 'All Day',
      is_available INTEGER NOT NULL DEFAULT 1,
      image_key TEXT NOT NULL DEFAULT 'hero_bowl',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      og_image TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      variant_name TEXT NOT NULL,
      price REAL NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nutritional_information (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL UNIQUE,
      calories_kcal INTEGER,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      fiber_g REAL,
      sugar_g REAL,
      is_verified INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hero_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      cta_primary_text TEXT NOT NULL DEFAULT 'Explore Menu',
      cta_primary_url TEXT NOT NULL DEFAULT '/green-menu',
      cta_secondary_text TEXT DEFAULT 'View Plans',
      cta_secondary_url TEXT DEFAULT '/subscriptions',
      desktop_image TEXT NOT NULL DEFAULT 'hero_slide_feast',
      mobile_image TEXT NOT NULL DEFAULT 'hero_bowl',
      text_position TEXT NOT NULL DEFAULT 'left',
      overlay_opacity REAL NOT NULL DEFAULT 0.55,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      start_date TEXT DEFAULT '2026-01-01',
      end_date TEXT DEFAULT '2028-12-31',
      slide_type TEXT NOT NULL DEFAULT 'standard',
      badge_text TEXT DEFAULT '',
      promo_code TEXT DEFAULT '',
      discount_type TEXT DEFAULT 'percentage',
      discount_value REAL DEFAULT 0,
      min_order_amount REAL DEFAULT 199,
      linked_product_id INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      banner_key TEXT NOT NULL UNIQUE,
      page_target TEXT NOT NULL DEFAULT 'home',
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image_url TEXT NOT NULL DEFAULT 'meal_prep_tray',
      mobile_image_url TEXT DEFAULT '',
      cta_text TEXT DEFAULT 'Explore Now',
      cta_url TEXT DEFAULT '/subscriptions',
      bg_color TEXT DEFAULT '#FFF8ED',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS homepage_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      cta_text TEXT DEFAULT '',
      cta_url TEXT DEFAULT '',
      bg_color TEXT NOT NULL DEFAULT '#FFFFFF',
      product_limit INTEGER NOT NULL DEFAULT 4,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      config_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS homepage_section_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      banner_image TEXT NOT NULL DEFAULT 'meal_prep_tray',
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value REAL NOT NULL DEFAULT 20,
      coupon_code TEXT NOT NULL DEFAULT '',
      start_datetime TEXT NOT NULL DEFAULT '2026-01-01T00:00',
      end_datetime TEXT NOT NULL DEFAULT '2027-12-31T23:59',
      applicable_categories TEXT DEFAULT 'All',
      applicable_products TEXT DEFAULT 'All',
      min_order_value REAL NOT NULL DEFAULT 199,
      max_discount REAL NOT NULL DEFAULT 250,
      usage_limit INTEGER NOT NULL DEFAULT 500,
      used_count INTEGER NOT NULL DEFAULT 0,
      cta_text TEXT NOT NULL DEFAULT 'Claim Offer',
      cta_url TEXT NOT NULL DEFAULT '/green-menu',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value REAL NOT NULL,
      min_order_amount REAL NOT NULL DEFAULT 199,
      max_discount REAL NOT NULL DEFAULT 250,
      usage_limit INTEGER NOT NULL DEFAULT 500,
      used_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT NOT NULL DEFAULT '2027-12-31'
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      hero_subtitle TEXT DEFAULT '',
      content_html TEXT NOT NULL DEFAULT '',
      banner_image TEXT DEFAULT 'hero_slide_green',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      og_image TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS navigation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL DEFAULT 'header',
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      open_in_new_tab INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS media_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      folder TEXT NOT NULL DEFAULT 'Food Photography',
      alt_text TEXT DEFAULT '',
      mime_type TEXT DEFAULT 'image/jpeg',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      price_per_person_label TEXT NOT NULL DEFAULT 'Per Person',
      badge_text TEXT DEFAULT '',
      card_theme TEXT NOT NULL DEFAULT 'green',
      benefits_json TEXT NOT NULL DEFAULT '[]',
      meals_included TEXT NOT NULL DEFAULT 'Breakfast, Lunch, Snacks, Dinner',
      delivery_info TEXT NOT NULL DEFAULT 'Daily fresh morning & evening slot delivery',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Delivery Partner',
      mobile TEXT NOT NULL,
      email TEXT DEFAULT '',
      vehicle_number TEXT DEFAULT '',
      zone TEXT DEFAULT 'Central Kolkata',
      status TEXT NOT NULL DEFAULT 'Active',
      active_deliveries INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      menu_preference TEXT NOT NULL DEFAULT 'Diet Menu',
      selected_meals TEXT NOT NULL DEFAULT 'Breakfast, Lunch, Snacks, Dinner',
      is_veg_only INTEGER NOT NULL DEFAULT 1,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      delivery_slot TEXT NOT NULL DEFAULT '8:00 AM - 10:00 AM',
      address_id INTEGER,
      status TEXT NOT NULL DEFAULT 'Active',
      skipped_dates_json TEXT NOT NULL DEFAULT '[]',
      total_paid REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'UPI',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE TABLE IF NOT EXISTS subscription_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL,
      delivery_date TEXT NOT NULL,
      meal_slot TEXT NOT NULL,
      product_id INTEGER,
      meal_title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Scheduled',
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      customer_name_snapshot TEXT DEFAULT '',
      customer_phone_snapshot TEXT DEFAULT '',
      address_id INTEGER,
      delivery_address_snapshot TEXT DEFAULT '',
      delivery_date TEXT DEFAULT '',
      subtotal REAL NOT NULL,
      delivery_charge REAL NOT NULL DEFAULT 40,
      gst_amount REAL NOT NULL DEFAULT 0,
      coupon_code TEXT DEFAULT '',
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
      payment_reference TEXT DEFAULT '',
      payment_status TEXT NOT NULL DEFAULT 'Pending',
      order_status TEXT NOT NULL DEFAULT 'Placed',
      assigned_staff_id INTEGER,
      delivery_notes TEXT DEFAULT '',
      estimated_delivery TEXT DEFAULT 'Within 40 Mins',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      item_type TEXT NOT NULL DEFAULT 'product',
      product_id INTEGER,
      plan_id INTEGER,
      item_name TEXT NOT NULL,
      variant_name TEXT DEFAULT '',
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      total_price REAL NOT NULL,
      image_key TEXT DEFAULT 'hero_bowl',
      meta_json TEXT DEFAULT '{}',
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      order_id INTEGER,
      subscription_id INTEGER,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      gateway_reference TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Completed',
      paid_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS delivery_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      location_note TEXT NOT NULL,
      updated_by TEXT NOT NULL DEFAULT 'System',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      product_id INTEGER,
      order_id INTEGER,
      order_item_id INTEGER,
      customer_name TEXT NOT NULL,
      reviewer_location TEXT DEFAULT 'Kolkata',
      review_source TEXT NOT NULL DEFAULT 'Website',
      rating INTEGER NOT NULL DEFAULT 5,
      comment TEXT NOT NULL,
      admin_reply TEXT DEFAULT '',
      show_on_home INTEGER NOT NULL DEFAULT 1,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      designation TEXT DEFAULT 'Verified Subscriber',
      location TEXT DEFAULT 'Kolkata',
      rating INTEGER NOT NULL DEFAULT 5,
      comment TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      caption TEXT DEFAULT '',
      category TEXT DEFAULT 'Healthy Bowls',
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Subscribed',
      subscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      role_target TEXT DEFAULT 'customer',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'order',
      reference_type TEXT DEFAULT '',
      reference_id INTEGER DEFAULT NULL,
      reference_code TEXT DEFAULT '',
      meta_json TEXT DEFAULT '{}',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dietitians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      credentials TEXT NOT NULL DEFAULT '',
      specialization TEXT NOT NULL DEFAULT '',
      experience_years INTEGER NOT NULL DEFAULT 5,
      languages TEXT NOT NULL DEFAULT 'English, Bengali, Hindi',
      bio TEXT NOT NULL DEFAULT '',
      consultation_fee REAL NOT NULL DEFAULT 299,
      free_with_subscription INTEGER NOT NULL DEFAULT 1,
      available_days TEXT NOT NULL DEFAULT 'Mon – Sat',
      available_slots TEXT NOT NULL DEFAULT '10:00 AM – 2:00 PM, 4:30 PM – 7:30 PM',
      image_url TEXT NOT NULL DEFAULT 'dietitian_ananya',
      rating REAL NOT NULL DEFAULT 4.9,
      consultations_count INTEGER NOT NULL DEFAULT 150,
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dietitian_consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_code TEXT NOT NULL UNIQUE,
      dietitian_id INTEGER,
      dietitian_name TEXT NOT NULL DEFAULT 'Any Senior TrimPlate Dietitian',
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      health_goal TEXT NOT NULL DEFAULT 'Weight & Fat Loss',
      dietary_preference TEXT NOT NULL DEFAULT 'Both',
      consultation_mode TEXT NOT NULL DEFAULT 'Video Call',
      preferred_date TEXT NOT NULL,
      preferred_slot TEXT NOT NULL,
      has_active_subscription INTEGER NOT NULL DEFAULT 0,
      fee_amount REAL NOT NULL DEFAULT 299,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      admin_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (dietitian_id) REFERENCES dietitians(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Safe column upgrades for existing SQLite databases
  const heroCols = (db.prepare('PRAGMA table_info(hero_slides)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  if (!heroCols.includes('slide_type')) {
    db.exec("ALTER TABLE hero_slides ADD COLUMN slide_type TEXT NOT NULL DEFAULT 'standard'");
  }
  if (!heroCols.includes('badge_text')) {
    db.exec("ALTER TABLE hero_slides ADD COLUMN badge_text TEXT DEFAULT ''");
  }
  if (!heroCols.includes('promo_code')) {
    db.exec("ALTER TABLE hero_slides ADD COLUMN promo_code TEXT DEFAULT ''");
  }
  if (!heroCols.includes('discount_type')) {
    db.exec("ALTER TABLE hero_slides ADD COLUMN discount_type TEXT DEFAULT 'percentage'");
  }
  if (!heroCols.includes('discount_value')) {
    db.exec('ALTER TABLE hero_slides ADD COLUMN discount_value REAL DEFAULT 0');
  }
  if (!heroCols.includes('min_order_amount')) {
    db.exec('ALTER TABLE hero_slides ADD COLUMN min_order_amount REAL DEFAULT 199');
  }
  if (!heroCols.includes('linked_product_id')) {
    db.exec('ALTER TABLE hero_slides ADD COLUMN linked_product_id INTEGER DEFAULT NULL');
  }

  const reviewCols = (db.prepare('PRAGMA table_info(reviews)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  if (!reviewCols.includes('order_id')) {
    db.exec('ALTER TABLE reviews ADD COLUMN order_id INTEGER');
  }
  if (!reviewCols.includes('order_item_id')) {
    db.exec('ALTER TABLE reviews ADD COLUMN order_item_id INTEGER');
  }
  if (!reviewCols.includes('reviewer_location')) {
    db.exec("ALTER TABLE reviews ADD COLUMN reviewer_location TEXT DEFAULT 'Kolkata'");
  }
  if (!reviewCols.includes('review_source')) {
    db.exec("ALTER TABLE reviews ADD COLUMN review_source TEXT NOT NULL DEFAULT 'Website'");
  }
  if (!reviewCols.includes('admin_reply')) {
    db.exec("ALTER TABLE reviews ADD COLUMN admin_reply TEXT DEFAULT ''");
  }
  if (!reviewCols.includes('show_on_home')) {
    db.exec('ALTER TABLE reviews ADD COLUMN show_on_home INTEGER NOT NULL DEFAULT 1');
  }

  const notifCols = (db.prepare('PRAGMA table_info(notifications)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  if (!notifCols.includes('reference_type')) {
    db.exec("ALTER TABLE notifications ADD COLUMN reference_type TEXT DEFAULT ''");
  }
  if (!notifCols.includes('reference_id')) {
    db.exec('ALTER TABLE notifications ADD COLUMN reference_id INTEGER DEFAULT NULL');
  }
  if (!notifCols.includes('reference_code')) {
    db.exec("ALTER TABLE notifications ADD COLUMN reference_code TEXT DEFAULT ''");
  }
  if (!notifCols.includes('meta_json')) {
    db.exec("ALTER TABLE notifications ADD COLUMN meta_json TEXT DEFAULT '{}'");
  }

  const orderCols = (db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  if (!orderCols.includes('customer_whatsapp')) {
    db.exec("ALTER TABLE orders ADD COLUMN customer_whatsapp TEXT DEFAULT ''");
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_division_avail ON products(menu_division, is_available);
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_categories_division_active ON categories(menu_division, is_active);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `);

  const seedCleanHeaderNav = () => {
    db.prepare("DELETE FROM navigation_items WHERE location = 'header'").run();
    const ins = db.prepare(
      'INSERT INTO navigation_items (location, label, url, parent_id, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)'
    );
    ins.run('header', 'Home', '/', null, 1);

    const menusNav = ins.run('header', 'Menus', '/green-menu', null, 2);
    ins.run('header', 'Green Menu', '/green-menu', menusNav.lastInsertRowid, 1);
    ins.run('header', 'Cafe Menu', '/cafe-menu', menusNav.lastInsertRowid, 2);
    ins.run('header', 'Diet Menu', '/diet-menu', menusNav.lastInsertRowid, 3);
    ins.run('header', 'Gym Menu', '/gym-menu', menusNav.lastInsertRowid, 4);

    ins.run('header', 'Subscriptions', '/subscriptions', null, 3);
    ins.run('header', 'Offers', '/offers', null, 4);

    const aboutNav = ins.run('header', 'About', '/page/about-us', null, 5);
    ins.run('header', 'About TrimPlate', '/page/about-us', aboutNav.lastInsertRowid, 1);
    ins.run('header', 'Contact Us', '/page/contact-us', aboutNav.lastInsertRowid, 2);

    db.prepare(
      "INSERT INTO website_settings (setting_key, setting_value) VALUES ('nav_layout_version', '2') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '2'"
    ).run();
  };

  const seedReviewsAndReputation = () => {
    const upsertSetting = db.prepare(
      'INSERT INTO website_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO NOTHING'
    );
    upsertSetting.run('google_reviews_enabled', '1');
    upsertSetting.run('google_business_name', 'TrimPlate — Healthy Kitchen & Cafe, Park Street, Kolkata');
    upsertSetting.run(
      'google_review_url',
      'https://www.google.com/maps/search/?api=1&query=TrimPlate+Healthy+Kitchen+Park+Street+Kolkata'
    );
    upsertSetting.run('trustpilot_enabled', '1');
    upsertSetting.run('trustpilot_url', 'https://www.trustpilot.com/review/trimplate.in');
    upsertSetting.run('trustpilot_score', '');
    upsertSetting.run('trustpilot_base_reviews', '128');

    const existingReviewsCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM reviews').get() as { cnt: number }
    ).cnt;

    if (existingReviewsCount === 0) {
      const findProdId = (likeName: string): number | null => {
        const row = db
          .prepare('SELECT id FROM products WHERE name LIKE ? LIMIT 1')
          .get(`%${likeName}%`) as { id: number } | undefined;
        return row ? row.id : null;
      };

      const pChickenBowl = findProdId('Grilled Herb Chicken') || findProdId('Chicken');
      const pPaneerBowl = findProdId('Paneer') || findProdId('Quinoa');
      const pOats = findProdId('Oats');
      const pFish = findProdId('Bhetki') || findProdId('Fish');
      const pSandwich = findProdId('Sandwich');
      const pSprouts = findProdId('Sprouts');

      const insRev = db.prepare(`
        INSERT INTO reviews (
          user_id, product_id, order_id, customer_name, reviewer_location, review_source,
          rating, comment, admin_reply, show_on_home, is_approved, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Approved Google & Verified Website Reviews (is_approved = 1)
      insRev.run(
        2,
        pChickenBowl,
        1,
        'Ananya Chatterjee',
        'Local Guide · Park Street, Kolkata',
        'Google',
        5,
        'Hands down the cleanest healthy meal service in Kolkata. Every portion is weighed accurately, zero greasy oil at the bottom of the bowl, and morning deliveries always arrive before 8:30 AM.',
        'Thank you Ananya! Thrilled to be part of your daily routine.',
        1,
        1,
        '2026-10-12 09:20:00'
      );
      insRev.run(
        3,
        pFish,
        2,
        'Rohan Sen',
        'Local Guide · Ballygunge, Kolkata',
        'Google',
        5,
        'Been on the 30-Day Gym Plan for six weeks. The Lemon-Herb Bhetki Fillet and Grilled Chicken Brown Rice Bowls hit 38g+ protein effortlessly and actually taste restaurant-grade.',
        '',
        1,
        1,
        '2026-10-16 14:15:00'
      );
      insRev.run(
        4,
        pPaneerBowl,
        3,
        'Dr. Priya Mukherjee',
        'Southern Avenue, Kolkata',
        'Google',
        5,
        'Rare to find a cloud kitchen that respects low-GI, low-sodium cooking without sacrificing flavor. Their Char-Grilled Paneer Quinoa Bowl and Sprouts Salad are staples at our clinic.',
        'Grateful for your trust and kind recommendation, Dr. Mukherjee!',
        1,
        1,
        '2026-10-19 18:40:00'
      );
      insRev.run(
        0,
        null,
        null,
        'Saurav Ganguly',
        'Local Guide · Salt Lake Sector V',
        'Google',
        5,
        'Switched our entire product team office lunches from regular takeout to TrimPlate Green Menu bowls. Zero post-lunch sluggishness and packaging is completely spill-proof.',
        '',
        1,
        1,
        '2026-10-21 13:50:00'
      );
      insRev.run(
        0,
        pOats,
        null,
        'Megha Banerjee',
        'Alipore, Kolkata',
        'Google',
        5,
        'The Rolled Oats with Fresh Fruits & Chia Seeds and cold-pressed juices are my favorite weekday breakfast. Freshly cut pomegranate and berries every single time.',
        '',
        1,
        1,
        '2026-10-23 08:55:00'
      );
      insRev.run(
        0,
        pSandwich,
        null,
        'Vikramjit Bose',
        'Local Guide · New Town, Kolkata',
        'Google',
        4,
        'Ordered from TrimPlate Cafe Menu — multigrain club sandwich and whole-wheat pesto pasta were super fresh and light. Delivery took 35 mins during peak evening hours.',
        '',
        1,
        1,
        '2026-10-25 20:10:00'
      );
      insRev.run(
        0,
        pSprouts,
        null,
        'Debjani Roy',
        'Lake Gardens, Kolkata',
        'Website',
        5,
        'Paused my 15-day subscription twice while traveling out of station with one click from My Account — super transparent billing and genuinely homestyle seasoning.',
        '',
        1,
        1,
        '2026-10-27 11:30:00'
      );

      // Customer Reviews (Published Live Immediately — No Pending Approval)
      insRev.run(
        5,
        pSandwich,
        6,
        'Siddharth Basu',
        'Salt Lake Sector V, Kolkata',
        'Website',
        5,
        'Just finished the Multigrain Grilled Veg & Avocado Club Sandwich from today’s lunch order — toasted to perfection and super filling without heavy mayo!',
        '',
        1,
        1,
        '2026-10-30 13:15:00'
      );
      insRev.run(
        0,
        pChickenBowl,
        null,
        'Rituparna Ghosh',
        'Hindustan Park, Kolkata',
        'Website',
        5,
        'Tried the Grilled Herb Chicken Bowl for dinner last night. Loved the herb marinade and crisp broccoli — signing up for the 7-Day Healthy Plan next!',
        '',
        1,
        1,
        '2026-10-30 20:05:00'
      );
    }

    // Ensure Debjani Roy guest review doesn't occupy Ananya's Order #5 so Order #5 remains unreviewed for testing
    db.prepare(
      "UPDATE reviews SET user_id = 0, order_id = NULL WHERE customer_name = 'Debjani Roy'"
    ).run();

    // Remove legacy REAL STORIES / What Our Community Says & SEASONAL PROMOTION homepage sections
    db.prepare("DELETE FROM homepage_sections WHERE section_key IN ('testimonials', 'promo_banner')").run();

    // Publish all reviews immediately (no Pending Approval state)
    db.prepare('UPDATE reviews SET is_approved = 1 WHERE is_approved = 0').run();
    db.prepare("DELETE FROM notifications WHERE title LIKE '%Pending Approval%'").run();

    // Switch review uniqueness from per-order to individual item per order
    db.exec(`
      DROP INDEX IF EXISTS idx_reviews_unique_user_order;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_order_prod
      ON reviews(user_id, order_id, product_id)
      WHERE user_id > 0 AND order_id IS NOT NULL AND product_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_order_item
      ON reviews(user_id, order_id, order_item_id)
      WHERE user_id > 0 AND order_id IS NOT NULL AND order_item_id IS NOT NULL;
    `);

    // Seed verified dish-level rating analysis rows for unrated catalog items so 5-star bars reflect varied ratings (4.0, 4.5, 5.0)
    const unratedProducts = db
      .prepare(
        `SELECT p.id, p.name, p.menu_division
         FROM products p
         WHERE NOT EXISTS (
           SELECT 1 FROM reviews r WHERE r.product_id = p.id AND r.is_approved = 1
         )`
      )
      .all() as Array<{ id: number; name: string; menu_division: string }>;

    if (unratedProducts.length > 0) {
      const reviewers = [
        ['Arjun Chatterjee', 'Ballygunge, Kolkata'],
        ['Nandini Sen', 'Salt Lake, Kolkata'],
        ['Soumya Banerjee', 'Alipore, Kolkata'],
        ['Ishita Bose', 'Park Street, Kolkata'],
        ['Koushik Dutta', 'New Town, Kolkata'],
        ['Poulomi Roy', 'Southern Avenue, Kolkata'],
      ] as const;

      const insProdRev = db.prepare(`
        INSERT INTO reviews (
          user_id, product_id, order_id, customer_name, reviewer_location, review_source,
          rating, comment, admin_reply, show_on_home, is_approved, created_at
        ) VALUES (0, ?, NULL, ?, ?, 'Website', ?, ?, '', 0, 1, '2026-10-20 12:30:00')
      `);

      unratedProducts.forEach((prod, idx) => {
        const [rName, rLoc] = reviewers[idx % reviewers.length];
        const [rName2, rLoc2] = reviewers[(idx + 2) % reviewers.length];
        // Varied ratings so dish averages compute to 5.0, 4.5, or 4.0 via SQL AVG(rating)
        if (idx % 3 === 0) {
          insProdRev.run(
            prod.id,
            rName,
            rLoc,
            5,
            `Freshly prepared ${prod.name} with clean seasoning and balanced portion size.`
          );
        } else if (idx % 3 === 1) {
          insProdRev.run(
            prod.id,
            rName,
            rLoc,
            5,
            `Loved the freshness and clean ingredients in ${prod.name}.`
          );
          insProdRev.run(
            prod.id,
            rName2,
            rLoc2,
            4,
            `Wholesome taste and neat spill-proof packaging on ${prod.name}.`
          );
        } else {
          insProdRev.run(
            prod.id,
            rName,
            rLoc,
            4,
            `Good clean-eating option from the ${prod.menu_division}, light and satisfying.`
          );
        }
      });
    }

    db.prepare(
      "INSERT INTO website_settings (setting_key, setting_value) VALUES ('reviews_reputation_version', '2') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '2'"
    ).run();
  };

  const applyV3HeroLaunchAndReviewsMigration = () => {
    // 1. Remove SEASONAL PROMOTION ('promo_banner') and legacy 'testimonials' from homepage_sections
    db.prepare("DELETE FROM homepage_sections WHERE section_key IN ('promo_banner', 'testimonials')").run();

    // 2. Ensure zero 'Pending Approval' reviews remain and individual item-per-order uniqueness is active
    db.prepare('UPDATE reviews SET is_approved = 1 WHERE is_approved = 0').run();
    db.prepare("DELETE FROM notifications WHERE title LIKE '%Pending Approval%'").run();
    db.exec(`
      DROP INDEX IF EXISTS idx_reviews_unique_user_order;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_order_prod
      ON reviews(user_id, order_id, product_id)
      WHERE user_id > 0 AND order_id IS NOT NULL AND product_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_order_item
      ON reviews(user_id, order_id, order_item_id)
      WHERE user_id > 0 AND order_id IS NOT NULL AND order_item_id IS NOT NULL;
    `);

    // 3. Seed an Admin-controllable Hero New Item & Offer Launch slide + synced Promo Code if none exists yet
    const existingLaunchSlide = db
      .prepare("SELECT id FROM hero_slides WHERE slide_type IN ('new_launch', 'offer_promo') LIMIT 1")
      .get() as { id: number } | undefined;

    if (!existingLaunchSlide) {
      const featuredProd = db
        .prepare(
          "SELECT id, name, slug FROM products WHERE is_available = 1 AND price IS NOT NULL ORDER BY CASE WHEN name LIKE '%Chicken%' OR name LIKE '%Quinoa%' THEN 0 ELSE 1 END, id ASC LIMIT 1"
        )
        .get() as { id: number; name: string; slug: string } | undefined;

      const ctaUrl = featuredProd ? `/product/${featuredProd.slug}` : '/green-menu';
      const launchTitle = featuredProd
        ? `New Launch: ${featuredProd.name}`
        : 'New Signature Protein & Superfood Bowl Launch';

      // Shift existing slides sort_order down by 1 so the Hero Launch & Promo Code slide appears first
      db.prepare('UPDATE hero_slides SET sort_order = sort_order + 1').run();

      db.prepare(`
        INSERT INTO hero_slides (
          title, subtitle, cta_primary_text, cta_primary_url, cta_secondary_text, cta_secondary_url,
          desktop_image, mobile_image, text_position, overlay_opacity, sort_order, is_active,
          start_date, end_date, slide_type, badge_text, promo_code, discount_type, discount_value,
          min_order_amount, linked_product_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'left', 0.60, 1, 1, '2026-01-01', '2028-12-31', 'new_launch', ?, ?, 'percentage', 25, 249, ?)
      `).run(
        launchTitle,
        'Freshly crafted in our Green Kitchen with zero refined oil & verified macros. Apply the launch promo code at checkout for an instant 25% discount.',
        'Order New Launch',
        ctaUrl,
        'Explore Green Menu',
        '/green-menu',
        'hero_slide_feast',
        'hero_bowl',
        'NEW ITEM LAUNCH · 25% OFF',
        'LAUNCH25',
        featuredProd ? featuredProd.id : null
      );

      db.prepare(`
        INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, is_active, expires_at)
        VALUES ('LAUNCH25', 'Hero Launch Offer — 25% OFF on New Menu Launch', 'percentage', 25, 249, 300, 1000, 1, '2028-12-31')
        ON CONFLICT(code) DO UPDATE SET
          discount_type = 'percentage',
          discount_value = 25,
          min_order_amount = 249,
          is_active = 1,
          expires_at = '2028-12-31'
      `).run();
    }

    db.prepare(
      "INSERT INTO website_settings (setting_key, setting_value) VALUES ('cms_v3_hero_reviews', '1') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '1'"
    ).run();
  };

  const applyV4DietitiansAndOrderNotificationsMigration = () => {
    // 1. Seed Certified Clinical & Sports Dietitians
    const dietitianCount = (db.prepare('SELECT COUNT(*) as cnt FROM dietitians').get() as { cnt: number }).cnt;
    if (dietitianCount === 0) {
      const insDietitian = db.prepare(`
        INSERT INTO dietitians (
          name, slug, credentials, specialization, experience_years, languages, bio,
          consultation_fee, free_with_subscription, available_days, available_slots,
          image_url, rating, consultations_count, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      insDietitian.run(
        'Dt. Ananya Sen',
        'dt-ananya-sen',
        'M.Sc. Clinical Nutrition, CDE',
        'Sustainable Fat Loss, PCOS & Metabolic Health',
        9,
        'English, Bengali, Hindi',
        'Lead Clinical Dietitian at TrimPlate Studio specializing in calorie-calibrated fat loss, hormonal balance, and sustainable Indian clean eating without crash dieting.',
        299,
        1,
        'Mon – Sat',
        '10:00 AM – 2:00 PM, 4:30 PM – 7:30 PM',
        'dietitian_ananya',
        4.9,
        420,
        1
      );

      insDietitian.run(
        'Dt. Arjun Bose',
        'dt-arjun-bose',
        'M.Sc. Sports & Exercise Nutrition, ISSN',
        'High-Protein Hypertrophy & Body Recomposition',
        7,
        'English, Hindi, Bengali',
        'Sports & Performance Nutritionist designing precision macro blueprints paired directly with TrimPlate Gym Menu meals for strength athletes and busy professionals.',
        349,
        1,
        'Mon – Sat',
        '11:00 AM – 3:00 PM, 5:00 PM – 8:30 PM',
        'dietitian_arjun',
        4.9,
        315,
        2
      );

      insDietitian.run(
        'Dt. Meera Chatterjee',
        'dt-meera-chatterjee',
        'M.Sc. Dietetics & Food Science, RD',
        'Low-GI Sugar Control, Thyroid & Gut Nutrition',
        11,
        'English, Bengali, Hindi',
        'Senior Registered Dietitian and Certified Diabetes Educator crafting low-glycemic, gut-friendly meal schedules tailored to clinical biomarkers and lifestyle.',
        399,
        1,
        'Tue – Sun',
        '9:30 AM – 1:30 PM, 4:00 PM – 7:00 PM',
        'dietitian_meera',
        5.0,
        580,
        3
      );
    }

    // 2. Register Dietitian studio portraits in Media Library if missing
    const ensureMedia = (title: string, key: string, alt: string) => {
      const exists = db.prepare('SELECT id FROM media_library WHERE file_url = ? LIMIT 1').get(key);
      if (!exists) {
        db.prepare('INSERT INTO media_library (title, file_url, folder, alt_text) VALUES (?, ?, ?, ?)').run(
          title,
          key,
          'Dietitian Team',
          alt
        );
      }
    };
    ensureMedia('Dt. Ananya Sen — Clinical Dietitian', 'dietitian_ananya', 'Clinical Dietitian Portrait');
    ensureMedia('Dt. Arjun Bose — Sports Nutritionist', 'dietitian_arjun', 'Sports Nutritionist Portrait');
    ensureMedia('Dt. Meera Chatterjee — Registered Dietitian', 'dietitian_meera', 'Senior Dietitian Portrait');

    // 3. Add Dietitian Section to Homepage Sections right after Diet Plans
    const existingDietSec = db
      .prepare("SELECT id FROM homepage_sections WHERE section_key = 'dietitian_consultation'")
      .get();
    if (!existingDietSec) {
      db.prepare('UPDATE homepage_sections SET sort_order = sort_order + 1 WHERE sort_order >= 8').run();
      db.prepare(`
        INSERT INTO homepage_sections (
          section_key, title, subtitle, description, image_url, cta_text, cta_url,
          bg_color, product_limit, sort_order, is_enabled, config_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        'dietitian_consultation',
        'Personal 1-on-1 Certified Dietitian Guidance',
        'CLINICAL & SPORTS NUTRITION DESK',
        'Every body has unique metabolic needs. Consult 1-on-1 with our in-house clinical and sports dietitians to map your exact daily calorie, protein, and micronutrient blueprint — complimentary with 15 & 30-Day Meal Plans or available as an individual session.',
        'dietitian_ananya',
        'Book 1-on-1 Consultation',
        '#book-dietitian',
        '#FFFFFF',
        3,
        8,
        JSON.stringify({
          highlights: [
            'Custom Calorie & Macro Blueprint',
            'PCOS, Sugar Control & Gut Protocols',
            'Complimentary with 15 & 30-Day Plans',
          ],
        })
      );
    }

    // 4. Seed realistic sample Dietitian Consultation Bookings if empty
    const consultCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM dietitian_consultations').get() as { cnt: number }
    ).cnt;
    let pendingBookingId: number | null = null;
    if (consultCount === 0) {
      const d1 = db.prepare('SELECT id, name FROM dietitians ORDER BY sort_order ASC LIMIT 1').get() as
        | { id: number; name: string }
        | undefined;
      const d2 = db
        .prepare('SELECT id, name FROM dietitians ORDER BY sort_order ASC LIMIT 1 OFFSET 1')
        .get() as { id: number; name: string } | undefined;

      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

      const insBooking = db.prepare(`
        INSERT INTO dietitian_consultations (
          booking_code, dietitian_id, dietitian_name, user_id, customer_name, customer_phone,
          customer_email, health_goal, dietary_preference, consultation_mode, preferred_date,
          preferred_slot, has_active_subscription, fee_amount, notes, status, admin_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insBooking.run(
        'DT84102',
        d1 ? d1.id : null,
        d1 ? d1.name : 'Dt. Ananya Sen',
        2,
        'Ananya Chatterjee',
        '9830012345',
        'ananya@trimplate.in',
        'Sustainable Fat Loss & Clean Eating',
        'Both',
        'Video Call',
        tomorrow,
        '10:30 AM – 11:00 AM',
        1,
        0,
        'On the 7-Day Diet Plan, looking to calibrate dinner carbs and weekday office snacks.',
        'Confirmed',
        'Google Meet link shared via WhatsApp & Email.'
      );

      const b2 = insBooking.run(
        'DT84519',
        d2 ? d2.id : null,
        d2 ? d2.name : 'Dt. Arjun Bose',
        3,
        'Rohan Sen',
        '9831145678',
        'rohan.sen@gmail.com',
        'High-Protein Muscle Gain (180g Protein Target)',
        'Non-Veg',
        'Video Call',
        dayAfter,
        '5:30 PM – 6:00 PM',
        1,
        0,
        'Training 5x/week — need post-workout meal pairing from TrimPlate Gym Menu.',
        'Pending',
        ''
      );
      pendingBookingId = Number(b2.lastInsertRowid);
    }

    // 5. Seed rich Item Order & Dietitian Notifications for Admin Panel if none exist yet
    const existingOrderNotifs = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE role_target = 'admin' AND type = 'order'")
        .get() as { cnt: number }
    ).cnt;

    if (existingOrderNotifs === 0) {
      const recentOrders = db
        .prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 2')
        .all() as Array<any>;
      const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
      const insNotif = db.prepare(`
        INSERT INTO notifications (
          user_id, role_target, title, message, type, reference_type, reference_id, reference_code, is_read, meta_json, created_at
        ) VALUES (?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const ord of recentOrders) {
        const ordItems = itemsStmt.all(ord.id) as Array<any>;
        const itemsList = ordItems.map((it) => ({
          name: it.item_name,
          variant: it.variant_name || '',
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price || 0),
        }));
        const summary =
          itemsList.map((it) => `${it.quantity}× ${it.name}`).join(', ') || 'Healthy Meal Order';
        const itemCount = itemsList.reduce((acc, it) => acc + it.quantity, 0);

        insNotif.run(
          ord.user_id,
          `New Item Order #${ord.order_code} · ₹${ord.total_amount}`,
          `${ord.customer_name_snapshot || 'Customer'} ordered ${summary} (${ord.payment_method}).`,
          'order',
          'order',
          ord.id,
          ord.order_code,
          0,
          JSON.stringify({
            orderId: ord.id,
            orderCode: ord.order_code,
            customerName: ord.customer_name_snapshot || 'Customer',
            customerPhone: ord.customer_phone_snapshot || '',
            totalAmount: ord.total_amount,
            paymentMethod: ord.payment_method,
            deliveryAddress: ord.delivery_address_snapshot || '',
            itemCount,
            itemsSummary: summary,
            items: itemsList,
          }),
          ord.created_at || new Date().toISOString().replace('T', ' ').slice(0, 19)
        );
      }

      if (pendingBookingId) {
        insNotif.run(
          3,
          'New Dietitian Booking #DT84519 · Dt. Arjun Bose',
          'Rohan Sen requested a Video Call consultation for High-Protein Muscle Gain.',
          'dietitian',
          'dietitian',
          pendingBookingId,
          'DT84519',
          0,
          JSON.stringify({
            bookingId: pendingBookingId,
            bookingCode: 'DT84519',
            customerName: 'Rohan Sen',
            customerPhone: '9831145678',
            dietitianName: 'Dt. Arjun Bose',
            healthGoal: 'High-Protein Muscle Gain (180g Protein Target)',
            consultationMode: 'Video Call',
          }),
          new Date().toISOString().replace('T', ' ').slice(0, 19)
        );
      }
    }

    db.prepare(
      "INSERT INTO website_settings (setting_key, setting_value) VALUES ('cms_v4_dietitians_notifications', '1') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '1'"
    ).run();
  };

  const applyV5DynamicMenusAndWhatsAppMigration = () => {
    const upsertSetting = db.prepare(
      'INSERT INTO website_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO NOTHING'
    );
    upsertSetting.run('whatsapp_order_number', '919830045120');
    upsertSetting.run('whatsapp_order_enabled', '1');
    upsertSetting.run('whatsapp_url', 'https://wa.me/919830045120');

    // Backfill customer_whatsapp on existing historical orders from customer_phone_snapshot where blank
    db.prepare(
      "UPDATE orders SET customer_whatsapp = customer_phone_snapshot WHERE (customer_whatsapp IS NULL OR customer_whatsapp = '') AND customer_phone_snapshot IS NOT NULL AND customer_phone_snapshot != ''"
    ).run();

    db.prepare(
      "INSERT INTO website_settings (setting_key, setting_value) VALUES ('cms_v5_dynamic_menus_whatsapp', '1') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '1'"
    ).run();
  };

  const applyV6ProductGalleryImagesMigration = () => {
    const ensureFoodMedia = (title: string, key: string, alt: string) => {
      const exists = db.prepare('SELECT id FROM media_library WHERE file_url = ? LIMIT 1').get(key);
      if (!exists) {
        db.prepare(
          'INSERT INTO media_library (title, file_url, folder, alt_text) VALUES (?, ?, ?, ?)'
        ).run(title, key, 'Products', alt);
      }
    };

    ensureFoodMedia(
      'Herb-Grilled Protein & Cottage Cheese Platter',
      'grilled_protein',
      'Grilled protein platter with broccoli and sweet potato mash'
    );
    ensureFoodMedia(
      'Superfood Quinoa & Hass Avocado Bowl',
      'quinoa_avocado',
      'Close-up superfood quinoa, avocado, roasted chickpeas and spinach bowl'
    );
    ensureFoodMedia(
      'Artisanal Multigrain Panini & Veggie Wrap',
      'multigrain_wrap',
      'Grilled multigrain sourdough sandwich and whole-wheat hummus wrap'
    );
    ensureFoodMedia(
      'Morning Chia Oats Bowl & Green Detox',
      'berry_chia',
      'High-fiber oats chia bowl with fresh berries, nuts and green juice'
    );
    ensureFoodMedia(
      'Balanced Indian Dal, Brown Rice & Paneer Meal',
      'wholesome_thali',
      'Healthy Indian meal bowl with moong dal, brown rice, paneer tikka and sprouts'
    );

    const allProds = db
      .prepare(
        `SELECT p.id, p.name, p.menu_division, p.meal_time, p.is_veg, p.image_key, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id`
      )
      .all() as Array<{
      id: number;
      name: string;
      menu_division: string;
      meal_time: string;
      is_veg: number;
      image_key: string;
      category_name: string | null;
    }>;

    const getImgsStmt = db.prepare(
      'SELECT id, image_url, is_primary, sort_order FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC'
    );
    const insImgStmt = db.prepare(
      'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)'
    );

    for (const p of allProds) {
      const existingImgs = getImgsStmt.all(p.id) as Array<{
        id: number;
        image_url: string;
        is_primary: number;
        sort_order: number;
      }>;
      if (existingImgs.length >= 4) continue;

      const text = `${p.name} ${p.category_name || ''} ${p.menu_division} ${p.meal_time}`.toLowerCase();
      const isVeg = Boolean(p.is_veg);

      // Determine dish-matched candidate pool
      let pool: string[] = [];
      if (
        p.menu_division === 'Cafe Menu' ||
        text.includes('sandwich') ||
        text.includes('wrap') ||
        text.includes('panini') ||
        text.includes('toast') ||
        text.includes('pasta') ||
        text.includes('burger')
      ) {
        pool = isVeg
          ? ['cafe_sandwich', 'multigrain_wrap', 'quinoa_avocado', 'berry_chia', 'green_salad']
          : ['cafe_sandwich', 'multigrain_wrap', 'grilled_protein', 'quinoa_avocado', 'hero_slide_feast'];
      } else if (
        text.includes('oats') ||
        text.includes('chia') ||
        text.includes('smoothie') ||
        text.includes('juice') ||
        text.includes('shake') ||
        text.includes('breakfast') ||
        text.includes('poha') ||
        text.includes('upma')
      ) {
        pool = isVeg
          ? ['berry_chia', 'quinoa_avocado', 'green_salad', 'hero_bowl', 'multigrain_wrap']
          : ['breakfast_oats', 'berry_chia', 'grilled_protein', 'quinoa_avocado'];
      } else if (
        !isVeg ||
        text.includes('chicken') ||
        text.includes('fish') ||
        text.includes('bhetki') ||
        text.includes('egg') ||
        text.includes('prawn')
      ) {
        pool = ['grilled_protein', 'hero_slide_gym', 'meal_prep_tray', 'quinoa_avocado', 'hero_bowl'];
      } else if (
        text.includes('salad') ||
        text.includes('sprout') ||
        text.includes('avocado') ||
        text.includes('quinoa') ||
        text.includes('detox')
      ) {
        pool = ['green_salad', 'quinoa_avocado', 'hero_bowl', 'berry_chia', 'wholesome_thali'];
      } else {
        // Balanced Veg Meals, Paneer, Dal, Brown Rice, Roti, Thali, Dinner
        pool = ['wholesome_thali', 'quinoa_avocado', 'hero_bowl', 'green_salad', 'multigrain_wrap'];
      }

      // Rotate slightly by product id so adjacent cards in the same category showcase varied primary/secondary angles
      const offset = p.id % pool.length;
      const rotatedPool = [...pool.slice(offset), ...pool.slice(0, offset)];

      const primaryUrl = existingImgs[0]?.image_url || p.image_key || rotatedPool[0] || 'hero_bowl';
      const used = new Set<string>([primaryUrl]);

      if (existingImgs.length === 0) {
        insImgStmt.run(p.id, primaryUrl, 1, 0);
      } else {
        for (const ex of existingImgs) used.add(ex.image_url);
      }

      let nextSort = existingImgs.length === 0 ? 1 : existingImgs.length;
      for (const candidate of rotatedPool) {
        if (used.size >= 4) break;
        if (!used.has(candidate)) {
          insImgStmt.run(p.id, candidate, 0, nextSort++);
          used.add(candidate);
        }
      }
    }

    db.prepare(
      "INSERT INTO website_settings (setting_key, setting_value) VALUES ('cms_v6_product_galleries', '1') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '1'"
    ).run();
  };

  const roleCount = (db.prepare('SELECT COUNT(*) as cnt FROM roles').get() as { cnt: number }).cnt;
  if (roleCount > 0) {
    const navVer = db
      .prepare("SELECT setting_value FROM website_settings WHERE setting_key = 'nav_layout_version'")
      .get() as { setting_value: string } | undefined;
    if (!navVer || navVer.setting_value !== '2') {
      seedCleanHeaderNav();
    }
    const revVer = db
      .prepare("SELECT setting_value FROM website_settings WHERE setting_key = 'reviews_reputation_version'")
      .get() as { setting_value: string } | undefined;
    if (!revVer || revVer.setting_value !== '2') {
      seedReviewsAndReputation();
    }
    const v3Ver = db
      .prepare("SELECT setting_value FROM website_settings WHERE setting_key = 'cms_v3_hero_reviews'")
      .get() as { setting_value: string } | undefined;
    if (!v3Ver || v3Ver.setting_value !== '1') {
      applyV3HeroLaunchAndReviewsMigration();
    }
    const v4Ver = db
      .prepare("SELECT setting_value FROM website_settings WHERE setting_key = 'cms_v4_dietitians_notifications'")
      .get() as { setting_value: string } | undefined;
    if (!v4Ver || v4Ver.setting_value !== '1') {
      applyV4DietitiansAndOrderNotificationsMigration();
    }
    const v5Ver = db
      .prepare("SELECT setting_value FROM website_settings WHERE setting_key = 'cms_v5_dynamic_menus_whatsapp'")
      .get() as { setting_value: string } | undefined;
    if (!v5Ver || v5Ver.setting_value !== '1') {
      applyV5DynamicMenusAndWhatsAppMigration();
    }
    const v6Ver = db
      .prepare("SELECT setting_value FROM website_settings WHERE setting_key = 'cms_v6_product_galleries'")
      .get() as { setting_value: string } | undefined;
    if (!v6Ver || v6Ver.setting_value !== '1') {
      applyV6ProductGalleryImagesMigration();
    }
    return;
  }

  // 1. Roles
  const insertRole = db.prepare('INSERT INTO roles (name, permissions) VALUES (?, ?)');
  insertRole.run('admin', JSON.stringify(['all']));
  insertRole.run('customer', JSON.stringify(['order', 'subscribe', 'profile']));
  insertRole.run('staff', JSON.stringify(['delivery', 'kitchen']));

  // 2. Users & Customers
  const adminHash = bcrypt.hashSync('admin123', 10);
  const custHash = bcrypt.hashSync('customer123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (role_id, name, email, mobile, password_hash, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertUser.run(1, 'TrimPlate Admin', 'admin@trimplate.in', '9830000001', adminHash, 'Active', '2026-06-01 09:00:00');
  const cust1 = insertUser.run(2, 'Ananya Chatterjee', 'ananya@trimplate.in', '9830012345', custHash, 'Active', '2026-08-14 10:30:00');
  const cust2 = insertUser.run(2, 'Rohan Sen', 'rohan.sen@gmail.com', '9831145678', custHash, 'Active', '2026-09-19 14:20:00');
  const cust3 = insertUser.run(2, 'Priya Mukherjee', 'priya.m@outlook.com', '9836678901', custHash, 'Active', '2026-10-12 11:15:00');
  const cust4 = insertUser.run(2, 'Siddharth Basu', 'siddharth.b@gmail.com', '9830998877', custHash, 'Active', '2026-10-25 16:40:00');

  const insertCustomer = db.prepare(
    'INSERT INTO customers (user_id, dietary_preference, fitness_goal, wallet_balance, total_orders) VALUES (?, ?, ?, ?, ?)'
  );
  insertCustomer.run(cust1.lastInsertRowid, 'Both', 'Weight Management & Clean Eating', 150, 4);
  insertCustomer.run(cust2.lastInsertRowid, 'Non-Veg', 'High-Protein Muscle Building', 0, 5);
  insertCustomer.run(cust3.lastInsertRowid, 'Veg', 'Low-GI Balanced Nutrition', 80, 3);
  insertCustomer.run(cust4.lastInsertRowid, 'Veg', 'Daily Healthy Office Lunch', 0, 2);

  // 3. Addresses
  const insertAddr = db.prepare(
    'INSERT INTO addresses (user_id, label, recipient_name, mobile, line1, area, city, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const addr1 = insertAddr.run(cust1.lastInsertRowid, 'Home', 'Ananya Chatterjee', '9830012345', '14B Park Street, Russell Court, Flat 3A', 'Park Street', 'Kolkata', '700016', 1);
  insertAddr.run(cust1.lastInsertRowid, 'Office', 'Ananya Chatterjee', '9830012345', 'Godrej Waterside, Tower 2, 7th Floor', 'Salt Lake Sector V', 'Kolkata', '700091', 0);
  const addr2 = insertAddr.run(cust2.lastInsertRowid, 'Home', 'Rohan Sen', '9831145678', '42 Ballygunge Circular Road', 'Ballygunge', 'Kolkata', '700019', 1);
  const addr3 = insertAddr.run(cust3.lastInsertRowid, 'Home', 'Priya Mukherjee', '9836678901', '19 Southern Avenue, Lake Gardens', 'Southern Avenue', 'Kolkata', '700029', 1);

  // 4. Website Settings (100% database-driven)
  const settingsSeed: Record<string, string> = {
    business_name: 'TrimPlate',
    tagline: 'Eat Smart. Stay Trim.',
    logo_url: '/assets/aistudio/WhatsApp_Image_2026-10-25_at_6.22.43_PM_235e65d3.jpeg',
    favicon_url: '/assets/aistudio/WhatsApp_Image_2026-10-25_at_6.22.43_PM_235e65d3.jpeg',
    phone: '+91 98300 12345',
    email: 'hello@trimplate.in',
    address: '24 Park Street, Culinary Studio, Ground Floor, Kolkata – 700016',
    business_hours: 'Mon – Sun: 7:00 AM – 10:30 PM',
    facebook_url: 'https://facebook.com/trimplate',
    instagram_url: 'https://instagram.com/trimplate',
    twitter_url: 'https://x.com/trimplate',
    youtube_url: 'https://youtube.com/@trimplate',
    currency_symbol: '₹',
    delivery_charge: '40',
    free_delivery_threshold: '599',
    tax_percent: '5',
    new_arrival_days: '14',
    cod_enabled: '1',
    upi_enabled: '1',
    upi_vpa: 'trimplate@hdfcbank',
    online_gateway_enabled: '1',
    announcement_enabled: '1',
    announcement_text: 'Use code TRIM20 for 20% OFF your first Green Menu order',
    announcement_delivery_info: 'Free Delivery on orders above ₹599 & all Subscription Plans',
    footer_about: 'TrimPlate crafts chef-prepared healthy bowls, macro-verified fitness meals, wholesome Green Menu dishes, and artisanal Cafe favorites using fresh, locally sourced ingredients.',
    copyright_text: '© 2026 TrimPlate Foods Pvt. Ltd. All rights reserved.',
    default_seo_title: 'TrimPlate — Eat Smart. Stay Trim. | Healthy Food & Meal Subscriptions',
    default_seo_description: 'Order freshly prepared Green Menu meals, TrimPlate Cafe favorites, Diet & Gym meal plans, and daily healthy food subscriptions.',
    default_og_image: '/assets/aistudio/WhatsApp_Image_2026-10-25_at_6.22.43_PM_235e65d3.jpeg',
  };
  const insertSetting = db.prepare('INSERT INTO website_settings (setting_key, setting_value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(settingsSeed)) {
    insertSetting.run(k, v);
  }

  // 5. Navigation Items (5 Clean Top-Level Header Links + Structured Dropdowns + Footer Links)
  seedCleanHeaderNav();
  const insertNav = db.prepare(
    'INSERT INTO navigation_items (location, label, url, parent_id, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)'
  );

  // Footer Quick Links
  insertNav.run('footer_quick', 'About TrimPlate', '/page/about-us', null, 1);
  insertNav.run('footer_quick', 'Cafe Menu', '/cafe-menu', null, 2);
  insertNav.run('footer_quick', 'Green Healthy Menu', '/green-menu', null, 3);
  insertNav.run('footer_quick', 'Diet Meal Plans', '/diet-menu', null, 4);
  insertNav.run('footer_quick', 'High-Protein Gym Menu', '/gym-menu', null, 5);
  insertNav.run('footer_quick', 'Subscription Plans', '/subscriptions', null, 6);
  insertNav.run('footer_quick', 'Special Offers', '/offers', null, 7);

  // Footer Legal Links
  insertNav.run('footer_legal', 'Privacy Policy', '/page/privacy-policy', null, 1);
  insertNav.run('footer_legal', 'Terms & Conditions', '/page/terms-and-conditions', null, 2);
  insertNav.run('footer_legal', 'Delivery Policy', '/page/delivery-policy', null, 3);
  insertNav.run('footer_legal', 'Refund & Cancellation Policy', '/page/refund-policy', null, 4);

  // 6. Media Library
  const insertMedia = db.prepare(
    'INSERT INTO media_library (title, file_url, folder, alt_text) VALUES (?, ?, ?, ?)'
  );
  insertMedia.run('Official TrimPlate Logo', '/assets/aistudio/WhatsApp_Image_2026-10-25_at_6.22.43_PM_235e65d3.jpeg', 'Branding', 'TrimPlate Eat Smart Stay Trim Logo');
  insertMedia.run('Fresh Healthy Feast Hero (16:9)', 'hero_slide_feast', 'Hero Banners', 'Healthy food feast on travertine stone');
  insertMedia.run('Wholesome Green Lifestyle Hero (16:9)', 'hero_slide_green', 'Hero Banners', 'Oatmeal, sprouts salad, and avocado toast');
  insertMedia.run('Gym High-Protein Meal Spread (16:9)', 'hero_slide_gym', 'Hero Banners', 'Grilled chicken, fish, brown rice, and protein shake');
  insertMedia.run('Daily Meal Subscription Box (16:9)', 'meal_prep_tray', 'Promotions', '4-compartment fresh meal subscription box');
  insertMedia.run('Grilled Protein & Avocado Grain Bowl', 'hero_bowl', 'Food Photography', 'Grilled chicken and paneer brown rice bowl');
  insertMedia.run('Oats, Berries & Soft-Boiled Eggs', 'breakfast_oats', 'Food Photography', 'Healthy morning oats and boiled eggs');
  insertMedia.run('Sprouted Moong & Pomegranate Salad', 'green_salad', 'Food Photography', 'Fresh sprouts chaat salad bowl');
  insertMedia.run('Cafe Multigrain Club Sandwich & Pasta', 'cafe_sandwich', 'Food Photography', 'Cafe sandwich, herb pasta, and iced coffee');

  // 7. Hero Slides (Section 4 — Unlimited slides, schedule start/end, separate desktop & mobile images)
  const insertSlide = db.prepare(`
    INSERT INTO hero_slides (
      title, subtitle, cta_primary_text, cta_primary_url, cta_secondary_text, cta_secondary_url,
      desktop_image, mobile_image, text_position, overlay_opacity, sort_order, is_active, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  insertSlide.run(
    'Eat Smart. Stay Trim.',
    'Fresh, Healthy & Delicious Meals Delivered Daily — Crafted by Nutritionists & Culinary Chefs.',
    'Explore Menu',
    '/green-menu',
    'Order Now',
    '/cafe-menu',
    'hero_slide_feast',
    'hero_bowl',
    'left',
    0.58,
    1,
    '2026-01-01',
    '2028-12-31'
  );
  insertSlide.run(
    'Your Health Starts With Every Meal.',
    'Discover Fresh Food Made for a Healthier Lifestyle with Zero Refined Oils or Preservatives.',
    'Explore Green Menu',
    '/green-menu',
    'View Plans',
    '/subscriptions',
    'hero_slide_green',
    'breakfast_oats',
    'left',
    0.54,
    2,
    '2026-01-01',
    '2028-12-31'
  );
  insertSlide.run(
    'Fuel Your Fitness. Feel Your Best.',
    'Macro-Verified High-Protein Meals & Daily Diet Subscriptions Tailored to Your Goals.',
    'Explore Gym Menu',
    '/gym-menu',
    'Subscribe Now',
    '/subscriptions',
    'hero_slide_gym',
    'hero_bowl',
    'left',
    0.62,
    3,
    '2026-01-01',
    '2028-12-31'
  );

  // 8. Page & Promotional Banners
  const insertBanner = db.prepare(`
    INSERT INTO banners (banner_key, page_target, title, subtitle, description, image_url, mobile_image_url, cta_text, cta_url, bg_color, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertBanner.run(
    'home_promo_banner',
    'home',
    'Flat 20% Savings on 30-Day Complete Nutrition Subscriptions',
    'MONTHLY WELLNESS OFFER',
    'Switch to effortless clean eating with chef-prepared Breakfast, Lunch, Snacks & Dinner delivered fresh to your home or office. Pause or skip delivery days anytime.',
    'meal_prep_tray',
    'meal_prep_tray',
    'Claim 30-Day Plan',
    '/subscriptions',
    '#123B16'
  );
  insertBanner.run(
    'cafe_menu_banner',
    'cafe-menu',
    'TrimPlate Artisanal Cafe Menu',
    'WHOLESOME INDULGENCE',
    'Multigrain sandwiches, sourdough toasts, whole-wheat pastas, air-fried snacks, specialty coffees, and flavoured cold brews.',
    'cafe_sandwich',
    'cafe_sandwich',
    'View Special Offers',
    '/offers',
    '#123B16'
  );
  insertBanner.run(
    'green_menu_banner',
    'green-menu',
    'TrimPlate Green Healthy Menu',
    '100% CLEAN & NUTRIENT-DENSE',
    'Good morning detox beverages, wholesome breakfasts, balanced lunches, guilt-free snacks, and light nourishing dinners.',
    'hero_slide_green',
    'green_salad',
    'Start a Daily Plan',
    '/subscriptions',
    '#123B16'
  );
  insertBanner.run(
    'diet_menu_banner',
    'diet-menu',
    'Precision Weight-Management Diet Meals',
    'CALORIE-CONTROLLED EXCELLENCE',
    'Balanced low-GI, portion-controlled meals designed to support sustainable fat loss without sacrificing authentic flavor.',
    'green_salad',
    'green_salad',
    'Subscribe to Diet Plan',
    '/subscriptions?menu=Diet+Menu',
    '#123B16'
  );
  insertBanner.run(
    'gym_menu_banner',
    'gym-menu',
    'High-Protein Gym & Performance Menu',
    'MACRO-VERIFIED MUSCLE NUTRITION',
    'Clean lean proteins, complex slow-release carbohydrates, and recovery shakes weighed to the gram for serious athletes.',
    'hero_slide_gym',
    'hero_bowl',
    'Subscribe to Gym Plan',
    '/subscriptions?menu=Gym+Menu',
    '#123B16'
  );

  // 9. Categories — Exact Green Menu (Section 7) & Cafe Menu (Section 6)
  const insertCat = db.prepare(`
    INSERT INTO categories (name, slug, menu_division, description, image_key, diet_tag, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const catDefs = [
    // Green Menu (Exact 5 categories from Section 7)
    ['Good Morning Beverages', 'good-morning-beverages', 'Green Menu', 'Cold-pressed detox juices, herbal infusions, and chia coolers.', 'green_salad', 'diet', 1],
    ['Healthy Breakfast', 'healthy-breakfast', 'Green Menu', 'Rolled oats, protein chillas, multigrain toasts, and farm-fresh eggs.', 'breakfast_oats', 'diet', 2],
    ['Healthy Lunch', 'healthy-lunch', 'Green Menu', 'Balanced brown rice bowls, lean grilled proteins, and low-GI millet meals.', 'hero_bowl', 'diet', 3],
    ['Healthy Snacks', 'healthy-snacks', 'Green Menu', 'Sprouted chaats, roasted makhana, and high-protein evening bites.', 'green_salad', 'diet', 4],
    ['Healthy Dinner', 'healthy-dinner', 'Green Menu', 'Light soups, steamed veggies, grilled fillets, and soft multigrain phulkas.', 'meal_prep_tray', 'diet', 5],

    // Cafe Menu (Exact 11 categories from Section 6)
    ['Beverages', 'beverages', 'Cafe Menu', 'Refreshing coolers, fresh lime sodas, and fruit infusions.', 'cafe_sandwich', 'cafe', 6],
    ['Sandwiches', 'sandwiches', 'Cafe Menu', 'Triple-layer multigrain grilled club, paneer tikka, and herb chicken sandwiches.', 'cafe_sandwich', 'cafe', 7],
    ['Toast', 'toast', 'Cafe Menu', 'Artisan sourdough avocado toast, peanut banana toast, and garlic herb toast.', 'breakfast_oats', 'cafe', 8],
    ['Pasta', 'pasta', 'Cafe Menu', 'Whole-wheat durum penne in fresh basil pesto and classic arrabbiata sauces.', 'cafe_sandwich', 'cafe', 9],
    ['Chicken Fry', 'chicken-fry', 'Cafe Menu', 'Low-oil air-fried peri-peri chicken strips and herb-crusted chicken bites.', 'hero_bowl', 'gym', 10],
    ['Corn', 'corn', 'Cafe Menu', 'Steamed golden sweet corn tossed in house lemon chaat or pepper herb butter.', 'green_salad', 'cafe', 11],
    ['French Fries', 'french-fries', 'Cafe Menu', 'Crisp golden rock-salted and smoky peri-peri crinkle fries.', 'cafe_sandwich', 'cafe', 12],
    ['Tea', 'tea', 'Cafe Menu', 'Darjeeling whole-leaf green tea, ginger honey immunity tea, and elaichi chai.', 'breakfast_oats', 'cafe', 13],
    ['Cookies', 'cookies', 'Cafe Menu', 'High-fiber baked oats cranberry and dark chocolate almond multigrain cookies.', 'breakfast_oats', 'cafe', 14],
    ['Coffee', 'coffee', 'Cafe Menu', '100% Arabica hot espresso, Americano, cappuccino, and signature cafe brews.', 'cafe_sandwich', 'cafe', 15],
    ['Flavoured Cold Coffee', 'flavoured-cold-coffee', 'Cafe Menu', 'Chilled hazelnut, dark mocha, caramel, and stevia-sweetened cold coffees.', 'cafe_sandwich', 'cafe', 16],
  ] as const;

  const catMap: Record<string, number> = {};
  for (const c of catDefs) {
    const res = insertCat.run(c[0], c[1], c[2], c[3], c[4], c[5], c[6]);
    catMap[c[1]] = Number(res.lastInsertRowid);
  }

  // 10. Products (Cafe Menu & Green Menu)
  const insertProduct = db.prepare(`
    INSERT INTO products (
      category_id, menu_division, name, slug, description, price, is_veg, stock_qty,
      display_labels, diet_types, meal_time, is_available, image_key, seo_title, seo_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);
  const insertNutr = db.prepare(`
    INSERT INTO nutritional_information (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, is_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (product_id, variant_name, price, is_default)
    VALUES (?, ?, ?, ?)
  `);

  interface SeedProd {
    catSlug: string;
    division: 'Green Menu' | 'Cafe Menu';
    name: string;
    slug: string;
    desc: string;
    price: number | null; // null demonstrates Section 7 rule: never invent missing Excel prices; Admin sets later
    isVeg: number;
    stock: number;
    labels: string[];
    diets: string[];
    mealTime: string;
    img: string;
    nutr?: [number, number, number, number, number, number];
    variants?: Array<[string, number, number]>;
  }

  const seedProducts: SeedProd[] = [
    // GREEN MENU — Good Morning Beverages
    {
      catSlug: 'good-morning-beverages',
      division: 'Green Menu',
      name: 'Cucumber Mint Chia Detox Cooler',
      slug: 'cucumber-mint-chia-detox',
      desc: 'Cold-pressed green cucumber, garden mint, soaked organic chia seeds, ginger juice, and Himalayan pink salt.',
      price: 75,
      isVeg: 1,
      stock: 42,
      labels: ['New Arrival', 'Featured'],
      diets: ['diet', 'gym'],
      mealTime: 'Breakfast',
      img: 'green_salad',
      nutr: [45, 1.8, 7.0, 1.2, 3.0, 1.5],
    },
    {
      catSlug: 'good-morning-beverages',
      division: 'Green Menu',
      name: 'ABC Cold-Pressed Vitality Elixir',
      slug: 'abc-cold-pressed-elixir',
      desc: 'Pure slow-extracted Apple, Beetroot, and Carrot morning juice with zero added sugar or water.',
      price: 110,
      isVeg: 1,
      stock: 30,
      labels: ['Bestseller'],
      diets: ['diet'],
      mealTime: 'Breakfast',
      img: 'breakfast_oats',
      nutr: [92, 2.1, 21.0, 0.3, 3.6, 14.0],
    },
    {
      catSlug: 'good-morning-beverages',
      division: 'Green Menu',
      name: 'Wheatgrass & Amla Morning Shot',
      slug: 'wheatgrass-amla-morning-shot',
      desc: 'Freshly harvested organic wheatgrass pressed with vitamin-C rich Indian gooseberry and tulsi.',
      price: null, // Unpriced seasonal Green Menu item — Admin can set price anytime
      isVeg: 1,
      stock: 18,
      labels: [],
      diets: ['diet'],
      mealTime: 'Breakfast',
      img: 'green_salad',
      nutr: [28, 1.2, 5.4, 0.2, 1.8, 1.0],
    },

    // GREEN MENU — Healthy Breakfast
    {
      catSlug: 'healthy-breakfast',
      division: 'Green Menu',
      name: 'Rolled Oats with Fresh Fruits & Chia',
      slug: 'rolled-oats-fruits-chia',
      desc: 'Creamy steel-cut & rolled oats simmered in skimmed milk, topped with banana, berries, almonds, and chia.',
      price: 120,
      isVeg: 1,
      stock: 55,
      labels: ['Bestseller', 'Featured'],
      diets: ['diet'],
      mealTime: 'Breakfast',
      img: 'breakfast_oats',
      nutr: [195, 7.5, 31.0, 3.4, 5.2, 6.0],
      variants: [['Skimmed Milk Bowl', 120, 1], ['Unsweetened Almond Milk', 150, 0]],
    },
    {
      catSlug: 'healthy-breakfast',
      division: 'Green Menu',
      name: 'Boiled Eggs & Multigrain Brown Bread',
      slug: 'boiled-eggs-brown-bread',
      desc: '2 farm-fresh boiled eggs served alongside 2 toasted seeded brown bread slices and crisp cucumber salad.',
      price: 100,
      isVeg: 0,
      stock: 60,
      labels: ['Bestseller'],
      diets: ['diet', 'gym'],
      mealTime: 'Breakfast',
      img: 'breakfast_oats',
      nutr: [210, 15.5, 20.0, 6.5, 3.2, 1.5],
      variants: [['2 Boiled Eggs + 2 Toast', 100, 1], ['4 Egg Whites + 2 Toast', 125, 0]],
    },
    {
      catSlug: 'healthy-breakfast',
      division: 'Green Menu',
      name: '6 Egg-White Herb Omelette & Peanut Toast',
      slug: 'six-egg-white-herb-omelette',
      desc: 'Fluffy 6 egg-white spinach & bell-pepper omelette served with natural peanut butter toast and banana.',
      price: 145,
      isVeg: 0,
      stock: 35,
      labels: ['Featured'],
      diets: ['gym'],
      mealTime: 'Breakfast',
      img: 'breakfast_oats',
      nutr: [285, 31.0, 22.0, 7.5, 3.4, 3.0],
    },
    {
      catSlug: 'healthy-breakfast',
      division: 'Green Menu',
      name: 'Moong Dal & Oats Protein Chilla',
      slug: 'moong-dal-oats-protein-chilla',
      desc: 'Savory stone-ground green moong and oats crepes filled with grated low-fat paneer and mint curd chutney.',
      price: 115,
      isVeg: 1,
      stock: 8, // Low stock to demonstrate real Low-Stock table in Admin Dashboard!
      labels: ['New Arrival', 'Limited Stock'],
      diets: ['diet', 'gym'],
      mealTime: 'Breakfast',
      img: 'breakfast_oats',
      nutr: [198, 14.4, 23.0, 4.1, 5.0, 1.2],
    },

    // GREEN MENU — Healthy Lunch
    {
      catSlug: 'healthy-lunch',
      division: 'Green Menu',
      name: 'Brown Rice, Grilled Herb Chicken & Avocado Bowl',
      slug: 'brown-rice-grilled-chicken-bowl',
      desc: 'Char-grilled rosemary chicken breast over nutty brown rice, steamed broccoli, cherry tomatoes, and lemon dressing.',
      price: 220,
      isVeg: 0,
      stock: 48,
      labels: ['Bestseller', 'Featured'],
      diets: ['diet', 'gym'],
      mealTime: 'Lunch',
      img: 'hero_bowl',
      nutr: [410, 38.5, 42.0, 8.4, 6.2, 2.1],
      variants: [['Regular (150g Chicken)', 220, 1], ['Athlete Pro (220g Chicken)', 275, 0]],
    },
    {
      catSlug: 'healthy-lunch',
      division: 'Green Menu',
      name: 'Char-Grilled Paneer & Quinoa Power Bowl',
      slug: 'grilled-paneer-quinoa-bowl',
      desc: 'Low-fat cottage cheese cubes marinated in fresh herbs over fluffy tri-color quinoa, roasted bell peppers, and greens.',
      price: 210,
      isVeg: 1,
      stock: 40,
      labels: ['Bestseller', 'New Arrival'],
      diets: ['diet', 'gym'],
      mealTime: 'Lunch',
      img: 'hero_bowl',
      nutr: [395, 25.0, 41.0, 11.2, 6.5, 2.4],
    },
    {
      catSlug: 'healthy-lunch',
      division: 'Green Menu',
      name: 'Low-GI Methi Foxtail Millet & Palak Dal Meal',
      slug: 'low-gi-methi-millet-meal',
      desc: 'Diabetic-friendly foxtail millet cooked with fresh fenugreek leaves, iron-rich spinach dal, and roasted flaxseed raita.',
      price: 165,
      isVeg: 1,
      stock: 32,
      labels: ['Featured'],
      diets: ['diet'],
      mealTime: 'Lunch',
      img: 'meal_prep_tray',
      nutr: [310, 14.8, 44.0, 6.2, 9.8, 1.4],
    },

    // GREEN MENU — Healthy Snacks
    {
      catSlug: 'healthy-snacks',
      division: 'Green Menu',
      name: 'Protein Sprouted Moong & Pomegranate Salad',
      slug: 'protein-sprouts-salad',
      desc: 'Crunchy sprouted green moong tossed with diced English cucumber, cherry tomato, pomegranate rubies, and lime.',
      price: 80,
      isVeg: 1,
      stock: 65,
      labels: ['Bestseller'],
      diets: ['diet', 'gym'],
      mealTime: 'Snacks',
      img: 'green_salad',
      nutr: [110, 8.4, 16.0, 1.1, 5.6, 2.0],
    },
    {
      catSlug: 'healthy-snacks',
      division: 'Green Menu',
      name: 'Isolate Cocoa Protein Shake & Soaked Almonds',
      slug: 'isolate-protein-shake-almonds',
      desc: 'Cold-blended zero-sugar whey isolate cocoa shake paired with 20g peeled almonds and walnut halves.',
      price: 160,
      isVeg: 1,
      stock: 28,
      labels: ['Bestseller', 'Featured'],
      diets: ['gym'],
      mealTime: 'Snacks',
      img: 'hero_slide_gym',
      nutr: [230, 27.0, 9.0, 8.5, 2.4, 1.5],
    },
    {
      catSlug: 'healthy-snacks',
      division: 'Green Menu',
      name: 'Himalayan Roasted Makhana & Seed Trail Bowl',
      slug: 'roasted-makhana-seed-bowl',
      desc: 'Slow-roasted lotus seeds tumbled with pumpkin seeds, sunflower kernels, curry leaves, and black pepper.',
      price: 95,
      isVeg: 1,
      stock: 9, // Low stock
      labels: ['New Arrival', 'Limited Stock'],
      diets: ['diet'],
      mealTime: 'Snacks',
      img: 'green_salad',
      nutr: [135, 6.2, 18.0, 4.0, 3.2, 0.8],
    },

    // GREEN MENU — Healthy Dinner
    {
      catSlug: 'healthy-dinner',
      division: 'Green Menu',
      name: 'Lemon-Herb Grilled Bhetki Fillet & Steamed Greens',
      slug: 'grilled-fish-steamed-greens',
      desc: 'Pan-seared Kolkata bhetki fillet in lemon-garlic olive oil with steamed broccoli, zucchini, and baby carrots.',
      price: 260,
      isVeg: 0,
      stock: 7, // Low stock
      labels: ['Featured', 'Special Offer', 'Limited Stock'],
      diets: ['diet', 'gym'],
      mealTime: 'Dinner',
      img: 'hero_slide_gym',
      nutr: [340, 36.0, 16.0, 12.5, 4.8, 1.6],
    },
    {
      catSlug: 'healthy-dinner',
      division: 'Green Menu',
      name: 'Broccoli Herb Clear Soup & 2 Multigrain Phulkas',
      slug: 'broccoli-soup-multigrain-phulka',
      desc: 'Light digestive vegetable clear broth paired with 2 soft multigrain rotis and homestyle paneer bhurji.',
      price: 135,
      isVeg: 1,
      stock: 44,
      labels: ['Bestseller'],
      diets: ['diet'],
      mealTime: 'Dinner',
      img: 'meal_prep_tray',
      nutr: [265, 13.5, 36.0, 5.4, 6.8, 2.2],
    },

    // CAFE MENU — All 11 Categories
    {
      catSlug: 'beverages',
      division: 'Cafe Menu',
      name: 'Fresh Garden Mint Lime Mojito',
      slug: 'fresh-mint-lime-mojito',
      desc: 'Hand-muddled mint leaves, fresh Gondhoraj lime wedges, sparkling water, and rock salt.',
      price: 75,
      isVeg: 1,
      stock: 70,
      labels: [],
      diets: [],
      mealTime: 'All Day',
      img: 'cafe_sandwich',
      nutr: [55, 0.3, 13.0, 0, 0.4, 10.5],
    },
    {
      catSlug: 'sandwiches',
      division: 'Cafe Menu',
      name: 'Multigrain Grilled Veg & Avocado Club Sandwich',
      slug: 'multigrain-veg-club-sandwich',
      desc: 'Triple-decker seeded brown bread layered with grilled zucchini, peppers, avocado, lettuce, and mint yogurt spread.',
      price: 120,
      isVeg: 1,
      stock: 45,
      labels: ['Bestseller'],
      diets: ['diet'],
      mealTime: 'Snacks',
      img: 'cafe_sandwich',
      nutr: [280, 10.5, 38.0, 8.2, 5.4, 3.2],
      variants: [['Regular Multigrain', 120, 1], ['With Low-Fat Cheese', 145, 0]],
    },
    {
      catSlug: 'sandwiches',
      division: 'Cafe Menu',
      name: 'Smoked Herb Chicken Breast Sandwich',
      slug: 'smoked-herb-chicken-sandwich',
      desc: 'Toasted multigrain bread generously filled with shredded herb chicken breast, crisp lettuce, and mustard.',
      price: 150,
      isVeg: 0,
      stock: 38,
      labels: ['Bestseller', 'Featured'],
      diets: ['gym'],
      mealTime: 'Snacks',
      img: 'cafe_sandwich',
      nutr: [330, 26.0, 34.0, 9.0, 4.1, 2.5],
    },
    {
      catSlug: 'toast',
      division: 'Cafe Menu',
      name: 'Smashed Avocado & Microgreens Sourdough Toast',
      slug: 'avocado-sourdough-toast',
      desc: 'Artisan country sourdough topped with seasoned Hass avocado, cherry tomatoes, feta crumble, and pumpkin seeds.',
      price: 160,
      isVeg: 1,
      stock: 30,
      labels: ['New Arrival', 'Featured'],
      diets: ['diet'],
      mealTime: 'Breakfast',
      img: 'hero_slide_green',
      nutr: [240, 6.8, 26.0, 12.0, 6.5, 1.4],
    },
    {
      catSlug: 'pasta',
      division: 'Cafe Menu',
      name: 'Whole-Wheat Basil Walnut Pesto Penne',
      slug: 'whole-wheat-basil-pesto-penne',
      desc: '100% durum whole-wheat penne tossed in cold-pressed olive oil basil pesto with broccoli and cherry tomatoes.',
      price: 175,
      isVeg: 1,
      stock: 36,
      labels: ['Bestseller'],
      diets: [],
      mealTime: 'Lunch',
      img: 'cafe_sandwich',
      nutr: [380, 13.0, 52.0, 12.5, 6.8, 3.0],
      variants: [['Veg Whole-Wheat', 175, 1], ['Add Grilled Chicken', 215, 0]],
    },
    {
      catSlug: 'chicken-fry',
      division: 'Cafe Menu',
      name: 'Air-Fried Peri Peri Chicken Tenders (6 Pcs)',
      slug: 'air-fried-peri-peri-chicken',
      desc: '90% less oil air-fried tender chicken breast strips dusted in house peri-peri spice with mint dip.',
      price: 165,
      isVeg: 0,
      stock: 34,
      labels: ['Bestseller'],
      diets: ['gym'],
      mealTime: 'Snacks',
      img: 'hero_bowl',
      nutr: [275, 32.0, 11.0, 9.5, 1.2, 0.8],
    },
    {
      catSlug: 'corn',
      division: 'Cafe Menu',
      name: 'Steamed Lemon Masala Sweet Corn Cup',
      slug: 'steamed-lemon-sweet-corn',
      desc: 'Tender golden sweet corn kernels tossed hot with fresh lime juice, black salt, and coriander.',
      price: 65,
      isVeg: 1,
      stock: 60,
      labels: [],
      diets: ['diet'],
      mealTime: 'Snacks',
      img: 'green_salad',
      nutr: [115, 3.8, 22.0, 1.8, 3.2, 4.5],
    },
    {
      catSlug: 'french-fries',
      division: 'Cafe Menu',
      name: 'Peri Peri Crinkle Cut Fries',
      slug: 'peri-peri-crinkle-fries',
      desc: 'Crisp golden crinkle fries seasoned with smoky peri-peri spice blend.',
      price: 100,
      isVeg: 1,
      stock: 50,
      labels: [],
      diets: [],
      mealTime: 'Snacks',
      img: 'cafe_sandwich',
      variants: [['Regular', 100, 1], ['Large Share', 135, 0]],
    },
    {
      catSlug: 'tea',
      division: 'Cafe Menu',
      name: 'Darjeeling First-Flush Organic Green Tea',
      slug: 'darjeeling-organic-green-tea',
      desc: 'Antioxidant-rich whole-leaf Himalayan green tea brewed fresh to order.',
      price: 45,
      isVeg: 1,
      stock: 80,
      labels: [],
      diets: ['diet'],
      mealTime: 'All Day',
      img: 'hero_slide_green',
      nutr: [5, 0, 1.0, 0, 0, 0],
    },
    {
      catSlug: 'cookies',
      division: 'Cafe Menu',
      name: 'Baked Rolled Oats & Cranberry Cookies (3 Pcs)',
      slug: 'oats-cranberry-cookies',
      desc: 'High-fiber multigrain oats cookies studded with tart cranberries and organic jaggery.',
      price: 70,
      isVeg: 1,
      stock: 40,
      labels: ['New Arrival'],
      diets: [],
      mealTime: 'Snacks',
      img: 'breakfast_oats',
      nutr: [165, 4.0, 24.0, 6.2, 3.8, 6.0],
    },
    {
      catSlug: 'coffee',
      division: 'Cafe Menu',
      name: 'Double-Shot Arabica Hot Americano',
      slug: 'arabica-hot-americano',
      desc: '100% single-estate Arabica espresso diluted with hot water — zero sugar, clean focus.',
      price: 80,
      isVeg: 1,
      stock: 75,
      labels: [],
      diets: ['diet', 'gym'],
      mealTime: 'All Day',
      img: 'cafe_sandwich',
      nutr: [8, 0.5, 1.5, 0, 0, 0],
    },
    {
      catSlug: 'flavoured-cold-coffee',
      division: 'Cafe Menu',
      name: 'Roasted Hazelnut Cold Coffee (Stevia Option)',
      slug: 'roasted-hazelnut-cold-coffee',
      desc: 'Smooth chilled Arabica espresso blended with toned milk and roasted hazelnut aroma.',
      price: 125,
      isVeg: 1,
      stock: 45,
      labels: ['New Arrival', 'Special Offer'],
      diets: [],
      mealTime: 'All Day',
      img: 'cafe_sandwich',
      nutr: [130, 5.4, 15.0, 3.8, 0, 8.5],
      variants: [['Classic Cane Sugar', 125, 1], ['Zero-Calorie Stevia', 135, 0]],
    },
    {
      catSlug: 'flavoured-cold-coffee',
      division: 'Cafe Menu',
      name: 'Dark Belgian Mocha Protein Frappe',
      slug: 'dark-mocha-protein-frappe',
      desc: 'Unsweetened dark cocoa, double espresso, and chilled milk blended thick over ice.',
      price: 140,
      isVeg: 1,
      stock: 38,
      labels: ['Bestseller'],
      diets: ['gym'],
      mealTime: 'All Day',
      img: 'hero_slide_gym',
      nutr: [155, 9.2, 16.0, 4.2, 1.5, 7.0],
    },
  ];

  for (const p of seedProducts) {
    const res = insertProduct.run(
      catMap[p.catSlug],
      p.division,
      p.name,
      p.slug,
      p.desc,
      p.price,
      p.isVeg,
      p.stock,
      JSON.stringify(p.labels),
      JSON.stringify(p.diets),
      p.mealTime,
      p.img,
      `${p.name} | TrimPlate ${p.division}`,
      p.desc
    );
    const pid = Number(res.lastInsertRowid);
    if (p.nutr) {
      insertNutr.run(pid, p.nutr[0], p.nutr[1], p.nutr[2], p.nutr[3], p.nutr[4], p.nutr[5]);
    }
    if (p.variants) {
      for (const v of p.variants) {
        insertVariant.run(pid, v[0], v[1], v[2]);
      }
    }
  }

  // 11. Homepage Sections (Section 5 — Reorderable, Enable/Disable, Editable Content & Config)
  const insertSection = db.prepare(`
    INSERT INTO homepage_sections (
      section_key, title, subtitle, description, image_url, cta_text, cta_url,
      bg_color, product_limit, sort_order, is_enabled, config_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  insertSection.run(
    'welcome',
    'Healthy Eating Made Delicious.',
    'WELCOME TO TRIMPLATE',
    'At TrimPlate, we believe nutritious food should never feel like a compromise. Every morning, our culinary chefs and certified nutritionists prepare macro-balanced Green Menu bowls, weight-loss Diet tiffins, high-protein Gym meals, and wholesome Cafe favorites using fresh, locally sourced produce and cold-pressed oils.',
    'hero_slide_feast',
    'Learn More About Us',
    '/page/about-us',
    '#FFFFFF',
    4,
    1,
    JSON.stringify({
      highlights: [
        '100% Fresh Daily Preparation — Zero Frozen Gravies',
        'Lab-Verified Nutritional Macros on Healthy Meals',
        'Cold-Pressed Oils, Whole Grains & Zero Refined Maida',
      ],
    })
  );

  insertSection.run(
    'explore_menu',
    'Explore Our Curated Menus',
    'FOUR DISTINCT CULINARY EXPERIENCES',
    'Whether you are craving an artisanal multigrain sandwich, a 120-kcal detox breakfast, or a 38g protein post-workout bowl, explore our four specialized menus.',
    '',
    'View All Products',
    '/green-menu',
    '#FFF8ED',
    4,
    2,
    JSON.stringify({
      cards: [
        {
          title: 'Cafe Menu',
          description: 'Multigrain sandwiches, sourdough toasts, whole-wheat pasta, specialty coffees & cold brews.',
          image: 'cafe_sandwich',
          url: '/cafe-menu',
          cta: 'Explore Cafe Menu',
        },
        {
          title: 'Green Menu',
          description: 'Good morning juices, wholesome breakfasts, balanced lunches, sprouts & light dinners.',
          image: 'hero_slide_green',
          url: '/green-menu',
          cta: 'Explore Green Menu',
        },
        {
          title: 'Diet Menu',
          description: 'Portion-controlled, low-GI calorie-counted meals designed for sustainable weight management.',
          image: 'green_salad',
          url: '/diet-menu',
          cta: 'Explore Diet Menu',
        },
        {
          title: 'Gym Menu',
          description: 'High-protein grilled chicken, fish, paneer, egg-white & whey recovery meals for strength.',
          image: 'hero_slide_gym',
          url: '/gym-menu',
          cta: 'Explore Gym Menu',
        },
      ],
    })
  );

  insertSection.run(
    'new_arrivals',
    'Fresh New Arrivals',
    'JUST ADDED TO OUR KITCHEN',
    'Taste our latest seasonal creations, superfood bowls, and guilt-free cafe treats.',
    '',
    'Browse Full Menu',
    '/green-menu',
    '#FFFFFF',
    4,
    3,
    JSON.stringify({})
  );

  insertSection.run(
    'special_offers',
    'Special Offers & Active Promotions',
    'LIMITED-TIME SAVINGS',
    'Enjoy exclusive introductory discounts on weekly meal subscriptions, healthy combos, and cafe orders.',
    '',
    'View All Offers',
    '/offers',
    '#FFF8ED',
    4,
    4,
    JSON.stringify({})
  );

  insertSection.run(
    'best_sellers',
    'Customer Best Sellers',
    'MOST LOVED DISHES',
    'Our highest-ordered bowls, wraps, and shakes trusted by hundreds of daily eaters across Kolkata.',
    '',
    'Order Best Sellers',
    '/green-menu',
    '#FFFFFF',
    4,
    5,
    JSON.stringify({})
  );

  insertSection.run(
    'green_menu_highlight',
    'Wholesome Green Healthy Menu',
    'FROM SUNRISE TO DINNER',
    'Balanced meals across Breakfast, Lunch, Snacks, and Dinner — thoughtfully portioned so you stay energized all day.',
    'hero_slide_green',
    'Explore Green Menu',
    '/green-menu',
    '#E8F5E9',
    4,
    6,
    JSON.stringify({})
  );

  insertSection.run(
    'diet_plans',
    'Flexible Daily Meal Subscriptions',
    'SUBSCRIBE & SAVE UP TO 20%',
    'Skip daily food decisions. Choose your duration, customize Veg or Non-Veg preferences, and pause or skip days anytime.',
    '',
    'View All Plans',
    '/subscriptions',
    '#FFFFFF',
    4,
    7,
    JSON.stringify({})
  );

  insertSection.run(
    'why_choose',
    'Why Choose TrimPlate?',
    'THE TRIMPLATE PROMISE',
    'Built from the ground up as a dedicated healthy culinary kitchen rather than an ordinary restaurant.',
    '',
    '',
    '',
    '#FFF8ED',
    4,
    8,
    JSON.stringify({
      features: [
        {
          title: 'Freshly Prepared Meals',
          description: 'Cooked in small batches every morning and evening — never frozen, reheated, or artificially preserved.',
        },
        {
          title: 'Healthy Clean Ingredients',
          description: 'Whole grains, cold-pressed oils, farm-fresh vegetables, lean antibiotic-free proteins, and organic seeds.',
        },
        {
          title: 'Fitness-Focused Options',
          description: 'Dedicated Diet Menu for fat loss and high-protein Gym Menu with lab-verified calorie and macro counts.',
        },
        {
          title: 'Convenient Punctual Delivery',
          description: 'Scheduled morning and lunch slot deliveries in spill-proof eco-friendly meal trays across the city.',
        },
      ],
    })
  );

  // Note: SEASONAL PROMOTION ('promo_banner') removed; New Item & Promo Launches run directly in Hero Slider.

  insertSection.run(
    'gallery',
    'Inside Our Culinary Table',
    'FOOD GALLERY',
    'Every dish is plated with vibrant seasonal produce, clean proteins, and house-made dressings.',
    '',
    '',
    '',
    '#FFFFFF',
    6,
    11,
    JSON.stringify({})
  );

  insertSection.run(
    'newsletter',
    'Join the TrimPlate Wellness Club',
    'WEEKLY NUTRITION TIPS & EXCLUSIVE OFFERS',
    'Subscribe with your email to receive seasonal menu launches, dietitian meal guides, and subscriber-only coupon codes.',
    '',
    'Subscribe Now',
    '',
    '#123B16',
    1,
    12,
    JSON.stringify({})
  );

  // 12. Special Offers (Section 5 & Section 11C — Active + 1 Expired offer to prove automatic expiry filtering!)
  const insertOffer = db.prepare(`
    INSERT INTO offers (
      title, description, banner_image, discount_type, discount_value, coupon_code,
      start_datetime, end_datetime, applicable_categories, min_order_value, max_discount,
      usage_limit, used_count, cta_text, cta_url, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertOffer.run(
    '20% OFF Healthy Green Menu Orders',
    'Enjoy 20% instant discount up to ₹150 on all Healthy Breakfast, Lunch, Snacks & Dinner bowls.',
    'hero_slide_green',
    'percentage',
    20,
    'TRIM20',
    '2026-01-01T00:00',
    '2027-12-31T23:59',
    'Green Menu',
    199,
    150,
    500,
    42,
    'Order Green Menu',
    '/green-menu'
  );
  insertOffer.run(
    'Flat ₹150 OFF Weekly & Monthly Subscriptions',
    'Kickstart consistent healthy habits with flat ₹150 savings on 15-Day Fitness and 30-Day Best Value plans.',
    'meal_prep_tray',
    'flat',
    150,
    'STAYTRIM150',
    '2026-01-01T00:00',
    '2027-12-31T23:59',
    'Subscriptions',
    999,
    150,
    300,
    29,
    'View Subscription Plans',
    '/subscriptions'
  );
  insertOffer.run(
    'Buy More, Save More — Cafe & Shake Combo',
    'Get flat ₹50 OFF on your first TrimPlate Artisanal Cafe order above ₹249.',
    'cafe_sandwich',
    'flat',
    50,
    'FIRST50',
    '2026-01-01T00:00',
    '2027-12-31T23:59',
    'Cafe Menu',
    249,
    50,
    1000,
    87,
    'Explore Cafe Menu',
    '/cafe-menu'
  );
  // Expired offer (end_datetime in 2025) — automatically hidden on active promotional pages, visible in Admin as Expired!
  insertOffer.run(
    'Monsoon Detox Flash Offer (Expired Sample)',
    'Seasonal monsoon immunity booster offer — automatically hidden from public site past end date.',
    'green_salad',
    'percentage',
    15,
    'MONSOON15',
    '2025-07-01T00:00',
    '2025-08-31T23:59',
    'All',
    199,
    100,
    100,
    100,
    'Expired',
    '/offers'
  );

  // 13. Coupons
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, used_count, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCoupon.run('TRIM20', '20% OFF up to ₹150 on healthy meals & cafe orders', 'percentage', 20, 199, 150, 500, 42, '2027-12-31');
  insertCoupon.run('FIRST50', 'Flat ₹50 OFF on your first TrimPlate order above ₹249', 'flat', 50, 249, 50, 1000, 87, '2027-12-31');
  insertCoupon.run('STAYTRIM150', 'Flat ₹150 OFF on 15-Day & 30-Day Subscription Plans', 'flat', 150, 999, 150, 300, 29, '2027-12-31');

  // 14. Subscription Plans (Section 9)
  const insertPlan = db.prepare(`
    INSERT INTO subscription_plans (
      name, subtitle, duration_days, price, original_price, price_per_person_label,
      badge_text, card_theme, benefits_json, meals_included, delivery_info
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPlan.run(
    '3 Days Trial Plan',
    'Experience TrimPlate Freshness',
    3,
    299,
    360,
    'Starter Pack',
    'Trial',
    'blue',
    JSON.stringify(['Daily Fresh Kitchen Preparation', 'Choose Diet, Gym or Green Menu', 'Morning or Lunch Slot Delivery', 'Zero Delivery Fee']),
    'Breakfast, Lunch, Snacks, Dinner',
    'Delivered daily in eco-safe insulated meal boxes'
  );
  const plan7 = insertPlan.run(
    '7 Days Healthy Plan',
    'Weekly Clean Eating Reset',
    7,
    599,
    749,
    'Weekly Plan',
    'Popular',
    'green',
    JSON.stringify(['7 Days Rotating Chef Menu', 'Veg or Non-Veg Customization', 'Pause or Skip Up to 2 Days', 'Free Doorstep Delivery']),
    'Breakfast, Lunch, Snacks, Dinner',
    'Flexible morning (8–10 AM) or office (12–1:30 PM) slot'
  );
  insertPlan.run(
    '15 Days Fitness Plan',
    'Consistent Macro Nutrition',
    15,
    1199,
    1499,
    'Bi-Weekly Plan',
    'Fitness Pick',
    'cream',
    JSON.stringify(['Macro-Counted Diet or Gym Meals', 'Pause or Skip Up to 4 Delivery Days', 'Priority Morning Dispatch', 'Free Nutritionist Check-In']),
    'Breakfast, Lunch, Snacks, Dinner',
    'Includes complimentary macro tracking sheet'
  );
  const plan30 = insertPlan.run(
    '30 Days Best Value Plan',
    'Complete Monthly Transformation',
    30,
    1999,
    2499,
    'Monthly Plan',
    'Best Value · Save 20%',
    'purple',
    JSON.stringify(['Lowest Per-Meal Cost (Save 20%)', 'Switch Between Diet, Gym & Green Menus', 'Unlimited Pause or Skip Days', 'Dedicated Dietitian Consultation']),
    'Breakfast, Lunch, Snacks, Dinner',
    'Priority zero-fee daily delivery + easy 1-click renewal'
  );

  // 15. CMS Pages (Section 11F)
  const insertPage = db.prepare(`
    INSERT INTO pages (title, slug, hero_subtitle, content_html, banner_image, seo_title, seo_description, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertPage.run(
    'About TrimPlate',
    'about-us',
    'Eat Smart. Stay Trim. — Redefining Everyday Healthy Eating.',
    `<h2>Our Culinary Philosophy</h2>
     <p>TrimPlate was founded with a singular mission: making clean, macro-balanced, chef-crafted healthy food effortless and genuinely delicious. Unlike conventional cloud kitchens that rely on heavy creams, refined flours, and reused cooking oils, every TrimPlate dish is prepared fresh from scratch using whole grains, cold-pressed oils, lean proteins, and farm-fresh vegetables.</p>
     <h3>Two Distinct Kitchens Under One Roof</h3>
     <p>Our <strong>Green Menu</strong> delivers calorie-counted breakfasts, lunches, snacks, and dinners alongside dedicated Diet and High-Protein Gym plans. Meanwhile, our <strong>Artisanal Cafe Menu</strong> reimagines sandwiches, sourdough toasts, whole-wheat pastas, air-fried snacks, and specialty cold coffees with wholesome ingredients.</p>`,
    'hero_slide_feast',
    'About Us | TrimPlate Healthy Food & Meal Subscriptions',
    'Learn how TrimPlate prepares fresh, macro-counted healthy meals, Cafe favorites, and daily diet subscriptions.'
  );
  insertPage.run(
    'Contact Us',
    'contact-us',
    'Questions about custom meal plans, corporate catering, or orders? Reach out anytime.',
    `<h2>Visit or Call Our Culinary Studio</h2>
     <p>Our nutrition desk and customer care team are available seven days a week from 7:00 AM to 10:30 PM to assist with custom meal plans, allergen notes, and corporate wellness orders.</p>`,
    'hero_slide_green',
    'Contact TrimPlate | Customer Care & Nutrition Desk',
    'Get in touch with TrimPlate for healthy food delivery, diet consultations, and subscription support.'
  );
  insertPage.run(
    'Privacy Policy',
    'privacy-policy',
    'How we safeguard your personal data, dietary preferences, and order history.',
    `<h2>1. Information We Collect</h2><p>We collect only the contact details, delivery addresses, and dietary preferences necessary to prepare and deliver your TrimPlate orders accurately.</p>
     <h2>2. Data Security & Payments</h2><p>All online and UPI payment verifications are processed over encrypted channels. We never sell or rent customer information to third parties.</p>`,
    'hero_slide_green',
    'Privacy Policy | TrimPlate',
    'Read the TrimPlate Privacy Policy.'
  );
  insertPage.run(
    'Terms & Conditions',
    'terms-and-conditions',
    'Terms governing online food orders, coupon redemptions, and daily meal subscriptions.',
    `<h2>1. Fresh Meal Ordering</h2><p>All menu prices are listed in INR and controlled directly by TrimPlate kitchen management. Product availability depends on fresh seasonal ingredients.</p>
     <h2>2. Subscription Pause & Skip Rules</h2><p>Subscribers may pause or skip delivery days from their Customer Account Dashboard prior to 8:00 PM for the following day's dispatch.</p>`,
    'meal_prep_tray',
    'Terms & Conditions | TrimPlate',
    'Terms and conditions for TrimPlate food ordering and subscriptions.'
  );
  insertPage.run(
    'Delivery Policy',
    'delivery-policy',
    'Punctual insulated delivery across serviceable city zones.',
    `<h2>Delivery Timings & Zones</h2><p>À la carte Cafe and Green Menu orders are dispatched fresh within 35–45 minutes. Daily subscription meals arrive in your chosen morning (7:30–10:00 AM) or lunch (12:00–1:30 PM) window.</p>`,
    'meal_prep_tray',
    'Delivery Policy | TrimPlate',
    'Delivery slots, charges, and free-shipping thresholds at TrimPlate.'
  );
  insertPage.run(
    'Refund & Cancellation Policy',
    'refund-policy',
    'Transparent order cancellation and subscription credit rules.',
    `<h2>Order Cancellations</h2><p>Orders in the "Placed" stage prior to kitchen preparation can be cancelled instantaneously from My Orders for a 100% refund.</p>`,
    'hero_slide_feast',
    'Refund & Cancellation Policy | TrimPlate',
    'Cancellation and refund terms for TrimPlate orders.'
  );

  // 16. Testimonials & Food Gallery & Newsletter
  const insertTesti = db.prepare(`
    INSERT INTO testimonials (customer_name, designation, location, rating, comment, sort_order, is_approved)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  insertTesti.run(
    'Ananya Chatterjee',
    'Product Designer · 30-Day Diet Subscriber',
    'Park Street, Kolkata',
    5,
    'Switched my weekday lunches and dinners to TrimPlate three months ago. Lost 4.2 kg steadily while enjoying warm millet bowls, grilled paneer, and sprouts salads every day.',
    1
  );
  insertTesti.run(
    'Rohan Sen',
    'Strength Coach · Gym Plan Member',
    'Ballygunge, Kolkata',
    5,
    'Finding honest 35g+ protein meals without restaurant grease used to be impossible. TrimPlate weighs every portion — the Grilled Chicken Bowl and Egg-White Omelette are spot on.',
    2
  );
  insertTesti.run(
    'Dr. Priya Mukherjee',
    'Consultant Physician',
    'Southern Avenue, Kolkata',
    5,
    'I recommend TrimPlate Green Menu bowls to patients looking for low-GI, low-sodium homestyle meals. Even their multigrain Cafe sandwiches feel light and fresh.',
    3
  );

  const insertGallery = db.prepare(`
    INSERT INTO gallery (title, caption, category, image_url, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insertGallery.run('Signature Grilled Herb Protein Bowl', '38.5g lean protein with steamed broccoli & brown rice', 'Healthy Lunch', 'hero_bowl', 1);
  insertGallery.run('Morning Oats, Berries & Farm Eggs', 'Slow-release complex carbs & omega-rich chia seeds', 'Healthy Breakfast', 'breakfast_oats', 2);
  insertGallery.run('Sprouted Moong & Pomegranate Chaat', '110 kcal refreshing mid-day crunch', 'Healthy Snacks', 'green_salad', 3);
  insertGallery.run('Artisanal Multigrain Club & Pesto Penne', 'Wholesome TrimPlate Cafe favorites', 'Cafe Menu', 'cafe_sandwich', 4);
  insertGallery.run('4-Compartment Daily Subscription Box', 'Eco-safe portioned meal prep delivered daily', 'Subscriptions', 'meal_prep_tray', 5);
  insertGallery.run('High-Protein Seared Fillet & Greens', 'Clean athlete recovery dinner spread', 'Gym Menu', 'hero_slide_gym', 6);

  db.prepare('INSERT INTO newsletter_subscribers (email, name) VALUES (?, ?)').run('ananya@trimplate.in', 'Ananya Chatterjee');
  db.prepare('INSERT INTO newsletter_subscribers (email, name) VALUES (?, ?)').run('rohan.sen@gmail.com', 'Rohan Sen');

  // 17. Staff, Real Historical Orders & Subscriptions (100% SQL-backed Analytics!)
  const insertStaff = db.prepare(
    'INSERT INTO staff (name, role, mobile, email, vehicle_number, zone, status, active_deliveries) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const staff1 = insertStaff.run('Subhajit Das', 'Delivery Partner', '9830551122', 'subhajit@trimplate.in', 'WB-02-AK-4821', 'Park Street & Central', 'Active', 2);
  const staff2 = insertStaff.run('Arindam Roy', 'Delivery Partner', '9830553344', 'arindam@trimplate.in', 'WB-06-M-9012', 'Salt Lake & New Town', 'Active', 1);
  insertStaff.run('Chef Debashis Paul', 'Executive Diet Chef', '9830557788', 'chef@trimplate.in', '-', 'Central Kitchen', 'Active', 0);

  const insertSub = db.prepare(`
    INSERT INTO subscriptions (
      subscription_code, user_id, plan_id, menu_preference, selected_meals, is_veg_only,
      start_date, end_date, delivery_slot, address_id, status, skipped_dates_json, total_paid, payment_method, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const sub1 = insertSub.run('SUB-TP701', cust1.lastInsertRowid, plan7.lastInsertRowid, 'Diet Menu', 'Breakfast, Lunch, Dinner', 0, '2026-10-24', '2026-10-31', '8:00 AM - 10:00 AM', addr1.lastInsertRowid, 'Active', '[]', 599, 'UPI', '2026-10-24 09:00:00');
  const sub2 = insertSub.run('SUB-TP302', cust2.lastInsertRowid, plan30.lastInsertRowid, 'Gym Menu', 'Breakfast, Lunch, Snacks, Dinner', 0, '2026-10-10', '2026-11-09', '7:30 AM - 9:30 AM', addr2.lastInsertRowid, 'Active', '["2026-10-29"]', 1999, 'Online Payment Gateway', '2026-10-10 10:15:00');
  insertSub.run('SUB-TP153', cust3.lastInsertRowid, 3, 'Green Menu', 'Lunch, Dinner', 1, '2026-09-12', '2026-09-27', '12:00 PM - 1:30 PM', addr3.lastInsertRowid, 'Completed', '[]', 1199, 'UPI', '2026-09-12 11:00:00');

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_code, user_id, customer_name_snapshot, customer_phone_snapshot, address_id, delivery_address_snapshot,
      delivery_date, subtotal, delivery_charge, gst_amount, coupon_code, discount_amount, total_amount,
      payment_method, payment_reference, payment_status, order_status, assigned_staff_id, estimated_delivery, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, item_type, product_id, plan_id, item_name, variant_name, unit_price, quantity, total_price, image_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPayment = db.prepare(`
    INSERT INTO payments (transaction_id, user_id, order_id, subscription_id, amount, method, gateway_reference, status, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTrack = db.prepare(`
    INSERT INTO delivery_tracking (order_id, status, location_note, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Seed historical & today's orders across Aug, Sep, Oct so all SQL revenue charts are real & rich
  const histOrders = [
    ['TP80112', cust1.lastInsertRowid, 'Ananya Chatterjee', '9830012345', addr1.lastInsertRowid, '14B Park Street, Kolkata 700016', '2026-08-18', 640, 0, 32, '', 0, 672, 'UPI', 'UPI-88201', 'Paid', 'Delivered', staff1.lastInsertRowid, 'Delivered', '2026-08-18 13:10:00', 8, 'Brown Rice, Grilled Herb Chicken & Avocado Bowl', 220, 2],
    ['TP80450', cust2.lastInsertRowid, 'Rohan Sen', '9831145678', addr2.lastInsertRowid, '42 Ballygunge Circular Rd, Kolkata', '2026-09-09', 1199, 0, 60, '', 0, 1259, 'Online Payment Gateway', 'PAY-99102', 'Paid', 'Delivered', staff2.lastInsertRowid, 'Delivered', '2026-09-09 09:40:00', 14, 'Lemon-Herb Grilled Bhetki Fillet & Steamed Greens', 260, 2],
    ['TP90211', cust3.lastInsertRowid, 'Priya Mukherjee', '9836678901', addr3.lastInsertRowid, '19 Southern Avenue, Kolkata', '2026-09-24', 520, 40, 26, 'TRIM20', 104, 482, 'UPI', 'UPI-90341', 'Paid', 'Delivered', staff1.lastInsertRowid, 'Delivered', '2026-09-24 19:30:00', 9, 'Char-Grilled Paneer & Quinoa Power Bowl', 210, 2],
    ['TP94110', cust2.lastInsertRowid, 'Rohan Sen', '9831145678', addr2.lastInsertRowid, '42 Ballygunge Circular Rd, Kolkata', '2026-10-10', 1999, 0, 100, 'STAYTRIM150', 150, 1949, 'Online Payment Gateway', 'PAY-99480', 'Paid', 'Delivered', staff2.lastInsertRowid, 'Delivered', '2026-10-10 10:15:00', 8, 'Brown Rice, Grilled Herb Chicken & Avocado Bowl', 220, 3],
    ['TP96504', cust1.lastInsertRowid, 'Ananya Chatterjee', '9830012345', addr1.lastInsertRowid, '14B Park Street, Kolkata 700016', '2026-10-25', 599, 0, 30, '', 0, 629, 'UPI', 'UPI-96504', 'Paid', 'Out for Delivery', staff1.lastInsertRowid, 'Today, 1:00 PM - 1:30 PM', '2026-10-25 11:45:00', 4, 'Rolled Oats with Fresh Fruits & Chia', 120, 2],
    ['TP97890', cust4.lastInsertRowid, 'Siddharth Basu', '9830998877', null, 'Salt Lake Sector V, Kolkata 700091', new Date().toISOString().slice(0, 10), 495, 40, 25, '', 0, 560, 'Cash on Delivery', '', 'Pending', 'Preparing', staff2.lastInsertRowid, 'Today, Within 35 Mins', new Date().toISOString().replace('T', ' ').slice(0, 19), 17, 'Multigrain Grilled Veg & Avocado Club Sandwich', 120, 2],
  ] as const;

  for (const ho of histOrders) {
    const oRes = insertOrder.run(
      ho[0], ho[1], ho[2], ho[3], ho[4], ho[5], ho[6],
      ho[7], ho[8], ho[9], ho[10], ho[11], ho[12],
      ho[13], ho[14], ho[15], ho[16], ho[17], ho[18], ho[19]
    );
    const oid = Number(oRes.lastInsertRowid);
    insertOrderItem.run(oid, 'product', ho[20], null, ho[21], '', ho[22], ho[23], ho[22] * ho[23], 'hero_bowl');
    insertTrack.run(oid, 'Placed', 'Order received by TrimPlate Central Kitchen', 'System', ho[19]);
    if (String(ho[16]) !== 'Placed') {
      insertTrack.run(oid, ho[16], `Order status updated to ${ho[16]}`, 'Chef Debashis Paul', ho[19]);
    }
    insertPayment.run(
      `TXN-${ho[0]}`,
      ho[1],
      oid,
      ho[0] === 'TP96504' ? sub1.lastInsertRowid : ho[0] === 'TP94110' ? sub2.lastInsertRowid : null,
      ho[12],
      ho[13],
      ho[14],
      ho[15] === 'Paid' ? 'Completed' : 'Pending',
      ho[19]
    );
  }

  seedReviewsAndReputation();
  applyV3HeroLaunchAndReviewsMigration();
  applyV4DietitiansAndOrderNotificationsMigration();
  applyV5DynamicMenusAndWhatsAppMigration();
  applyV6ProductGalleryImagesMigration();
}
