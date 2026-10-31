import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  MapPin,
  Package,
  CalendarRange,
  CreditCard,
  LifeBuoy,
  LogOut,
  Pause,
  Play,
  RefreshCw,
  FileText,
  XCircle,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Star,
  Clock,
  CornerDownRight,
  Lock,
  ShoppingBag,
  Truck,
  Phone,
  ArrowRight,
  Home,
  Briefcase,
  Printer,
  X,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { useRealtime } from '../hooks/useRealtime';
import { SEOHead } from '../components/SEOHead';
import { StarRatingBar } from '../components/StarRatingBar';
import { api, formatINR } from '../services/api';
import { CustomerReview, OrderRecord, Product, SubscriptionRecord } from '../types';
import { OFFICIAL_TRIMPLATE_LOGO, resolveFoodImage } from '../assets/mediaMap';

export function LoginPage() {
  const { login, register, quickAccess } = useAuth();
  const { site } = useSite();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/account?tab=profile';

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    dietary_preference: 'Both',
  });
  const [resetPassword, setResetPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const brandName = site.settings.business_name || site.settings.site_name || 'TrimPlate';
  const logoSrc =
    resolveFoodImage(site.settings.logo_url || 'official_logo') || OFFICIAL_TRIMPLATE_LOGO;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const u = await login(identifier, password);
      showToast(`Welcome back, ${u.name}!`);
      navigate(u.role === 'admin' ? '/admin' : redirectPath);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const u = await register(regForm);
      showToast(`Account created! Welcome to TrimPlate, ${u.name}.`);
      navigate(redirectPath);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        identifier,
        new_password: resetPassword,
      });
      showToast(data.message || 'Password updated!');
      setMode('login');
      setPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not reset password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[82vh] bg-[#FFF8ED] py-10 sm:py-16 px-4 flex items-center justify-center">
      <SEOHead title="Sign In or Create Account" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl border border-[#E8ECE9] shadow-lg overflow-hidden">
        {/* Left Editorial Brand & Member Perks Panel */}
        <div className="hidden lg:flex lg:col-span-5 bg-[#123B16] text-white p-9 flex-col justify-between relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={logoSrc}
                alt={brandName}
                className="w-12 h-12 rounded-2xl object-cover border border-white/20"
              />
              <div>
                <span className="block text-xl font-extrabold tracking-tight font-['Poppins']">
                  {brandName}
                </span>
                <span className="block text-[10px] font-bold tracking-[0.16em] uppercase text-[#8CCB16]">
                  {site.settings.tagline || 'EAT SMART. STAY TRIM.'}
                </span>
              </div>
            </Link>

            <div className="pt-2 space-y-2.5">
              <h2 className="text-2xl font-extrabold leading-snug text-white">
                Your Personal Healthy Dining &amp; Meal Plan Portal
              </h2>
              <p className="text-sm text-white/75 leading-relaxed">
                Track fresh kitchen dispatches, manage daily Diet &amp; Gym subscriptions, download
                GST invoices, and rate your orders.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              {[
                {
                  icon: Truck,
                  title: 'Live Kitchen-to-Door Tracking',
                  desc: 'Follow your meal from preparation to insulated doorstep delivery.',
                },
                {
                  icon: CalendarRange,
                  title: 'Flexible Plan Pause & Date Skip',
                  desc: 'Travelling? Pause your subscription or skip any delivery date in 1 click.',
                },
                {
                  icon: Star,
                  title: 'Verified Order Ratings',
                  desc: 'Submit one verified rating per order and view kitchen replies.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/8 border border-white/10"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#0B8F4D] text-white flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="text-[11px] text-white/70 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-white/60 pt-8 relative z-10">
            100% FSSAI Certified Kitchen · Zero Refined Oils · Macro-Counted Daily
          </p>
        </div>

        {/* Right Authentication Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-10 space-y-6 flex flex-col justify-center">
          <div className="space-y-1.5 text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-3">
              <img
                src={logoSrc}
                alt={brandName}
                className="w-12 h-12 rounded-2xl object-cover border border-[#EEEEEE]"
              />
            </div>
            <h1 className="text-2xl font-extrabold text-[#202124]">
              {mode === 'login'
                ? 'Sign In to Your Account'
                : mode === 'register'
                ? 'Create Your TrimPlate Account'
                : 'Reset Account Password'}
            </h1>
            <p className="text-xs sm:text-sm text-[#777777]">
              {mode === 'login'
                ? 'Access your orders, active meal subscriptions, addresses & reviews.'
                : mode === 'register'
                ? 'Join TrimPlate for fresh macro-counted meals and flexible daily plans.'
                : 'Enter your registered email or mobile number to set a new password.'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 bg-[#F4F6F5] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2.5 rounded-lg text-xs font-bold transition-colors ${
                mode === 'login' ? 'bg-white text-[#0B8F4D] shadow-xs' : 'text-[#666666]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2.5 rounded-lg text-xs font-bold transition-colors ${
                mode === 'register' ? 'bg-white text-[#0B8F4D] shadow-xs' : 'text-[#666666]'
              }`}
            >
              Create Account
            </button>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Email Address or Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. ananya@trimplate.in or 9830012345"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E4E2] text-sm outline-none focus:border-[#0B8F4D] transition-colors"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-[#202124]">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs font-semibold text-[#0B8F4D] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E4E2] text-sm outline-none focus:border-[#0B8F4D] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold transition-colors shadow-xs"
              >
                {submitting ? 'Signing In...' : 'Sign In to Account'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Your Full Name"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E4E2] text-sm outline-none focus:border-[#0B8F4D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    10-Digit Mobile *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9830012345"
                    value={regForm.mobile}
                    onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E4E2] text-sm font-num outline-none focus:border-[#0B8F4D]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E4E2] text-sm outline-none focus:border-[#0B8F4D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Dietary Preference
                  </label>
                  <select
                    value={regForm.dietary_preference}
                    onChange={(e) =>
                      setRegForm({ ...regForm, dietary_preference: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E4E2] text-sm outline-none focus:border-[#0B8F4D] bg-white"
                  >
                    <option value="Both">Veg &amp; Non-Veg</option>
                    <option value="Pure Veg">Pure Vegetarian</option>
                    <option value="High Protein">High Protein Gym</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Create Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E4E2] text-sm outline-none focus:border-[#0B8F4D]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold transition-colors"
              >
                {submitting ? 'Creating Account...' : 'Create My Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Registered Email or Mobile
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your email or mobile"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E4E2] text-sm outline-none focus:border-[#0B8F4D]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Enter new password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E4E2] text-sm outline-none focus:border-[#0B8F4D]"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="px-4 py-3 rounded-xl border border-[#E0E4E2] text-xs font-bold text-[#202124]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#0B8F4D] text-white text-sm font-bold"
                >
                  Update Password
                </button>
              </div>
            </form>
          )}

          {/* Instant 1-Click Demo Access */}
          <div className="pt-5 border-t border-[#EEEEEE] space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-center text-[#777777]">
              Instant 1-Click Demo Sign In
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  const u = await quickAccess('customer');
                  showToast(`Signed in as ${u.name}`);
                  navigate(redirectPath);
                }}
                className="py-2.5 px-3.5 rounded-xl border border-[#DCE4DF] hover:border-[#0B8F4D] bg-[#F9FBF9] text-xs font-bold text-[#123B16] inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#0B8F4D]" /> Customer Account Demo
              </button>
              <button
                type="button"
                onClick={async () => {
                  await quickAccess('admin');
                  showToast('Signed in to Admin Website CMS');
                  navigate('/admin');
                }}
                className="py-2.5 px-3.5 rounded-xl bg-[#123B16] hover:bg-[#0B8F4D] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#8CCB16]" /> Admin Website CMS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomerAccountPage() {
  const { user, loading: authLoading, refreshProfile, addAddress, deleteAddress, logout } = useAuth();
  const { addProductToCart, setIsCartDrawerOpen } = useCart();
  const { site, refreshSite } = useSite();
  const { showToast, requestConfirm } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Default to 'profile' when /account is visited without ?tab=, so every link shows ONLY its own data
  const activeTab = searchParams.get('tab') || 'profile';
  const preselectedOrderParam = searchParams.get('order') || '';

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [subs, setSubs] = useState<SubscriptionRecord[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<CustomerReview[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderRecord | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [reviewForm, setReviewForm] = useState({
    order_id: '',
    order_item_id: '',
    product_id: '',
    reviewer_location: 'Kolkata',
    rating: 5,
    comment: '',
  });
  const [submittingMyReview, setSubmittingMyReview] = useState(false);
  const [thankYouBanner, setThankYouBanner] = useState<string>('');

  // Inline individual item review state inside My Orders tab
  const [inlineItemTarget, setInlineItemTarget] = useState<{
    orderId: number;
    itemId: number;
    productId: number | null;
    itemName: string;
  } | null>(null);
  const [inlineRating, setInlineRating] = useState<number>(5);
  const [inlineComment, setInlineComment] = useState<string>('');
  const [submittingInline, setSubmittingInline] = useState<boolean>(false);
  const [justReviewedKeys, setJustReviewedKeys] = useState<Record<string, boolean>>({});

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    dietary_preference: user?.customerProfile?.dietary_preference || 'Both',
    fitness_goal: user?.customerProfile?.fitness_goal || 'Eat Smart & Stay Trim',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwdForm, setPwdForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingPwd, setSavingPwd] = useState(false);

  const [addrForm, setAddrForm] = useState({
    label: 'Home',
    line1: '',
    area: '',
    city: 'Kolkata',
    pincode: '700016',
  });
  const [skipDateInput, setSkipDateInput] = useState<Record<number, string>>({});
  const [supportTopic, setSupportTopic] = useState('Order Delivery & Timing');
  const [supportOrderRef, setSupportOrderRef] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);

  const loadAccountData = useCallback(async (silent = false) => {
    if (!silent) setDataLoading(true);
    try {
      const [ordRes, subRes, payRes, revRes, prodRes] = await Promise.allSettled([
        api.get<OrderRecord[]>('/orders'),
        api.get<SubscriptionRecord[]>('/subscriptions'),
        api.get<any[]>('/payments'),
        api.get<CustomerReview[]>('/reviews/my'),
        api.get<Product[]>('/products'),
      ]);
      if (ordRes.status === 'fulfilled') setOrders(ordRes.value.data);
      if (subRes.status === 'fulfilled') setSubs(subRes.value.data);
      if (payRes.status === 'fulfilled') setPayments(payRes.value.data);
      if (revRes.status === 'fulfilled') setMyReviews(revRes.value.data);
      if (prodRes.status === 'fulfilled') setCatalogProducts(prodRes.value.data);
    } finally {
      if (!silent) setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?redirect=/account');
      return;
    }
    const defaultArea = user.addresses?.[0]?.area
      ? `${user.addresses[0].area}, ${user.addresses[0].city || 'Kolkata'}`
      : 'Kolkata';
    setReviewForm((prev) => ({ ...prev, reviewer_location: defaultArea }));
    setProfileForm({
      name: user.name,
      email: user.email || '',
      mobile: user.mobile,
      dietary_preference: user.customerProfile?.dietary_preference || 'Both',
      fitness_goal: user.customerProfile?.fitness_goal || 'Eat Smart & Stay Trim',
    });
    loadAccountData(false);
  }, [authLoading, user, navigate, loadAccountData]);

  useRealtime(
    useCallback(
      (msg) => {
        if (
          msg.event === 'order_status_updated' ||
          msg.event === 'subscription_updated' ||
          msg.event === 'review_updated'
        ) {
          loadAccountData(true);
        }
      },
      [loadAccountData]
    )
  );

  // Find submitted review for an individual item within an order
  const findReviewForOrderItem = useCallback(
    (orderId: number, item: { id: number; product_id?: number | null }) =>
      myReviews.find(
        (r) =>
          Number(r.order_id) === orderId &&
          ((item.product_id && Number(r.product_id) === Number(item.product_id)) ||
            (r.order_item_id && Number(r.order_item_id) === Number(item.id)))
      ),
    [myReviews]
  );

  const unreviewedOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.order_status !== 'Cancelled' &&
          o.items.some((it) => !findReviewForOrderItem(o.id, it))
      ),
    [orders, findReviewForOrderItem]
  );

  // Keep selected order & individual item in review form synced with unreviewedOrders (and optional ?order= param)
  useEffect(() => {
    if (unreviewedOrders.length === 0) {
      setReviewForm((prev) =>
        prev.order_id ? { ...prev, order_id: '', order_item_id: '', product_id: '' } : prev
      );
      return;
    }

    const fromQuery =
      preselectedOrderParam && unreviewedOrders.find((o) => String(o.id) === preselectedOrderParam);
    const currentValid =
      reviewForm.order_id && unreviewedOrders.find((o) => String(o.id) === reviewForm.order_id);
    const targetOrder = fromQuery || currentValid || unreviewedOrders[0];
    const unreviewedItemsInTarget = targetOrder.items.filter(
      (it) => !findReviewForOrderItem(targetOrder.id, it)
    );
    const currentItemValid =
      reviewForm.order_item_id &&
      unreviewedItemsInTarget.find((it) => String(it.id) === reviewForm.order_item_id);
    const firstItem = currentItemValid || unreviewedItemsInTarget[0];

    if (
      String(targetOrder.id) !== reviewForm.order_id ||
      (firstItem && String(firstItem.id) !== reviewForm.order_item_id)
    ) {
      setReviewForm((prev) => ({
        ...prev,
        order_id: String(targetOrder.id),
        order_item_id: firstItem ? String(firstItem.id) : '',
        product_id: firstItem?.product_id ? String(firstItem.product_id) : '',
      }));
    }
  }, [
    unreviewedOrders,
    preselectedOrderParam,
    reviewForm.order_id,
    reviewForm.order_item_id,
    findReviewForOrderItem,
  ]);

  const selectedReviewOrder = useMemo(
    () => unreviewedOrders.find((o) => String(o.id) === reviewForm.order_id) || null,
    [unreviewedOrders, reviewForm.order_id]
  );

  const unreviewedItemsForSelectedOrder = useMemo(() => {
    if (!selectedReviewOrder) return [];
    return selectedReviewOrder.items.filter(
      (it) => !findReviewForOrderItem(selectedReviewOrder.id, it)
    );
  }, [selectedReviewOrder, findReviewForOrderItem]);

  const lifetimeSpend = useMemo(
    () =>
      orders
        .filter((o) => o.order_status !== 'Cancelled')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'active') {
      return orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.order_status));
    }
    if (orderFilter === 'delivered') {
      return orders.filter((o) => o.order_status === 'Delivered');
    }
    if (orderFilter === 'cancelled') {
      return orders.filter((o) => o.order_status === 'Cancelled');
    }
    return orders;
  }, [orders, orderFilter]);

  if (authLoading) {
    return (
      <div className="bg-[#F7F9F8] min-h-[75vh] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="h-20 rounded-2xl bg-[#E8ECE9] animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="hidden lg:block lg:col-span-3 h-80 rounded-3xl bg-white border border-[#EEEEEE] animate-pulse" />
            <div className="lg:col-span-9 h-96 rounded-3xl bg-white border border-[#EEEEEE] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', profileForm);
      await refreshProfile();
      showToast('Profile and nutrition preferences updated');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.new_password.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      showToast('New password and confirmation do not match', 'error');
      return;
    }
    setSavingPwd(true);
    try {
      const { data } = await api.put('/auth/password', {
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password,
      });
      showToast(data.message || 'Password updated successfully');
      setPwdForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not update password', 'error');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleCancelOrder = (order: OrderRecord) => {
    requestConfirm({
      title: `Cancel Order #${order.order_code}?`,
      message:
        'Orders in the Placed stage can be cancelled before kitchen preparation begins. Would you like to cancel this order?',
      confirmLabel: 'Yes, Cancel Order',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.patch(`/orders/${order.id}/status`, {
            order_status: 'Cancelled',
          });
          showToast(`Order #${order.order_code} has been cancelled`);
          loadAccountData(true);
        } catch (err: any) {
          showToast(err.response?.data?.error || 'Cannot cancel order', 'error');
        }
      },
    });
  };

  const handleReorder = (order: OrderRecord) => {
    let addedCount = 0;
    order.items.forEach((it) => {
      if (it.product_id) {
        const prod = catalogProducts.find((p) => p.id === it.product_id);
        if (prod) {
          addProductToCart(prod, it.variant_name || '', it.unit_price, it.quantity);
          addedCount += it.quantity;
        }
      }
    });
    if (addedCount > 0) {
      showToast(`Added ${addedCount} item(s) from Order #${order.order_code} to your bag`);
      setIsCartDrawerOpen(true);
    } else {
      navigate('/green-menu');
    }
  };

  const handleToggleSubscription = async (sub: SubscriptionRecord) => {
    const nextStatus = sub.status === 'Active' ? 'Paused' : 'Active';
    await api.patch(`/subscriptions/${sub.id}/status`, { status: nextStatus });
    showToast(`Subscription ${sub.subscription_code} ${nextStatus.toLowerCase()}`);
    loadAccountData(true);
  };

  const handleSkipDay = async (subId: number, specificDate?: string) => {
    const dateVal = specificDate || skipDateInput[subId];
    if (!dateVal) return;
    await api.patch(`/subscriptions/${subId}/status`, { skip_date: dateVal });
    showToast(`Updated skipped delivery schedule (${dateVal})`);
    if (!specificDate) {
      setSkipDateInput((prev) => ({ ...prev, [subId]: '' }));
    }
    loadAccountData(true);
  };

  const handleRenewSub = async (subId: number) => {
    try {
      const { data } = await api.post(`/subscriptions/${subId}/renew`);
      showToast(`Subscription renewed! New Plan ID: ${data.subscription_code}`);
      loadAccountData(true);
    } catch {
      showToast('Failed to renew subscription', 'error');
    }
  };

  const navTabs = [
    { id: 'profile', label: 'My Account', shortLabel: 'Account', icon: User },
    { id: 'orders', label: 'My Orders', shortLabel: 'Orders', icon: Package },
    {
      id: 'subscriptions',
      label: 'My Subscriptions',
      shortLabel: 'Subscriptions',
      icon: CalendarRange,
    },
    { id: 'reviews', label: 'My Reviews', shortLabel: 'Reviews', icon: Star },
    { id: 'addresses', label: 'Saved Addresses', shortLabel: 'Addresses', icon: MapPin },
    { id: 'payments', label: 'Billing & Payments', shortLabel: 'Billing', icon: CreditCard },
    { id: 'support', label: 'Help & Support', shortLabel: 'Support', icon: LifeBuoy },
  ];

  const switchTab = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="bg-[#F6F8F7] min-h-screen pb-16">
      <SEOHead title="My Account | TrimPlate" />

      {/* Slim Member Bar (Clean identity without cluttering other tabs' data) */}
      <div className="bg-white border-b border-[#E8ECEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0B8F4D] text-white text-sm font-extrabold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-extrabold text-[#202124] truncate">
                {user.name}
              </p>
              <p className="text-xs text-[#666666] font-num truncate">
                {user.mobile}
                {user.email ? ` · ${user.email}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/green-menu"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Order Meals
            </Link>
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#123B16] text-white text-xs font-bold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#8CCB16]" /> Admin CMS
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-5">
        {/* Compact Mobile / Tablet Horizontal Tab Switcher (lg:hidden) */}
        <div className="lg:hidden bg-white rounded-2xl border border-[#E6EAE8] p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xs">
          {navTabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#0B8F4D] text-white'
                    : 'text-[#4A4E54] hover:bg-[#F5F7F6]'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.shortLabel}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {/* Desktop Sidebar + Focused Active Section Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Sticky Desktop Account Navigation */}
          <aside className="hidden lg:block lg:col-span-3 bg-white rounded-2xl border border-[#E6EAE8] p-3.5 space-y-1 sticky top-24 shadow-2xs">
            {navTabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#0B8F4D] text-white'
                      : 'text-[#202124] hover:bg-[#F5F8F6] hover:text-[#0B8F4D]'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-[#F0F2F1]">
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </aside>

          {/* Main Active Module Panel — Shows ONLY the clicked section's actual data */}
          <div key={activeTab} className="lg:col-span-9 space-y-5 animate-tp-fade-up">
            {/* ==================== TAB: MY ACCOUNT (PROFILE & SECURITY) ==================== */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleUpdateProfile}
                  className="bg-white rounded-2xl border border-[#E6EAE8] p-6 sm:p-7 space-y-5 shadow-2xs"
                >
                  <div className="border-b border-[#F0F2F1] pb-4">
                    <h1 className="text-xl font-extrabold text-[#202124]">
                      My Account &amp; Nutrition Preferences
                    </h1>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Manage your personal contact information and dietary preferences.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm outline-none focus:border-[#0B8F4D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1.5">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={profileForm.mobile}
                        onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm font-num outline-none focus:border-[#0B8F4D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm outline-none focus:border-[#0B8F4D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1.5">
                        Dietary Preference
                      </label>
                      <select
                        value={profileForm.dietary_preference}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, dietary_preference: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm bg-white outline-none focus:border-[#0B8F4D]"
                      >
                        <option value="Both">Veg &amp; Non-Veg</option>
                        <option value="Pure Veg">Pure Vegetarian</option>
                        <option value="High Protein">High Protein Gym</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#202124] mb-1.5">
                        Primary Health / Fitness Goal
                      </label>
                      <select
                        value={profileForm.fitness_goal}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, fitness_goal: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm bg-white outline-none focus:border-[#0B8F4D]"
                      >
                        <option value="Eat Smart & Stay Trim">
                          Eat Smart &amp; Stay Trim (Balanced Daily Nutrition)
                        </option>
                        <option value="Calorie-Deficit Weight Loss">
                          Calorie-Deficit Sustainable Weight Loss
                        </option>
                        <option value="Lean Muscle & High Protein">
                          Lean Muscle &amp; High-Protein Recovery
                        </option>
                        <option value="Low-GI Sugar Control">
                          Low-GI Sugar &amp; Metabolic Control
                        </option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-3 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold transition-colors"
                  >
                    {savingProfile ? 'Saving Changes...' : 'Save Profile & Preferences'}
                  </button>
                </form>

                {/* Change Password Security Card */}
                <form
                  onSubmit={handleUpdatePassword}
                  className="bg-white rounded-2xl border border-[#E6EAE8] p-6 sm:p-7 space-y-5 shadow-2xs"
                >
                  <div className="border-b border-[#F0F2F1] pb-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-[#202124]">
                        Account Security &amp; Password
                      </h2>
                      <p className="text-xs text-[#777777]">
                        Update your account password anytime for secure access.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1.5">
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={pwdForm.current_password}
                        onChange={(e) =>
                          setPwdForm({ ...pwdForm, current_password: e.target.value })
                        }
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm outline-none focus:border-[#0B8F4D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={pwdForm.new_password}
                        onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm outline-none focus:border-[#0B8F4D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={pwdForm.confirm_password}
                        onChange={(e) =>
                          setPwdForm({ ...pwdForm, confirm_password: e.target.value })
                        }
                        placeholder="Repeat new password"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm outline-none focus:border-[#0B8F4D]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPwd}
                    className="px-5 py-2.5 rounded-xl bg-[#123B16] hover:bg-[#0B8F4D] text-white text-xs font-bold transition-colors"
                  >
                    {savingPwd ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {/* ==================== TAB: MY ORDERS ==================== */}
            {activeTab === 'orders' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-[#E6EAE8] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h1 className="text-xl font-extrabold text-[#202124]">My Orders</h1>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Track live kitchen preparation, download GST tax invoices, or submit a one-time rating for each ordered item.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#F4F6F5] p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'active', label: 'Active' },
                        { id: 'delivered', label: 'Delivered' },
                        { id: 'cancelled', label: 'Cancelled' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setOrderFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                          orderFilter === f.id
                            ? 'bg-white text-[#0B8F4D] shadow-2xs'
                            : 'text-[#666666] hover:text-[#202124]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {dataLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((n) => (
                      <div
                        key={n}
                        className="h-52 rounded-2xl bg-white border border-[#E6EAE8] animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#E6EAE8] p-10 sm:p-14 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center mx-auto">
                      <Package className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-[#202124]">
                        No matching orders found
                      </h3>
                      <p className="text-xs text-[#777777] max-w-sm mx-auto">
                        Explore our macro-verified Healthy Green Menu or artisanal Cafe Menu to place
                        your next fresh order.
                      </p>
                    </div>
                    <Link
                      to="/green-menu"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
                    >
                      Explore Healthy Menu <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const steps = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
                    const currentIdx = steps.indexOf(order.order_status);
                    const unreviewedCountInOrder = order.items.filter(
                      (it) => !findReviewForOrderItem(order.id, it)
                    ).length;

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-[#E6EAE8] overflow-hidden shadow-2xs"
                      >
                        {/* Order Top Meta Bar */}
                        <div className="px-5 sm:px-6 py-4 bg-[#FAFCFB] border-b border-[#EEF1EF] flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="text-sm font-extrabold text-[#123B16] font-num">
                              Order #{order.order_code}
                            </span>
                            <span className="text-[#CCCCCC]">·</span>
                            <span className="text-[#777777] font-num">
                              {order.created_at?.slice(0, 16)}
                            </span>
                            <span className="text-[#CCCCCC]">·</span>
                            <span className="font-medium text-[#555555]">
                              {order.payment_method} ({order.payment_status})
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs font-bold ${
                                order.order_status === 'Cancelled'
                                  ? 'text-red-600'
                                  : order.order_status === 'Delivered'
                                  ? 'text-[#0B8F4D]'
                                  : 'text-amber-700'
                              }`}
                            >
                              {order.order_status}
                            </span>
                            <span className="text-base font-extrabold text-[#202124] font-num">
                              {formatINR(order.total_amount)}
                            </span>
                          </div>
                        </div>

                        {/* Order Body: Individual Items (Each Item Has Individual One-Time Review) */}
                        <div className="p-5 sm:p-6 space-y-5">
                          <div className="divide-y divide-[#F2F4F3]">
                            {order.items.map((it) => {
                              const itemReview = findReviewForOrderItem(order.id, it);
                              const itemKey = `${order.id}:${it.id}`;
                              const isInlineOpen =
                                inlineItemTarget?.orderId === order.id &&
                                inlineItemTarget?.itemId === it.id;

                              return (
                                <div key={it.id} className="py-3 first:pt-0 last:pb-0 space-y-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <img
                                        src={resolveFoodImage(it.image_key || 'hero_bowl')}
                                        alt={it.item_name}
                                        className="w-11 h-11 rounded-xl object-cover border border-[#EEEEEE] shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-[#202124] truncate">
                                          {it.item_name}
                                        </p>
                                        <p className="text-xs text-[#777777] font-num">
                                          Qty: {it.quantity}
                                          {it.variant_name ? ` · ${it.variant_name}` : ''} ·{' '}
                                          {formatINR(it.unit_price)} each
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                                      {order.order_status !== 'Cancelled' && (
                                        itemReview ? (
                                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8F5E9]/70 border border-[#0B8F4D]/25 text-xs font-semibold text-[#123B16]">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0B8F4D] shrink-0" />
                                            <span>
                                              {justReviewedKeys[itemKey]
                                                ? 'Thank you for your review!'
                                                : 'Thank you · Reviewed'}
                                            </span>
                                            <StarRatingBar rating={itemReview.rating} size="xs" />
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (isInlineOpen) {
                                                setInlineItemTarget(null);
                                              } else {
                                                setInlineItemTarget({
                                                  orderId: order.id,
                                                  itemId: it.id,
                                                  productId: it.product_id ?? null,
                                                  itemName: it.item_name,
                                                });
                                                setInlineRating(5);
                                                setInlineComment('');
                                              }
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8ED] border border-[#0B8F4D]/25 text-xs font-bold text-[#123B16] hover:bg-[#E8F5E9] transition-colors"
                                          >
                                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                            {isInlineOpen ? 'Close' : 'Rate Item'}
                                          </button>
                                        )
                                      )}

                                      <span className="text-sm font-bold text-[#202124] font-num">
                                        {formatINR(it.total_price)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Inline One-Time Individual Item Rating Form */}
                                  {isInlineOpen && !itemReview && (
                                    <form
                                      onSubmit={async (e) => {
                                        e.preventDefault();
                                        setSubmittingInline(true);
                                        try {
                                          await api.post('/reviews', {
                                            order_id: order.id,
                                            order_item_id: it.id,
                                            product_id: it.product_id ?? null,
                                            reviewer_location:
                                              reviewForm.reviewer_location || 'Kolkata',
                                            rating: inlineRating,
                                            comment: inlineComment.trim(),
                                          });
                                          setJustReviewedKeys((prev) => ({
                                            ...prev,
                                            [itemKey]: true,
                                          }));
                                          setInlineItemTarget(null);
                                          setInlineComment('');
                                          showToast('Thank you for your review!');
                                          await loadAccountData(true);
                                          await refreshSite();
                                        } catch (err: any) {
                                          showToast(
                                            err.response?.data?.error || 'Could not submit review',
                                            'error'
                                          );
                                        } finally {
                                          setSubmittingInline(false);
                                        }
                                      }}
                                      className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#DCE8E0] flex flex-col sm:flex-row sm:items-center gap-3 animate-tp-fade-in"
                                    >
                                      <div className="flex items-center gap-1 shrink-0">
                                        {[1, 2, 3, 4, 5].map((st) => (
                                          <button
                                            key={st}
                                            type="button"
                                            onClick={() => setInlineRating(st)}
                                            className={`p-1.5 rounded-lg border transition-colors ${
                                              inlineRating >= st
                                                ? 'bg-amber-50 border-amber-300 text-amber-500'
                                                : 'bg-white border-[#E2EAE5] text-[#CCCCCC]'
                                            }`}
                                          >
                                            <Star className="w-4 h-4 fill-current" />
                                          </button>
                                        ))}
                                      </div>

                                      <input
                                        type="text"
                                        value={inlineComment}
                                        onChange={(e) => setInlineComment(e.target.value)}
                                        placeholder={`Share a quick note on ${it.item_name} (optional)...`}
                                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#DCE4DF] text-xs outline-none focus:border-[#0B8F4D]"
                                      />

                                      <button
                                        type="submit"
                                        disabled={submittingInline}
                                        className="px-4 py-2 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold whitespace-nowrap transition-colors"
                                      >
                                        {submittingInline ? 'Saving...' : 'Submit Review'}
                                      </button>
                                    </form>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {(order.delivery_address_snapshot || order.estimated_delivery) && (
                            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#F8FAF9] border border-[#EDF1EF] text-xs text-[#555555]">
                              {order.delivery_address_snapshot && (
                                <span className="inline-flex items-center gap-1.5 min-w-0">
                                  <MapPin className="w-3.5 h-3.5 text-[#0B8F4D] shrink-0" />
                                  <span className="truncate">{order.delivery_address_snapshot}</span>
                                </span>
                              )}
                              {order.estimated_delivery && (
                                <span className="inline-flex items-center gap-1 font-semibold text-[#123B16] shrink-0">
                                  <Clock className="w-3.5 h-3.5 text-[#0B8F4D]" />
                                  {order.estimated_delivery}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Connected 4-Stage Visual Order Stepper */}
                          {order.order_status !== 'Cancelled' && (
                            <div className="pt-1">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {steps.map((step, i) => {
                                  const done = i <= currentIdx;
                                  const isCurrent = i === currentIdx;
                                  return (
                                    <div
                                      key={step}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${
                                        isCurrent
                                          ? 'bg-[#E8F5E9] border-[#0B8F4D]/35 text-[#123B16]'
                                          : done
                                          ? 'bg-[#F8FBF9] border-[#DCE8E0] text-[#0B8F4D]'
                                          : 'bg-white border-[#F0F2F1] text-[#9AA0A6]'
                                      }`}
                                    >
                                      <CheckCircle2
                                        className={`w-4 h-4 shrink-0 ${
                                          done ? 'text-[#0B8F4D]' : 'text-[#D0D5D2]'
                                        }`}
                                      />
                                      <span className="truncate">{step}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons Bar */}
                          <div className="pt-3 border-t border-[#F0F2F1] flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setInvoiceOrder(order)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCE4DF] text-xs font-bold text-[#202124] hover:bg-[#F5F7F6] transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#0B8F4D]" /> Tax Invoice
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReorder(order)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCE4DF] text-xs font-bold text-[#202124] hover:border-[#0B8F4D] hover:text-[#0B8F4D] transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Reorder
                              </button>

                              {order.order_status !== 'Cancelled' && unreviewedCountInOrder === 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8F5E9]/70 border border-[#0B8F4D]/25 text-xs font-semibold text-[#123B16]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0B8F4D]" />
                                  Thank you for your review!
                                </span>
                              )}
                            </div>

                            {order.order_status === 'Placed' && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Cancel Order
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ==================== TAB: MY SUBSCRIPTIONS ==================== */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-[#E6EAE8] p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h1 className="text-xl font-extrabold text-[#202124]">
                      My Meal Subscriptions
                    </h1>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Pause or resume deliveries anytime, skip travel dates, or renew your plan in one
                      click.
                    </p>
                  </div>
                  <Link
                    to="/subscriptions"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold transition-colors"
                  >
                    + Subscribe to New Plan
                  </Link>
                </div>

                {subs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#E6EAE8] p-10 sm:p-14 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#FFF8ED] text-[#0B8F4D] flex items-center justify-center mx-auto">
                      <CalendarRange className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-[#202124]">
                        No Meal Subscriptions Yet
                      </h3>
                      <p className="text-xs text-[#777777] max-w-md mx-auto">
                        Choose from our 3-Day Trial, 7-Day Healthy Plan, 15-Day Fitness Plan, or
                        30-Day Best Value Subscription with free doorstep delivery.
                      </p>
                    </div>
                    <Link
                      to="/subscriptions"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
                    >
                      Explore Meal Plans <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  subs.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white rounded-2xl border border-[#E6EAE8] overflow-hidden shadow-2xs"
                    >
                      <div className="px-5 sm:px-6 py-4 bg-[#FAFCFB] border-b border-[#EEF1EF] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B8F4D] font-num">
                            {sub.subscription_code}
                          </span>
                          <span className="text-[#CCCCCC]">·</span>
                          <span className="text-xs font-bold text-[#202124]">{sub.plan_name}</span>
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            sub.status === 'Active'
                              ? 'text-[#0B8F4D]'
                              : sub.status === 'Paused'
                              ? 'text-amber-700'
                              : 'text-[#666666]'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-extrabold text-[#202124]">
                              {sub.menu_preference}
                            </h3>
                            <p className="text-xs text-[#666666] mt-0.5">
                              Included Meals:{' '}
                              <strong className="text-[#202124]">
                                {sub.selected_meals || 'Breakfast, Lunch, Snacks, Dinner'}
                              </strong>{' '}
                              · {sub.is_veg_only ? 'Pure Vegetarian' : 'Veg & Non-Veg'}
                            </p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-lg font-extrabold text-[#0B8F4D] font-num">
                              {formatINR(sub.total_paid)}
                            </p>
                            <p className="text-[11px] text-[#777777]">{sub.payment_method}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#EDF1EF] text-xs">
                          <div>
                            <span className="text-[#777777] block">Active Plan Window</span>
                            <strong className="text-[#202124] font-num">
                              {sub.start_date} → {sub.end_date}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[#777777] block">Daily Delivery Window</span>
                            <strong className="text-[#202124] font-num">{sub.delivery_slot}</strong>
                          </div>
                        </div>

                        {sub.skipped_dates.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-[#555555]">Skipped Dates:</span>
                            {sub.skipped_dates.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleSkipDay(sub.id, d)}
                                title="Click to restore delivery on this date"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-num font-semibold hover:bg-amber-100"
                              >
                                {d} <X className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="pt-3 border-t border-[#F0F2F1] flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="date"
                              value={skipDateInput[sub.id] || ''}
                              onChange={(e) =>
                                setSkipDateInput({ ...skipDateInput, [sub.id]: e.target.value })
                              }
                              className="px-3 py-2 rounded-xl border border-[#DCE4DF] text-xs font-num outline-none focus:border-[#0B8F4D]"
                            />
                            <button
                              type="button"
                              onClick={() => handleSkipDay(sub.id)}
                              className="px-3.5 py-2 rounded-xl border border-[#0B8F4D] text-[#0B8F4D] hover:bg-[#E8F5E9] text-xs font-bold transition-colors"
                            >
                              Skip / Unskip Date
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleSubscription(sub)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCE4DF] text-xs font-bold text-[#202124] hover:bg-[#F5F7F6] transition-colors"
                            >
                              {sub.status === 'Active' ? (
                                <>
                                  <Pause className="w-3.5 h-3.5" /> Pause Plan
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 text-[#0B8F4D]" /> Resume Plan
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRenewSub(sub.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Renew Plan
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ==================== TAB: MY REVIEWS (INDIVIDUAL ONE-TIME ITEM REVIEWS) ==================== */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-[#E6EAE8] p-5 sm:p-6 shadow-2xs">
                  <h1 className="text-xl font-extrabold text-[#202124]">My Reviews</h1>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Rate each ordered item individually once. Your review publishes immediately and is final once submitted.
                  </p>
                </div>

                {thankYouBanner && (
                  <div className="bg-[#E8F5E9] border border-[#0B8F4D]/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 animate-tp-fade-in">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-[#0B8F4D] shrink-0" />
                      <div>
                        <p className="text-sm font-extrabold text-[#123B16]">{thankYouBanner}</p>
                        <p className="text-xs text-[#3C4043]">
                          We appreciate your feedback — your verified rating is now live.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setThankYouBanner('')}
                      className="p-1.5 rounded-lg text-[#123B16]/70 hover:bg-white/60"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {unreviewedOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#E6EAE8] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold text-[#202124]">
                          {orders.length > 0
                            ? 'Thank You for Reviewing Your Ordered Items!'
                            : 'No Orders Available to Review Yet'}
                        </h2>
                        <p className="text-xs text-[#666666] mt-0.5 leading-relaxed">
                          {orders.length > 0
                            ? 'Each ordered item can be reviewed once. Thank you for sharing your ratings with us!'
                            : 'Place a fresh order from our Green Menu or Cafe Menu — each ordered item unlocks one verified review.'}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/green-menu"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      Order Meals <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!reviewForm.order_id) return;
                      setSubmittingMyReview(true);
                      try {
                        await api.post('/reviews', {
                          order_id: Number(reviewForm.order_id),
                          order_item_id: reviewForm.order_item_id
                            ? Number(reviewForm.order_item_id)
                            : null,
                          product_id: reviewForm.product_id ? Number(reviewForm.product_id) : null,
                          reviewer_location: reviewForm.reviewer_location || 'Kolkata',
                          rating: reviewForm.rating,
                          comment: reviewForm.comment.trim(),
                        });
                        setThankYouBanner('Thank you for your review!');
                        showToast('Thank you for your review!');
                        setReviewForm((prev) => ({
                          ...prev,
                          order_id: '',
                          order_item_id: '',
                          product_id: '',
                          rating: 5,
                          comment: '',
                        }));
                        setSearchParams({ tab: 'reviews' });
                        await loadAccountData(true);
                        await refreshSite();
                      } catch (err: any) {
                        showToast(err.response?.data?.error || 'Could not submit review', 'error');
                      } finally {
                        setSubmittingMyReview(false);
                      }
                    }}
                    className="bg-white rounded-2xl border border-[#E6EAE8] p-5 sm:p-6 space-y-4 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-extrabold text-[#202124]">
                          Rate an Ordered Item
                        </h2>
                        <p className="text-[11px] text-[#777777]">
                          One review per ordered item · Publishes immediately
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setReviewForm({ ...reviewForm, rating: st })}
                            className={`p-2 rounded-xl border transition-colors ${
                              reviewForm.rating >= st
                                ? 'bg-amber-50 border-amber-300 text-amber-500'
                                : 'bg-white border-[#E6EAE8] text-[#CCCCCC]'
                            }`}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-[#202124] mb-1">
                          Select Order *
                        </label>
                        <select
                          required
                          value={reviewForm.order_id}
                          onChange={(e) => {
                            const ord = unreviewedOrders.find(
                              (o) => String(o.id) === e.target.value
                            );
                            const firstItem = ord?.items.find(
                              (it) => !findReviewForOrderItem(ord.id, it)
                            );
                            setReviewForm({
                              ...reviewForm,
                              order_id: e.target.value,
                              order_item_id: firstItem ? String(firstItem.id) : '',
                              product_id: firstItem?.product_id ? String(firstItem.product_id) : '',
                            });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-xs font-semibold bg-white outline-none focus:border-[#0B8F4D]"
                        >
                          {unreviewedOrders.map((o) => (
                            <option key={o.id} value={o.id}>
                              Order #{o.order_code} ({formatINR(o.total_amount)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#202124] mb-1">
                          Select Individual Item *
                        </label>
                        <select
                          value={reviewForm.order_item_id}
                          onChange={(e) => {
                            const chosen = unreviewedItemsForSelectedOrder.find(
                              (it) => String(it.id) === e.target.value
                            );
                            setReviewForm({
                              ...reviewForm,
                              order_item_id: e.target.value,
                              product_id: chosen?.product_id ? String(chosen.product_id) : '',
                            });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-xs bg-white outline-none focus:border-[#0B8F4D]"
                        >
                          {unreviewedItemsForSelectedOrder.map((it) => (
                            <option key={it.id} value={String(it.id)}>
                              {it.item_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#202124] mb-1">
                          Area / Location
                        </label>
                        <input
                          type="text"
                          value={reviewForm.reviewer_location}
                          onChange={(e) =>
                            setReviewForm({ ...reviewForm, reviewer_location: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-xs outline-none focus:border-[#0B8F4D]"
                        />
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      placeholder="How was the meal freshness, nutrition accuracy, packaging, and delivery? (Optional)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm outline-none focus:border-[#0B8F4D]"
                    />

                    <button
                      type="submit"
                      disabled={submittingMyReview}
                      className="px-6 py-3 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold transition-colors"
                    >
                      {submittingMyReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                )}

                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-[#555555] px-1">
                    Submitted Reviews ({myReviews.length})
                  </h2>

                  {myReviews.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E6EAE8] p-10 text-center text-sm text-[#777777]">
                      You haven&rsquo;t submitted any reviews yet.
                    </div>
                  ) : (
                    myReviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="bg-white rounded-2xl border border-[#E6EAE8] p-5 space-y-2.5 shadow-2xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-[#202124]">
                              {rev.product_name ? (
                                rev.product_slug ? (
                                  <Link
                                    to={`/product/${rev.product_slug}`}
                                    className="hover:text-[#0B8F4D] hover:underline"
                                  >
                                    {rev.product_name}
                                  </Link>
                                ) : (
                                  rev.product_name
                                )
                              ) : (
                                'TrimPlate Order Review'
                              )}
                              {rev.order_code ? (
                                <span className="text-xs font-normal text-[#777777] font-num">
                                  {' '}
                                  · Order #{rev.order_code}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs text-[#777777] font-num">
                              {rev.created_at?.slice(0, 16)} · {rev.reviewer_location || 'Kolkata'}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <StarRatingBar rating={rev.rating} size="sm" />
                            <span className="text-xs font-semibold text-[#555555]">·</span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0B8F4D]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Thank you for your review
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-[#3C4043] leading-relaxed">
                          &ldquo;{rev.comment}&rdquo;
                        </p>

                        {rev.admin_reply && (
                          <div className="pt-2.5 border-t border-[#F1F3F4] text-xs text-[#5F6368]">
                            <p className="font-bold text-[#123B16] flex items-center gap-1">
                              <CornerDownRight className="w-3 h-3 text-[#0B8F4D]" /> TrimPlate
                              Kitchen Reply
                            </p>
                            <p className="mt-0.5">{rev.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB: SAVED ADDRESSES ==================== */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-[#E6EAE8] p-6 space-y-4 shadow-2xs">
                  <div>
                    <h1 className="text-xl font-extrabold text-[#202124]">
                      Saved Delivery Addresses
                    </h1>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Manage home, office, or gym addresses for express meal &amp; subscription
                      drop-offs.
                    </p>
                  </div>

                  {(user.addresses || []).length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#F9FBF9] border border-[#EDF1EF] text-center text-xs text-[#777777]">
                      No saved addresses yet. Add your primary delivery address below.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(user.addresses || []).map((a) => {
                        const LabelIcon =
                          a.label?.toLowerCase() === 'office' ? Briefcase : Home;
                        return (
                          <div
                            key={a.id}
                            className="p-4 rounded-2xl border border-[#E6EAE8] bg-[#FCFCFC] flex justify-between items-start gap-3 hover:border-[#0B8F4D]/40 transition-colors"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center shrink-0">
                                <LabelIcon className="w-4 h-4" />
                              </span>
                              <div className="min-w-0">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0B8F4D]">
                                  {a.label}
                                </span>
                                <p className="text-sm font-bold text-[#202124] mt-0.5">{a.line1}</p>
                                <p className="text-xs text-[#777777] mt-0.5">
                                  {a.area}, {a.city} – <span className="font-num">{a.pincode}</span>
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                requestConfirm({
                                  title: `Delete "${a.label}" Address?`,
                                  message: 'Remove this saved delivery address from your account?',
                                  confirmLabel: 'Remove Address',
                                  destructive: true,
                                  onConfirm: async () => {
                                    await deleteAddress(a.id);
                                    showToast('Address removed');
                                  },
                                })
                              }
                              className="p-2 rounded-lg text-[#777777] hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                              aria-label="Delete address"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#E6EAE8] p-6 space-y-4 shadow-2xs">
                  <h2 className="text-base font-extrabold text-[#202124]">
                    Add New Delivery Address
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Address Label
                      </label>
                      <select
                        value={addrForm.label}
                        onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm bg-white outline-none focus:border-[#0B8F4D]"
                      >
                        <option value="Home">Home</option>
                        <option value="Office">Office</option>
                        <option value="Gym / Studio">Gym / Studio</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Locality / Area *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Park Street / Salt Lake"
                        value={addrForm.area}
                        onChange={(e) => setAddrForm({ ...addrForm, area: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm outline-none focus:border-[#0B8F4D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        6-Digit Pincode *
                      </label>
                      <input
                        type="text"
                        placeholder="700016"
                        value={addrForm.pincode}
                        onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm font-num outline-none focus:border-[#0B8F4D]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Flat / House No., Building, Street *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 4B, Greenview Residency, 14B Park Street"
                      value={addrForm.line1}
                      onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm outline-none focus:border-[#0B8F4D]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!addrForm.line1.trim() || !addrForm.area.trim()) {
                        showToast('Please enter flat/street and locality', 'info');
                        return;
                      }
                      await addAddress({
                        ...addrForm,
                        recipient_name: user.name,
                        mobile: user.mobile,
                        is_default: 0,
                      });
                      setAddrForm({ ...addrForm, line1: '', area: '' });
                      showToast('Delivery address saved');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold transition-colors"
                  >
                    Save Delivery Address
                  </button>
                </div>
              </div>
            )}

            {/* ==================== TAB: BILLING & PAYMENTS ==================== */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-2xl border border-[#E6EAE8] overflow-hidden shadow-2xs">
                <div className="p-6 border-b border-[#EEF1EF] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-extrabold text-[#202124]">
                      Billing &amp; Payment History
                    </h1>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Complete record of UPI, Online Gateway, and Cash on Delivery transactions.
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-[#123B16] font-num">
                    Total Paid: {formatINR(lifetimeSpend)}
                  </span>
                </div>

                {payments.length === 0 ? (
                  <div className="p-12 text-center text-sm text-[#777777]">
                    No payment transactions recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#F9FBF9] text-[11px] font-bold uppercase tracking-wider text-[#666666] border-b border-[#EEF1EF]">
                        <tr>
                          <th className="px-6 py-3.5">Transaction ID</th>
                          <th className="px-6 py-3.5">Order Ref</th>
                          <th className="px-6 py-3.5">Method</th>
                          <th className="px-6 py-3.5">Date</th>
                          <th className="px-6 py-3.5">Amount</th>
                          <th className="px-6 py-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F2F1]">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-[#FAFCFB]">
                            <td className="px-6 py-4 font-num font-bold text-[#202124] whitespace-nowrap">
                              {p.transaction_id}
                            </td>
                            <td className="px-6 py-4 font-num text-xs text-[#555555] whitespace-nowrap">
                              {p.order_code ? `#${p.order_code}` : 'Subscription'}
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-[#202124] whitespace-nowrap">
                              {p.method}
                            </td>
                            <td className="px-6 py-4 font-num text-xs text-[#777777] whitespace-nowrap">
                              {(p.paid_at || '').slice(0, 10) || '—'}
                            </td>
                            <td className="px-6 py-4 font-num font-extrabold text-[#202124] whitespace-nowrap">
                              {formatINR(p.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`text-xs font-bold ${
                                  p.status === 'Completed' ? 'text-[#0B8F4D]' : 'text-amber-700'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB: HELP & SUPPORT ==================== */}
            {activeTab === 'support' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E6EAE8] p-6 sm:p-7 space-y-4 shadow-2xs">
                  <div>
                    <h1 className="text-xl font-extrabold text-[#202124]">
                      Help &amp; Kitchen Support
                    </h1>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Need help rescheduling a delivery, customizing macros, or checking an order?
                      Message our central kitchen team directly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Inquiry Topic
                      </label>
                      <select
                        value={supportTopic}
                        onChange={(e) => setSupportTopic(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-xs bg-white outline-none focus:border-[#0B8F4D]"
                      >
                        <option value="Order Delivery & Timing">Order Delivery &amp; Timing</option>
                        <option value="Meal Subscription Schedule">
                          Meal Subscription Schedule
                        </option>
                        <option value="Custom Diet & Allergen Note">
                          Custom Diet &amp; Allergen Note
                        </option>
                        <option value="Billing, Coupon or Refund">
                          Billing, Coupon or Refund
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Related Order (Optional)
                      </label>
                      <select
                        value={supportOrderRef}
                        onChange={(e) => setSupportOrderRef(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-xs bg-white outline-none focus:border-[#0B8F4D]"
                      >
                        <option value="">General Account Inquiry</option>
                        {orders.map((o) => (
                          <option key={o.id} value={o.order_code}>
                            Order #{o.order_code} ({formatINR(o.total_amount)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      How can we assist you?
                    </label>
                    <textarea
                      rows={4}
                      value={supportMsg}
                      onChange={(e) => setSupportMsg(e.target.value)}
                      placeholder="Share details about your meal preference, delivery instructions, or billing question..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE4DF] text-sm outline-none focus:border-[#0B8F4D]"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={sendingSupport}
                    onClick={async () => {
                      if (!supportMsg.trim()) {
                        showToast('Please enter a message for our support team', 'info');
                        return;
                      }
                      setSendingSupport(true);
                      try {
                        await api.post('/contact-inquiry', {
                          name: user.name,
                          email: user.email,
                          phone: user.mobile,
                          subject: `${supportTopic}${supportOrderRef ? ` (#${supportOrderRef})` : ''}`,
                          message: supportMsg.trim(),
                          user_id: user.id,
                        });
                        setSupportMsg('');
                        setSupportOrderRef('');
                        showToast('Support ticket sent to TrimPlate Operations Desk!');
                      } finally {
                        setSendingSupport(false);
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold transition-colors"
                  >
                    {sendingSupport ? 'Submitting Ticket...' : 'Submit Ticket'}
                  </button>
                </div>

                <div className="lg:col-span-4 bg-[#FFF8ED] rounded-2xl border border-[#EFE6D5] p-6 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0B8F4D] text-white flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-extrabold text-[#123B16]">
                    Direct Kitchen Helpline
                  </h2>
                  <p className="text-xs text-[#555555] leading-relaxed">
                    Our hospitality and nutrition desk is open daily from{' '}
                    <strong>{site.settings.business_hours || '7:00 AM – 10:30 PM'}</strong> for
                    urgent live-delivery updates.
                  </p>
                  {site.settings.phone && (
                    <a
                      href={`tel:${site.settings.phone.replace(/\s+/g, '')}`}
                      className="block w-full text-center py-2.5 px-4 rounded-xl bg-white border border-[#DCE4DF] text-xs font-extrabold text-[#123B16] font-num hover:border-[#0B8F4D]"
                    >
                      Call {site.settings.phone}
                    </a>
                  )}
                  {site.settings.email && (
                    <p className="text-[11px] text-[#666666] text-center truncate">
                      Email: {site.settings.email}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Executive GST Tax Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-[#E6EAE8] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#EEEEEE] pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={OFFICIAL_TRIMPLATE_LOGO}
                  alt="TrimPlate"
                  className="w-11 h-11 rounded-xl object-cover border border-[#EEEEEE]"
                />
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#123B16]">
                    TrimPlate GST Tax Invoice
                  </h3>
                  <p className="text-xs text-[#777777] font-num">
                    Invoice #{invoiceOrder.order_code} · {invoiceOrder.created_at?.slice(0, 16)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="p-2 rounded-xl hover:bg-[#F5F6F7] text-[#777777]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8FAF9] p-4 rounded-2xl border border-[#EDF1EF] text-xs">
              <div>
                <p className="font-bold text-[#777777] uppercase text-[10px]">Billed To</p>
                <p className="font-bold text-[#202124] mt-0.5">{user.name}</p>
                <p className="text-[#555555] font-num">{user.mobile}</p>
                {invoiceOrder.delivery_address_snapshot && (
                  <p className="text-[#666666] mt-0.5">{invoiceOrder.delivery_address_snapshot}</p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="font-bold text-[#777777] uppercase text-[10px]">Payment Summary</p>
                <p className="font-bold text-[#202124] mt-0.5">{invoiceOrder.payment_method}</p>
                <p className="text-[#0B8F4D] font-bold">{invoiceOrder.payment_status}</p>
              </div>
            </div>

            <div className="divide-y divide-[#F0F2F1] text-sm">
              {invoiceOrder.items.map((it) => (
                <div key={it.id} className="py-2.5 flex justify-between gap-3">
                  <div>
                    <span className="font-semibold text-[#202124]">
                      {it.quantity} × {it.item_name}
                    </span>
                    {it.variant_name && (
                      <span className="text-xs text-[#777777]"> ({it.variant_name})</span>
                    )}
                  </div>
                  <span className="font-num font-bold text-[#202124] shrink-0">
                    {formatINR(it.total_price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#EEEEEE] pt-3 space-y-1.5 text-xs text-[#666666]">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="font-num font-semibold text-[#202124]">
                  {formatINR(invoiceOrder.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery &amp; Packaging</span>
                <span className="font-num font-semibold text-[#202124]">
                  {invoiceOrder.delivery_charge === 0
                    ? 'FREE'
                    : formatINR(invoiceOrder.delivery_charge)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="font-num font-semibold text-[#202124]">
                  {formatINR(invoiceOrder.gst_amount)}
                </span>
              </div>
              {Number(invoiceOrder.discount_amount) > 0 && (
                <div className="flex justify-between text-[#0B8F4D] font-semibold">
                  <span>Coupon Discount ({invoiceOrder.coupon_code})</span>
                  <span className="font-num">-{formatINR(invoiceOrder.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-[#202124] pt-2.5 border-t border-[#EEEEEE]">
                <span>Grand Total</span>
                <span className="font-num text-[#0B8F4D]">
                  {formatINR(invoiceOrder.total_amount)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="px-4 py-3 rounded-xl border border-[#DCE4DF] text-xs font-bold text-[#202124]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#123B16] hover:bg-[#0B8F4D] text-white text-xs font-bold transition-colors"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
