export interface Address {
  id: number;
  user_id: number;
  label: string;
  recipient_name: string;
  mobile: string;
  line1: string;
  area: string;
  city: string;
  pincode: string;
  is_default: number;
}

export interface CustomerProfile {
  id: number;
  user_id: number;
  dietary_preference: string;
  fitness_goal: string;
  wallet_balance: number;
  total_orders: number;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: 'admin' | 'customer';
  addresses: Address[];
  customerProfile?: CustomerProfile;
}

export interface CustomMenu {
  id: number;
  name: string;
  slug: string;
  division_name: string;
  subtitle: string;
  description: string;
  image_url: string;
  bg_color: string;
  badge_text: string;
  show_in_header: boolean | number;
  show_on_home: boolean | number;
  sort_order: number;
  is_active: boolean | number;
  category_count?: number;
  product_count?: number;
  created_at?: string;
}

export interface Category {
  id: number;
  parent_id?: number | null;
  parent_name?: string | null;
  name: string;
  slug: string;
  menu_division: string;
  description: string;
  image_key: string;
  custom_image_url?: string;
  diet_tag: string;
  sort_order: number;
  is_active: number;
  product_count?: number;
}

export interface ProductVariant {
  id: number;
  variant_name: string;
  price: number;
  is_default: number;
}

export interface ProductImage {
  id: number;
  image_url: string;
  is_primary: number;
  sort_order?: number;
}

export interface NutritionalInfo {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  is_verified: number;
}

export interface Product {
  id: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  menu_division: string;
  name: string;
  slug: string;
  description: string;
  price: number | null;
  is_veg: boolean;
  stock_qty: number;
  display_labels: string[];
  diet_types: string[];
  meal_time: string;
  is_available: boolean;
  image_key: string;
  custom_image_url?: string;
  images?: ProductImage[];
  seo_title?: string;
  seo_description?: string;
  sold_count?: number;
  avg_rating?: number | null;
  review_count?: number;
  created_at?: string;
  variants: ProductVariant[];
  nutrition: NutritionalInfo | null;
}

export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  cta_primary_text: string;
  cta_primary_url: string;
  cta_secondary_text: string;
  cta_secondary_url: string;
  desktop_image: string;
  mobile_image: string;
  text_position: 'left' | 'center' | 'right';
  overlay_opacity: number;
  sort_order: number;
  is_active: number;
  start_date: string;
  end_date: string;
  slide_type?: 'standard' | 'new_launch' | 'offer_promo';
  badge_text?: string;
  promo_code?: string;
  discount_type?: 'percentage' | 'flat';
  discount_value?: number;
  min_order_amount?: number;
  linked_product_id?: number | null;
}

export interface HomepageSection {
  id: number;
  section_key: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  cta_text: string;
  cta_url: string;
  bg_color: string;
  product_limit: number;
  sort_order: number;
  is_enabled: boolean;
  config: Record<string, any>;
  curated_product_ids: number[];
}

export interface Banner {
  id: number;
  banner_key: string;
  page_target: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  mobile_image_url?: string;
  cta_text: string;
  cta_url: string;
  bg_color: string;
  is_active: number;
}

export interface SpecialOffer {
  id: number;
  title: string;
  description: string;
  banner_image: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  coupon_code: string;
  start_datetime: string;
  end_datetime: string;
  applicable_categories: string;
  applicable_products: string;
  min_order_value: number;
  max_discount: number;
  usage_limit: number;
  used_count: number;
  cta_text: string;
  cta_url: string;
  is_active: number;
}

export interface CmsPage {
  id: number;
  title: string;
  slug: string;
  hero_subtitle: string;
  content_html: string;
  banner_image: string;
  seo_title: string;
  seo_description: string;
  og_image: string;
  is_published: number;
  updated_at?: string;
}

export interface NavItem {
  id: number;
  location: 'header' | 'footer_quick' | 'footer_legal';
  label: string;
  url: string;
  parent_id: number | null;
  sort_order: number;
  is_active: number;
}

export interface MediaItem {
  id: number;
  title: string;
  file_url: string;
  folder: string;
  alt_text: string;
  created_at: string;
}

export interface Testimonial {
  id: number;
  customer_name: string;
  designation: string;
  location: string;
  rating: number;
  comment: string;
  avatar_url?: string;
  sort_order: number;
  is_approved: number;
}

export interface GalleryItem {
  id: number;
  title: string;
  caption: string;
  category: string;
  image_url: string;
  sort_order: number;
  is_active: number;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  name: string;
  status: string;
  created_at: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  subtitle: string;
  duration_days: number;
  price: number;
  original_price: number | null;
  price_per_person_label: string;
  badge_text: string;
  card_theme: 'blue' | 'green' | 'amber' | 'purple';
  benefits: string[];
  meals_included?: string;
  delivery_info?: string;
  is_active?: boolean;
}

