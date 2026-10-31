import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  User,
  Menu,
  X,
  Phone,
  Truck,
  ChevronDown,
  MapPin,
  Clock,
  Mail,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Package,
  CalendarRange,
  Salad,
  Coffee,
  Flame,
  Dumbbell,
  Leaf,
  Info,
  Star,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { resolveFoodImage, OFFICIAL_TRIMPLATE_LOGO } from '../assets/mediaMap';
import { cachedGet, peekCached, formatINR } from '../services/api';
import { NavItem, Product } from '../types';
import {
  AboveFooterGoogleReviewsSection,
  FooterTrustpilotWidget,
} from '../components/GoogleReviewsAndTrustpilot';

const DROPDOWN_ITEM_META: Record<
  string,
  { subtitle: string; icon: React.ComponentType<{ className?: string }> }
> = {
  '/green-menu': {
    subtitle: 'Wholesome breakfasts, balanced bowls & light dinners',
    icon: Salad,
  },
  '/cafe-menu': {
    subtitle: 'Multigrain sandwiches, pasta, toasts & cold brews',
    icon: Coffee,
  },
  '/diet-menu': {
    subtitle: 'Calorie-counted low-GI dishes for weight loss',
    icon: Flame,
  },
  '/gym-menu': {
    subtitle: 'High-protein lean chicken, egg & muscle recovery meals',
    icon: Dumbbell,
  },
  '/subscriptions': {
    subtitle: '3, 7, 15 & 30-day flexible daily meal plans',
    icon: CalendarRange,
  },
  '/page/about-us': {
    subtitle: 'Our culinary story, clean oils & fresh ingredients',
    icon: Info,
  },
  '/page/contact-us': {
    subtitle: 'Kitchen studio, nutrition desk & catering inquiries',
    icon: Phone,
  },
};

