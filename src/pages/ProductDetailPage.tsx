import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Plus,
  Minus,
  Star,
  CheckCircle2,
  Flame,
  ShieldCheck,
  CornerDownRight,
  Maximize2,
  X,
} from 'lucide-react';
import { api, cachedGet, peekCached, invalidateApiCache, formatINR } from '../services/api';
import { CustomerReview, OrderRecord, Product } from '../types';
import { SEOHead } from '../components/SEOHead';
import { FALLBACK_FOOD_IMAGE, getProductGalleryUrls } from '../assets/mediaMap';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { useRealtime } from '../hooks/useRealtime';
import { WebsiteProductCard } from '../components/WebsiteProductCard';
import { StarRatingBar } from '../components/StarRatingBar';
import { FadeIn } from '../components/FadeIn';

interface ProductDetailResponse extends Product {
  reviews: CustomerReview[];
  myPendingReviews?: CustomerReview[];
  related: Product[];
}

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addProductToCart, setIsCartDrawerOpen } = useCart();
  const { user } = useAuth();
  const { site } = useSite();
  const { showToast } = useToast();

  const [product, setProduct] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [qty, setQty] = useState(1);
  const touchStartX = useRef<number | null>(null);

  const [myOrders, setMyOrders] = useState<OrderRecord[]>([]);
  const [myReviews, setMyReviews] = useState<CustomerReview[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [rating, setRating] = useState(5);
  const [reviewerLocation, setReviewerLocation] = useState('Kolkata');
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<string>('');

  const loadProduct = useCallback(
    (silent = false) => {
      if (!slug) return;
      const detailCached = peekCached<ProductDetailResponse>(`/products/${slug}`);
      const listMatch = !detailCached
        ? (peekCached<Product[]>('/products') || []).find((x) => x.slug === slug)
        : undefined;

      if (!silent) {
        setActiveSlideIdx(0);
        setIsLightboxOpen(false);
        if (detailCached) {
          setProduct(detailCached);
          const defVar =
            detailCached.variants.find((v) => v.is_default === 1) || detailCached.variants[0];
          setSelectedVariant(defVar ? defVar.variant_name : '');
          setQty(1);
          setLoading(false);
        } else if (listMatch) {
          setProduct({ ...listMatch, reviews: [], related: [] });
          const defVar =
            listMatch.variants.find((v) => v.is_default === 1) || listMatch.variants[0];
          setSelectedVariant(defVar ? defVar.variant_name : '');
          setQty(1);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        invalidateApiCache(`/products/${slug}`);
      }

      cachedGet<ProductDetailResponse>(`/products/${slug}`, undefined, silent ? 0 : 30000)
        .then((p) => {
          setProduct(p);
          if (!silent && !detailCached && !listMatch) {
            const defVar = p.variants.find((v) => v.is_default === 1) || p.variants[0];
            setSelectedVariant(defVar ? defVar.variant_name : '');
            setQty(1);
          }
        })
        .catch(() => {
          if (!silent && !detailCached && !listMatch) setProduct(null);
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [slug]
  );

  const loadCustomerOrderEligibility = useCallback(() => {
    if (!user) {
      setMyOrders([]);
      setMyReviews([]);
      return;
    }
    const defaultArea = user.addresses?.[0]?.area
      ? `${user.addresses[0].area}, ${user.addresses[0].city || 'Kolkata'}`
      : 'Kolkata';
    setReviewerLocation(defaultArea);

    Promise.allSettled([
      api.get<OrderRecord[]>('/orders'),
      api.get<CustomerReview[]>('/reviews/my'),
    ]).then(([ordRes, revRes]) => {
      if (ordRes.status === 'fulfilled') setMyOrders(ordRes.value.data);
      if (revRes.status === 'fulfilled') setMyReviews(revRes.value.data);
    });
  }, [user]);

  useEffect(() => {
    setPendingConfirmation('');
    loadProduct(false);
    loadCustomerOrderEligibility();
  }, [loadProduct, loadCustomerOrderEligibility]);

  useRealtime(
    useCallback(
      (msg) => {
        if (
          msg.event === 'review_updated' ||
          msg.event === 'order_created' ||
          msg.event === 'product_updated'
        ) {
          loadProduct(true);
          loadCustomerOrderEligibility();
        }
      },
      [loadProduct, loadCustomerOrderEligibility]
    )
  );

  const gallerySources = useMemo(() => {
    if (!product) return [FALLBACK_FOOD_IMAGE];
    return getProductGalleryUrls(product);
  }, [product]);

  const safeSlideIdx = activeSlideIdx < gallerySources.length ? activeSlideIdx : 0;

  // Keyboard navigation when Lightbox Slider is open
  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft' && gallerySources.length > 1) {
        setActiveSlideIdx((prev) => (prev - 1 + gallerySources.length) % gallerySources.length);
      } else if (e.key === 'ArrowRight' && gallerySources.length > 1) {
        setActiveSlideIdx((prev) => (prev + 1) % gallerySources.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLightboxOpen, gallerySources.length]);

  // Orders containing this specific dish that have NOT yet reviewed this dish
  const myDishReviews = useMemo(() => {
    if (!product) return [];
    return myReviews.filter((r) => Number(r.product_id) === Number(product.id));
  }, [myReviews, product]);

  const eligibleOrders = useMemo(() => {
    if (!product) return [];
    const reviewedOrderIdsForDish = new Set(
      myReviews
        .filter((r) => Number(r.product_id) === Number(product.id))
        .map((r) => Number(r.order_id))
        .filter((id) => !Number.isNaN(id) && id > 0)
    );
    return myOrders.filter(
      (o) =>
        o.order_status !== 'Cancelled' &&
        o.items.some((it) => Number(it.product_id) === Number(product.id)) &&
        !reviewedOrderIdsForDish.has(o.id)
    );
  }, [myOrders, myReviews, product]);

  useEffect(() => {
    if (eligibleOrders.length > 0) {
      setSelectedOrderId((prev) =>
        prev && eligibleOrders.some((o) => String(o.id) === prev)
          ? prev
          : String(eligibleOrders[0].id)
      );
    } else {
      setSelectedOrderId('');
    }
  }, [eligibleOrders]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-[4/3] rounded-3xl bg-[#F5F6F7] animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 bg-[#F5F6F7] rounded-xl animate-pulse" />
            <div className="h-24 bg-[#F5F6F7] rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-extrabold text-[#202124]">Dish Not Found</h1>
        <p className="text-sm text-[#777777]">
          This menu item may have been updated or moved to another section.
        </p>
        <Link
          to="/green-menu"
          className="inline-block px-6 py-3 rounded-xl bg-[#0B8F4D] text-white text-sm font-semibold"
        >
          Browse Healthy Green Menu
        </Link>
      </div>
    );
  }

  const activeVar = product.variants.find((v) => v.variant_name === selectedVariant);
  const effectivePrice = activeVar ? activeVar.price : product.price;

  const matchedCustomMenu = (site.customMenus || []).find(
    (m) => m.division_name === product.menu_division
  );
  const divisionHref = matchedCustomMenu
    ? `/menu/${matchedCustomMenu.slug}`
    : product.menu_division === 'Cafe Menu'
    ? '/cafe-menu'
    : '/green-menu';

  const customerCount = product.review_count ?? product.reviews.length;
  const starDistribution = [5, 4, 3, 2, 1].map((starLevel) => {
    const cnt = product.reviews.filter((r) => Math.round(Number(r.rating || 0)) === starLevel).length;
    const pct = customerCount > 0 ? Math.round((cnt / customerCount) * 100) : 0;
    return { starLevel, cnt, pct };
  });

  const goPrevImage = () => {
    setActiveSlideIdx((prev) => (prev - 1 + gallerySources.length) % gallerySources.length);
  };

  const goNextImage = () => {
    setActiveSlideIdx((prev) => (prev + 1) % gallerySources.length);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to submit a verified review', 'info');
      return;
    }
    if (!selectedOrderId) {
      showToast('Please select an eligible order', 'info');
      return;
    }
    setSubmittingReview(true);
    try {
      const matchedOrd = eligibleOrders.find((o) => String(o.id) === selectedOrderId);
      const matchedItem = matchedOrd?.items.find((it) => Number(it.product_id) === Number(product.id));
      await api.post('/reviews', {
        order_id: Number(selectedOrderId),
        order_item_id: matchedItem ? matchedItem.id : null,
        product_id: product.id,
        reviewer_location: reviewerLocation.trim() || 'Kolkata',
        rating,
        comment: comment.trim(),
      });
      setPendingConfirmation('Thank you for your review!');
      showToast('Thank you for your review!');
      setComment('');
      loadProduct(true);
      loadCustomerOrderEligibility();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="bg-white">
      <SEOHead
        title={product.seo_title || product.name}
        description={
          product.seo_description ||
          product.description ||
          `Order ${product.name} online from TrimPlate ${product.menu_division}.`
        }
        ogImage={product.custom_image_url || product.image_key}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* Breadcrumbs */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-[#777777] mb-8">
          <Link to="/" className="hover:text-[#0B8F4D]">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={divisionHref} className="hover:text-[#0B8F4D]">
            {product.menu_division}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#202124] font-semibold">{product.name}</span>
        </nav>

        {/* Product Split Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Interactive Multi-Image Product Gallery Slider */}
          <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4">
            <div
              className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-[#EEEEEE] bg-[#FFF8ED] shadow-xs select-none"
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null || gallerySources.length <= 1) return;
                const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
                const delta = endX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(delta) > 40) {
                  if (delta < 0) goNextImage();
                  else goPrevImage();
                }
              }}
            >
              <div
                onClick={() => setIsLightboxOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsLightboxOpen(true);
                  }
                }}
                aria-label={`Expand ${product.name} photo gallery`}
                className="flex w-full h-full cursor-zoom-in will-change-transform transition-transform duration-350 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{
                  transform: `translate3d(-${safeSlideIdx * 100}%, 0, 0)`,
                }}
              >
                {gallerySources.map((src, idx) => (
                  <div key={`${src}-${idx}`} className="w-full h-full shrink-0 overflow-hidden">
                    <img
                      src={src}
                      alt={`${product.name} — view ${idx + 1} of ${gallerySources.length}`}
                      referrerPolicy="no-referrer"
                      onError={(ev) => {
                        const target = ev.currentTarget;
                        if (target.src !== FALLBACK_FOOD_IMAGE) {
                          target.src = FALLBACK_FOOD_IMAGE;
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Subtle Bottom Contrast Scrim */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 via-black/15 to-transparent"
              />

              {/* Expand Fullscreen Lightbox Button */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                aria-label="Open full-screen photo viewer"
                className="absolute top-3.5 right-3.5 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/92 hover:bg-white text-[#123B16] text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#0B8F4D]" />
                <span>View Photos</span>
              </button>

              {/* Prev / Next Click-to-Slide Arrows */}
              {gallerySources.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrevImage}
                    aria-label="Previous dish photo"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/92 hover:bg-white text-[#123B16] shadow-md flex items-center justify-center transition-transform duration-150 active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNextImage}
                    aria-label="Next dish photo"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/92 hover:bg-white text-[#123B16] shadow-md flex items-center justify-center transition-transform duration-150 active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Pagination Dots */}
                  <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                    {gallerySources.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSlideIdx(idx)}
                        aria-label={`Go to photo ${idx + 1}`}
                        className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                          idx === safeSlideIdx
                            ? 'w-6 bg-white shadow-xs'
                            : 'w-2 bg-white/65 hover:bg-white'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Tabular Photo Counter */}
                  <span className="pointer-events-none absolute bottom-3 right-4 z-10 text-xs font-semibold font-num text-white bg-black/50 px-2.5 py-1 rounded-lg">
                    {safeSlideIdx + 1} / {gallerySources.length}
                  </span>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {gallerySources.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {gallerySources.map((src, i) => {
                  const isActive = safeSlideIdx === i;
                  return (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setActiveSlideIdx(i)}
                      aria-label={`Select photo ${i + 1}`}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'border-[#0B8F4D] ring-2 ring-[#0B8F4D]/25 opacity-100'
                          : 'border-[#EEEEEE] opacity-75 hover:opacity-100 hover:border-[#0B8F4D]/50'
                      }`}
                    >
                      <img
                        src={src}
                        alt={`${product.name} thumbnail ${i + 1}`}
                        referrerPolicy="no-referrer"
                        onError={(ev) => {
                          const target = ev.currentTarget;
                          if (target.src !== FALLBACK_FOOD_IMAGE) {
                            target.src = FALLBACK_FOOD_IMAGE;
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info & Purchase Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#777777]">
              <span className="inline-flex items-center gap-1.5 text-[#202124]">
                <span
                  className={`w-3.5 h-3.5 border flex items-center justify-center ${
                    product.is_veg ? 'border-[#0B8F4D]' : 'border-red-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      product.is_veg ? 'bg-[#0B8F4D]' : 'bg-red-600'
                    }`}
                  />
                </span>
                {product.is_veg ? 'Pure Vegetarian' : 'Contains Egg / Lean Meat'}
              </span>
              <span>·</span>
              <span>{product.category_name}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-2">
                <StarRatingBar rating={product.avg_rating ?? 0} size="sm" />
                <span className="text-[#202124] font-semibold">
                  <span className="font-num">{customerCount}</span>{' '}
                  {customerCount === 1 ? 'Customer Review' : 'Customer Reviews'}
                </span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#202124] leading-tight">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3">
              {effectivePrice === null || effectivePrice === undefined ? (
                <span className="text-lg font-bold text-[#777777]">
                  Seasonal Dish · Price on Request
                </span>
              ) : (
                <span className="text-3xl font-extrabold text-[#0B8F4D] font-num">
                  {formatINR(effectivePrice)}
                </span>
              )}
              <span
                className={`text-xs font-semibold ${
                  product.is_available && product.stock_qty > 0
                    ? 'text-[#0B8F4D]'
                    : 'text-red-600'
                }`}
              >
                {product.is_available && product.stock_qty > 0
                  ? `In Stock (${product.stock_qty} portions available today)`
                  : 'Currently Out of Stock'}
              </span>
            </div>

            <p className="text-sm sm:text-base text-[#777777] leading-relaxed">
              {product.description ||
                `Freshly prepared ${product.name} from our ${product.menu_division}, crafted using clean oils and whole ingredients.`}
            </p>

            {/* Variant Selector */}
            {product.variants.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#202124]">
                  Choose Size / Portion
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v.variant_name)}
                      className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                        selectedVariant === v.variant_name
                          ? 'bg-[#E8F5E9] border-[#0B8F4D] text-[#123B16]'
                          : 'bg-white border-[#EEEEEE] text-[#202124] hover:border-[#0B8F4D]'
                      }`}
                    >
                      {v.variant_name} · <span className="font-num">{formatINR(v.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart Controls */}
            {product.is_available && product.stock_qty > 0 && effectivePrice !== null && (
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="inline-flex items-center border border-[#EEEEEE] rounded-xl bg-[#F8F9FA]">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="p-3.5 text-[#202124] hover:text-[#0B8F4D]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-extrabold font-num">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="p-3.5 text-[#202124] hover:text-[#0B8F4D]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addProductToCart(
                      product,
                      selectedVariant || undefined,
                      effectivePrice,
                      qty
                    );
                    showToast(`${qty} × ${product.name} added to your bag!`);
                    setIsCartDrawerOpen(true);
                  }}
                  className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold px-6 py-4 rounded-xl shadow-sm transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add to Cart ·{' '}
                  <span className="font-num">{formatINR(effectivePrice * qty)}</span>
                </button>
              </div>
            )}

            {/* Verified Nutritional Breakdown (Shown only when verified in DB) */}
            {product.nutrition && Boolean(product.nutrition.is_verified) && (
              <div className="bg-[#FFF8ED] rounded-2xl border border-[#EEEEEE] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#123B16]">
                    <Flame className="w-4 h-4 text-[#0B8F4D]" /> Verified Nutritional Profile
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B8F4D]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Kitchen Verified
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 text-center">
                  {[
                    { label: 'Calories', val: `${product.nutrition.calories_kcal} kcal` },
                    { label: 'Protein', val: `${product.nutrition.protein_g}g` },
                    { label: 'Carbs', val: `${product.nutrition.carbs_g}g` },
                    { label: 'Fat', val: `${product.nutrition.fat_g}g` },
                    { label: 'Fiber', val: `${product.nutrition.fiber_g}g` },
                    { label: 'Sugar', val: `${product.nutrition.sugar_g}g` },
                  ].map((m) => (
                    <div key={m.label} className="bg-white rounded-xl p-2.5 border border-[#EEEEEE]">
                      <p className="text-xs font-extrabold text-[#202124] font-num">{m.val}</p>
                      <p className="text-[11px] text-[#777777] mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-[#777777]">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F7FAF8]">
                <ShieldCheck className="w-4 h-4 text-[#0B8F4D] shrink-0" />
                <span>100% Hygienic FSSAI Kitchen</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F7FAF8]">
                <CheckCircle2 className="w-4 h-4 text-[#0B8F4D] shrink-0" />
                <span>Freshly Cooked to Order</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <FadeIn>
          <section className="mt-16 pt-12 border-t border-[#EEEEEE] grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#202124]">
                    Verified Customer Reviews{' '}
                    <span className="text-base font-bold text-[#0B8F4D] font-num">
                      ({customerCount})
                    </span>
                  </h2>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Rated by <strong className="text-[#202124] font-num">{customerCount}</strong>{' '}
                    {customerCount === 1 ? 'verified customer' : 'verified customers'}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-[#FFF8ED] border border-[#EEEEEE] px-4 py-2.5 rounded-2xl">
                  <StarRatingBar rating={product.avg_rating ?? 0} size="md" />
                  <div className="border-l border-[#E6E1D6] pl-3">
                    <p className="text-xs font-extrabold text-[#202124] font-num leading-none">
                      {product.avg_rating ? Number(product.avg_rating).toFixed(1) : '0.0'} / 5
                    </p>
                    <p className="text-[11px] font-semibold text-[#0B8F4D] font-num mt-0.5">
                      {customerCount} {customerCount === 1 ? 'Customer' : 'Customers'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Per-Star Customer Count Analysis Bar */}
              {customerCount > 0 && (
                <div className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {starDistribution.map((row) => (
                    <div
                      key={row.starLevel}
                      className="bg-white rounded-xl border border-[#EFEFEF] px-3 py-2 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#202124] font-num">
                        <span>{'★'.repeat(row.starLevel)}</span>
                        <span className="text-[#0B8F4D]">{row.cnt}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#EAECEF] overflow-hidden mt-1.5">
                        <div
                          className="h-full rounded-full bg-[#F59E0B] transition-all duration-500"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#777777] mt-1 font-num">
                        {row.cnt} {row.cnt === 1 ? 'customer' : 'customers'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {product.reviews.length === 0 ? (
                <div className="p-8 rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA] text-center">
                  <p className="text-sm font-semibold text-[#202124]">
                    No customer reviews on {product.name} yet
                  </p>
                  <p className="text-xs text-[#777777] mt-1">
                    Ordered this dish? Share your one-time verified rating and it will appear here immediately.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {product.reviews.map((r) => (
                    <div key={r.id} className="p-5 rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#202124] flex items-center gap-1.5">
                            <span>{r.customer_name}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0B8F4D]" />
                          </p>
                          <p className="text-xs text-[#777777]">
                            {r.reviewer_location || 'Kolkata'} ·{' '}
                            {r.created_at ? r.created_at.slice(0, 10) : 'Verified'}
                          </p>
                        </div>
                        <StarRatingBar rating={r.rating} size="sm" />
                      </div>
                      <p className="text-sm text-[#3C4043] mt-2.5 leading-relaxed">{r.comment}</p>
                      {r.admin_reply && (
                        <div className="mt-3 pt-2.5 border-t border-[#E8ECE9] text-xs text-[#5F6368]">
                          <p className="font-bold text-[#123B16] flex items-center gap-1">
                            <CornerDownRight className="w-3 h-3 text-[#0B8F4D]" /> TrimPlate Kitchen Reply
                          </p>
                          <p className="mt-0.5">{r.admin_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              {!user ? (
                <div className="bg-[#FFF8ED] rounded-2xl border border-[#EEEEEE] p-6 space-y-4">
                  <h3 className="text-lg font-bold text-[#202124]">Rate &amp; Review This Dish</h3>
                  <p className="text-xs text-[#777777] leading-relaxed">
                    Sign in to rate this dish from your order. Each ordered item can be reviewed once.
                  </p>
                  <Link
                    to={`/login?redirect=/product/${product.slug}`}
                    className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-semibold transition-colors"
                  >
                    Sign In to Review
                  </Link>
                </div>
              ) : eligibleOrders.length === 0 ? (
                <div className="bg-[#FFF8ED] rounded-2xl border border-[#EEEEEE] p-6 space-y-3">
                  {pendingConfirmation || myDishReviews.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 text-[#123B16]">
                        <CheckCircle2 className="w-5 h-5 text-[#0B8F4D] shrink-0" />
                        <h3 className="text-base font-extrabold">Thank you for your review!</h3>
                      </div>
                      <p className="text-xs text-[#555555] leading-relaxed">
                        Your verified rating for <strong className="text-[#202124]">{product.name}</strong> has been recorded.
                      </p>
                      {myDishReviews[0] && (
                        <div className="p-3 rounded-xl bg-white border border-[#E6ECE8] flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#123B16]">Your Rating</span>
                          <StarRatingBar rating={myDishReviews[0].rating} size="sm" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <h3 className="text-base font-bold text-[#202124]">Order to Rate This Dish</h3>
                      <p className="text-xs text-[#666666] leading-relaxed">
                        Order <strong className="text-[#202124]">{product.name}</strong> to unlock a one-time verified customer review for this item.
                      </p>
                    </div>
                  )}
                  <Link
                    to="/account?tab=orders"
                    className="inline-block text-xs font-bold text-[#0B8F4D] hover:underline pt-1"
                  >
                    View My Orders →
                  </Link>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitReview}
                  className="bg-[#FFF8ED] rounded-2xl border border-[#EEEEEE] p-6 space-y-4"
                >
                  <div>
                    <h3 className="text-lg font-bold text-[#202124]">Rate This Dish</h3>
                    <p className="text-xs text-[#777777] mt-0.5">
                      One review per ordered item · Publishes immediately.
                    </p>
                  </div>

                  {pendingConfirmation && (
                    <div className="p-3.5 rounded-xl bg-[#E8F5E9] border border-[#0B8F4D]/30 text-xs text-[#123B16] font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0B8F4D] shrink-0" />
                      <span>{pendingConfirmation}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#202124] mb-1">
                      Select Order *
                    </label>
                    <select
                      required
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#EEEEEE] text-xs font-semibold text-[#202124] outline-none focus:border-[#0B8F4D]"
                    >
                      {eligibleOrders.map((ord) => (
                        <option key={ord.id} value={ord.id}>
                          Order #{ord.order_code} · {formatINR(ord.total_amount)} ({ord.order_status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#777777] mb-1.5">
                      Your Star Rating
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`p-2 rounded-lg border transition-colors ${
                            rating >= star
                              ? 'bg-amber-50 border-amber-300 text-amber-500'
                              : 'bg-white border-[#EEEEEE] text-[#CCCCCC]'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#777777] mb-1">
                      Neighborhood / City
                    </label>
                    <input
                      type="text"
                      value={reviewerLocation}
                      onChange={(e) => setReviewerLocation(e.target.value)}
                      placeholder="e.g. Park Street, Kolkata"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#777777] mb-1.5">
                      Feedback (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="How was the taste, freshness and portion size?"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-3 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-semibold transition-colors"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>
          </section>
        </FadeIn>

        {/* Related Products */}
        {product.related && product.related.length > 0 && (
          <FadeIn className="mt-16 pt-12 border-t border-[#EEEEEE]">
            <h2 className="text-2xl font-extrabold text-[#202124] mb-6">
              You May Also Enjoy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {product.related.map((rel) => (
                <WebsiteProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </FadeIn>
        )}
      </div>

      {/* Fullscreen Lightbox Gallery Slider Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between p-4 sm:p-8"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-sm sm:text-base font-bold truncate max-w-md sm:max-w-xl">
                {product.name}
              </p>
              <p className="text-xs text-white/70 font-num">
                Photo {safeSlideIdx + 1} of {gallerySources.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close photo viewer"
              className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Lightbox Image Stage */}
          <div
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={gallerySources[safeSlideIdx]}
              alt={`${product.name} — enlarged view ${safeSlideIdx + 1}`}
              referrerPolicy="no-referrer"
              onError={(ev) => {
                const target = ev.currentTarget;
                if (target.src !== FALLBACK_FOOD_IMAGE) {
                  target.src = FALLBACK_FOOD_IMAGE;
                }
              }}
              className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />

            {gallerySources.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrevImage}
                  aria-label="Previous photo"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-[#123B16] shadow-lg flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={goNextImage}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-[#123B16] shadow-lg flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {gallerySources.length > 1 && (
            <div
              className="flex items-center gap-2.5 overflow-x-auto max-w-full pb-1"
              onClick={(e) => e.stopPropagation()}
            >
              {gallerySources.map((src, idx) => (
                <button
                  key={`lb-${src}-${idx}`}
                  type="button"
                  onClick={() => setActiveSlideIdx(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    idx === safeSlideIdx
                      ? 'border-[#8CCB16] opacity-100 scale-105'
                      : 'border-white/25 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={src}
                    alt={`${product.name} preview ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
