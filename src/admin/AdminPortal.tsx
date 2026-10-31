import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  Images,
  Layers,
  Megaphone,
  Sparkles,
  ShoppingBag,
  FolderTree,
  Coffee,
  Salad,
  Flame,
  Dumbbell,
  CalendarRange,
  ClipboardList,
  Users,
  Repeat,
  CreditCard,
  Truck,
  Tag,
  MessageSquareQuote,
  Camera,
  Mail,
  FileText,
  Compass,
  Image as ImageIcon,
  SearchCheck,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  CheckCheck,
  ArrowRight,
  Trash2,
  UtensilsCrossed,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRealtime } from '../hooks/useRealtime';
import { SEOHead } from '../components/SEOHead';
import { OFFICIAL_TRIMPLATE_LOGO } from '../assets/mediaMap';
import { api, formatINR, buildWhatsAppLink } from '../services/api';
import { AdminNotification } from '../types';
import { AdminDashboardView, AdminReportsView } from './AdminDashboardAndReports';
import { AdminDietitianModule } from './AdminDietitianModule';
import { AdminMenusModule } from './AdminMenusModule';
import {
  WebsiteOverviewHub,
  HeroSliderManager,
  HomepageSectionsManager,
  BannersManager,
  SpecialOffersManager,
  PagesManager,
  NavigationManager,
  MediaLibraryManager,
  TestimonialsManager,
  GalleryManager,
  NewsletterManager,
  SeoManager,
  WebsiteSettingsManager,
} from './AdminWebsiteCmsModules';
import {
  ProductsManager,
  CategoriesManager,
  SubscriptionPlansManager,
  OrdersAndDeliveryManager,
  CustomersManager,
  SubscriptionsAdminManager,
  PaymentsAdminManager,
  CouponsAdminManager,
  StaffAdminManager,
  AdminProfileModule,
} from './AdminCatalogAndOpsModules';

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  group: string;
}

const SIDEBAR_MODULES: SidebarItem[] = [
  // Analytics & Website CMS
  { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard, group: 'Overview & CMS' },
  { id: 'website-management', label: '2. Website Management', icon: Globe, group: 'Overview & CMS' },
  { id: 'hero-slider', label: '3. Hero Slider', icon: Images, group: 'Overview & CMS' },
  { id: 'homepage-sections', label: '4. Homepage Sections', icon: Layers, group: 'Overview & CMS' },
  { id: 'banners', label: '5. Promotional Banners', icon: Megaphone, group: 'Overview & CMS' },
  { id: 'offers', label: '6. Special Offers', icon: Sparkles, group: 'Overview & CMS' },

  // Catalog & Menus
  { id: 'menus-builder', label: '7. Menus Builder (Add Menu)', icon: UtensilsCrossed, group: 'Menus & Catalog' },
  { id: 'products', label: '8. Products', icon: ShoppingBag, group: 'Menus & Catalog' },
  { id: 'categories', label: '9. Categories', icon: FolderTree, group: 'Menus & Catalog' },
  { id: 'cafe-menu', label: '10. Cafe Menu', icon: Coffee, group: 'Menus & Catalog' },
  { id: 'green-menu', label: '11. Green Menu', icon: Salad, group: 'Menus & Catalog' },
  { id: 'diet-menu', label: '12. Diet Menu', icon: Flame, group: 'Menus & Catalog' },
  { id: 'gym-menu', label: '13. Gym Menu', icon: Dumbbell, group: 'Menus & Catalog' },
  { id: 'subscription-plans', label: '14. Subscription Plans', icon: CalendarRange, group: 'Menus & Catalog' },

  // E-Commerce Operations & Clinical Dietitian Desk
  { id: 'orders', label: '15. Orders', icon: ClipboardList, group: 'Operations' },
  { id: 'dietitians', label: '16. Dietitian & Consultations', icon: Stethoscope, group: 'Operations' },
  { id: 'customers', label: '17. Customers', icon: Users, group: 'Operations' },
  { id: 'subscriptions', label: '18. Subscriptions', icon: Repeat, group: 'Operations' },
  { id: 'payments', label: '19. Payments', icon: CreditCard, group: 'Operations' },
  { id: 'delivery', label: '20. Delivery Management', icon: Truck, group: 'Operations' },
  { id: 'coupons', label: '21. Coupons', icon: Tag, group: 'Operations' },

  // Content, Media & SEO
  { id: 'testimonials', label: '22. Reviews & Testimonials', icon: MessageSquareQuote, group: 'Content & SEO' },
  { id: 'gallery', label: '23. Gallery', icon: Camera, group: 'Content & SEO' },
  { id: 'newsletter', label: '24. Newsletter Subscribers', icon: Mail, group: 'Content & SEO' },
  { id: 'pages', label: '25. Pages Management', icon: FileText, group: 'Content & SEO' },
  { id: 'navigation', label: '26. Navigation Management', icon: Compass, group: 'Content & SEO' },
  { id: 'media', label: '27. Media Library', icon: ImageIcon, group: 'Content & SEO' },
  { id: 'seo', label: '28. SEO Management', icon: SearchCheck, group: 'Content & SEO' },

  // Administration
  { id: 'staff', label: '29. Staff Management', icon: UserCheck, group: 'System' },
  { id: 'reports', label: '30. Reports & Analytics', icon: BarChart3, group: 'System' },
  { id: 'settings', label: '31. Website Settings', icon: Settings, group: 'System' },
  { id: 'profile', label: '32. Profile & Logout', icon: LogOut, group: 'System' },
];