export function WebsiteLayout() {
  const { site } = useSite();
  const { user, logout } = useAuth();
  const {
    items,
    subtotal,
    deliveryCharge,
    freeDeliveryThreshold,
    itemCount,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeItem,
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedIds, setMobileExpandedIds] = useState<number[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const s = site.settings;
  const brandName = s.business_name || s.site_name || 'TrimPlate';
  const logoSrc = resolveFoodImage(s.logo_url || 'official_logo') || OFFICIAL_TRIMPLATE_LOGO;

  // Close menus on route OR query-tab change; scroll immediately so user scrolling never lags
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountDropdownOpen(false);
    setOpenDropdownId(null);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  // Close account dropdown on outside click
  useEffect(() => {
    if (!accountDropdownOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [accountDropdownOpen]);

  // Instantaneous live search modal query (filters cached catalog in 0ms, falls back to API)
  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const cachedAll = peekCached<Product[]>('/products');
    if (cachedAll && cachedAll.length > 0) {
      const matched = cachedAll
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category_name.toLowerCase().includes(q) ||
            p.menu_division.toLowerCase().includes(q)
        )
        .slice(0, 8);
      setSearchResults(matched);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await cachedGet<Product[]>('/products', { search: searchQuery.trim() }, 30000);
        setSearchResults(data.slice(0, 8));
      } catch {
        setSearchResults([]);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen]);

  // Build hierarchical navigation from database + dynamically merge Admin-created Custom Menus
  const headerTopItems = site.navigation.filter(
    (n) => n.location === 'header' && !n.parent_id
  );
  const headerCustomMenus = (site.customMenus || []).filter(
    (m) => Boolean(m.is_active) && Boolean(m.show_in_header)
  );

  const getChildren = (parentId: number): Array<NavItem & { customSubtitle?: string }> => {
    const dbChildren: Array<NavItem & { customSubtitle?: string }> = site.navigation.filter(
      (n) => n.location === 'header' && n.parent_id === parentId
    );
    const parentNav = headerTopItems.find((n) => n.id === parentId);
    if (parentNav && parentNav.label.toLowerCase().includes('menu') && headerCustomMenus.length > 0) {
      const existingUrls = new Set(dbChildren.map((c) => c.url));
      const dynamicItems: Array<NavItem & { customSubtitle?: string }> = headerCustomMenus
        .filter((m) => !existingUrls.has(`/menu/${m.slug}`))
        .map((m, idx) => ({
          id: 90000 + m.id,
          location: 'header',
          label: m.name,
          url: `/menu/${m.slug}`,
          parent_id: parentId,
          sort_order: 100 + idx,
          is_active: 1,
          customSubtitle: m.subtitle || m.description,
        }));
      return [...dbChildren, ...dynamicItems];
    }
    return dbChildren;
  };

  const openMobileDrawer = () => {
    const parentIds = headerTopItems
      .filter((item) => getChildren(item.id).length > 0)
      .map((item) => item.id);
    setMobileExpandedIds((prev) => (prev.length > 0 ? prev : parentIds));
    setMobileMenuOpen(true);
  };

  const footerQuickLinks = site.navigation.filter((n) => n.location === 'footer_quick');
  const footerLegalLinks = site.navigation.filter((n) => n.location === 'footer_legal');

  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  const toggleMobileSection = (id: number) => {
    setMobileExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#202124]">
      {/* 1. Slim Executive Top Announcement Bar */}
      {s.announcement_enabled === '1' && (
        <div className="bg-[#123B16] text-white/95 text-[11px] sm:text-[12px]">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-8 sm:h-9 flex items-center justify-between gap-3">
            <p className="font-medium tracking-wide flex items-center gap-1.5 truncate">
              <Leaf className="w-3.5 h-3.5 text-[#8CCB16] shrink-0" />
              <span className="truncate">{s.announcement_text}</span>
            </p>
            <div className="hidden md:flex items-center gap-5 text-white/85 shrink-0">
              {s.announcement_delivery_info && (
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#8CCB16]" />
                  <span>{s.announcement_delivery_info}</span>
                </span>
              )}
              {s.phone && (
                <a
                  href={`tel:${s.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 hover:text-[#8CCB16] transition-colors font-num font-semibold border-l border-white/15 pl-5"
                >
                  <Phone className="w-3.5 h-3.5 text-[#8CCB16]" />
                  {s.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Clean, Balanced Sticky Main Header (Direct to Hero — No Secondary Bar Below) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EEEEEE]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
          {/* Official Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink group">
            <img
              src={logoSrc}
              alt={brandName}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover shadow-xs border border-[#EEEEEE] shrink-0"
            />
            <div className="min-w-0">
              <span className="block text-base sm:text-xl font-extrabold tracking-tight text-[#123B16] leading-none font-['Poppins'] truncate">
                {brandName}
              </span>
              <span className="hidden min-[380px]:block text-[9px] sm:text-[10px] font-bold tracking-[0.12em] sm:tracking-[0.15em] uppercase text-[#0B8F4D] mt-1 truncate">
                {s.tagline || 'EAT SMART. STAY TRIM.'}
              </span>
            </div>
          </Link>

          {/* Centered Desktop & Tablet Primary Navigation (5 Clean Top-Level Items + Rich Dropdowns) */}
          <nav
            className="hidden md:flex items-center justify-center gap-4 lg:gap-7 xl:gap-8 flex-1"
            aria-label="Main Navigation"
          >
            {headerTopItems.map((nav) => {
              const children = getChildren(nav.id);
              const isParentActive =
                location.pathname === nav.url ||
                children.some((c) => location.pathname === c.url);

              if (children.length > 0) {
                const isOpen = openDropdownId === nav.id;
                return (
                  <div
                    key={nav.id}
                    className="relative py-6"
                    onMouseEnter={() => setOpenDropdownId(nav.id)}
                    onMouseLeave={() => setOpenDropdownId(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenDropdownId(isOpen ? null : nav.id)}
                      className={`inline-flex items-center gap-1.5 text-[14px] font-semibold tracking-tight transition-colors whitespace-nowrap relative ${
                        isParentActive
                          ? 'text-[#0B8F4D]'
                          : 'text-[#202124] hover:text-[#0B8F4D]'
                      }`}
                    >
                      <span>{nav.label}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#0B8F4D]' : 'text-[#777777]'
                        }`}
                      />
                      {isParentActive && (
                        <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-[#0B8F4D]" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-1 w-80 z-50 animate-tp-scale-fade">
                        <div className="bg-white rounded-2xl shadow-xl border border-[#EEEEEE] p-2.5 space-y-1">
                          {children.map((child) => {
                            const meta = DROPDOWN_ITEM_META[child.url];
                            const IconComp = meta?.icon || Leaf;
                            const subtitleText = meta?.subtitle || child.customSubtitle || '';
                            const childActive = location.pathname === child.url;
                            return (
                              <Link
                                key={child.id}
                                to={child.url}
                                className={`flex items-start gap-3 p-3 rounded-xl transition-colors group/item ${
                                  childActive
                                    ? 'bg-[#E8F5E9]/80 text-[#123B16]'
                                    : 'hover:bg-[#F7FAF8] text-[#202124]'
                                }`}
                              >
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    childActive
                                      ? 'bg-[#0B8F4D] text-white'
                                      : 'bg-[#FFF8ED] text-[#0B8F4D] group-hover/item:bg-[#0B8F4D] group-hover/item:text-white'
                                  }`}
                                >
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-[#202124] group-hover/item:text-[#0B8F4D] transition-colors">
                                    {child.label}
                                  </p>
                                  {subtitleText && (
                                    <p className="text-[11px] text-[#777777] leading-snug mt-0.5 line-clamp-2">
                                      {subtitleText}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={nav.id}
                  to={nav.url}
                  end={nav.url === '/'}
                  className={({ isActive }) =>
                    `relative py-2 text-[14px] font-semibold tracking-tight transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-[#0B8F4D]'
                        : 'text-[#202124] hover:text-[#0B8F4D]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {nav.label}
                      {isActive && (
                        <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-[#0B8F4D]" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Header Actions: Search, Account, Cart, Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-[#F7F8F9] hover:bg-[#E8F5E9]/70 text-[#202124] hover:text-[#0B8F4D] text-xs font-semibold transition-colors"
              aria-label="Search menu"
              title="Search Dishes & Bowls"
            >
              <Search className="w-4 h-4 text-[#0B8F4D]" />
              <span className="hidden xl:inline text-[#777777]">Search...</span>
            </button>

            <span className="hidden sm:block h-5 w-px bg-[#EEEEEE]" />

            {/* User Account (Mobile Direct Icon + Desktop Dropdown) */}
            <div className="relative" ref={accountMenuRef}>
              {user ? (
                <>
                  <Link
                    to="/account?tab=profile"
                    className="sm:hidden w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] text-xs font-extrabold flex items-center justify-center border border-[#0B8F4D]/20"
                    aria-label="My Account"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAccountDropdownOpen((v) => !v)}
                    className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#F7FAF8] text-sm font-semibold text-[#202124] transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#E8F5E9] text-[#0B8F4D] text-xs font-bold flex items-center justify-center">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#777777] transition-transform ${
                        accountDropdownOpen ? 'rotate-180 text-[#0B8F4D]' : ''
                      }`}
                    />
                  </button>
                  {accountDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#EEEEEE] py-2 z-50 animate-tp-scale-fade">
                      <div className="px-4 py-2.5 border-b border-[#EEEEEE]">
                        <p className="text-sm font-bold text-[#202124] truncate">{user.name}</p>
                        <p className="text-xs text-[#777777] truncate">{user.email || user.mobile}</p>
                      </div>
                      <Link
                        to="/account?tab=profile"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#202124] hover:bg-[#F7FAF8] hover:text-[#0B8F4D]"
                      >
                        <User className="w-4 h-4" /> My Account
                      </Link>
                      <Link
                        to="/account?tab=orders"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#202124] hover:bg-[#F7FAF8] hover:text-[#0B8F4D]"
                      >
                        <Package className="w-4 h-4" /> My Orders
                      </Link>
                      <Link
                        to="/account?tab=subscriptions"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#202124] hover:bg-[#F7FAF8] hover:text-[#0B8F4D]"
                      >
                        <CalendarRange className="w-4 h-4" /> My Subscriptions
                      </Link>
                      <Link
                        to="/account?tab=reviews"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#202124] hover:bg-[#F7FAF8] hover:text-[#0B8F4D]"
                      >
                        <Star className="w-4 h-4" /> My Reviews
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#0B8F4D] bg-[#E8F5E9]/60 hover:bg-[#E8F5E9]"
                        >
                          <ShieldCheck className="w-4 h-4" /> Admin Website CMS
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setAccountDropdownOpen(false);
                          navigate('/');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left border-t border-[#EEEEEE] mt-1"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="sm:hidden p-2 rounded-xl bg-[#F7F8F9] hover:bg-[#E8F5E9]/70 text-[#202124] inline-flex items-center justify-center"
                    aria-label="Sign In"
                  >
                    <User className="w-4 h-4 text-[#0B8F4D]" />
                  </Link>
                  <Link
                    to="/login"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#202124] hover:text-[#0B8F4D] hover:bg-[#F7FAF8] transition-colors"
                  >
                    <User className="w-4 h-4 text-[#0B8F4D]" />
                    <span>Sign In</span>
                  </Link>
                </>
              )}
            </div>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#0B8F4D] hover:bg-[#09773F] text-white px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs"
              aria-label="Open shopping cart"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="bg-white/20 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md font-num leading-none">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Drawer Button */}
            <button
              type="button"
              onClick={openMobileDrawer}
              className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#F4FAF6] border border-[#0B8F4D]/25 text-[#123B16] hover:bg-[#E8F5E9] text-xs font-bold transition-colors shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4 text-[#0B8F4D]" />
              <span className="hidden min-[360px]:inline">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Website Content with Smooth Route Fade */}
      <main className="flex-1">
        <div key={location.pathname} className="animate-tp-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Auto-Sliding Actual Google & Verified Customer Reviews — Shown Strictly on Home Page Only */}
      {location.pathname === '/' && <AboveFooterGoogleReviewsSection />}

      {/* 3. Multi-Column Website Footer (100% Database Managed) */}
      <footer className="bg-[#123B16] text-white pt-16 pb-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
            {/* Brand Column */}
            <div className="lg:col-span-4 space-y-4">
              <Link to="/" className="inline-flex items-center gap-3">
                <img
                  src={logoSrc}
                  alt={brandName}
                  className="w-12 h-12 rounded-xl object-cover border border-white/20"
                />
                <div>
                  <span className="block text-xl font-extrabold text-white font-['Poppins']">
                    {brandName}
                  </span>
                  <span className="block text-[10px] font-bold tracking-[0.16em] uppercase text-[#8CCB16]">
                    {s.tagline || 'EAT SMART. STAY TRIM.'}
                  </span>
                </div>
              </Link>
              <p className="text-sm text-white/80 leading-relaxed max-w-sm">
                {s.footer_about ||
                  'TrimPlate crafts fresh, macro-counted meals, wholesome cafe sandwiches, cold-pressed beverages and flexible daily diet subscriptions.'}
              </p>
              <div className="flex items-center gap-3 pt-1">
                {s.instagram_url && (
                  <a
                    href={s.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#0B8F4D] text-xs font-semibold transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {s.facebook_url && (
                  <a
                    href={s.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#0B8F4D] text-xs font-semibold transition-colors"
                  >
                    Facebook
                  </a>
                )}
                {s.whatsapp_url && (
                  <a
                    href={s.whatsapp_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#0B8F4D] text-xs font-semibold transition-colors"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Quick Explore Links */}
            <div className="lg:col-span-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#8CCB16] mb-4">
                Explore Menus
              </h4>
              <ul className="space-y-2.5 text-sm text-white/80">
                {(footerQuickLinks.length > 0
                  ? footerQuickLinks
                  : [
                      { id: 1, label: 'Cafe Menu', url: '/cafe-menu' },
                      { id: 2, label: 'Green Menu', url: '/green-menu' },
                      { id: 3, label: 'Diet Subscriptions', url: '/subscriptions' },
                      { id: 4, label: 'Special Offers', url: '/offers' },
                    ]
                ).map((item) => (
                  <li key={item.id}>
                    <Link to={item.url} className="hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Policies & Company Links */}
            <div className="lg:col-span-2">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#8CCB16] mb-4">
                Information
              </h4>
              <ul className="space-y-2.5 text-sm text-white/80">
                <li>
                  <Link to="/page/about-us" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/page/contact-us" className="hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
                {footerLegalLinks.map((item) => (
                  <li key={item.id}>
                    <Link to={item.url} className="hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kitchen & Contact Info */}
            <div className="lg:col-span-3 space-y-3 text-sm text-white/85">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#8CCB16] mb-4">
                Kitchen & Support
              </h4>
              {s.address && (
                <p className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#8CCB16] shrink-0 mt-1" />
                  <span>{s.address}</span>
                </p>
              )}
              {s.phone && (
                <p className="flex items-center gap-2.5 font-num">
                  <Phone className="w-4 h-4 text-[#8CCB16] shrink-0" />
                  <a href={`tel:${s.phone.replace(/\s+/g, '')}`} className="hover:text-white">
                    {s.phone}
                  </a>
                </p>
              )}
              {s.email && (
                <p className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#8CCB16] shrink-0" />
                  <a href={`mailto:${s.email}`} className="hover:text-white">
                    {s.email}
                  </a>
                </p>
              )}
              {s.business_hours && (
                <p className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#8CCB16] shrink-0" />
                  <span>{s.business_hours}</span>
                </p>
              )}
            </div>
          </div>

          {/* Footer Verified Trustpilot Bar */}
          <div className="py-6 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <FooterTrustpilotWidget />
            <p className="text-xs text-white/70">
              100% FSSAI Certified Central Kitchen · Freshly Prepared Daily with Zero Refined Oils
            </p>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/65">
            <p>{s.copyright_text || '© 2026 TrimPlate Healthy Kitchen Pvt. Ltd. All rights reserved.'}</p>
            <div className="flex items-center gap-5">
              <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:text-white">
                Sitemap
              </a>
              <Link to="/admin" className="hover:text-[#8CCB16] font-medium transition-colors">
                Admin Portal Login
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* 4. Responsive Mobile Accordion Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-tp-fade-in">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-[88vw] bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto animate-tp-scale-fade">
            <div className="p-4 border-b border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={logoSrc}
                  alt={brandName}
                  className="w-9 h-9 rounded-xl object-cover border border-[#EEEEEE] shrink-0"
                />
                <div className="min-w-0">
                  <span className="block font-extrabold text-sm text-[#123B16] truncate">
                    {brandName}
                  </span>
                  <span className="block text-[9px] font-bold tracking-wider uppercase text-[#0B8F4D] truncate">
                    {s.tagline || 'EAT SMART. STAY TRIM.'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-[#777777] hover:bg-[#EFEFEF] shrink-0"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 space-y-1.5 flex-1">
              {headerTopItems.map((nav) => {
                const children = getChildren(nav.id);
                if (children.length > 0) {
                  const expanded = mobileExpandedIds.includes(nav.id);
                  const isAnyChildActive = children.some((c) => location.pathname === c.url);
                  return (
                    <div
                      key={nav.id}
                      className="rounded-2xl border border-[#F0F2F1] bg-[#FCFCFC] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleMobileSection(nav.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-3 text-sm font-bold transition-colors ${
                          isAnyChildActive ? 'text-[#0B8F4D]' : 'text-[#202124]'
                        }`}
                      >
                        <span>{nav.label}</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expanded ? 'rotate-180 text-[#0B8F4D]' : 'text-[#777777]'
                          }`}
                        />
                      </button>
                      {expanded && (
                        <div className="px-2 pb-2 space-y-1 border-t border-[#F0F2F1] pt-1.5 bg-white">
                          {children.map((ch) => {
                            const meta = DROPDOWN_ITEM_META[ch.url];
                            const IconComp = meta?.icon || Leaf;
                            const subtitleText = meta?.subtitle || ch.customSubtitle || '';
                            const active = location.pathname === ch.url;
                            return (
                              <Link
                                key={ch.id}
                                to={ch.url}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                                  active
                                    ? 'bg-[#E8F5E9] text-[#123B16]'
                                    : 'text-[#202124] hover:bg-[#F7FAF8]'
                                }`}
                              >
                                <span
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    active
                                      ? 'bg-[#0B8F4D] text-white'
                                      : 'bg-[#FFF8ED] text-[#0B8F4D]'
                                  }`}
                                >
                                  <IconComp className="w-3.5 h-3.5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate">{ch.label}</p>
                                  {subtitleText && (
                                    <p className="text-[10px] text-[#777777] truncate">
                                      {subtitleText}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = location.pathname === nav.url;
                return (
                  <Link
                    key={nav.id}
                    to={nav.url}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-colors ${
                      isActive
                        ? 'bg-[#E8F5E9] text-[#0B8F4D]'
                        : 'text-[#202124] hover:bg-[#F7FAF8] hover:text-[#0B8F4D]'
                    }`}
                  >
                    <span>{nav.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                  </Link>
                );
              })}
            </div>

            <div className="p-4 border-t border-[#EEEEEE] bg-[#FFF8ED] space-y-2.5">
              {user ? (
                <>
                  <div className="flex items-center gap-2.5 pb-1">
                    <span className="w-8 h-8 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-[#202124] truncate">{user.name}</p>
                      <p className="text-[11px] text-[#777777] truncate">
                        {user.email || user.mobile}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/account?tab=profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E2E6E4] text-xs font-bold text-[#202124]"
                    >
                      <User className="w-3.5 h-3.5 text-[#0B8F4D]" /> My Account
                    </Link>
                    <Link
                      to="/account?tab=orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E2E6E4] text-xs font-bold text-[#202124]"
                    >
                      <Package className="w-3.5 h-3.5 text-[#0B8F4D]" /> Orders
                    </Link>
                  </div>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-[#123B16] text-white text-xs font-bold"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#8CCB16]" /> Admin Website CMS
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                      navigate('/');
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#0B8F4D] text-white text-sm font-bold shadow-xs"
                >
                  <User className="w-4 h-4" /> Sign In / Create Account
                </Link>
              )}

              {s.phone && (
                <a
                  href={`tel:${s.phone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-semibold text-[#123B16] font-num"
                >
                  <Phone className="w-3.5 h-3.5 text-[#0B8F4D]" /> Kitchen Desk: {s.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Global Website Search Overlay Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 animate-tp-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EEEEEE] w-full max-w-2xl overflow-hidden animate-tp-scale-fade">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#EEEEEE]">
              <Search className="w-5 h-5 text-[#0B8F4D]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Cafe Menu, Green Bowls, Oats, Sandwiches, Protein..."
                className="flex-1 text-sm sm:text-base outline-none text-[#202124]"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-1.5 rounded-lg text-[#777777] hover:bg-[#F5F6F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-[#EEEEEE]">
              {!searchQuery.trim() ? (
                <div className="p-6 text-center text-sm text-[#777777]">
                  Type to search across our Cafe Menu & Healthy Green Menu...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#777777]">
                  No dishes matched &ldquo;{searchQuery}&rdquo;. Try browsing our Green Menu or Cafe Menu.
                </div>
              ) : (
                searchResults.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.slug}`}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-4 p-4 hover:bg-[#FFF8ED]/70 transition-colors"
                  >
                    <img
                      src={resolveFoodImage(p.image_key, p.custom_image_url)}
                      alt={p.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#EEEEEE]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#202124] truncate">{p.name}</p>
                      <p className="text-xs text-[#777777]">
                        {p.menu_division} · {p.category_name}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#0B8F4D] font-num">
                      {formatINR(p.price)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Slide-Over Cart Preview Drawer */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-tp-fade-in">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsCartDrawerOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col animate-tp-scale-fade">
            <div className="px-6 py-5 border-b border-[#EEEEEE] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#202124]">Your Shopping Bag</h3>
                <p className="text-xs text-[#777777]">{itemCount} item(s) selected</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-2 rounded-xl hover:bg-[#F5F6F7] text-[#777777]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {items.length > 0 && (
              <div className="px-6 py-3 bg-[#E8F5E9] text-xs font-medium text-[#123B16]">
                {remainingForFreeDelivery > 0 ? (
                  <span>
                    Add <strong className="font-num">{formatINR(remainingForFreeDelivery)}</strong> more for{' '}
                    <strong>FREE Express Delivery!</strong>
                  </span>
                ) : (
                  <span className="font-semibold text-[#0B8F4D]">
                    You unlocked FREE Express Delivery on this order!
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#FFF8ED] text-[#0B8F4D] flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <p className="text-base font-bold text-[#202124]">Your bag is currently empty</p>
                  <p className="text-xs text-[#777777] max-w-xs mx-auto">
                    Explore our Cafe Menu, Healthy Green Bowls, or subscribe to a daily Diet Plan.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartDrawerOpen(false);
                      navigate('/green-menu');
                    }}
                    className="inline-flex items-center gap-2 bg-[#0B8F4D] text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
                  >
                    Browse Green Menu
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-[#EEEEEE] bg-white"
                  >
                    <img
                      src={resolveFoodImage(item.image_key, item.custom_image_url)}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#EEEEEE]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#202124] line-clamp-1">{item.name}</p>
                      {item.variant_name && (
                        <p className="text-xs text-[#777777] line-clamp-1 mt-0.5">{item.variant_name}</p>
                      )}
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-sm font-bold text-[#0B8F4D] font-num">
                          {formatINR(item.unit_price * item.quantity)}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center border border-[#EEEEEE] rounded-lg">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.key, -1)}
                              className="p-1.5 hover:bg-[#F5F6F7]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold font-num">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.key, 1)}
                              className="p-1.5 hover:bg-[#F5F6F7]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="p-1.5 text-[#777777] hover:text-red-600"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-[#EEEEEE] bg-[#FAFAFA] space-y-4">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#777777]">
                    <span>Subtotal</span>
                    <span className="font-num font-semibold text-[#202124]">{formatINR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#777777]">
                    <span>Delivery</span>
                    <span className="font-num font-semibold text-[#0B8F4D]">
                      {deliveryCharge === 0 ? 'FREE' : formatINR(deliveryCharge)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartDrawerOpen(false);
                      navigate('/cart');
                    }}
                    className="py-3 px-4 rounded-xl border border-[#123B16] text-[#123B16] text-sm font-semibold hover:bg-[#F5F6F7] transition-colors"
                  >
                    View Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartDrawerOpen(false);
                      navigate('/checkout');
                    }}
                    className="py-3 px-4 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Checkout <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