export interface SubscriptionRecord {
  id: number;
  subscription_code: string;
  user_id: number;
  plan_id: number;
  plan_name: string;
  plan_subtitle: string;
  duration_days: number;
  menu_preference: string;
  selected_meals?: string;
  is_veg_only: boolean;
  start_date: string;
  end_date: string;
  delivery_slot: string;
  status: 'Active' | 'Paused' | 'Cancelled' | 'Completed';
  skipped_dates: string[];
  total_paid: number;
  payment_method: string;
  customer_name?: string;
  customer_mobile?: string;
}

export interface CartItem {
  key: string;
  item_type: 'product' | 'subscription';
  product_id?: number;
  plan_id?: number;
  name: string;
  slug?: string;
  variant_name?: string;
  unit_price: number;
  quantity: number;
  image_key: string;
  custom_image_url?: string;
  meta?: {
    menuPreference?: string;
    selectedMeals?: string;
    isVegOnly?: boolean;
    startDate?: string;
    deliverySlot?: string;
    durationDays?: number;
  };
}

export interface OrderRecord {
  id: number;
  order_code: string;
  user_id: number;
  customer_name?: string;
  customer_mobile?: string;
  customer_name_snapshot?: string;
  customer_phone_snapshot?: string;
  customer_whatsapp?: string;
  delivery_address_snapshot?: string;
  delivery_date?: string;
  subtotal: number;
  delivery_charge: number;
  gst_amount: number;
  coupon_code: string;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_status: string;
  order_status: 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  delivery_notes: string;
  estimated_delivery: string;
  assigned_staff_id: number | null;
  staff_name?: string;
  staff_mobile?: string;
  address_line1?: string;
  address_area?: string;
  address_pincode?: string;
  created_at: string;
  items: Array<{
    id: number;
    item_type: string;
    product_id?: number | null;
    plan_id?: number | null;
    item_name: string;
    variant_name: string;
    unit_price: number;
    quantity: number;
    total_price: number;
    image_key: string;
  }>;
  tracking: Array<{
    id: number;
    status: string;
    location_note: string;
    updated_by: string;
    created_at: string;
  }>;
}

export interface CustomerReview {
  id: number;
  user_id: number;
  product_id: number | null;
  product_name?: string | null;
  product_slug?: string | null;
  order_id?: number | null;
  order_item_id?: number | null;
  order_code?: string | null;
  customer_name: string;
  reviewer_location: string;
  review_source: 'Website' | 'Google' | 'Trustpilot' | string;
  rating: number;
  comment: string;
  admin_reply?: string;
  show_on_home: number;
  is_approved: number;
  created_at: string;
}

export interface ReviewStats {
  avgRating: number;
  totalApprovedCount: number;
  googleReviewCount: number;
}

export interface Dietitian {
  id: number;
  name: string;
  slug: string;
  credentials: string;
  specialization: string;
  experience_years: number;
  languages: string;
  bio: string;
  consultation_fee: number;
  free_with_subscription: boolean | number;
  available_days: string;
  available_slots: string;
  image_url: string;
  rating: number;
  consultations_count: number;
  sort_order: number;
  is_active: boolean | number;
}

export interface DietitianConsultation {
  id: number;
  booking_code: string;
  dietitian_id: number | null;
  dietitian_name: string;
  user_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  health_goal: string;
  dietary_preference: string;
  consultation_mode: 'Video Call' | 'Phone Call' | 'In-Studio' | string;
  preferred_date: string;
  preferred_slot: string;
  has_active_subscription: number | boolean;
  fee_amount: number;
  notes: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  admin_notes: string;
  created_at: string;
}

export interface AdminNotification {
  id: number;
  user_id?: number | null;
  role_target: string;
  title: string;
  message: string;
  type: 'order' | 'dietitian' | 'support' | 'review' | string;
  reference_type?: string;
  reference_id?: number | null;
  reference_code?: string;
  is_read: number;
  created_at: string;
  meta?: {
    orderId?: number;
    orderCode?: string;
    bookingId?: number;
    bookingCode?: string;
    customerName?: string;
    customerPhone?: string;
    customerWhatsapp?: string;
    storeWhatsappNumber?: string;
    whatsappOrderUrl?: string;
    customerWhatsappReplyUrl?: string;
    totalAmount?: number;
    paymentMethod?: string;
    deliveryAddress?: string;
    itemCount?: number;
    itemsSummary?: string;
    items?: Array<{
      name: string;
      variant?: string;
      quantity: number;
      unit_price: number;
    }>;
    dietitianName?: string;
    healthGoal?: string;
    preferredDate?: string;
    preferredSlot?: string;
    consultationMode?: string;
  };
}

export interface SiteBootstrap {
  settings: Record<string, string>;
  navigation: NavItem[];
  customMenus?: CustomMenu[];
  categories?: Category[];
  heroSlides: HeroSlide[];
  homepageSections: HomepageSection[];
  banners: Banner[];
  activeOffers: SpecialOffer[];
  testimonials: Testimonial[];
  approvedReviews?: CustomerReview[];
  reviewStats?: ReviewStats;
  gallery: GalleryItem[];
  plans: SubscriptionPlan[];
  dietitians?: Dietitian[];
}