interface LiveIncomingAlert {
  kind: 'order' | 'dietitian';
  code: string;
  customerName: string;
  customerWhatsapp?: string;
  customerWhatsappReplyUrl?: string;
  summary: string;
  amountLabel?: string;
}

export function AdminPortal() {
  const { user, quickAccess, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [customMenuDivisionTarget, setCustomMenuDivisionTarget] = useState<string | null>(null);
  const [highlightOrderCode, setHighlightOrderCode] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'order' | 'dietitian' | 'unread'>('all');
  const [liveAlert, setLiveAlert] = useState<LiveIncomingAlert | null>(null);
  const notifDropdownRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = useCallback(() => {
    if (user?.role === 'admin') {
      api
        .get<AdminNotification[]>('/notifications')
        .then((r) => setNotifications(r.data))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  useRealtime(
    useCallback(
      (msg) => {
        if (msg.event === 'order_created') {
          const p = msg.payload || {};
          const itemsSummary = p.itemsSummary || 'New healthy meal order';
          setLiveAlert({
            kind: 'order',
            code: p.orderCode || '',
            customerName: p.customer || 'Customer',
            customerWhatsapp: p.customerWhatsapp || p.customerPhone || '',
            customerWhatsappReplyUrl: p.customerWhatsappReplyUrl || '',
            summary: `${itemsSummary} (${p.paymentMethod || 'Order'})`,
            amountLabel: p.total !== undefined ? formatINR(Number(p.total)) : undefined,
          });
          showToast(
            `New Item Order #${p.orderCode} (WA: ${p.customerWhatsapp || p.customerPhone || 'N/A'}): ${itemsSummary}`,
            'info'
          );
          loadNotifications();
        } else if (msg.event === 'dietitian_booking_created') {
          const p = msg.payload || {};
          setLiveAlert({
            kind: 'dietitian',
            code: p.bookingCode || '',
            customerName: p.customerName || 'Customer',
            summary: `${p.dietitianName || 'Dietitian'} · ${p.healthGoal || '1-on-1 Consultation'} (${p.preferredDate || ''})`,
          });
          showToast(
            `New Dietitian Consultation #${p.bookingCode} from ${p.customerName}!`,
            'info'
          );
          loadNotifications();
        } else if (msg.event === 'support_inquiry') {
          showToast(`New Website Inquiry from ${msg.payload.name}`, 'info');
          loadNotifications();
        } else if (msg.event === 'review_updated' && msg.payload?.customer_name) {
          showToast(
            `New ${msg.payload.rating}★ item review received from ${msg.payload.customer_name}!`,
            'info'
          );
          loadNotifications();
        }
      },
      [showToast, loadNotifications]
    )
  );

  const handleMarkRead = async (notifId: number) => {
    try {
      await api.patch(`/notifications/${notifId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: 1 } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      showToast('All notifications marked as read');
    } catch {
      // ignore
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: number) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${notifId}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch {
      // ignore
    }
  };

  const handleOpenNotificationTarget = async (n: AdminNotification) => {
    if (!n.is_read) {
      await handleMarkRead(n.id);
    }
    setNotifOpen(false);
    if (n.type === 'order') {
      const code = n.reference_code || n.meta?.orderCode || null;
      setHighlightOrderCode(code);
      setActiveModule('orders');
    } else if (n.type === 'dietitian') {
      setActiveModule('dietitians');
    } else if (n.type === 'review') {
      setActiveModule('testimonials');
    }
  };

  // Admin Access Gate
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#123B16] flex items-center justify-center p-4">
        <SEOHead title="Admin Website CMS Login" />
        <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center space-y-5 shadow-2xl">
          <img
            src={OFFICIAL_TRIMPLATE_LOGO}
            alt="TrimPlate"
            className="w-16 h-16 rounded-2xl object-cover mx-auto"
          />
          <h1 className="text-2xl font-extrabold text-[#202124]">TrimPlate Admin Website CMS</h1>
          <p className="text-xs text-[#777777] leading-relaxed">
            Restricted to authorized administrators. Sign in to manage hero sliders, homepage
            sections, menus, dietitians, prices, offers, orders and SEO.
          </p>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={async () => {
                await quickAccess('admin');
                showToast('Signed in to Admin Website CMS');
              }}
              className="w-full py-3.5 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Instant Admin Demo Sign-In
            </button>
            <Link
              to="/login?redirect=/admin"
              className="block w-full py-3 rounded-xl border border-[#EEEEEE] text-xs font-bold text-[#202124]"
            >
              Sign In with Credentials (admin@trimplate.in / admin123)
            </Link>
            <Link to="/" className="block text-xs font-semibold text-[#0B8F4D] pt-2">
              ← Return to Public Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const unreadOrderCount = notifications.filter((n) => !n.is_read && n.type === 'order').length;
  const unreadDietitianCount = notifications.filter(
    (n) => !n.is_read && n.type === 'dietitian'
  ).length;

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'order') return n.type === 'order';
    if (notifFilter === 'dietitian') return n.type === 'dietitian';
    if (notifFilter === 'unread') return !n.is_read;
    return true;
  });

  const groups = Array.from(new Set(SIDEBAR_MODULES.map((m) => m.group)));
  const currentMeta = SIDEBAR_MODULES.find((m) => m.id === activeModule) || SIDEBAR_MODULES[0];

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <AdminDashboardView onNavigateModule={setActiveModule} />;
      case 'website-management':
        return <WebsiteOverviewHub onSelectModule={setActiveModule} />;
      case 'hero-slider':
        return <HeroSliderManager />;
      case 'homepage-sections':
        return <HomepageSectionsManager />;
      case 'banners':
        return <BannersManager />;
      case 'offers':
        return <SpecialOffersManager />;
      case 'menus-builder':
        return (
          <AdminMenusModule
            onOpenMenuProducts={(divisionName) => {
              setCustomMenuDivisionTarget(divisionName);
              setActiveModule('custom-menu-products');
            }}
            onSelectCoreModule={setActiveModule}
          />
        );
      case 'custom-menu-products':
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveModule('menus-builder')}
              className="text-xs font-bold text-[#0B8F4D] hover:underline"
            >
              ← Back to Menus Builder
            </button>
            <ProductsManager
              presetDivision={customMenuDivisionTarget || undefined}
              titleOverride={`${customMenuDivisionTarget || 'Custom Menu'} Dishes`}
            />
          </div>
        );
      case 'products':
        return <ProductsManager />;
      case 'categories':
        return <CategoriesManager />;
      case 'cafe-menu':
        return <ProductsManager presetDivision="Cafe Menu" titleOverride="Cafe Menu Management" />;
      case 'green-menu':
        return <ProductsManager presetDivision="Green Menu" titleOverride="Green Menu Management" />;
      case 'diet-menu':
        return <ProductsManager presetDiet="diet" titleOverride="Diet Menu (Weight Loss) Dishes" />;
      case 'gym-menu':
        return <ProductsManager presetDiet="gym" titleOverride="Gym High-Protein Menu Dishes" />;
      case 'subscription-plans':
        return <SubscriptionPlansManager />;
      case 'orders':
        return <OrdersAndDeliveryManager highlightOrderCode={highlightOrderCode} />;
      case 'dietitians':
        return <AdminDietitianModule />;
      case 'customers':
        return <CustomersManager />;
      case 'subscriptions':
        return <SubscriptionsAdminManager />;
      case 'payments':
        return <PaymentsAdminManager />;
      case 'delivery':
        return <OrdersAndDeliveryManager deliveryOnly />;
      case 'coupons':
        return <CouponsAdminManager />;
      case 'testimonials':
        return <TestimonialsManager />;
      case 'gallery':
        return <GalleryManager />;
      case 'newsletter':
        return <NewsletterManager />;
      case 'pages':
        return <PagesManager />;
      case 'navigation':
        return <NavigationManager />;
      case 'media':
        return <MediaLibraryManager />;
      case 'seo':
        return <SeoManager />;
      case 'staff':
        return <StaffAdminManager />;
      case 'reports':
        return <AdminReportsView />;
      case 'settings':
        return <WebsiteSettingsManager />;
      case 'profile':
        return (
          <AdminProfileModule
            onLogout={() => {
              logout();
              navigate('/');
            }}
          />
        );
      default:
        return <AdminDashboardView onNavigateModule={setActiveModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F6] flex">
      <SEOHead title={`Admin CMS – ${currentMeta.label}`} />

      {/* Desktop Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#123B16] text-white flex flex-col transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={OFFICIAL_TRIMPLATE_LOGO}
              alt="TrimPlate"
              className="w-10 h-10 rounded-xl object-cover border border-white/20"
            />
            <div>
              <span className="block text-base font-extrabold leading-none">TrimPlate CMS</span>
              <span className="block text-[10px] font-bold tracking-widest uppercase text-[#8CCB16] mt-1">
                Full-Stack Admin
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-white/70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((grp) => (
            <div key={grp}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#8CCB16]/85 mb-1.5">
                {grp}
              </p>
              <div className="space-y-0.5">
                {SIDEBAR_MODULES.filter((m) => m.group === grp).map((mod) => {
                  const active = activeModule === mod.id;
                  const modBadge =
                    mod.id === 'orders'
                      ? unreadOrderCount
                      : mod.id === 'dietitians'
                      ? unreadDietitianCount
                      : 0;

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        setActiveModule(mod.id);
                        if (mod.id !== 'orders') setHighlightOrderCode(null);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                        active
                          ? 'bg-[#0B8F4D] text-white shadow-xs'
                          : 'text-white/80 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <mod.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate flex-1">{mod.label}</span>
                      {modBadge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#8CCB16] text-[#123B16] text-[10px] font-extrabold font-num shrink-0">
                          {modBadge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Admin Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#EEEEEE] px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[#EEEEEE]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-extrabold text-[#202124] truncate">
              {currentMeta.label.replace(/^\d+\.\s*/, '')}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EEEEEE] hover:border-[#0B8F4D] text-xs font-bold text-[#0B8F4D]"
            >
              Live Website <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* Real-Time Order & Consultation Notification Center */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className={`relative p-2.5 rounded-xl border transition-colors ${
                  unreadCount > 0
                    ? 'border-[#0B8F4D]/40 bg-[#F2FAF5] hover:bg-[#E8F5E9]'
                    : 'border-[#EEEEEE] hover:bg-[#F5F6F7]'
                }`}
                aria-label="Open admin notifications"
              >
                <Bell className="w-4 h-4 text-[#123B16]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0B8F4D] text-white text-[10px] font-extrabold flex items-center justify-center font-num">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[340px] sm:w-[430px] bg-white rounded-2xl shadow-2xl border border-[#EEEEEE] z-50 overflow-hidden">
                  {/* Dropdown Header */}
                  <div className="px-4 py-3 bg-[#123B16] text-white flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-extrabold">
                        Item Orders &amp; Operational Notifications
                      </p>
                      <p className="text-[11px] text-white/75 font-num">
                        {unreadCount} unread · {notifications.length} recent alerts
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold text-[#8CCB16]"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div className="px-3 py-2 border-b border-[#EEEEEE] bg-[#FAFAFA] flex items-center gap-1.5 overflow-x-auto">
                    {(
                      [
                        ['all', `All (${notifications.length})`],
                        ['order', `Item Orders (${notifications.filter((n) => n.type === 'order').length})`],
                        ['dietitian', `Dietitian (${notifications.filter((n) => n.type === 'dietitian').length})`],
                        ['unread', `Unread (${unreadCount})`],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNotifFilter(key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                          notifFilter === key
                            ? 'bg-[#0B8F4D] text-white'
                            : 'text-[#666666] hover:bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto divide-y divide-[#EEEEEE]">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#777777]">
                        No notifications in this category.
                      </div>
                    ) : (
                      filteredNotifications.map((n) => {
                        const isUnread = !n.is_read;
                        const orderItems = n.meta?.items || [];
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleOpenNotificationTarget(n)}
                            className={`p-3.5 cursor-pointer transition-colors hover:bg-[#F5F8F6] ${
                              isUnread ? 'bg-[#F2FAF5]/85' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-[#0B8F4D] shrink-0" />
                                )}
                                <p className="text-xs font-extrabold text-[#202124] truncate font-num">
                                  {n.title}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-[#888888] font-num">
                                  {String(n.created_at || '').slice(5, 16)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteNotification(e, n.id)}
                                  className="p-1 rounded hover:bg-red-50 text-[#999999] hover:text-red-600"
                                  title="Dismiss alert"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-[#555555] mt-1 leading-snug">{n.message}</p>

                            {/* Ordered Items Breakdown inside Admin Notification */}
                            {orderItems.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {orderItems.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-[#FFF8ED] border border-[#EDE6D8] text-[11px] font-semibold text-[#123B16] font-num"
                                  >
                                    {it.quantity} × {it.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {(n.type === 'order' || n.type === 'dietitian') && (
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-[#0B8F4D]">
                                <span className="inline-flex items-center gap-1">
                                  {n.type === 'order'
                                    ? 'Open in Order Management'
                                    : 'Open Dietitian Booking'}
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                                {n.type === 'order' &&
                                  (n.meta?.customerWhatsapp || n.meta?.customerPhone) && (
                                    <a
                                      href={
                                        n.meta?.customerWhatsappReplyUrl ||
                                        buildWhatsAppLink(
                                          n.meta?.customerWhatsapp || n.meta?.customerPhone,
                                          `Hello ${
                                            n.meta?.customerName || 'Customer'
                                          }, we received your TrimPlate Order #${
                                            n.reference_code || n.meta?.orderCode || ''
                                          }!`
                                        )
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8F5E9] text-[#123B16] hover:bg-[#0B8F4D] hover:text-white transition-colors font-num"
                                    >
                                      <MessageCircle className="w-3 h-3" /> WA:{' '}
                                      {n.meta?.customerWhatsapp || n.meta?.customerPhone}
                                    </a>
                                  )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Real-Time Live Incoming Item Order / Dietitian Booking Alert Banner */}
        {liveAlert && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 rounded-2xl bg-[#123B16] text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#0B8F4D] text-white flex items-center justify-center shrink-0">
                {liveAlert.kind === 'order' ? (
                  <ShoppingBag className="w-4 h-4" />
                ) : (
                  <Stethoscope className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#8CCB16] font-num">
                  {liveAlert.kind === 'order'
                    ? `NEW ITEM ORDER RECEIVED · #${liveAlert.code}${
                        liveAlert.amountLabel ? ` · ${liveAlert.amountLabel}` : ''
                      }${
                        liveAlert.customerWhatsapp
                          ? ` · WHATSAPP: ${liveAlert.customerWhatsapp}`
                          : ''
                      }`
                    : `NEW DIETITIAN CONSULTATION · #${liveAlert.code}`}
                </p>
                <p className="text-xs text-white/95 mt-0.5 truncate">
                  <strong>{liveAlert.customerName}:</strong> {liveAlert.summary}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {liveAlert.kind === 'order' && liveAlert.customerWhatsappReplyUrl && (
                <a
                  href={liveAlert.customerWhatsappReplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Customer
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  if (liveAlert.kind === 'order') {
                    setHighlightOrderCode(liveAlert.code || null);
                    setActiveModule('orders');
                  } else {
                    setActiveModule('dietitians');
                  }
                  setLiveAlert(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#8CCB16] hover:bg-white text-[#123B16] text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors"
              >
                {liveAlert.kind === 'order' ? 'View Item Order' : 'View Booking'}{' '}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLiveAlert(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <main className="p-4 sm:p-8 flex-1 overflow-x-hidden">{renderActiveModule()}</main>
      </div>
    </div>
  );
}
