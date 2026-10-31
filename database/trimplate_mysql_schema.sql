-- =================================================================================
-- TRIMPLATE HEALTHY FOOD E-COMMERCE, SUBSCRIPTION & COMPLETE WEBSITE CMS
-- Production MySQL 8.0+ Schema (31 Normalized Tables)
-- =================================================================================

CREATE DATABASE IF NOT EXISTS trimplate_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trimplate_db;

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  dietary_preference VARCHAR(80) DEFAULT 'Both',
  fitness_goal VARCHAR(160) DEFAULT 'Eat Smart & Stay Trim',
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  total_orders INT DEFAULT 0,
  CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  label VARCHAR(60) NOT NULL DEFAULT 'Home',
  recipient_name VARCHAR(120) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  line1 VARCHAR(255) NOT NULL,
  area VARCHAR(120) NOT NULL,
  city VARCHAR(80) NOT NULL DEFAULT 'Kolkata',
  pincode VARCHAR(15) NOT NULL DEFAULT '700001',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  menu_division ENUM('Cafe Menu', 'Green Menu') NOT NULL,
  description TEXT,
  image_key VARCHAR(120) DEFAULT 'hero_bowl',
  custom_image_url LONGTEXT,
  diet_tag VARCHAR(50) DEFAULT 'all',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_cat_division (menu_division, sort_order)
) ENGINE=InnoDB;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  menu_division ENUM('Cafe Menu', 'Green Menu') NOT NULL,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NULL COMMENT 'NULL allowed when seasonal / price on request',
  is_veg TINYINT(1) NOT NULL DEFAULT 1,
  stock_qty INT NOT NULL DEFAULT 50,
  display_labels JSON COMMENT '["New Arrival","Bestseller","Featured","Special Offer","Limited Stock"]',
  diet_types JSON COMMENT '["diet","gym","sugar-control"]',
  meal_time VARCHAR(50) DEFAULT 'All Day',
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  image_key VARCHAR(120) NOT NULL DEFAULT 'hero_bowl',
  seo_title VARCHAR(200),
  seo_description VARCHAR(320),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_prod_division (menu_division, is_available)
) ENGINE=InnoDB;

CREATE TABLE product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  variant_name VARCHAR(80) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_var_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url LONGTEXT NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_img_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE nutritional_information (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL UNIQUE,
  calories_kcal INT,
  protein_g DECIMAL(6,1),
  carbs_g DECIMAL(6,1),
  fat_g DECIMAL(6,1),
  fiber_g DECIMAL(6,1),
  sugar_g DECIMAL(6,1),
  is_verified TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_nutr_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==================== COMPLETE WEBSITE CMS TABLES ====================

CREATE TABLE hero_slides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  subtitle TEXT,
  cta_primary_text VARCHAR(80) DEFAULT 'Explore Menu',
  cta_primary_url VARCHAR(200) DEFAULT '/green-menu',
  cta_secondary_text VARCHAR(80),
  cta_secondary_url VARCHAR(200),
  desktop_image LONGTEXT NOT NULL,
  mobile_image LONGTEXT,
  text_position ENUM('left','center','right') DEFAULT 'left',
  overlay_opacity DECIMAL(3,2) DEFAULT 0.55,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  start_date DATE DEFAULT '2026-01-01',
  end_date DATE DEFAULT '2028-12-31'
) ENGINE=InnoDB;

CREATE TABLE banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  banner_key VARCHAR(80) NOT NULL UNIQUE,
  page_target VARCHAR(80) NOT NULL DEFAULT 'home',
  title VARCHAR(220) NOT NULL,
  subtitle VARCHAR(220),
  description TEXT,
  image_url LONGTEXT NOT NULL,
  mobile_image_url LONGTEXT,
  cta_text VARCHAR(80),
  cta_url VARCHAR(200),
  bg_color VARCHAR(20) DEFAULT '#123B16',
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE homepage_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(220) NOT NULL,
  subtitle VARCHAR(220),
  description TEXT,
  image_url LONGTEXT,
  cta_text VARCHAR(80),
  cta_url VARCHAR(200),
  bg_color VARCHAR(20) DEFAULT '#FFFFFF',
  product_limit INT DEFAULT 4,
  sort_order INT NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  config_json JSON
) ENGINE=InnoDB;

CREATE TABLE homepage_section_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_id INT NOT NULL,
  product_id INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_hsp_sec FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_hsp_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  banner_image LONGTEXT,
  discount_type ENUM('percentage','flat') DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 10,
  coupon_code VARCHAR(40),
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  applicable_categories VARCHAR(255) DEFAULT 'All',
  applicable_products VARCHAR(255) DEFAULT 'All',
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2) DEFAULT 0,
  usage_limit INT DEFAULT 500,
  used_count INT DEFAULT 0,
  cta_text VARCHAR(80) DEFAULT 'Order Now',
  cta_url VARCHAR(200) DEFAULT '/green-menu',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_offers_validity (is_active, start_datetime, end_datetime)
) ENGINE=InnoDB;

