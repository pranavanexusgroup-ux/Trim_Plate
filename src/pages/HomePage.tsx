import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Leaf,
  Award,
  ShieldCheck,
  Clock,
  X,
  Mail,
  Tag,
  ShoppingBag,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { useCart } from '../context/CartContext';
import { SEOHead } from '../components/SEOHead';
import { WebsiteProductCard } from '../components/WebsiteProductCard';
import { WebsiteSubscriptionCard } from '../components/WebsiteSubscriptionCard';
import { FadeIn } from '../components/FadeIn';
import {
  TrimPlateMarqueeStrip,
  SignatureHighlightsSection,
} from '../components/BrandMarqueeAndHighlights';
import { DietitianSection } from '../components/DietitianSection';
import { resolveFoodImage } from '../assets/mediaMap';
import { api, cachedGet, peekCached, formatINR } from '../services/api';
import { Product, HomepageSection, GalleryItem } from '../types';
import { useToast } from '../context/ToastContext';

export function HomePage() {
  const { site } = useSite();
  const { subtotal, addProductToCart, setCoupon, setIsCartDrawerOpen } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>(() => peekCached<Product[]>('/products') || []);
  const rawSlides = site.heroSlides;
  const extendedSlides = useMemo(() => {
    if (rawSlides.length <= 1) return rawSlides;
    return [rawSlides[rawSlides.length - 1], ...rawSlides, rawSlides[0]];
  }, [rawSlides]);

  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [paused, setPaused] = useState(false);
  const [greenMealTab, setGreenMealTab] = useState<'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'>('Breakfast');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterName, setNewsletterName] = useState('');
  const [submittingNews, setSubmittingNews] = useState(false);

  const [heroDragDelta, setHeroDragDelta] = useState(0);
  const [heroIsDragging, setHeroIsDragging] = useState(false);
  const heroDragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const heroIsHorizontalRef = useRef<boolean | null>(null);

  const activeSlideIdx =
    rawSlides.length > 0 ? (currentIndex - 1 + rawSlides.length) % rawSlides.length : 0;

  const goNextHero = useCallback(() => {
    if (rawSlides.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  }, [rawSlides.length]);

  const goPrevHero = useCallback(() => {
    if (rawSlides.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  }, [rawSlides.length]);

  const handleHeroTransitionEnd = () => {
    if (rawSlides.length <= 1) return;
    if (currentIndex >= extendedSlides.length - 1) {
      // Reached cloned first slide at end: snap seamlessly to real first slide (index 1) without animation
      setIsTransitioning(false);
      setCurrentIndex(1);
    } else if (currentIndex <= 0) {
      // Reached cloned last slide at start: snap seamlessly to real last slide without animation
      setIsTransitioning(false);
      setCurrentIndex(rawSlides.length);
    }
  };

  const handleHeroStart = (clientX: number, clientY: number) => {
    setPaused(true);
    setIsTransitioning(false);
    heroDragStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    heroIsHorizontalRef.current = null;
    setHeroDragDelta(0);
    setHeroIsDragging(false);
  };

  const handleHeroMove = (clientX: number, clientY: number) => {
    if (!heroDragStartRef.current) return;
    const dx = clientX - heroDragStartRef.current.x;
    const dy = clientY - heroDragStartRef.current.y;

    if (heroIsHorizontalRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        heroIsHorizontalRef.current = Math.abs(dx) >= Math.abs(dy);
      }
    }

    if (heroIsHorizontalRef.current === true) {
      setHeroIsDragging(true);
      setHeroDragDelta(dx);
    }
  };

  const handleHeroEnd = useCallback(() => {
    if (heroDragStartRef.current && heroIsHorizontalRef.current === true) {
      const dt = Date.now() - heroDragStartRef.current.time;
      const threshold = dt < 300 ? 30 : 60;
      if (heroDragDelta < -threshold) {
        goNextHero();
      } else if (heroDragDelta > threshold) {
        goPrevHero();
      } else {
        setIsTransitioning(true);
      }
    }
    heroDragStartRef.current = null;
    heroIsHorizontalRef.current = null;
    setHeroDragDelta(0);
    setHeroIsDragging(false);
    setTimeout(() => setPaused(false), 4500);
  }, [heroDragDelta, goNextHero, goPrevHero]);

  useEffect(() => {
    if (!heroIsDragging) return;
    const handleGlobalHeroUp = () => {
      handleHeroEnd();
    };
    window.addEventListener('mouseup', handleGlobalHeroUp);
    window.addEventListener('touchend', handleGlobalHeroUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalHeroUp);
      window.removeEventListener('touchend', handleGlobalHeroUp);
    };
  }, [heroIsDragging, handleHeroEnd]);

  useEffect(() => {
    cachedGet<Product[]>('/products', undefined, 60000)
      .then((data) => setProducts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (rawSlides.length <= 1 || paused) return;
    const timer = setInterval(() => {
      goNextHero();
    }, 5500);
    return () => clearInterval(timer);
  }, [rawSlides.length, paused, goNextHero]);

  const handleCopyCoupon = async (code: string, applyToBag = false) => {
    const clean = code.trim().toUpperCase();
    navigator.clipboard?.writeText(clean);
    localStorage.setItem('tp_pending_promo', clean);
    setCopiedCode(clean);
    setTimeout(() => setCopiedCode(null), 2500);

    if (applyToBag && subtotal > 0) {
      try {
        const { data } = await api.post('/coupons/validate', {
          code: clean,
          subtotal,
        });
        setCoupon({ code: data.coupon.code, discount: data.discount });
        localStorage.removeItem('tp_pending_promo');
        showToast(`Promo code ${data.coupon.code} applied! Saved ${formatINR(data.discount)}`);
        return;
      } catch {
        // Fallback to saved pending promo when subtotal hasn't met min_order_amount yet
      }
    }
    showToast(`Promo code ${clean} copied & saved for checkout!`);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubmittingNews(true);
    try {
      const { data } = await api.post('/newsletter/subscribe', {
        email: newsletterEmail.trim(),
        name: newsletterName.trim(),
      });
      showToast(data.message || 'Subscribed to TrimPlate updates!');
      setNewsletterEmail('');
      setNewsletterName('');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not subscribe', 'error');
    } finally {
      setSubmittingNews(false);
    }
  };

  const getCuratedOrFiltered = (
    sec: HomepageSection,
    fallbackFn: (list: Product[]) => Product[]
  ): Product[] => {
    const limit = Math.max(1, Number(sec.product_limit || 4));
    if (sec.curated_product_ids && sec.curated_product_ids.length > 0) {
      const map = new Map(products.map((p) => [p.id, p]));
      const curated = sec.curated_product_ids
        .map((id) => map.get(id))
        .filter((p): p is Product => Boolean(p));
      if (curated.length > 0) return curated.slice(0, limit);
    }
    return fallbackFn(products).slice(0, limit);
  };

  const renderSection = (sec: HomepageSection) => {
    switch (sec.section_key) {
      case 'welcome': {
        const stats: Array<{ label: string; value: string }> = Array.isArray(sec.config?.stats)
          ? sec.config.stats
          : [
              { label: 'Fresh Daily Dishes', value: '55+' },
              { label: 'Macro Verified Bowls', value: '100%' },
              { label: 'Flexible Plan Durations', value: '3–30 Days' },
            ];
        return (
          <section
            key={sec.id}
            className="py-16 lg:py-24 border-b border-[#EEEEEE]"
            style={{ backgroundColor: sec.bg_color || '#FFFFFF' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 lg:space-y-12">
              {/* 1. Editorial Header, Story & Verified Kitchen Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
                <div className="lg:col-span-6 space-y-3">
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#202124] leading-tight">
                    <span className="tp-text-highlight text-[#123B16]">{sec.title}</span>
                  </h2>
                  <p className="text-base text-[#666666] leading-relaxed pt-1">
                    {sec.description}
                  </p>
                </div>

                <div className="lg:col-span-6 grid grid-cols-3 gap-3.5 sm:gap-4">
                  {stats.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl bg-[#FFF8ED] border border-[#EDE6D8]"
                    >
                      <p className="text-xl sm:text-2xl font-extrabold text-[#123B16] font-num">
                        {st.value}
                      </p>
                      <p className="text-xs text-[#666666] mt-1 font-medium leading-snug">
                        {st.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Multi-Frame Culinary Studio Showcase Images */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6">
                <div className="md:col-span-7 relative rounded-3xl overflow-hidden border border-[#EAECEF] shadow-sm aspect-[16/10] bg-[#F6F9F7] group">
                  <img
                    src={resolveFoodImage(sec.image_url || 'hero_bowl')}
                    alt={sec.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A220D]/85 via-[#0A220D]/30 to-transparent p-5 sm:p-6 text-white">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8CCB16]">
                      Green Kitchen Craftsmanship
                    </p>
                    <p className="text-sm sm:text-base font-bold mt-0.5">
                      Weighed Macros, Zero Refined Oils &amp; Fresh Morning Prep
                    </p>
                  </div>
                </div>

                <div className="md:col-span-5 grid grid-cols-2 md:grid-cols-1 gap-5 lg:gap-6">
                  <div className="relative rounded-3xl overflow-hidden border border-[#EAECEF] shadow-sm aspect-[4/3] md:aspect-auto md:h-full min-h-[165px] bg-[#FFF8ED] group">
                    <img
                      src={resolveFoodImage('meal_prep_tray')}
                      alt="Daily Subscription Meal Trays"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-4 text-white">
                      <p className="text-xs sm:text-sm font-bold">
                        Punctual Daily Diet &amp; Gym Subscriptions
                      </p>
                    </div>
                  </div>

                  <div className="relative rounded-3xl overflow-hidden border border-[#EAECEF] shadow-sm aspect-[4/3] md:aspect-auto md:h-full min-h-[165px] bg-[#E8F5E9] group">
                    <img
                      src={resolveFoodImage('cafe_sandwich')}
                      alt="Wholesome TrimPlate Cafe Menu"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-4 text-white">
                      <p className="text-xs sm:text-sm font-bold">
                        Artisanal Multigrain Cafe Favorites
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Professional CTA Bar Placed Strictly AFTER the Images */}
              {sec.cta_text && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#F8FBF9] border border-[#E3ECE6]">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-semibold text-[#123B16]">
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0B8F4D] shrink-0" />
                      100% FSSAI-Certified Culinary Studio
                    </span>
                    <span className="hidden sm:inline text-[#C9D6CE]">·</span>
                    <span className="text-[#5F6662] font-normal">
                      Discover how our chefs &amp; nutritionists craft every single bowl from scratch.
                    </span>
                  </div>

                  <Link
                    to={sec.cta_url || '/page/about-us'}
                    className="inline-flex items-center justify-center gap-2 bg-[#0B8F4D] hover:bg-[#123B16] text-white text-sm font-bold px-7 py-3.5 rounded-xl shadow-xs transition-colors shrink-0"
                  >
                    {sec.cta_text} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        );
      }

      case 'explore_menu': {
        const cards: Array<{ title: string; subtitle?: string; description?: string; image: string; url: string; cta?: string }> =
          Array.isArray(sec.config?.cards) && sec.config.cards.length > 0
            ? sec.config.cards
            : [
                {
                  title: 'Cafe Menu',
                  subtitle: 'Artisan Sandwiches, Pasta, Toast, Coffee & Coolers',
                  image: 'cafe_sandwich',
                  url: '/cafe-menu',
                },
                {
                  title: 'Green Menu',
                  subtitle: 'Wholesome Breakfast, Balanced Lunch, Sprouts & Dinner',
                  image: 'green_salad',
                  url: '/green-menu',
                },
                {
                  title: 'Diet Plans',
                  subtitle: 'Calorie-Controlled Weight Loss & Sugar Control Meals',
                  image: 'meal_prep_tray',
                  url: '/diet-menu',
                },
                {
                  title: 'Gym Protein Menu',
                  subtitle: 'High-Protein Chicken, Egg & Muscle Recovery Bowls',
                  image: 'hero_slide_gym',
                  url: '/gym-menu',
                },
              ];
        const homeCustomCards = (site.customMenus || [])
          .filter((m) => Boolean(m.is_active) && Boolean(m.show_on_home))
          .map((m) => ({
            title: m.name,
            subtitle: m.subtitle || m.description,
            description: m.description || m.subtitle,
            image: m.image_url || 'hero_bowl',
            url: `/menu/${m.slug}`,
            cta: `Explore ${m.name}`,
          }));
        const allMenuCards = [...cards, ...homeCustomCards];
        return (
          <section
            key={sec.id}
            className="py-16 lg:py-20 border-b border-[#EEEEEE]"
            style={{ backgroundColor: sec.bg_color || '#FFF8ED' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl mb-10">
                {sec.subtitle && (
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
                    {sec.subtitle}
                  </p>
                )}
                <h2 className="text-3xl font-extrabold text-[#202124] mt-1">{sec.title}</h2>
                {sec.description && (
                  <p className="text-sm text-[#777777] mt-2">{sec.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {allMenuCards.map((c, i) => (
                  <Link
                    key={i}
                    to={c.url}
                    className="group relative rounded-2xl overflow-hidden bg-white border border-[#EEEEEE] shadow-xs hover:shadow-lg transition-all flex flex-col"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-[#E8F5E9]">
                      <img
                        src={resolveFoodImage(c.image)}
                        alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[#202124] group-hover:text-[#0B8F4D] transition-colors">
                          {c.title}
                        </h3>
                        <p className="text-xs text-[#777777] mt-1 leading-relaxed">
                          {c.description || c.subtitle}
                        </p>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#0B8F4D]">
                        {c.cta || 'Explore Menu'} <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'new_arrivals': {
        const list = getCuratedOrFiltered(sec, (all) =>
          all.filter((p) => p.display_labels.includes('New Arrival') && p.price !== null)
        );
        if (list.length === 0) return null;
        return (
          <section
            key={sec.id}
            className="py-16 lg:py-20 border-b border-[#EEEEEE]"
            style={{ backgroundColor: sec.bg_color || '#FFFFFF' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                <div>
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="text-3xl font-extrabold text-[#202124] mt-1">{sec.title}</h2>
                  {sec.description && (
                    <p className="text-sm text-[#777777] mt-1.5">{sec.description}</p>
                  )}
                </div>
                {sec.cta_text && (
                  <Link
                    to={sec.cta_url || '/green-menu'}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0B8F4D] hover:text-[#123B16]"
                  >
                    {sec.cta_text} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {list.map((p) => (
                  <WebsiteProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'special_offers': {
        if (site.activeOffers.length === 0) return null;
        return (
          <section
            key={sec.id}
            className="py-16 lg:py-20 border-b border-[#EEEEEE]"
            style={{ backgroundColor: sec.bg_color || '#E8F5E9' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                <div>
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="text-3xl font-extrabold text-[#123B16] mt-1">{sec.title}</h2>
                  {sec.description && (
                    <p className="text-sm text-[#123B16]/75 mt-1.5">{sec.description}</p>
                  )}
                </div>
                {sec.cta_text && (
                  <Link
                    to={sec.cta_url || '/offers'}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#123B16] hover:text-[#0B8F4D]"
                  >
                    {sec.cta_text} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {site.activeOffers.slice(0, sec.product_limit || 3).map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-white rounded-2xl border border-[#0B8F4D]/20 overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 overflow-hidden bg-[#123B16]">
                        <img
                          src={resolveFoodImage(offer.banner_image)}
                          alt={offer.title}
                          className="w-full h-full object-cover opacity-90"
                        />
                        <span className="absolute top-3 left-3 bg-[#0B8F4D] text-white text-xs font-extrabold px-3 py-1 rounded-lg shadow-xs font-num">
                          {offer.discount_type === 'percentage'
                            ? `${offer.discount_value}% OFF`
                            : `FLAT ₹${offer.discount_value} OFF`}
                        </span>
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-[#202124]">{offer.title}</h3>
                        <p className="text-xs text-[#777777] mt-1.5 leading-relaxed">
                          {offer.description}
                        </p>
                        <p className="text-[11px] text-[#777777] mt-3 font-num">
                          Min Order: ₹{offer.min_order_value} · Valid till{' '}
                          {offer.end_datetime.slice(0, 10)}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-3 border-t border-[#F4F5F6] flex items-center justify-between gap-3">
                      {offer.coupon_code ? (
                        <button
                          type="button"
                          onClick={() => handleCopyCoupon(offer.coupon_code)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[#0B8F4D] bg-[#E8F5E9]/50 text-xs font-bold text-[#123B16] font-num"
                        >
                          {copiedCode === offer.coupon_code ? (
                            <Check className="w-3.5 h-3.5 text-[#0B8F4D]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#0B8F4D]" />
                          )}
                          {offer.coupon_code}
                        </button>
                      ) : (
                        <span className="text-xs text-[#0B8F4D] font-semibold">Auto-applied</span>
                      )}
                      <Link
                        to={offer.cta_url || '/green-menu'}
                        className="px-4 py-2 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        {offer.cta_text || 'Order Now'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'best_sellers': {
        const list = getCuratedOrFiltered(sec, (all) =>
          [...all]
            .filter((p) => p.price !== null)
            .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
        );
        if (list.length === 0) return null;
        return (
          <section
            key={sec.id}
            className="py-16 lg:py-20 border-b border-[#EEEEEE]"
            style={{ backgroundColor: sec.bg_color || '#FFFFFF' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                <div>
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="text-3xl font-extrabold text-[#202124] mt-1">{sec.title}</h2>
                  {sec.description && (
                    <p className="text-sm text-[#777777] mt-1.5">{sec.description}</p>
                  )}
                </div>
                {sec.cta_text && (
                  <Link
                    to={sec.cta_url || '/cafe-menu'}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0B8F4D] hover:text-[#123B16]"
                  >
                    {sec.cta_text} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {list.map((p) => (
                  <WebsiteProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'green_menu_highlight': {
        const greenFiltered = products
          .filter(
            (p) =>
              p.menu_division === 'Green Menu' &&
              p.meal_time.toLowerCase() === greenMealTab.toLowerCase()
          )
          .slice(0, sec.product_limit || 4);

        return (
          <section
            key={sec.id}
            className="py-16 lg:py-20 border-b border-[#EEEEEE]"
            style={{ backgroundColor: sec.bg_color || '#FFF8ED' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                <div>
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="text-3xl font-extrabold text-[#202124] mt-1">{sec.title}</h2>
                  {sec.description && (
                    <p className="text-sm text-[#777777] mt-1.5 max-w-2xl">{sec.description}</p>
                  )}
                </div>

                {/* Meal Time Tabs */}
                <div className="inline-flex bg-white p-1.5 rounded-xl border border-[#EEEEEE] self-start">
                  {(['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setGreenMealTab(tab)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                        greenMealTab === tab
                          ? 'bg-[#0B8F4D] text-white'
                          : 'text-[#777777] hover:text-[#202124]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div
                key={greenMealTab}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-tp-fade-in"
              >
                {greenFiltered.map((p) => (
                  <WebsiteProductCard key={p.id} product={p} />
                ))}
              </div>

              {sec.cta_text && (
                <div className="mt-10 text-center">
                  <Link
                    to={sec.cta_url || '/green-menu'}
                    className="inline-flex items-center gap-2 bg-[#123B16] hover:bg-[#0B8F4D] text-white text-sm font-semibold px-6 py-3.5 rounded-xl transition-colors"
                  >
                    {sec.cta_text} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        );
      }

      case 'diet_plans': {
        if (site.plans.length === 0) return null;
        return (
          <section
            key={sec.id}
            className="py-16 lg:py-24 border-b border-[#EEEEEE]"
            style={{ backgroundColor: sec.bg_color || '#FFFFFF' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12">
                {sec.subtitle && (
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
                    {sec.subtitle}
                  </p>
                )}
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#202124] mt-1">
                  {sec.title}
                </h2>
                {sec.description && (
                  <p className="text-sm text-[#777777] mt-2 leading-relaxed">{sec.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {site.plans.slice(0, sec.product_limit || 4).map((plan) => (
                  <WebsiteSubscriptionCard
                    key={plan.id}
                    plan={plan}
                    onSelect={(pl) => navigate(`/subscriptions?plan=${pl.id}`)}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'dietitian_consultation': {
        return <DietitianSection key={sec.id} section={sec} dietitians={site.dietitians || []} />;
      }

      case 'why_choose': {
        const features: Array<{ title: string; desc?: string; description?: string }> =
          Array.isArray(sec.config?.features) && sec.config.features.length > 0
            ? sec.config.features
            : [
                {
                  title: 'Farm-Fresh Ingredients',
                  desc: 'Locally sourced seasonal produce, whole grains, cold-pressed oils and lean proteins prepared every morning.',
                },
                {
                  title: 'Nutritionist-Designed Macros',
                  desc: 'Balanced calorie, protein and fiber profiles across Weight Loss, Sugar Control and Gym Muscle plans.',
                },
                {
                  title: 'Zero Preservatives Kitchen',
                  desc: '100% FSSAI-certified hygienic preparation with zero artificial flavours, refined syrups or trans-fats.',
                },
                {
                  title: 'Punctual Slot Delivery',
                  desc: 'Scheduled morning and lunch tiffin slots plus express cafe delivery across Kolkata.',
                },
              ];
        const icons = [Leaf, Award, ShieldCheck, Clock];

        return (
          <section
            key={sec.id}
            className="py-16 lg:py-20 border-b border-[#EEEEEE]"
            style={{ backgroundColor: sec.bg_color || '#F7FAF8' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12">
                {sec.subtitle && (
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
                    {sec.subtitle}
                  </p>
                )}
                <h2 className="text-3xl font-extrabold text-[#202124] mt-1">{sec.title}</h2>
                {sec.description && (
                  <p className="text-sm text-[#777777] mt-2">{sec.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((f, i) => {
                  const Icon = icons[i % icons.length];
                  return (
                    <div
                      key={i}
                      className="bg-white p-6 rounded-2xl border border-[#EEEEEE] shadow-xs"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-[#202124]">{f.title}</h3>
                      <p className="text-xs text-[#777777] mt-2 leading-relaxed">
                        {f.description || f.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      }

      case 'promo_banner':
      case 'testimonials':
        return null;

      case 'gallery': {
        if (site.gallery.length === 0) return null;
        return (
          <section
            key={sec.id}
            className="py-16 lg:py-20 border-b border-[#EEEEEE]"
            style={{ backgroundColor: sec.bg_color || '#FFFFFF' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10">
                {sec.subtitle && (
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
                    {sec.subtitle}
                  </p>
                )}
                <h2 className="text-3xl font-extrabold text-[#202124] mt-1">{sec.title}</h2>
                {sec.description && (
                  <p className="text-sm text-[#777777] mt-2">{sec.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {site.gallery.slice(0, sec.product_limit || 6).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setLightboxItem(g)}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#EEEEEE] text-left"
                  >
                    <img
                      src={resolveFoodImage(g.image_url)}
                      alt={g.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                      <span className="text-[11px] font-semibold text-[#8CCB16]">{g.category}</span>
                      <p className="text-sm font-bold">{g.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'newsletter': {
        const isDarkBg = (sec.bg_color || '').toLowerCase() === '#123b16';
        return (
          <section
            key={sec.id}
            className="py-16 lg:py-20"
            style={{ backgroundColor: sec.bg_color || '#E8F5E9' }}
          >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#0B8F4D] text-white flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6" />
              </div>
              {sec.subtitle && (
                <p
                  className={`text-xs font-bold uppercase tracking-[0.18em] ${
                    isDarkBg ? 'text-[#8CCB16]' : 'text-[#0B8F4D]'
                  }`}
                >
                  {sec.subtitle}
                </p>
              )}
              <h2
                className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
                  isDarkBg ? 'text-white' : 'text-[#123B16]'
                }`}
              >
                {sec.title}
              </h2>
              {sec.description && (
                <p
                  className={`text-sm mt-2 max-w-xl mx-auto ${
                    isDarkBg ? 'text-white/80' : 'text-[#123B16]/80'
                  }`}
                >
                  {sec.description}
                </p>
              )}

              <form
                onSubmit={handleNewsletterSubmit}
                className="mt-7 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
              >
                <input
                  type="text"
                  value={newsletterName}
                  onChange={(e) => setNewsletterName(e.target.value)}
                  placeholder="Your Name (optional)"
                  className="sm:w-44 px-4 py-3.5 rounded-xl bg-white border border-[#0B8F4D]/25 text-sm outline-none focus:border-[#0B8F4D]"
                />
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="flex-1 px-4 py-3.5 rounded-xl bg-white border border-[#0B8F4D]/25 text-sm outline-none focus:border-[#0B8F4D]"
                />
                <button
                  type="submit"
                  disabled={submittingNews}
                  className="px-6 py-3.5 rounded-xl bg-[#0B8F4D] hover:bg-[#123B16] text-white text-sm font-semibold transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  {submittingNews ? 'Subscribing...' : sec.cta_text || 'Subscribe'}
                </button>
              </form>
            </div>
          </section>
        );
      }

      default:
        return null;
    }
  };

  const activeSlide = rawSlides[activeSlideIdx] || rawSlides[0];
  const heroLinkedProduct = activeSlide?.linked_product_id
    ? products.find((p) => p.id === Number(activeSlide.linked_product_id)) || null
    : null;
  const heroPromoCode = String(activeSlide?.promo_code || '').trim().toUpperCase();
  const heroDiscountVal = Number(activeSlide?.discount_value || 0);
  const heroEyebrow =
    activeSlide?.badge_text?.trim() ||
    (activeSlide?.slide_type === 'new_launch'
      ? 'NEW ITEM LAUNCH'
      : activeSlide?.slide_type === 'offer_promo'
      ? 'LIMITED TIME OFFER'
      : `${site.settings.business_name || site.settings.site_name || 'TrimPlate'} · ${
          site.settings.tagline || 'Eat Smart. Stay Trim.'
        }`);

  return (
    <div>
      <SEOHead />

      {/* 1. Dynamic Full-Width Horizontal Sliding Hero Carousel */}
      {rawSlides.length > 0 && (
        <section
          className="relative overflow-hidden bg-[#123B16] select-none touch-pan-y cursor-grab active:cursor-grabbing"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => handleHeroStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handleHeroMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleHeroEnd}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            handleHeroStart(e.clientX, e.clientY);
          }}
          onMouseMove={heroIsDragging ? (e) => handleHeroMove(e.clientX, e.clientY) : undefined}
          onMouseUp={handleHeroEnd}
          onClickCapture={(e) => {
            if (heroIsDragging || Math.abs(heroDragDelta) > 10) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {/* Sliding Track with GPU acceleration, infinite seamless loop & buttery smooth easing */}
          <div
            className={`flex w-full will-change-transform ${
              isTransitioning && !heroIsDragging
                ? 'transition-transform duration-600 ease-[cubic-bezier(0.25,1,0.5,1)]'
                : 'transition-none'
            }`}
            onTransitionEnd={handleHeroTransitionEnd}
            style={{
              transform:
                heroIsDragging && heroDragDelta !== 0
                  ? `translate3d(calc(-${currentIndex * 100}% ${
                      heroDragDelta > 0 ? `+ ${heroDragDelta}px` : `- ${Math.abs(heroDragDelta)}px`
                    }), 0, 0)`
                  : `translate3d(-${currentIndex * 100}%, 0, 0)`,
            }}
          >
            {extendedSlides.map((slide, sIdx) => {
              const slideLinkedProduct = slide.linked_product_id
                ? products.find((p) => p.id === Number(slide.linked_product_id)) || null
                : null;
              const slidePromoCode = String(slide.promo_code || '').trim().toUpperCase();
              const slideDiscountVal = Number(slide.discount_value || 0);
              const slideEyebrow =
                slide.badge_text?.trim() ||
                (slide.slide_type === 'new_launch'
                  ? 'NEW ITEM LAUNCH'
                  : slide.slide_type === 'offer_promo'
                  ? 'LIMITED TIME OFFER'
                  : `${site.settings.business_name || site.settings.site_name || 'TrimPlate'} · ${
                      site.settings.tagline || 'Eat Smart. Stay Trim.'
                    }`);

              return (
                <div
                  key={`${slide.id}-${sIdx}`}
                  className="w-full min-w-full shrink-0 relative min-h-[500px] sm:min-h-[560px] lg:min-h-[620px] flex items-center overflow-hidden"
                >
                  <img
                    src={resolveFoodImage(slide.desktop_image)}
                    alt={slide.title}
                    className="hidden sm:block absolute inset-0 w-full h-full object-cover"
                  />
                  <img
                    src={resolveFoodImage(slide.mobile_image || slide.desktop_image)}
                    alt={slide.title}
                    className="sm:hidden absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-[#0A220D]"
                    style={{ opacity: Number(slide.overlay_opacity ?? 0.55) }}
                  />

                  {/* Soft Bottom Vignette Gradient Fade */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0A220D]/80 to-transparent z-[1]"
                  />

                  <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-16 lg:px-20 py-16 w-full">
                    <div
                      className={`max-w-2xl space-y-5 ${
                        slide.text_position === 'center'
                          ? 'mx-auto text-center'
                          : slide.text_position === 'right'
                          ? 'ml-auto text-right'
                          : 'text-left'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8CCB16] bg-black/35 backdrop-blur-xs border border-white/20 px-3.5 py-1.5 rounded-lg">
                        {(slide.slide_type === 'new_launch' ||
                          slide.slide_type === 'offer_promo') && (
                          <Sparkles className="w-3.5 h-3.5 text-[#8CCB16] shrink-0" />
                        )}
                        <span>{slideEyebrow}</span>
                      </span>

                      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.12] tracking-tight">
                        {slide.title}
                      </h1>

                      {slide.subtitle && (
                        <p className="text-base sm:text-lg text-white/90 leading-relaxed">
                          {slide.subtitle}
                        </p>
                      )}

                      {/* Admin-Managed Hero Promo Code & Discount Callout */}
                      {slidePromoCode && (
                        <div
                          className={`inline-flex flex-wrap items-center gap-3 p-3 sm:px-4 sm:py-3 rounded-2xl bg-black/45 backdrop-blur-md border border-[#8CCB16]/45 text-white ${
                            slide.text_position === 'center'
                              ? 'mx-auto justify-center'
                              : slide.text_position === 'right'
                              ? 'ml-auto justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-left">
                            <span className="w-8 h-8 rounded-xl bg-[#0B8F4D] text-white flex items-center justify-center shrink-0">
                              <Tag className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-xs font-extrabold text-[#8CCB16] uppercase tracking-wider font-num">
                                {slideDiscountVal > 0
                                  ? slide.discount_type === 'flat'
                                    ? `Flat ₹${slideDiscountVal} OFF`
                                    : `${slideDiscountVal}% OFF Launch Discount`
                                  : 'Exclusive Promo Code'}
                              </p>
                              <p className="text-[11px] text-white/80 font-num">
                                Use code <strong className="text-white">{slidePromoCode}</strong>
                                {Number(slide.min_order_amount || 0) > 0
                                  ? ` · Min order ₹${slide.min_order_amount}`
                                  : ''}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyCoupon(slidePromoCode, true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8CCB16] hover:bg-white text-[#123B16] text-xs font-extrabold font-num transition-colors cursor-pointer"
                          >
                            {copiedCode === slidePromoCode ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Code Ready
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy {slidePromoCode}
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div
                        className={`flex flex-wrap gap-3.5 pt-1 ${
                          slide.text_position === 'center'
                            ? 'justify-center'
                            : slide.text_position === 'right'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        {slideLinkedProduct && slideLinkedProduct.price !== null ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (slidePromoCode) {
                                localStorage.setItem('tp_pending_promo', slidePromoCode);
                              }
                              addProductToCart(slideLinkedProduct, undefined, slideLinkedProduct.price!, 1);
                              showToast(
                                slidePromoCode
                                  ? `${slideLinkedProduct.name} added! Promo ${slidePromoCode} saved for checkout.`
                                  : `${slideLinkedProduct.name} added to your bag!`
                              );
                              setIsCartDrawerOpen(true);
                            }}
                            className="inline-flex items-center gap-2 bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm sm:text-base font-bold px-7 py-4 rounded-xl shadow-lg transition-colors cursor-pointer"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            {slide.cta_primary_text || 'Order New Launch'} ·{' '}
                            <span className="font-num">{formatINR(slideLinkedProduct.price)}</span>
                          </button>
                        ) : (
                          slide.cta_primary_text && (
                            <Link
                              to={slide.cta_primary_url || '/green-menu'}
                              onClick={() => {
                                if (slidePromoCode) {
                                  localStorage.setItem('tp_pending_promo', slidePromoCode);
                                }
                              }}
                              className="inline-flex items-center gap-2 bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm sm:text-base font-bold px-7 py-4 rounded-xl shadow-lg transition-colors"
                            >
                              {slide.cta_primary_text} <ArrowRight className="w-4 h-4" />
                            </Link>
                          )
                        )}

                        {slideLinkedProduct ? (
                          <Link
                            to={`/product/${slideLinkedProduct.slug}`}
                            className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-xs text-white border border-white/30 text-sm sm:text-base font-semibold px-7 py-4 rounded-xl transition-colors"
                          >
                            View Dish &amp; Macros
                          </Link>
                        ) : (
                          slide.cta_secondary_text && (
                            <Link
                              to={slide.cta_secondary_url || '/subscriptions'}
                              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-xs text-white border border-white/30 text-sm sm:text-base font-semibold px-7 py-4 rounded-xl transition-colors"
                            >
                              {slide.cta_secondary_text}
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carousel Controls — Zero-Overlap Responsive Layout */}
          {rawSlides.length > 1 && (
            <>
              {/* Desktop-only floating arrows placed well outside text margins */}
              <button
                type="button"
                onClick={() => {
                  goPrevHero();
                  setPaused(true);
                  setTimeout(() => setPaused(false), 4500);
                }}
                className="hidden md:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/45 hover:bg-black/75 text-white items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-xs hover:scale-105 active:scale-95"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={() => {
                  goNextHero();
                  setPaused(true);
                  setTimeout(() => setPaused(false), 4500);
                }}
                className="hidden md:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/45 hover:bg-black/75 text-white items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-xs hover:scale-105 active:scale-95"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Bottom Navigation: Integrated Mobile Controls & Desktop Dots */}
              <div className="absolute bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20">
                <button
                  type="button"
                  onClick={() => {
                    goPrevHero();
                    setPaused(true);
                    setTimeout(() => setPaused(false), 4500);
                  }}
                  className="md:hidden p-1 text-white/80 hover:text-white"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {rawSlides.map((sl, i) => (
                    <button
                      key={sl.id}
                      type="button"
                      onClick={() => {
                        setIsTransitioning(true);
                        setCurrentIndex(i + 1);
                        setPaused(true);
                        setTimeout(() => setPaused(false), 4500);
                      }}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                        i === activeSlideIdx
                          ? 'w-7 sm:w-8 bg-[#8CCB16]'
                          : 'w-2 sm:w-2.5 bg-white/45 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    goNextHero();
                    setPaused(true);
                    setTimeout(() => setPaused(false), 4500);
                  }}
                  className="md:hidden p-1 text-white/80 hover:text-white"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* 2. Infinite Brand & Kitchen Promise Marquee (Below Hero with Edge Fades) */}
      <TrimPlateMarqueeStrip />

      {/* 3. Signature Culinary Highlights & Live Rated Dish Marquee */}
      <SignatureHighlightsSection products={products} />

      {/* 4. Dynamic Reorderable Homepage Sections with Smooth Scroll-Reveal Fades */}
      {site.homepageSections
        .filter((s) => s.is_enabled)
        .map((sec) => {
          const rendered = renderSection(sec);
          if (!rendered) return null;
          return <FadeIn key={sec.id}>{rendered}</FadeIn>;
        })}

      {/* Gallery Lightbox Modal */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-tp-fade-in"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl animate-tp-scale-fade"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] bg-black">
              <img
                src={resolveFoodImage(lightboxItem.image_url)}
                alt={lightboxItem.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B8F4D]">
                {lightboxItem.category}
              </span>
              <h3 className="text-lg font-bold text-[#202124] mt-0.5">{lightboxItem.title}</h3>
              {lightboxItem.caption && (
                <p className="text-sm text-[#777777] mt-1">{lightboxItem.caption}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
