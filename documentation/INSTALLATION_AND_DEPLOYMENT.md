# TrimPlate – Healthy Food E-Commerce, Subscription & Website CMS

**Brand**: TrimPlate (`Eat Smart. Stay Trim.`)

---

## 1. Architecture Overview

1. **React + Vite + Tailwind CSS Frontend (`src/`)**:
   - Desktop-first, responsive e-commerce website (`WebsiteLayout`, `HomePage` with dynamic Hero Carousel & 12 reorderable database sections, `/cafe-menu`, `/green-menu`, `/diet-menu`, `/gym-menu`, `/subscriptions`, `/offers`, `/product/:slug`, `/page/:slug`, `/cart`, `/checkout`, `/login`, `/account`).
   - Complete **30-Module Website CMS Admin Panel (`/admin`)** enabling non-technical administrators to manage every hero slide, homepage section, banner, offer, product, category, price, subscription plan, page, navigation menu, media asset, SEO tag, and setting without touching source code.
2. **CodeIgniter 4 Primary Backend (`backend-ci4/`) + MySQL 8.0 (`database/trimplate_mysql_schema.sql`)**:
   - Contains 31 normalized relational tables (`roles`, `users`, `customers`, `addresses`, `categories`, `products`, `product_variants`, `product_images`, `nutritional_information`, `hero_slides`, `banners`, `homepage_sections`, `homepage_section_products`, `offers`, `coupons`, `pages`, `navigation_items`, `media_library`, `website_settings`, `subscription_plans`, `subscriptions`, `subscription_meals`, `orders`, `order_items`, `payments`, `delivery_tracking`, `reviews`, `testimonials`, `gallery`, `newsletter_subscribers`, `notifications`, `staff`, `audit_logs`).
3. **Node.js Real-Time Notification Service (`realtime-node/` & integrated `server.ts`)**:
   - Broadcasts live WebSocket updates (`order_created`, `order_status_updated`, `subscription_updated`, `site_settings_updated`, `support_inquiry`) without duplicating primary business logic.

---

## 2. Production Deployment Steps (MySQL + CodeIgniter 4 + Node.js + React)

### Step A: Provision MySQL 8.0 Database
```bash
mysql -u root -p < database/trimplate_mysql_schema.sql
```

### Step B: Deploy CodeIgniter 4 Primary REST API (`backend-ci4/`)
1. Copy `backend-ci4/` onto a PHP 8.2+ host (`intl`, `mbstring`, `mysqli`, `curl` enabled).
2. Configure `.env` database credentials (`database.default.database = trimplate_db`), `JWT_SECRET`, and `NODE_REALTIME_WEBHOOK = http://127.0.0.1:4001/internal/broadcast`.
3. Install Composer dependencies (`firebase/php-jwt`, `phpoffice/phpspreadsheet`) and point Nginx/Apache document root to `public/`.

### Step C: Start Node.js Real-Time WebSocket Service (`realtime-node/`)
```bash
npm --prefix realtime-node install
PORT=4001 npm --prefix realtime-node start
```

### Step D: Build & Deploy React Website (`dist/`)
```bash
VITE_API_BASE_URL="https://api.trimplate.in/api" npm run build
```

---

## 3. Default Credentials (Live Preview Environment)

- **Admin Website CMS (`/admin`)**: `admin@trimplate.in` / `admin123` (or click **Instant Admin Demo Sign-In**)
- **Customer Account (`/login`)**: `ananya@trimplate.in` (or `9830012345`) / `customer123`
