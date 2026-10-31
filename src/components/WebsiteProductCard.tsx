import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { FALLBACK_FOOD_IMAGE, getProductGalleryUrls } from '../assets/mediaMap';
import { formatINR } from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { StarRatingBar } from './StarRatingBar';

interface WebsiteProductCardProps {
  product: Product;
}

export function WebsiteProductCard({ product }: WebsiteProductCardProps) {
  const { items, addProductToCart, updateQuantity } = useCart();
  const { showToast } = useToast();

  const defaultVariant =
    product.variants.find((v) => v.is_default === 1) || product.variants[0] || null;
  const [selectedVariantName, setSelectedVariantName] = useState<string>(
    defaultVariant ? defaultVariant.variant_name : ''
  );

  const galleryUrls = getProductGalleryUrls(product);
  const [slideIdx, setSlideIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setSlideIdx(0);
  }, [product.id]);

  const activeSlide = slideIdx < galleryUrls.length ? slideIdx : 0;

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSlideIdx((prev) => (prev - 1 + galleryUrls.length) % galleryUrls.length);
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSlideIdx((prev) => (prev + 1) % galleryUrls.length);
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSlideIdx(index);
  };

  const activeVariant = product.variants.find((v) => v.variant_name === selectedVariantName);
  const effectivePrice = activeVariant ? activeVariant.price : product.price;
  const cartKey = `prod-${product.id}-${selectedVariantName || 'std'}`;
  const existingItem = items.find((i) => i.key === cartKey);

  const hasVerifiedMacros = Boolean(product.nutrition && product.nutrition.is_verified);

  // Maximum 1 status badge per card to keep zero-pill clean layout
  const primaryLabel =
    product.display_labels.find((l) => l === 'Bestseller') ||
    product.display_labels.find((l) => l === 'New Arrival') ||
    product.display_labels.find((l) => l === 'Featured') ||
    product.display_labels.find((l) => l === 'Limited Stock') ||
    null;

  const customerReviewCount = product.review_count ?? 0;

  return (
    <article className="group bg-white rounded-2xl border border-[#EEEEEE] hover:border-[#0B8F4D]/35 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full animate-tp-fade-up">
      {/* Interactive Multi-Image Product Photography Slider */}
      <div
        className="relative aspect-[4/3] overflow-hidden bg-[#FFF8ED]"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || galleryUrls.length <= 1) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
          const delta = endX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) > 35) {
            setSlideIdx((prev) =>
              delta < 0
                ? (prev + 1) % galleryUrls.length
                : (prev - 1 + galleryUrls.length) % galleryUrls.length
            );
          }
        }}
      >
        <Link
          to={`/product/${product.slug}`}
          className="block w-full h-full overflow-hidden"
          aria-label={`View ${product.name}`}
        >
          <div
            className="flex w-full h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {galleryUrls.map((src, idx) => (
              <div key={`${src}-${idx}`} className="w-full h-full shrink-0 overflow-hidden">
                <img
                  src={src}
                  alt={`${product.name} — photo ${idx + 1}`}
                  loading={idx === 0 ? 'lazy' : 'eager'}
                  referrerPolicy="no-referrer"
                  onError={(ev) => {
                    const target = ev.currentTarget;
                    if (target.src !== FALLBACK_FOOD_IMAGE) {
                      target.src = FALLBACK_FOOD_IMAGE;
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              </div>
            ))}
          </div>

          {/* Subtle bottom contrast scrim for slider dots & counter */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 via-black/15 to-transparent"
          />
        </Link>

        {/* Click-to-Slide Prev / Next Controls */}
        {galleryUrls.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevSlide}
              aria-label={`Previous image of ${product.name}`}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#123B16] shadow-sm flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextSlide}
              aria-label={`Next image of ${product.name}`}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#123B16] shadow-sm flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Clickable Slide Dots */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
              {galleryUrls.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleDotClick(e, idx)}
                  aria-label={`Show image ${idx + 1} of ${galleryUrls.length}`}
                  className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    idx === activeSlide
                      ? 'w-4 bg-white shadow-xs'
                      : 'w-1.5 bg-white/65 hover:bg-white/90'
                  }`}
                />
              ))}
            </div>

            {/* Subtle Photo Count Indicator */}
            <span className="pointer-events-none absolute bottom-2 right-2.5 z-10 text-[10px] font-semibold font-num text-white/95 bg-black/45 px-1.5 py-0.5 rounded">
              {activeSlide + 1}/{galleryUrls.length}
            </span>
          </>
        )}

        {primaryLabel && (
          <span
            className={`pointer-events-none absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase shadow-xs ${
              primaryLabel === 'Limited Stock'
                ? 'bg-amber-600 text-white'
                : primaryLabel === 'Bestseller'
                ? 'bg-[#123B16] text-white'
                : 'bg-[#0B8F4D] text-white'
            }`}
          >
            {primaryLabel}
          </span>
        )}

        {/* Standard FSSAI Veg / Non-Veg Square Indicator */}
        <span
          className="pointer-events-none absolute top-3 right-3 z-10 bg-white/95 p-1.5 rounded-md shadow-xs"
          title={product.is_veg ? '100% Vegetarian' : 'Contains Egg / Meat'}
        >
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
        </span>
      </div>

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-1">
        {/* Clean inline category + macro metadata */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#777777]">
          <span className="truncate font-medium">
            {product.category_name}
            {hasVerifiedMacros && product.nutrition ? (
              <span className="text-[#0B8F4D] font-semibold">
                {' '}
                · {product.nutrition.calories_kcal} kcal · {product.nutrition.protein_g}g protein
              </span>
            ) : null}
          </span>
        </div>

        <Link
          to={`/product/${product.slug}`}
          className="mt-1.5 text-base font-bold text-[#202124] group-hover:text-[#0B8F4D] transition-colors line-clamp-1"
        >
          {product.name}
        </Link>

        {/* All 5 Stars (★★★★★) + Customer Review Count */}
        <div className="mt-1.5 flex items-center gap-2">
          <StarRatingBar rating={product.avg_rating ?? 0} size="sm" />
          <span className="text-[11px] font-medium text-[#666666]">
            <span className="font-num font-semibold text-[#202124]">{customerReviewCount}</span>{' '}
            {customerReviewCount === 1 ? 'customer review' : 'customer reviews'}
          </span>
        </div>

        {product.description ? (
          <p className="text-xs text-[#777777] mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        ) : (
          <p className="text-xs text-[#777777] mt-1.5">
            Freshly prepared in TrimPlate kitchen · {product.menu_division}
          </p>
        )}

        {/* Variant Selector */}
        {product.variants.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {product.variants.map((v) => {
              const active = v.variant_name === selectedVariantName;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantName(v.variant_name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[#E8F5E9] border-[#0B8F4D] text-[#123B16] font-semibold'
                      : 'bg-white border-[#EEEEEE] text-[#777777] hover:border-[#0B8F4D]/50'
                  }`}
                >
                  {v.variant_name} · <span className="font-num">{formatINR(v.price)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Price & Action Footer */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-[#F4F5F6] mt-4">
          <div>
            {effectivePrice === null || effectivePrice === undefined ? (
              <span className="text-xs font-semibold text-[#777777]">Seasonal / Price on Request</span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-[#202124] font-num">
                  {formatINR(effectivePrice)}
                </span>
              </div>
            )}
          </div>

          {!product.is_available || product.stock_qty <= 0 ? (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl">
              Out of Stock
            </span>
          ) : effectivePrice === null || effectivePrice === undefined ? (
            <Link
              to="/page/contact-us"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#0B8F4D] text-[#0B8F4D] hover:bg-[#E8F5E9] transition-colors whitespace-nowrap"
            >
              Inquire
            </Link>
          ) : existingItem ? (
            <div className="inline-flex items-center bg-[#0B8F4D] text-white rounded-xl overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => updateQuantity(cartKey, -1)}
                className="px-2.5 py-2 hover:bg-[#09773F] transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 text-xs font-bold font-num">{existingItem.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(cartKey, 1)}
                className="px-2.5 py-2 hover:bg-[#09773F] transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                addProductToCart(product, selectedVariantName || undefined, effectivePrice);
                showToast(`${product.name} added to cart`);
              }}
              className="inline-flex items-center gap-1.5 bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
