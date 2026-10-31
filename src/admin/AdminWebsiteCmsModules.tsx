import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GripVertical,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Upload,
  Globe,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
  Download,
  Star,
  MessageSquareReply,
  Sparkles,
  Tag,
  Play,
  Pause,
} from 'lucide-react';
import { api } from '../services/api';
import {
  HeroSlide,
  HomepageSection,
  Banner,
  SpecialOffer,
  CmsPage,
  NavItem,
  MediaItem,
  Testimonial,
  CustomerReview,
  GalleryItem,
  NewsletterSubscriber,
  Product,
} from '../types';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { useRealtime } from '../hooks/useRealtime';
import { MediaPickerField } from './MediaPickerField';
import { resolveFoodImage } from '../assets/mediaMap';

// 1. WEBSITE MANAGEMENT HUB
export function WebsiteOverviewHub({ onSelectModule }: { onSelectModule: (m: string) => void }) {
  const { site } = useSite();
  const cards = [
    { id: 'hero-slider', title: 'Hero Slider', stat: `${site.heroSlides.length} Active Slides`, desc: 'Manage full-width homepage hero slides, images, overlays & CTAs.' },
    { id: 'homepage-sections', title: 'Homepage Sections', stat: `${site.homepageSections.filter((s) => s.is_enabled).length} Enabled`, desc: 'Drag-and-drop section order, toggle visibility, edit copy & curated products.' },
    { id: 'banners', title: 'Promotional Banners', stat: `${site.banners.length} Banners`, desc: 'Edit Cafe Menu, Green Menu, Diet Menu, Gym Menu & seasonal banners.' },
    { id: 'offers', title: 'Special Offers', stat: `${site.activeOffers.length} Live Offers`, desc: 'Schedule auto-expiring deals, discount values & coupon codes.' },
    { id: 'dietitians', title: 'Dietitian & Consultations', stat: `${(site.dietitians || []).length} Certified Dietitians`, desc: 'Manage Home Page clinical & sports dietitians and 1-on-1 customer consultation bookings.' },
    { id: 'menus-builder', title: 'Menus Builder (Add New Menu)', stat: `${4 + (site.customMenus || []).length} Active Menus`, desc: 'Launch unlimited future menus (/menu/slug) with automatic navbar & homepage cards.' },
    { id: 'pages', title: 'Pages Management', stat: 'Dynamic Slugs', desc: 'Edit About Us, Contact Us, Policies & create custom landing pages.' },
    { id: 'navigation', title: 'Navigation Menus', stat: `${site.navigation.length} Menu Links`, desc: 'Edit Header, Dropdowns & Footer navigation links without code.' },
    { id: 'media', title: 'Media Library', stat: 'Central Assets', desc: 'Upload, organize, preview and replace food & banner photography.' },
    { id: 'seo', title: 'SEO & Sitemap', stat: 'Schema + XML', desc: 'Control global & per-page SEO titles, meta descriptions & OpenGraph.' },
    { id: 'settings', title: 'Website Settings', stat: 'Global Config', desc: 'Logo, WhatsApp Order Number, hours, delivery fee, GST % & announcement bar.' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#123B16] text-white rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#8CCB16]">
            Zero-Code Website CMS
          </span>
          <h2 className="text-2xl font-extrabold mt-1">
            Manage Every Section of TrimPlate Dynamically
          </h2>
          <p className="text-xs text-white/80 mt-1">
            All changes save directly to the database and update the live customer website
            immediately.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#0B8F4D] hover:bg-[#8CCB16] hover:text-[#123B16] text-white text-xs font-bold px-5 py-3 rounded-xl transition-colors"
        >
          Preview Live Website <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectModule(c.id)}
            className="bg-white rounded-2xl border border-[#EEEEEE] hover:border-[#0B8F4D] p-6 text-left transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B8F4D]">
                {c.stat}
              </span>
              <h3 className="text-base font-extrabold text-[#202124] mt-1">{c.title}</h3>
              <p className="text-xs text-[#777777] mt-1.5 leading-relaxed">{c.desc}</p>
            </div>
            <span className="mt-4 text-xs font-bold text-[#123B16]">Open Manager →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 2. HERO SLIDER MANAGER (NEW ITEM / OFFER LAUNCHES + PROMO CODES + 1-CLICK RUN/STOP)
export function HeroSliderManager() {
  const { refreshSite } = useSite();
  const { showToast, requestConfirm } = useToast();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<HeroSlide> | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const load = () => {
    api.get<HeroSlide[]>('/cms/hero-slides').then((r) => setSlides(r.data));
    api.get<Product[]>('/products?include_unavailable=1').then((r) => setProducts(r.data));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.title) return;
    const payload = {
      ...editing,
      promo_code: editing.promo_code ? editing.promo_code.trim().toUpperCase() : '',
    };
    if (editing.id) {
      await api.put(`/cms/hero-slides/${editing.id}`, payload);
      showToast(
        payload.promo_code
          ? `Hero campaign & promo code ${payload.promo_code} updated live!`
          : 'Hero slide updated'
      );
    } else {
      await api.post('/cms/hero-slides', payload);
      showToast(
        payload.promo_code
          ? `Hero launch created & promo code ${payload.promo_code} activated!`
          : 'New hero slide created'
      );
    }
    setEditing(null);
    await load();
    await refreshSite();
  };

  const handleToggleActive = async (slide: HeroSlide) => {
    const res = await api.patch<{ is_active: number }>(`/cms/hero-slides/${slide.id}/toggle`);
    await load();
    await refreshSite();
    showToast(
      res.data.is_active
        ? `"${slide.title}" is now LIVE on the Hero section`
        : `"${slide.title}" stopped & hidden from Hero section`
    );
  };

  const handleDropReorder = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...slides];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    setSlides(next);
    setDragIdx(null);
    await api.put('/cms/hero-slides-reorder', { orderedIds: next.map((s) => s.id) });
    await refreshSite();
    showToast('Hero slide order saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">
            Hero Slider, New Item Launches &amp; Promo Offers
          </h2>
          <p className="text-xs text-[#777777]">
            Launch new dishes or promotional discount codes directly in the homepage Hero section.
            Start, change, or stop any campaign anytime with 1 click.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setEditing({
                slide_type: 'new_launch',
                badge_text: 'NEW ITEM LAUNCH · LIMITED OFFER',
                title: '',
                subtitle: '',
                promo_code: 'LAUNCH20',
                discount_type: 'percentage',
                discount_value: 20,
                min_order_amount: 249,
                linked_product_id: null,
                cta_primary_text: 'Order New Launch',
                cta_primary_url: '/green-menu',
                cta_secondary_text: 'Explore Full Menu',
                cta_secondary_url: '/cafe-menu',
                desktop_image: 'hero_slide_feast',
                mobile_image: 'hero_bowl',
                text_position: 'left',
                overlay_opacity: 0.58,
                is_active: 1,
                start_date: '2026-01-01',
                end_date: '2028-12-31',
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#123B16] hover:bg-[#0B8F4D] text-white text-xs font-bold transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#8CCB16]" /> Launch New Item / Promo Offer
          </button>

          <button
            type="button"
            onClick={() =>
              setEditing({
                slide_type: 'standard',
                badge_text: '',
                title: '',
                subtitle: '',
                promo_code: '',
                discount_type: 'percentage',
                discount_value: 0,
                min_order_amount: 0,
                linked_product_id: null,
                cta_primary_text: 'Explore Menu',
                cta_primary_url: '/green-menu',
                cta_secondary_text: 'View Plans',
                cta_secondary_url: '/subscriptions',
                desktop_image: 'hero_slide_feast',
                mobile_image: 'hero_bowl',
                text_position: 'left',
                overlay_opacity: 0.55,
                is_active: 1,
                start_date: '2026-01-01',
                end_date: '2028-12-31',
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Add Standard Slide
          </button>
        </div>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl border border-[#0B8F4D]/40 p-6 space-y-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEEEEE] pb-3">
            <h3 className="text-base font-extrabold text-[#202124]">
              {editing.id ? 'Edit Hero Slide / Campaign' : 'Create Hero Slide / Launch Campaign'}
            </h3>
            <span className="text-[11px] font-semibold text-[#0B8F4D]">
              Promo codes configured here automatically sync with Cart &amp; Checkout coupons
            </span>
          </div>

          {/* Campaign Type, Badge & Optional Dish Link */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F8FAF8] p-4 rounded-2xl border border-[#E4EDE6]">
            <div>
              <label className="block text-xs font-bold text-[#123B16] mb-1">
                Hero Campaign Type
              </label>
              <select
                value={editing.slide_type || 'standard'}
                onChange={(e) => {
                  const nextType = e.target.value as 'standard' | 'new_launch' | 'offer_promo';
                  setEditing({
                    ...editing,
                    slide_type: nextType,
                    badge_text:
                      editing.badge_text ||
                      (nextType === 'new_launch'
                        ? 'NEW ITEM LAUNCH'
                        : nextType === 'offer_promo'
                          ? 'LIMITED TIME HERO OFFER'
                          : ''),
                  });
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[#DCE5DE] text-xs font-semibold bg-white"
              >
                <option value="standard">Standard Brand Hero Slide</option>
                <option value="new_launch">New Item Launch Spotlight</option>
                <option value="offer_promo">Special Offer / Promo Campaign</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#123B16] mb-1">
                Hero Eyebrow / Launch Tag
              </label>
              <input
                type="text"
                placeholder="e.g. NEW LAUNCH · 25% OFF TODAY"
                value={editing.badge_text || ''}
                onChange={(e) => setEditing({ ...editing, badge_text: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-[#DCE5DE] text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#123B16] mb-1">
                Link Launched Dish (Optional Quick-Order)
              </label>
              <select
                value={editing.linked_product_id ?? ''}
                onChange={(e) => {
                  const prodId = e.target.value ? Number(e.target.value) : null;
                  const found = products.find((p) => p.id === prodId);
                  if (found) {
                    const imgRef = found.custom_image_url || found.image_key;
                    const macroPart = found.nutrition
                      ? ` · ${found.nutrition.calories_kcal} kcal · ${found.nutrition.protein_g}g Protein`
                      : '';
                    setEditing({
                      ...editing,
                      linked_product_id: found.id,
                      title: editing.title || `New Launch: ${found.name}`,
                      subtitle: editing.subtitle || `${found.description || ''}${macroPart}`,
                      cta_primary_text: editing.cta_primary_text || `Order ${found.name}`,
                      cta_primary_url: `/product/${found.slug}`,
                      desktop_image: imgRef || editing.desktop_image,
                      mobile_image: imgRef || editing.mobile_image,
                    });
                  } else {
                    setEditing({ ...editing, linked_product_id: null });
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[#DCE5DE] text-xs bg-white"
              >
                <option value="">— None (General Menu / Page Link) —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price ?? p.variants?.[0]?.price ?? 0} · {p.menu_division})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Promo Code & Discount Configuration */}
          <div className="bg-[#FFF8ED] p-4 rounded-2xl border border-[#F0E3CC] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-extrabold text-[#123B16] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0B8F4D]" />
                Hero Promo Code &amp; Instant Checkout Discount (Optional)
              </p>
              <span className="text-[11px] text-[#777777]">
                Leave Promo Code blank if this slide does not offer a coupon discount
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#202124] mb-1">
                  Promo Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. LAUNCH25"
                  value={editing.promo_code || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, promo_code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E5D7BF] text-xs font-extrabold uppercase tracking-wider bg-white font-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#202124] mb-1">
                  Discount Type
                </label>
                <select
                  value={editing.discount_type || 'percentage'}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      discount_type: e.target.value as 'percentage' | 'flat',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E5D7BF] text-xs bg-white"
                >
                  <option value="percentage">Percentage (% OFF)</option>
                  <option value="flat">Flat Amount (₹ OFF)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#202124] mb-1">
                  Discount Value ({editing.discount_type === 'flat' ? '₹' : '%'})
                </label>
                <input
                  type="number"
                  min={0}
                  max={editing.discount_type === 'flat' ? 5000 : 95}
                  value={editing.discount_value ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, discount_value: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E5D7BF] text-xs bg-white font-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#202124] mb-1">
                  Min Order Amount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editing.min_order_amount ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, min_order_amount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E5D7BF] text-xs bg-white font-num"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Slide Headline *</label>
              <input
                type="text"
                required
                value={editing.title || ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Subtitle / Description</label>
              <input
                type="text"
                value={editing.subtitle || ''}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Primary CTA Text &amp; URL</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Button Label"
                  value={editing.cta_primary_text || ''}
                  onChange={(e) => setEditing({ ...editing, cta_primary_text: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                />
                <input
                  type="text"
                  placeholder="/green-menu"
                  value={editing.cta_primary_url || ''}
                  onChange={(e) => setEditing({ ...editing, cta_primary_url: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Secondary CTA Text &amp; URL</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Optional Button"
                  value={editing.cta_secondary_text || ''}
                  onChange={(e) => setEditing({ ...editing, cta_secondary_text: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                />
                <input
                  type="text"
                  placeholder="/subscriptions"
                  value={editing.cta_secondary_url || ''}
                  onChange={(e) => setEditing({ ...editing, cta_secondary_url: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                />
              </div>
            </div>
            <MediaPickerField
              label="Desktop Hero Image (16:9)"
              value={editing.desktop_image || 'hero_slide_feast'}
              onChange={(url) => setEditing({ ...editing, desktop_image: url })}
              folder="Hero Slider"
            />
            <MediaPickerField
              label="Mobile Hero Image"
              value={editing.mobile_image || 'hero_bowl'}
              onChange={(url) => setEditing({ ...editing, mobile_image: url })}
              folder="Hero Slider"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold mb-1">Text Alignment</label>
                <select
                  value={editing.text_position || 'left'}
                  onChange={(e) => setEditing({ ...editing, text_position: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  Overlay ({editing.overlay_opacity ?? 0.55})
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="0.85"
                  step="0.05"
                  value={editing.overlay_opacity ?? 0.55}
                  onChange={(e) =>
                    setEditing({ ...editing, overlay_opacity: Number(e.target.value) })
                  }
                  className="w-full mt-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Live Status</label>
                <select
                  value={editing.is_active ? '1' : '0'}
                  onChange={(e) =>
                    setEditing({ ...editing, is_active: e.target.value === '1' ? 1 : 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  <option value="1">Running Live</option>
                  <option value="0">Stopped / Paused</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold mb-1">Schedule Start</label>
                <input
                  type="date"
                  value={editing.start_date || ''}
                  onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Schedule End</label>
                <input
                  type="date"
                  value={editing.end_date || ''}
                  onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl bg-[#F5F6F7] text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              Save &amp; Sync Hero Slide
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {slides.map((s, idx) => {
          const isLaunch = s.slide_type === 'new_launch';
          const isPromo = s.slide_type === 'offer_promo';
          return (
            <div
              key={s.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropReorder(idx)}
              className={`bg-white rounded-2xl border p-4 flex flex-wrap items-center gap-4 cursor-move transition-colors ${
                s.is_active
                  ? 'border-[#EEEEEE] hover:border-[#0B8F4D]/40'
                  : 'border-[#EEEEEE] bg-[#FAFAFA] opacity-80'
              }`}
            >
              <GripVertical className="w-4 h-4 text-[#999999]" />
              <img
                src={resolveFoodImage(s.desktop_image)}
                alt={s.title}
                className="w-24 h-14 rounded-xl object-cover border border-[#EEEEEE]"
              />
              <div className="flex-1 min-w-[220px] space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                      isLaunch
                        ? 'bg-[#123B16] text-[#8CCB16]'
                        : isPromo
                          ? 'bg-[#FFF8ED] text-[#B45309] border border-[#F0E3CC]'
                          : 'bg-[#F4F6F5] text-[#5F6368]'
                    }`}
                  >
                    {isLaunch ? 'New Item Launch' : isPromo ? 'Hero Offer' : 'Standard Hero'}
                  </span>
                  {s.promo_code && (
                    <span className="px-2 py-0.5 rounded-md bg-[#E8F5E9] text-[#0B8F4D] text-[10px] font-extrabold font-num">
                      CODE: {s.promo_code} (
                      {s.discount_type === 'flat'
                        ? `₹${s.discount_value} OFF`
                        : `${s.discount_value}% OFF`}
                      )
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-[#202124]">{s.title}</p>
                <p className="text-xs text-[#777777] line-clamp-1">{s.subtitle}</p>
                <p className="text-[11px] text-[#0B8F4D] font-num">
                  CTA: {s.cta_primary_text} ({s.cta_primary_url}) · {s.start_date} → {s.end_date}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleActive(s)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  s.is_active
                    ? 'bg-[#E8F5E9] text-[#0B8F4D] hover:bg-amber-50 hover:text-amber-800'
                    : 'bg-[#123B16] text-white hover:bg-[#0B8F4D]'
                }`}
                title={s.is_active ? 'Click to Stop / Pause this Hero slide' : 'Click to Run Live on Homepage'}
              >
                {s.is_active ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Running · Stop
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Stopped · Run Live
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setEditing(s)}
                className="p-2 rounded-lg hover:bg-[#F5F6F7] text-[#202124]"
                title="Edit Slide / Promo Code"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  requestConfirm({
                    title: 'Delete Hero Slide?',
                    message: `Remove "${s.title}" from the homepage slider?`,
                    destructive: true,
                    onConfirm: async () => {
                      await api.delete(`/cms/hero-slides/${s.id}`);
                      await load();
                      await refreshSite();
                      showToast('Slide deleted');
                    },
                  })
                }
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                title="Delete Slide"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3. HOMEPAGE SECTIONS MANAGER (DRAG & DROP REORDER + TOGGLE + CURATED PRODUCTS)
export function HomepageSectionsManager() {
  const { refreshSite } = useSite();
  const { showToast } = useToast();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<HomepageSection | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const load = () => {
    api
      .get<HomepageSection[]>('/cms/homepage-sections')
      .then((r) =>
        setSections(
          r.data.filter(
            (sec) => sec.section_key !== 'promo_banner' && sec.section_key !== 'testimonials'
          )
        )
      );
    api.get<Product[]>('/products').then((r) => setAllProducts(r.data));
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (sec: HomepageSection) => {
    await api.put(`/cms/homepage-sections/${sec.id}`, {
      ...sec,
      is_enabled: !sec.is_enabled,
    });
    await load();
    await refreshSite();
    showToast(`${sec.title} ${!sec.is_enabled ? 'enabled' : 'hidden'} on homepage`);
  };

  const handleDropReorder = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...sections];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    setSections(next);
    setDragIdx(null);
    await api.put('/cms/homepage-sections-reorder', { orderedIds: next.map((s) => s.id) });
    await refreshSite();
    showToast('Homepage section order updated live!');
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    await api.put(`/cms/homepage-sections/${editing.id}`, editing);
    setEditing(null);
    await load();
    await refreshSite();
    showToast('Homepage section updated');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#202124]">Homepage Section Builder</h2>
        <p className="text-xs text-[#777777]">
          Drag sections up or down to rearrange the homepage, toggle visibility, or click Edit to
          change headings, descriptions, background colors, product counts & curated dishes.
        </p>
      </div>

      {editing && (
        <form
          onSubmit={handleSaveSection}
          className="bg-white rounded-3xl border border-[#0B8F4D]/40 p-6 space-y-4 shadow-sm"
        >
          <h3 className="text-base font-extrabold text-[#202124]">
            Editing Section: {editing.section_key}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Heading</label>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Eyebrow Subtitle</label>
              <input
                type="text"
                value={editing.subtitle}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea
                rows={2}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold mb-1">CTA Text</label>
                <input
                  type="text"
                  value={editing.cta_text}
                  onChange={(e) => setEditing({ ...editing, cta_text: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">CTA Link</label>
                <input
                  type="text"
                  value={editing.cta_url}
                  onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold mb-1">Background Color</label>
                <input
                  type="text"
                  value={editing.bg_color}
                  onChange={(e) => setEditing({ ...editing, bg_color: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Max Items Displayed</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={editing.product_limit}
                  onChange={(e) =>
                    setEditing({ ...editing, product_limit: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <MediaPickerField
                label="Section Feature Image (if applicable)"
                value={editing.image_url || 'hero_bowl'}
                onChange={(url) => setEditing({ ...editing, image_url: url })}
              />
            </div>

            {(editing.section_key === 'new_arrivals' ||
              editing.section_key === 'best_sellers') && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold mb-1.5">
                  Optional: Hand-Pick Curated Products (Leave empty for automatic rule)
                </label>
                <div className="max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA]">
                  {allProducts.map((p) => {
                    const checked = editing.curated_product_ids.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const nextIds = checked
                              ? editing.curated_product_ids.filter((id) => id !== p.id)
                              : [...editing.curated_product_ids, p.id];
                            setEditing({ ...editing, curated_product_ids: nextIds });
                          }}
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl bg-[#F5F6F7] text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              Save Section
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {sections.map((sec, idx) => (
          <div
            key={sec.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDropReorder(idx)}
            className="bg-white rounded-2xl border border-[#EEEEEE] p-4 flex items-center justify-between gap-4 cursor-move hover:border-[#0B8F4D]/40"
          >
            <div className="flex items-center gap-3 min-w-0">
              <GripVertical className="w-4 h-4 text-[#999999] shrink-0" />
              <span className="w-6 h-6 rounded-lg bg-[#FFF8ED] text-[#123B16] text-xs font-extrabold font-num flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#202124] truncate">{sec.title}</p>
                <p className="text-[11px] text-[#777777]">
                  Key: <span className="font-num">{sec.section_key}</span> · Limit:{' '}
                  {sec.product_limit} · Bg: {sec.bg_color}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleToggle(sec)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  sec.is_enabled
                    ? 'bg-[#E8F5E9] text-[#0B8F4D]'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {sec.is_enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {sec.is_enabled ? 'Visible' : 'Hidden'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(sec)}
                className="p-2 rounded-lg hover:bg-[#F5F6F7] text-[#202124]"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. PROMOTIONAL BANNERS MANAGER
export function BannersManager() {
  const { refreshSite } = useSite();
  const { showToast, requestConfirm } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);

  const load = () => api.get<Banner[]>('/cms/banners').then((r) => setBanners(r.data));
  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.title) return;
    if (editing.id) {
      await api.put(`/cms/banners/${editing.id}`, editing);
    } else {
      await api.post('/cms/banners', editing);
    }
    setEditing(null);
    await load();
    await refreshSite();
    showToast('Banner saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">Promotional & Page Banners</h2>
          <p className="text-xs text-[#777777]">
            Control top hero banners across Cafe Menu, Green Menu, Diet Menu, Gym Menu & Offers.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              page_target: 'home',
              title: '',
              subtitle: '',
              description: '',
              image_url: 'meal_prep_tray',
              cta_text: 'Explore Now',
              cta_url: '/subscriptions',
              bg_color: '#123B16',
              is_active: 1,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> New Banner
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl border border-[#0B8F4D]/40 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Target Page</label>
              <select
                value={editing.page_target || 'home'}
                onChange={(e) => setEditing({ ...editing, page_target: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm bg-white"
              >
                <option value="cafe-menu">Cafe Menu (/cafe-menu)</option>
                <option value="green-menu">Green Menu (/green-menu)</option>
                <option value="diet-menu">Diet Menu (/diet-menu)</option>
                <option value="gym-menu">Gym Menu (/gym-menu)</option>
                <option value="offers">Offers Page (/offers)</option>
                <option value="home">Homepage Campaign</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Banner Title *</label>
              <input
                type="text"
                required
                value={editing.title || ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Subtitle</label>
              <input
                type="text"
                value={editing.subtitle || ''}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Background Color Hex</label>
              <input
                type="text"
                value={editing.bg_color || '#123B16'}
                onChange={(e) => setEditing({ ...editing, bg_color: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm font-num"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea
                rows={2}
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <MediaPickerField
                label="Banner Image"
                value={editing.image_url || 'meal_prep_tray'}
                onChange={(url) => setEditing({ ...editing, image_url: url })}
                folder="Banners"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl bg-[#F5F6F7] text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              Save Banner
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-2xl border border-[#EEEEEE] p-5 flex items-start gap-4"
          >
            <img
              src={resolveFoodImage(b.image_url)}
              alt={b.title}
              className="w-24 h-20 rounded-xl object-cover shrink-0 border border-[#EEEEEE]"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold uppercase text-[#0B8F4D]">
                Page: {b.page_target}
              </span>
              <h3 className="text-sm font-bold text-[#202124] mt-0.5">{b.title}</h3>
              <p className="text-xs text-[#777777] line-clamp-2 mt-1">{b.description}</p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setEditing(b)}
                  className="text-xs font-bold text-[#0B8F4D]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    requestConfirm({
                      title: 'Delete Banner?',
                      message: `Delete "${b.title}"?`,
                      destructive: true,
                      onConfirm: async () => {
                        await api.delete(`/cms/banners/${b.id}`);
                        await load();
                        await refreshSite();
                      },
                    })
                  }
                  className="text-xs font-bold text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. SPECIAL OFFERS MANAGER (AUTO-EXPIRING CAMPAIGNS)
export function SpecialOffersManager() {
  const { refreshSite } = useSite();
  const { showToast, requestConfirm } = useToast();
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [editing, setEditing] = useState<Partial<SpecialOffer> | null>(null);

  const load = () => api.get<SpecialOffer[]>('/offers?all=1').then((r) => setOffers(r.data));
  useEffect(() => {
    load();
  }, []);

  const nowIso = new Date().toISOString().slice(0, 16);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.title) return;
    if (editing.id) {
      await api.put(`/cms/offers/${editing.id}`, editing);
    } else {
      await api.post('/cms/offers', editing);
    }
    setEditing(null);
    await load();
    await refreshSite();
    showToast('Promotional offer saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">Special Offers & Deals</h2>
          <p className="text-xs text-[#777777]">
            Expired offers are automatically hidden from public promotional sections.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              title: '',
              description: '',
              banner_image: 'meal_prep_tray',
              discount_type: 'percentage',
              discount_value: 20,
              coupon_code: '',
              start_datetime: '2026-01-01T00:00',
              end_datetime: '2027-12-31T23:59',
              min_order_value: 249,
              max_discount: 200,
              usage_limit: 500,
              cta_text: 'Order Now',
              cta_url: '/green-menu',
              is_active: 1,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Create Offer
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl border border-[#0B8F4D]/40 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Offer Title *</label>
              <input
                type="text"
                required
                value={editing.title || ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Coupon Code</label>
              <input
                type="text"
                value={editing.coupon_code || ''}
                onChange={(e) =>
                  setEditing({ ...editing, coupon_code: e.target.value.toUpperCase() })
                }
                placeholder="SUMMER20"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num uppercase"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold mb-1">Description</label>
              <input
                type="text"
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Discount Type</label>
              <select
                value={editing.discount_type || 'percentage'}
                onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Discount Value</label>
              <input
                type="number"
                value={editing.discount_value || 0}
                onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Min Order Value (₹)</label>
              <input
                type="number"
                value={editing.min_order_value || 0}
                onChange={(e) =>
                  setEditing({ ...editing, min_order_value: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                value={editing.start_datetime?.slice(0, 16) || ''}
                onChange={(e) => setEditing({ ...editing, start_datetime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">End Date & Time</label>
              <input
                type="datetime-local"
                value={editing.end_datetime?.slice(0, 16) || ''}
                onChange={(e) => setEditing({ ...editing, end_datetime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Status</label>
              <select
                value={editing.is_active ? '1' : '0'}
                onChange={(e) =>
                  setEditing({ ...editing, is_active: e.target.value === '1' ? 1 : 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
              >
                <option value="1">Enabled</option>
                <option value="0">Disabled</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <MediaPickerField
                label="Offer Banner Image"
                value={editing.banner_image || 'meal_prep_tray'}
                onChange={(url) => setEditing({ ...editing, banner_image: url })}
                folder="Offers"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl bg-[#F5F6F7] text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              Save Offer
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAFAFA] text-[#777777]">
            <tr>
              <th className="px-5 py-3.5">Offer</th>
              <th className="px-5 py-3.5">Code</th>
              <th className="px-5 py-3.5">Discount</th>
              <th className="px-5 py-3.5">Validity Window</th>
              <th className="px-5 py-3.5">Public Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {offers.map((o) => {
              const expired = o.end_datetime < nowIso;
              const live = Boolean(o.is_active) && !expired && o.start_datetime <= nowIso;
              return (
                <tr key={o.id}>
                  <td className="px-5 py-4 font-bold text-[#202124]">{o.title}</td>
                  <td className="px-5 py-4 font-num font-bold text-[#0B8F4D]">
                    {o.coupon_code || '—'}
                  </td>
                  <td className="px-5 py-4 font-num">
                    {o.discount_type === 'percentage'
                      ? `${o.discount_value}%`
                      : `₹${o.discount_value}`}
                  </td>
                  <td className="px-5 py-4 font-num text-[#777777]">
                    {o.start_datetime.slice(0, 10)} → {o.end_datetime.slice(0, 10)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        live
                          ? 'bg-[#E8F5E9] text-[#0B8F4D]'
                          : expired
                          ? 'bg-red-50 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {live ? 'Live on Website' : expired ? 'Auto-Expired' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditing(o)}
                      className="font-bold text-[#0B8F4D]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: 'Delete Offer?',
                          message: `Delete "${o.title}"?`,
                          destructive: true,
                          onConfirm: async () => {
                            await api.delete(`/cms/offers/${o.id}`);
                            await load();
                            await refreshSite();
                          },
                        })
                      }
                      className="font-bold text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 6. PAGES MANAGEMENT (ABOUT, CONTACT, POLICIES & CUSTOM LANDING PAGES)
export function PagesManager() {
  const { refreshSite } = useSite();
  const { showToast, requestConfirm } = useToast();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [editing, setEditing] = useState<Partial<CmsPage> | null>(null);

  const load = () => api.get<CmsPage[]>('/pages?all=1').then((r) => setPages(r.data));
  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.title) return;
    if (editing.id) {
      await api.put(`/cms/pages/${editing.id}`, editing);
    } else {
      await api.post('/cms/pages', editing);
    }
    setEditing(null);
    await load();
    await refreshSite();
    showToast('Page saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">Pages Management</h2>
          <p className="text-xs text-[#777777]">
            Edit About Us, Contact Us, Legal Policies or publish custom SEO landing pages.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              title: '',
              slug: '',
              hero_subtitle: '',
              content_html: '<h3>Section Heading</h3><p>Enter page content here...</p>',
              banner_image: 'hero_slide_green',
              seo_title: '',
              seo_description: '',
              is_published: 1,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Create Page
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl border border-[#0B8F4D]/40 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Page Title *</label>
              <input
                type="text"
                required
                value={editing.title || ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">URL Slug</label>
              <input
                type="text"
                value={editing.slug || ''}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="about-us"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Hero Subtitle</label>
              <input
                type="text"
                value={editing.hero_subtitle || ''}
                onChange={(e) => setEditing({ ...editing, hero_subtitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Page Content (HTML Supported)</label>
              <textarea
                rows={7}
                value={editing.content_html || ''}
                onChange={(e) => setEditing({ ...editing, content_html: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">SEO Title</label>
              <input
                type="text"
                value={editing.seo_title || ''}
                onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">SEO Meta Description</label>
              <input
                type="text"
                value={editing.seo_description || ''}
                onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl bg-[#F5F6F7] text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              Save Page
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAFAFA] text-[#777777]">
            <tr>
              <th className="px-5 py-3.5">Page Title</th>
              <th className="px-5 py-3.5">Live URL</th>
              <th className="px-5 py-3.5">SEO Title</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {pages.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-4 font-bold">{p.title}</td>
                <td className="px-5 py-4 font-num text-[#0B8F4D]">
                  <Link to={`/page/${p.slug}`} target="_blank">
                    /page/{p.slug}
                  </Link>
                </td>
                <td className="px-5 py-4 text-[#777777]">{p.seo_title || p.title}</td>
                <td className="px-5 py-4 text-right space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="font-bold text-[#0B8F4D]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      requestConfirm({
                        title: 'Delete Page?',
                        message: `Delete page "${p.title}"?`,
                        destructive: true,
                        onConfirm: async () => {
                          await api.delete(`/cms/pages/${p.id}`);
                          await load();
                        },
                      })
                    }
                    className="font-bold text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 7. NAVIGATION MANAGER
export function NavigationManager() {
  const { refreshSite } = useSite();
  const { showToast } = useToast();
  const [items, setItems] = useState<NavItem[]>([]);
  const [form, setForm] = useState<Partial<NavItem>>({
    location: 'header',
    label: '',
    url: '/',
    parent_id: null,
    sort_order: 10,
    is_active: 1,
  });

  const load = () => api.get<NavItem[]>('/cms/navigation').then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.url) return;
    if (form.id) {
      await api.put(`/cms/navigation/${form.id}`, form);
    } else {
      await api.post('/cms/navigation', form);
    }
    setForm({ location: 'header', label: '', url: '/', parent_id: null, sort_order: 10, is_active: 1 });
    await load();
    await refreshSite();
    showToast('Navigation menu updated');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#202124]">Navigation Menu Manager</h2>
        <p className="text-xs text-[#777777]">
          Manage Main Header links, Dropdown sub-items & Footer Quick/Legal links.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl border border-[#EEEEEE] p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-bold mb-1">Location</label>
          <select
            value={form.location || 'header'}
            onChange={(e) => setForm({ ...form, location: e.target.value as any })}
            className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
          >
            <option value="header">Main Header</option>
            <option value="footer_quick">Footer Explore</option>
            <option value="footer_legal">Footer Legal</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Label *</label>
          <input
            type="text"
            required
            value={form.label || ''}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. Corporate Meals"
            className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Target URL *</label>
          <input
            type="text"
            required
            value={form.url || ''}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="/green-menu"
            className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Dropdown Parent</label>
          <select
            value={form.parent_id || ''}
            onChange={(e) =>
              setForm({ ...form, parent_id: e.target.value ? Number(e.target.value) : null })
            }
            className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
          >
            <option value="">Top-Level Link</option>
            {items
              .filter((i) => i.location === 'header' && !i.parent_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  Under: {p.label}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Order</label>
          <input
            type="number"
            value={form.sort_order ?? 10}
            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
          />
        </div>
        <button
          type="submit"
          className="py-2.5 px-4 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
        >
          {form.id ? 'Update Link' : '+ Add Link'}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAFAFA] text-[#777777]">
            <tr>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Label</th>
              <th className="px-5 py-3">URL</th>
              <th className="px-5 py-3">Sort</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {items.map((n) => (
              <tr key={n.id}>
                <td className="px-5 py-3 font-semibold uppercase text-[#0B8F4D]">{n.location}</td>
                <td className="px-5 py-3 font-bold">
                  {n.parent_id ? `↳ ${n.label}` : n.label}
                </td>
                <td className="px-5 py-3 font-num text-[#777777]">{n.url}</td>
                <td className="px-5 py-3 font-num">{n.sort_order}</td>
                <td className="px-5 py-3 text-right space-x-3">
                  <button
                    type="button"
                    onClick={() => setForm(n)}
                    className="font-bold text-[#0B8F4D]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.delete(`/cms/navigation/${n.id}`);
                      await load();
                      await refreshSite();
                    }}
                    className="font-bold text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 8. CENTRALIZED MEDIA LIBRARY
export function MediaLibraryManager() {
  const { showToast } = useToast();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [folder, setFolder] = useState('All');
  const [search, setSearch] = useState('');

  const load = () =>
    api
      .get<MediaItem[]>('/cms/media', { params: { folder, search } })
      .then((r) => setMedia(r.data));

  useEffect(() => {
    load();
  }, [folder, search]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await api.post('/cms/media', {
        title: file.name.replace(/\.[^.]+$/, ''),
        file_url: String(reader.result || ''),
        folder: folder === 'All' ? 'Uploads' : folder,
        alt_text: file.name,
      });
      showToast('Uploaded to Media Library');
      load();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">Centralized Media Library</h2>
          <p className="text-xs text-[#777777]">
            Upload food photography, hero banners and brand assets reusable across the entire CMS.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold cursor-pointer">
          <Upload className="w-4 h-4" /> Upload Image
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        {['All', 'Branding', 'Hero Slider', 'Products', 'Offers', 'Uploads'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFolder(f)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold ${
              folder === f ? 'bg-[#123B16] text-white' : 'bg-white border border-[#EEEEEE]'
            }`}
          >
            {f}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search media title or alt text..."
          className="px-3.5 py-2 rounded-xl bg-white border border-[#EEEEEE] text-xs ml-auto"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {media.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden flex flex-col justify-between"
          >
            <img
              src={resolveFoodImage(m.file_url, m.file_url)}
              alt={m.alt_text || m.title}
              className="w-full h-32 object-cover bg-[#FFF8ED]"
            />
            <div className="p-3 space-y-1">
              <p className="text-xs font-bold text-[#202124] truncate">{m.title}</p>
              <p className="text-[10px] text-[#777777]">{m.folder}</p>
              <button
                type="button"
                onClick={async () => {
                  await api.delete(`/cms/media/${m.id}`);
                  load();
                }}
                className="text-[11px] font-bold text-red-600 pt-1"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 9. CUSTOMER REVIEWS MODERATION, GOOGLE REVIEWS SLIDER & TESTIMONIALS MANAGER
export function TestimonialsManager() {
  const { site, refreshSite } = useSite();
  const { showToast, requestConfirm } = useToast();

  const [subTab, setSubTab] = useState<'reviews' | 'testimonials' | 'widgets'>('reviews');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'website' | 'google'>('all');

  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({
    customer_name: '',
    reviewer_location: 'Local Guide · Kolkata',
    review_source: 'Google',
    product_id: '',
    rating: 5,
    comment: '',
    admin_reply: '',
  });

  const [list, setList] = useState<Testimonial[]>([]);
  const [form, setForm] = useState({
    customer_name: '',
    designation: 'Verified Customer',
    location: 'Kolkata',
    rating: 5,
    comment: '',
  });

  const [widgetSettings, setWidgetSettings] = useState({
    google_reviews_enabled: site.settings.google_reviews_enabled ?? '1',
    google_business_name:
      site.settings.google_business_name ||
      'TrimPlate — Healthy Kitchen & Cafe, Park Street, Kolkata',
    google_review_url: site.settings.google_review_url || '',
    trustpilot_enabled: site.settings.trustpilot_enabled ?? '1',
    trustpilot_url: site.settings.trustpilot_url || 'https://www.trustpilot.com/review/trimplate.in',
    trustpilot_score: site.settings.trustpilot_score || '',
    trustpilot_base_reviews: site.settings.trustpilot_base_reviews || '128',
  });

  useEffect(() => {
    setWidgetSettings({
      google_reviews_enabled: site.settings.google_reviews_enabled ?? '1',
      google_business_name:
        site.settings.google_business_name ||
        'TrimPlate — Healthy Kitchen & Cafe, Park Street, Kolkata',
      google_review_url: site.settings.google_review_url || '',
      trustpilot_enabled: site.settings.trustpilot_enabled ?? '1',
      trustpilot_url:
        site.settings.trustpilot_url || 'https://www.trustpilot.com/review/trimplate.in',
      trustpilot_score: site.settings.trustpilot_score || '',
      trustpilot_base_reviews: site.settings.trustpilot_base_reviews || '128',
    });
  }, [site.settings]);

  const loadAll = () => {
    api.get<CustomerReview[]>('/admin/reviews').then((r) => {
      setReviews(r.data);
      const drafts: Record<number, string> = {};
      r.data.forEach((rev) => {
        drafts[rev.id] = rev.admin_reply || '';
      });
      setReplyDrafts(drafts);
    });
    api.get<Testimonial[]>('/cms/testimonials').then((r) => setList(r.data));
    api.get<Product[]>('/products?include_unavailable=1').then((r) => setProducts(r.data));
  };

  useEffect(() => {
    loadAll();
  }, []);

  useRealtime((msg) => {
    if (msg.event === 'review_submitted' || msg.event === 'review_updated') {
      loadAll();
    }
  });

  const websiteReviewsCount = reviews.filter(
    (r) => (r.review_source || 'Website').toLowerCase() !== 'google'
  ).length;
  const googleReviewsCount = reviews.filter(
    (r) => (r.review_source || '').toLowerCase() === 'google'
  ).length;

  const filteredReviews = reviews.filter((r) => {
    if (sourceFilter === 'website') return (r.review_source || 'Website').toLowerCase() !== 'google';
    if (sourceFilter === 'google') return (r.review_source || '').toLowerCase() === 'google';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">
            Customer Item Reviews, Home Google Slider &amp; Trustpilot
          </h2>
          <p className="text-xs text-[#777777] mt-0.5">
            Verified one-time customer item reviews publish immediately. Manage kitchen replies, homepage Google slider visibility, and Trustpilot settings.
          </p>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="inline-flex bg-white p-1.5 rounded-2xl border border-[#EEEEEE] gap-1">
          <button
            type="button"
            onClick={() => setSubTab('reviews')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
              subTab === 'reviews'
                ? 'bg-[#0B8F4D] text-white'
                : 'text-[#202124] hover:bg-[#F5F6F7]'
            }`}
          >
            <span>Customer &amp; Google Reviews ({reviews.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('testimonials')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              subTab === 'testimonials'
                ? 'bg-[#0B8F4D] text-white'
                : 'text-[#202124] hover:bg-[#F5F6F7]'
            }`}
          >
            Featured Quotes ({list.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('widgets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              subTab === 'widgets'
                ? 'bg-[#0B8F4D] text-white'
                : 'text-[#202124] hover:bg-[#F5F6F7]'
            }`}
          >
            Google &amp; Trustpilot Config
          </button>
        </div>
      </div>

      {/* TAB 1: PUBLISHED CUSTOMER & GOOGLE REVIEWS */}
      {subTab === 'reviews' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex bg-white p-1 rounded-xl border border-[#EEEEEE] gap-1">
              {[
                { key: 'all', label: `All Published (${reviews.length})` },
                { key: 'website', label: `Verified Dish Orders (${websiteReviewsCount})` },
                { key: 'google', label: `Google Reviews (${googleReviewsCount})` },
              ].map((flt) => (
                <button
                  key={flt.key}
                  type="button"
                  onClick={() => setSourceFilter(flt.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    sourceFilter === flt.key
                      ? 'bg-[#123B16] text-white'
                      : 'text-[#777777] hover:text-[#202124]'
                  }`}
                >
                  {flt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddReview((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              {showAddReview ? 'Close Form' : 'Add Google / Verified Review'}
            </button>
          </div>

          {showAddReview && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await api.post('/admin/reviews', {
                  ...newReviewForm,
                  product_id: newReviewForm.product_id ? Number(newReviewForm.product_id) : null,
                  is_approved: 1,
                  show_on_home: 1,
                });
                setNewReviewForm({
                  customer_name: '',
                  reviewer_location: 'Local Guide · Kolkata',
                  review_source: 'Google',
                  product_id: '',
                  rating: 5,
                  comment: '',
                  admin_reply: '',
                });
                setShowAddReview(false);
                loadAll();
                await refreshSite();
                showToast('Review added & published live!');
              }}
              className="bg-white rounded-3xl border border-[#0B8F4D]/40 p-6 space-y-4"
            >
              <h3 className="text-sm font-extrabold text-[#202124]">
                Publish Verified Google or Customer Review
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Reviewer Name *"
                  value={newReviewForm.customer_name}
                  onChange={(e) =>
                    setNewReviewForm({ ...newReviewForm, customer_name: e.target.value })
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs"
                />
                <input
                  type="text"
                  placeholder="Badge / Location (e.g. Local Guide · Kolkata)"
                  value={newReviewForm.reviewer_location}
                  onChange={(e) =>
                    setNewReviewForm({ ...newReviewForm, reviewer_location: e.target.value })
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs"
                />
                <select
                  value={newReviewForm.review_source}
                  onChange={(e) =>
                    setNewReviewForm({ ...newReviewForm, review_source: e.target.value })
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  <option value="Google">Google Review</option>
                  <option value="Website">Verified Website Order</option>
                  <option value="Trustpilot">Trustpilot Review</option>
                </select>
                <select
                  value={newReviewForm.rating}
                  onChange={(e) =>
                    setNewReviewForm({ ...newReviewForm, rating: Number(e.target.value) })
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs bg-white font-num"
                >
                  {[5, 4, 3, 2, 1].map((st) => (
                    <option key={st} value={st}>
                      {st} Stars ({st}.0 ★)
                    </option>
                  ))}
                </select>
                <select
                  value={newReviewForm.product_id}
                  onChange={(e) =>
                    setNewReviewForm({ ...newReviewForm, product_id: e.target.value })
                  }
                  className="md:col-span-2 px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  <option value="">Overall TrimPlate Kitchen / Subscription</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.menu_division})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Optional TrimPlate Kitchen Reply"
                  value={newReviewForm.admin_reply}
                  onChange={(e) =>
                    setNewReviewForm({ ...newReviewForm, admin_reply: e.target.value })
                  }
                  className="md:col-span-2 px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs"
                />
                <textarea
                  rows={2}
                  required
                  placeholder="Review Text *"
                  value={newReviewForm.comment}
                  onChange={(e) => setNewReviewForm({ ...newReviewForm, comment: e.target.value })}
                  className="md:col-span-4 px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddReview(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5F6F7] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
                >
                  Publish Review
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#EEEEEE] p-8 text-center text-xs text-[#777777]">
                No reviews match this filter.
              </div>
            ) : (
              filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-[#EEEEEE] p-5 space-y-3.5 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-[#202124]">
                          {rev.customer_name}
                        </span>
                        <span className="text-xs text-[#777777]">·</span>
                        <span className="text-xs font-semibold text-[#5F6368]">
                          {rev.review_source || 'Website'}
                        </span>
                        <span className="text-xs text-[#777777]">·</span>
                        <span className="text-xs text-[#777777]">
                          {rev.reviewer_location || 'Kolkata'}
                        </span>
                        {rev.order_code && (
                          <>
                            <span className="text-xs text-[#777777]">·</span>
                            <span className="text-xs font-bold text-[#0B8F4D] font-num">
                              Order #{rev.order_code}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="inline-flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`w-3.5 h-3.5 ${
                                idx < rev.rating ? 'fill-current text-amber-400' : 'text-[#E0E0E0]'
                              }`}
                            />
                          ))}
                          <span className="font-bold text-[#202124] ml-1 font-num">
                            {rev.rating}.0 ★
                          </span>
                        </div>
                        <span className="text-[#CCCCCC]">|</span>
                        <span className="text-[#5F6368]">
                          Item:{' '}
                          <strong className="text-[#202124]">
                            {rev.product_name || 'Overall TrimPlate Kitchen'}
                          </strong>
                        </span>
                        <span className="text-[#CCCCCC]">|</span>
                        <span className="text-[#777777] font-num">
                          {rev.created_at?.slice(0, 16)}
                        </span>
                      </div>
                    </div>

                    {/* Home Slider Visibility & Delete */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await api.patch(`/admin/reviews/${rev.id}`, {
                            show_on_home: rev.show_on_home ? 0 : 1,
                          });
                          loadAll();
                          await refreshSite();
                          showToast('Updated Home Google Slider visibility');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          rev.show_on_home
                            ? 'bg-[#E8F5E9] border-[#0B8F4D]/30 text-[#123B16]'
                            : 'bg-white border-[#EEEEEE] text-[#777777]'
                        }`}
                      >
                        {rev.show_on_home ? 'Shown on Home Slider' : 'Dish Page Only'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          requestConfirm({
                            title: 'Delete Customer Review?',
                            message: `Permanently delete review from ${rev.customer_name}?`,
                            destructive: true,
                            onConfirm: async () => {
                              await api.delete(`/admin/reviews/${rev.id}`);
                              loadAll();
                              await refreshSite();
                              showToast('Review deleted');
                            },
                          })
                        }
                        className="p-2 rounded-xl text-red-600 hover:bg-red-50"
                        title="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[#202124] leading-relaxed bg-[#FAFAFA] p-3.5 rounded-xl border border-[#F0F0F0]">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  {/* Official Kitchen Reply Input */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#777777] shrink-0">
                      <MessageSquareReply className="w-3.5 h-3.5 text-[#0B8F4D]" />
                      <span>Kitchen Reply:</span>
                    </div>
                    <input
                      type="text"
                      value={replyDrafts[rev.id] ?? ''}
                      onChange={(e) =>
                        setReplyDrafts({ ...replyDrafts, [rev.id]: e.target.value })
                      }
                      placeholder="Write a public response from TrimPlate Kitchen (optional)..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#EEEEEE] text-xs outline-none focus:border-[#0B8F4D]"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await api.patch(`/admin/reviews/${rev.id}`, {
                          admin_reply: replyDrafts[rev.id] || '',
                        });
                        loadAll();
                        await refreshSite();
                        showToast('Kitchen reply saved');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F5F6F7] hover:bg-[#E8F5E9] text-xs font-bold text-[#123B16]"
                    >
                      Save Reply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HOMEPAGE FEATURED TESTIMONIAL QUOTES */}
      {subTab === 'testimonials' && (
        <div className="space-y-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api.post('/cms/testimonials', form);
              setForm({
                customer_name: '',
                designation: 'Verified Customer',
                location: 'Kolkata',
                rating: 5,
                comment: '',
              });
              loadAll();
              await refreshSite();
              showToast('Testimonial added');
            }}
            className="bg-white rounded-2xl border border-[#EEEEEE] p-5 grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <input
              type="text"
              required
              placeholder="Customer Name *"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
            <input
              type="text"
              placeholder="Role / Plan (e.g. 30-Day Subscriber)"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
            <input
              type="text"
              required
              placeholder="Testimonial Quote *"
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
            <button
              type="submit"
              className="py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              + Add Quote
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-[#EEEEEE] p-5 flex justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-bold text-[#202124]">
                    {t.customer_name} · <span className="text-xs text-[#0B8F4D]">{t.rating}★</span>
                  </p>
                  <p className="text-xs text-[#777777] mt-1">&ldquo;{t.comment}&rdquo;</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await api.put(`/cms/testimonials/${t.id}`, {
                        ...t,
                        is_approved: t.is_approved ? 0 : 1,
                      });
                      loadAll();
                      await refreshSite();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      t.is_approved
                        ? 'bg-[#E8F5E9] text-[#0B8F4D]'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {t.is_approved ? 'Approved' : 'Hidden'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.delete(`/cms/testimonials/${t.id}`);
                      loadAll();
                      await refreshSite();
                    }}
                    className="text-xs font-bold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ABOVE-FOOTER GOOGLE SLIDER & FOOTER TRUSTPILOT SETTINGS */}
      {subTab === 'widgets' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await api.put('/settings', widgetSettings);
            await refreshSite();
            showToast('Google Reviews Slider & Trustpilot Footer settings saved!');
          }}
          className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 border-b border-[#EEEEEE] pb-2">
              <h3 className="text-sm font-extrabold text-[#123B16]">
                1. Above-Footer Auto-Sliding Google Reviews Section
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                Above-Footer Google Reviews Slider
              </label>
              <select
                value={widgetSettings.google_reviews_enabled}
                onChange={(e) =>
                  setWidgetSettings({
                    ...widgetSettings,
                    google_reviews_enabled: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm bg-white"
              >
                <option value="1">Visible Above Footer (Auto-Sliding)</option>
                <option value="0">Hidden</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Google Business Listing Title</label>
              <input
                type="text"
                value={widgetSettings.google_business_name}
                onChange={(e) =>
                  setWidgetSettings({
                    ...widgetSettings,
                    google_business_name: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">
                Google Business Reviews Link (&ldquo;View on Google&rdquo; URL)
              </label>
              <input
                type="text"
                value={widgetSettings.google_review_url}
                onChange={(e) =>
                  setWidgetSettings({ ...widgetSettings, google_review_url: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs font-num"
              />
            </div>

            <div className="md:col-span-2 border-b border-[#EEEEEE] pt-2 pb-2">
              <h3 className="text-sm font-extrabold text-[#123B16]">
                2. Footer Trustpilot Reputation Badge
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Footer Trustpilot Widget</label>
              <select
                value={widgetSettings.trustpilot_enabled}
                onChange={(e) =>
                  setWidgetSettings({ ...widgetSettings, trustpilot_enabled: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm bg-white"
              >
                <option value="1">Visible in Website Footer</option>
                <option value="0">Hidden</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Trustpilot Profile URL</label>
              <input
                type="text"
                value={widgetSettings.trustpilot_url}
                onChange={(e) =>
                  setWidgetSettings({ ...widgetSettings, trustpilot_url: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs font-num"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                TrustScore Override (Leave blank to sync with live SQL average)
              </label>
              <input
                type="text"
                placeholder="Auto-calculated from approved reviews (e.g. 4.9)"
                value={widgetSettings.trustpilot_score}
                onChange={(e) =>
                  setWidgetSettings({ ...widgetSettings, trustpilot_score: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm font-num"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                Historical Trustpilot Base Review Count
              </label>
              <input
                type="number"
                value={widgetSettings.trustpilot_base_reviews}
                onChange={(e) =>
                  setWidgetSettings({
                    ...widgetSettings,
                    trustpilot_base_reviews: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm font-num"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
          >
            <Save className="w-4 h-4" /> Save Google &amp; Trustpilot Configuration
          </button>
        </form>
      )}
    </div>
  );
}

export function GalleryManager() {
  const { refreshSite } = useSite();
  const { showToast } = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [form, setForm] = useState({ title: '', caption: '', category: 'Healthy Bowls', image_url: 'hero_bowl' });

  const load = () => api.get<GalleryItem[]>('/cms/gallery').then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold text-[#202124]">Food & Kitchen Gallery</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post('/cms/gallery', form);
          setForm({ title: '', caption: '', category: 'Healthy Bowls', image_url: 'hero_bowl' });
          await load();
          await refreshSite();
          showToast('Gallery photo added');
        }}
        className="bg-white rounded-2xl border border-[#EEEEEE] p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Photo Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
          />
          <input
            type="text"
            placeholder="Category (e.g. Green Menu)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
          />
          <input
            type="text"
            placeholder="Caption"
            value={form.caption}
            onChange={(e) => setForm({ ...form, caption: e.target.value })}
            className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
          />
        </div>
        <MediaPickerField
          label="Gallery Image"
          value={form.image_url}
          onChange={(u) => setForm({ ...form, image_url: u })}
          folder="Gallery"
        />
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold">
          + Add to Gallery
        </button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((g) => (
          <div key={g.id} className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
            <img src={resolveFoodImage(g.image_url)} alt={g.title} className="w-full h-36 object-cover" />
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#202124]">{g.title}</p>
                <p className="text-[10px] text-[#777777]">{g.category}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await api.delete(`/cms/gallery/${g.id}`);
                  await load();
                  await refreshSite();
                }}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewsletterManager() {
  const { showToast } = useToast();
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const load = () => api.get<NewsletterSubscriber[]>('/cms/newsletter').then((r) => setSubs(r.data));
  useEffect(() => {
    load();
  }, []);

  const exportCsv = () => {
    const csv = [
      'Email,Name,SubscribedAt',
      ...subs.map((s) => `${s.email},"${s.name || ''}",${s.created_at}`),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TrimPlate_Newsletter_Subscribers.csv';
    a.click();
    showToast('Subscribers CSV exported');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-[#202124]">
          Newsletter Subscribers ({subs.length})
        </h2>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAFAFA] text-[#777777]">
            <tr>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Subscribed On</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3.5 font-semibold">{s.email}</td>
                <td className="px-5 py-3.5">{s.name || '—'}</td>
                <td className="px-5 py-3.5 font-num text-[#777777]">{s.created_at}</td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={async () => {
                      await api.delete(`/cms/newsletter/${s.id}`);
                      load();
                    }}
                    className="font-bold text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 10. SEO MANAGEMENT & WEBSITE SETTINGS
export function SeoManager() {
  const { site, refreshSite } = useSite();
  const { showToast } = useToast();
  const [seoForm, setSeoForm] = useState({
    default_seo_title: site.settings.default_seo_title || '',
    default_seo_description: site.settings.default_seo_description || '',
    default_og_image: site.settings.default_og_image || 'hero_slide_feast',
  });

  useEffect(() => {
    setSeoForm({
      default_seo_title: site.settings.default_seo_title || '',
      default_seo_description: site.settings.default_seo_description || '',
      default_og_image: site.settings.default_og_image || 'hero_slide_feast',
    });
  }, [site.settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.put('/settings', seoForm);
    await refreshSite();
    showToast('Global SEO & OpenGraph metadata saved');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#202124] flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#0B8F4D]" /> SEO, OpenGraph & Search Indexing
            </h2>
            <p className="text-xs text-[#777777] mt-1">
              Manage default website title, meta description, OpenGraph image & verify live XML
              sitemap.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs font-bold text-[#0B8F4D]"
            >
              View /sitemap.xml ↗
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs font-bold text-[#202124]"
            >
              View /robots.txt ↗
            </a>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1">Default Website SEO Title</label>
            <input
              type="text"
              value={seoForm.default_seo_title}
              onChange={(e) => setSeoForm({ ...seoForm, default_seo_title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Default Meta Description</label>
            <textarea
              rows={3}
              value={seoForm.default_seo_description}
              onChange={(e) =>
                setSeoForm({ ...seoForm, default_seo_description: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>
          <MediaPickerField
            label="Default OpenGraph Social Share Image (1200×630)"
            value={seoForm.default_og_image}
            onChange={(u) => setSeoForm({ ...seoForm, default_og_image: u })}
            folder="SEO"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4" /> Save SEO Configuration
          </button>
        </form>
      </div>
    </div>
  );
}

export function WebsiteSettingsManager() {
  const { site, refreshSite } = useSite();
  const { showToast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({ ...site.settings });
  }, [site.settings]);

  const setField = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.put('/settings', form);
    await refreshSite();
    showToast('Website Settings saved & published live!');
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#202124]">Global Website Settings</h2>
            <p className="text-xs text-[#777777]">
              Control brand logo, announcement bar, contact info, delivery fees, tax % & payment
              settings.
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
          >
            <Save className="w-4 h-4" /> Save All Settings
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <MediaPickerField
            label="Website Brand Logo"
            value={form.logo_url || 'official_logo'}
            onChange={(u) => setField('logo_url', u)}
            folder="Branding"
          />
          <MediaPickerField
            label="Browser Favicon"
            value={form.favicon_url || 'official_logo'}
            onChange={(u) => setField('favicon_url', u)}
            folder="Branding"
          />

          <div>
            <label className="block text-xs font-bold mb-1">Brand Name</label>
            <input
              type="text"
              value={form.business_name ?? form.site_name ?? ''}
              onChange={(e) => setField('business_name', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Brand Tagline</label>
            <input
              type="text"
              value={form.tagline || ''}
              onChange={(e) => setField('tagline', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Top Announcement Bar Enabled</label>
            <select
              value={form.announcement_enabled || '1'}
              onChange={(e) => setField('announcement_enabled', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm bg-white"
            >
              <option value="1">Visible</option>
              <option value="0">Hidden</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Announcement Bar Text</label>
            <input
              type="text"
              value={form.announcement_text || ''}
              onChange={(e) => setField('announcement_text', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Delivery Info Banner Text</label>
            <input
              type="text"
              value={form.announcement_delivery_info || ''}
              onChange={(e) => setField('announcement_delivery_info', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Contact Phone Number</label>
            <input
              type="text"
              value={form.phone || ''}
              onChange={(e) => setField('phone', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Support Email</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => setField('email', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Business Operating Hours</label>
            <input
              type="text"
              value={form.business_hours || ''}
              onChange={(e) => setField('business_hours', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1">Kitchen & Studio Address</label>
            <input
              type="text"
              value={form.address || ''}
              onChange={(e) => setField('address', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Standard Delivery Charge (₹)</label>
            <input
              type="number"
              value={form.delivery_charge || '40'}
              onChange={(e) => setField('delivery_charge', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Free Delivery Threshold (₹)</label>
            <input
              type="number"
              value={form.free_delivery_threshold || '599'}
              onChange={(e) => setField('free_delivery_threshold', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">GST / Tax Percentage (%)</label>
            <input
              type="number"
              value={form.tax_percent ?? form.tax_percentage ?? '5'}
              onChange={(e) => setField('tax_percent', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">
              Auto &ldquo;New Arrival&rdquo; Window (Days)
            </label>
            <input
              type="number"
              value={form.new_arrival_days || '14'}
              onChange={(e) => setField('new_arrival_days', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Merchant UPI ID (VPA)</label>
            <input
              type="text"
              value={form.upi_vpa ?? form.upi_id ?? ''}
              onChange={(e) => setField('upi_vpa', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">
              Online Payment Gateway Key (Razorpay/Stripe)
            </label>
            <input
              type="text"
              value={form.payment_gateway_key || ''}
              onChange={(e) => setField('payment_gateway_key', e.target.value)}
              placeholder="Leave blank if using COD & Direct UPI"
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">
              Official Order Receiving WhatsApp Number (with country code)
            </label>
            <input
              type="text"
              value={form.whatsapp_order_number || ''}
              onChange={(e) => setField('whatsapp_order_number', e.target.value)}
              placeholder="e.g. 919830045120"
              className="w-full px-3.5 py-2 rounded-xl border border-[#0B8F4D]/40 bg-[#F9FDFB] text-xs font-num"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">WhatsApp Chat URL</label>
            <input
              type="text"
              value={form.whatsapp_url || ''}
              onChange={(e) => setField('whatsapp_url', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Instagram URL</label>
            <input
              type="text"
              value={form.instagram_url || ''}
              onChange={(e) => setField('instagram_url', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Google Reviews Link</label>
            <input
              type="text"
              value={form.google_review_url || ''}
              onChange={(e) => setField('google_review_url', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Trustpilot Profile URL</label>
            <input
              type="text"
              value={form.trustpilot_url || ''}
              onChange={(e) => setField('trustpilot_url', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1">Footer Brand Bio</label>
            <textarea
              rows={2}
              value={form.footer_about || ''}
              onChange={(e) => setField('footer_about', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1">Footer Copyright Text</label>
            <input
              type="text"
              value={form.copyright_text || ''}
              onChange={(e) => setField('copyright_text', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