CREATE TABLE coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  discount_type ENUM('percentage','flat') NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 199.00,
  max_discount DECIMAL(10,2) NOT NULL DEFAULT 250.00,
  usage_limit INT DEFAULT 500,
  used_count INT DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  expires_at DATE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  hero_subtitle VARCHAR(255),
  content_html LONGTEXT NOT NULL,
  banner_image LONGTEXT,
  seo_title VARCHAR(200),
  seo_description VARCHAR(320),
  og_image LONGTEXT,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE navigation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location ENUM('header','footer_quick','footer_legal') NOT NULL DEFAULT 'header',
  label VARCHAR(100) NOT NULL,
  url VARCHAR(200) NOT NULL,
  parent_id INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_nav_parent FOREIGN KEY (parent_id) REFERENCES navigation_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE media_library (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  file_url LONGTEXT NOT NULL,
  folder VARCHAR(80) DEFAULT 'General',
  alt_text VARCHAR(220),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE website_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value LONGTEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE testimonials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  designation VARCHAR(120),
  location VARCHAR(120) DEFAULT 'Kolkata',
  rating INT NOT NULL DEFAULT 5,
  comment TEXT NOT NULL,
  avatar_url LONGTEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_approved TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE gallery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  caption VARCHAR(255),
  category VARCHAR(80) DEFAULT 'Healthy Bowls',
  image_url LONGTEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(180) NOT NULL UNIQUE,
  name VARCHAR(120),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==================== SUBSCRIPTIONS, ORDERS & LOGISTICS ====================

CREATE TABLE subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  subtitle VARCHAR(120) NOT NULL,
  duration_days INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NULL,
  price_per_person_label VARCHAR(80) NOT NULL DEFAULT 'Per Person',
  badge_text VARCHAR(60),
  card_theme VARCHAR(30) NOT NULL DEFAULT 'green',
  benefits_json JSON NOT NULL,
  meals_included VARCHAR(180) DEFAULT 'Breakfast, Lunch, Snacks, Dinner',
  delivery_info VARCHAR(180) DEFAULT 'Daily insulated slot delivery',
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_code VARCHAR(40) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  menu_preference VARCHAR(80) NOT NULL,
  selected_meals VARCHAR(180) DEFAULT 'Breakfast, Lunch, Snacks, Dinner',
  is_veg_only TINYINT(1) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  delivery_slot VARCHAR(80) NOT NULL DEFAULT '8:00 AM - 10:00 AM',
  address_id INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  skipped_dates_json JSON,
  total_paid DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
) ENGINE=InnoDB;

CREATE TABLE subscription_meals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  delivery_date DATE NOT NULL,
  meal_slot VARCHAR(40) NOT NULL,
  dish_name VARCHAR(180) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  CONSTRAINT fk_submeals_sub FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(80) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(160),
  vehicle_number VARCHAR(40),
  zone VARCHAR(100) NOT NULL DEFAULT 'Central Kolkata',
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(40) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  customer_name_snapshot VARCHAR(120),
  customer_phone_snapshot VARCHAR(25),
  address_id INT NULL,
  delivery_address_snapshot TEXT,
  delivery_date DATE,
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 40.00,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  coupon_code VARCHAR(40),
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
  payment_reference VARCHAR(120),
  payment_status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  order_status VARCHAR(40) NOT NULL DEFAULT 'Placed',
  delivery_notes TEXT,
  estimated_delivery VARCHAR(80),
  assigned_staff_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ord_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_ord_staff FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_ord_status_date (order_status, created_at)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  item_type VARCHAR(30) NOT NULL DEFAULT 'product',
  product_id INT NULL,
  plan_id INT NULL,
  item_name VARCHAR(180) NOT NULL,
  variant_name VARCHAR(80),
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  image_key VARCHAR(120),
  meta_json JSON,
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(60) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  order_id INT NULL,
  subscription_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  gateway_reference VARCHAR(120),
  status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE delivery_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status VARCHAR(40) NOT NULL,
  location_note VARCHAR(255) NOT NULL,
  updated_by VARCHAR(120) NOT NULL DEFAULT 'System',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dt_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NULL,
  customer_name VARCHAR(120) NOT NULL,
  rating INT NOT NULL,
  comment TEXT NOT NULL,
  is_approved TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rev_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  role_target VARCHAR(30) NOT NULL DEFAULT 'customer',
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'order',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(60),
  details TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
