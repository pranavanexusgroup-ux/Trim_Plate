import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf,
  Flame,
  Dumbbell,
  ShieldCheck,
  Sparkles,
  Truck,
  CalendarRange,
  ArrowRight,
  Award,
  Coffee,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { Product } from '../types';
import { resolveFoodImage } from '../assets/mediaMap';
import { formatINR } from '../services/api';
import { StarRatingBar } from './StarRatingBar';
import { FadeIn } from './FadeIn';

/**
 * Infinite smooth brand marquee placed below the Hero section (never between Nav and Hero)
 * with soft left & right gradient edge fades.
 */
export function TrimPlateMarqueeStrip() {
  const { site } = useSite();
  const s = site.settings;
  const freeThreshold = Number(s.free_delivery_threshold || 599);
  const topOffer = site.activeOffers[0];

  const items = useMemo(() => {
    const base = [
      {
        icon: Leaf,
        highlight: '100% Zero Refined Oils',
        text: 'Cold-pressed & whole-grain culinary prep daily',
      },
      {
        icon: Flame,
        highlight: 'Macro-Counted Bowls',
        text: 'Verified calories, protein, carbs & fiber per portion',
      },
      {
        icon: Dumbbell,
        highlight: 'High-Protein Gym Fuel',
        text: 'Lean chicken, egg whites, fish & sprouts recovery meals',
      },
      {
        icon: CalendarRange,
        highlight: '3, 7, 15 & 30-Day Plans',
        text: 'Flexible Diet & Gym subscriptions · Pause or skip anytime',
      },
      {
        icon: Truck,
        highlight: `Free Delivery Above ₹${freeThreshold}`,
        text: 'Punctual morning tiffin & express cafe slots across Kolkata',
      },
      {
        icon: ShieldCheck,
        highlight: 'FSSAI Certified Kitchen',
        text: 'Zero artificial syrups, preservatives or trans-fats',
      },
    ];

    if (topOffer?.coupon_code) {
      base.splice(2, 0, {
        icon: Sparkles,
        highlight: `Code ${topOffer.coupon_code}`,
        text:
          topOffer.discount_type === 'percentage'
            ? `Save ${topOffer.discount_value}% on eligible healthy orders`
            : `Flat ₹${topOffer.discount_value} OFF on eligible orders`,
      });
    }

    return base;
  }, [freeThreshold, topOffer]);

  // Duplicate list twice for seamless -50% infinite loop
  const loopItems = [...items, ...items];

  return (
    <div
      className="relative bg-[#123B16] text-white border-y border-white/10 overflow-hidden py-3.5 group select-none"
      aria-label="TrimPlate Kitchen Highlights Marquee"
    >
      {/* Left & Right Soft Gradient Fades */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-[#123B16] via-[#123B16]/80 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-[#123B16] via-[#123B16]/80 to-transparent"
      />

      <div className="animate-tp-marquee flex items-center">
        {loopItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="inline-flex items-center gap-2.5 px-6 sm:px-8 shrink-0 text-xs sm:text-[13px]"
            >
              <span className="w-6 h-6 rounded-lg bg-[#0B8F4D]/35 border border-[#8CCB16]/35 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-[#8CCB16]" />
              </span>
              <span className="font-bold text-[#8CCB16] tracking-wide">{item.highlight}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/90 font-medium">{item.text}</span>
              <span className="ml-4 w-1.5 h-1.5 rounded-full bg-[#8CCB16]/60" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SignatureHighlightsSectionProps {
  products: Product[];
}

/**
 * Dedicated Culinary & Nutrition Highlights Section + Live Dish Spotlight Marquee with soft edge fades.
 */
export function SignatureHighlightsSection({ products }: SignatureHighlightsSectionProps) {
  const highlightCards = [
    {
      eyebrow: 'Calorie-Smart Weight Loss',
      title: 'Under-400 kcal Balanced Bowls',
      metric: '240 – 390 kcal',
      desc: 'Low-GI oats, sprouts chaat, brown rice bowls and light soups designed for sustainable fat loss.',
      url: '/diet-menu',
      cta: 'Explore Diet Menu',
      icon: Flame,
      accentBg: 'bg-[#FFF8ED]',
      borderHover: 'hover:border-[#0B8F4D]/45',
    },
    {
      eyebrow: 'Muscle Recovery & Strength',
      title: 'High-Protein Gym Meals',
      metric: '28g – 42g Protein',
      desc: 'Egg-white omelettes, herb-grilled chicken breast, grilled fish and whey shakes cooked fresh.',
      url: '/gym-menu',
      cta: 'View Gym Menu',
      icon: Dumbbell,
      accentBg: 'bg-[#E8F5E9]/65',
      borderHover: 'hover:border-[#0B8F4D]/45',
    },
    {
      eyebrow: 'Wholesome Cafe & Coolers',
      title: 'Zero-Syrup Artisan Cafe',
      metric: '100% Multigrain',
      desc: 'Multigrain sandwiches, whole-wheat pasta, stevia cold coffee and Darjeeling organic green tea.',
      url: '/cafe-menu',
      cta: 'Browse Cafe Menu',
      icon: Coffee,
      accentBg: 'bg-[#FFF8ED]',
      borderHover: 'hover:border-[#0B8F4D]/45',
    },
    {
      eyebrow: 'Best Value Daily Routine',
      title: 'Flexible Meal Subscriptions',
      metric: 'Save Up to 20%',
      desc: 'Choose 3, 7, 15 or 30-day plans with custom Breakfast, Lunch, Snacks & Dinner slot control.',
      url: '/subscriptions',
      cta: 'Compare Plans',
      icon: Award,
      accentBg: 'bg-[#E8F5E9]/65',
      borderHover: 'hover:border-[#0B8F4D]/45',
    },
  ];

  const spotlightDishes = useMemo(() => {
    const priced = products.filter((p) => p.price !== null && p.is_available);
    if (priced.length === 0) return [];
    const sorted = [...priced].sort(
      (a, b) => (b.avg_rating || 0) - (a.avg_rating || 0) || (b.sold_count || 0) - (a.sold_count || 0)
    );
    return sorted.slice(0, 10);
  }, [products]);

  const dishLoop = spotlightDishes.length > 0 ? [...spotlightDishes, ...spotlightDishes] : [];

  return (
    <section className="py-14 lg:py-20 bg-gradient-to-b from-[#FFFFFF] via-[#FBFDFB] to-[#FFF8ED]/55 border-b border-[#EEEEEE] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D]">
              Signature Kitchen Highlights
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#202124] mt-1 leading-tight">
              Crafted Fresh Daily,{' '}
              <span className="tp-text-highlight text-[#123B16]">Highlighted for Your Goals</span>
            </h2>
            <p className="text-sm text-[#777777] mt-2 leading-relaxed">
              Every dish and daily plan is precision-portioned in our central Kolkata kitchen using clean oils, whole grains and farm-fresh produce.
            </p>
          </div>

          <Link
            to="/green-menu"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0B8F4D] hover:text-[#123B16] transition-colors shrink-0"
          >
            Explore All Fresh Dishes <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeIn>

        {/* 4 Highlight Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {highlightCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <FadeIn key={card.title} delayMs={i * 70}>
                <Link
                  to={card.url}
                  className={`group block h-full rounded-2xl border border-[#EAECEF] ${card.borderHover} bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div
                        className={`w-11 h-11 rounded-xl ${card.accentBg} text-[#0B8F4D] flex items-center justify-center group-hover:bg-[#0B8F4D] group-hover:text-white transition-colors duration-300`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-extrabold text-[#123B16] bg-[#FFF8ED] border border-[#0B8F4D]/20 px-2.5 py-1 rounded-lg font-num">
                        {card.metric}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#0B8F4D]">
                      {card.eyebrow}
                    </p>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#202124] mt-1 group-hover:text-[#0B8F4D] transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-[#777777] mt-2 leading-relaxed">{card.desc}</p>
                  </div>

                  <span className="mt-5 pt-3 border-t border-[#F3F5F4] inline-flex items-center justify-between text-xs font-bold text-[#123B16] group-hover:text-[#0B8F4D] transition-colors">
                    <span>{card.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </div>

      {/* Live Dish Spotlight Marquee with Edge Fades */}
      {dishLoop.length > 0 && (
        <FadeIn delayMs={150} className="mt-10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
              Top-Rated Kitchen Picks · Live Customer Ratings
            </span>
          </div>

          <div className="relative tp-edge-fade-mask overflow-hidden py-1">
            <div className="animate-tp-marquee-slow flex items-stretch gap-4 px-4">
              {dishLoop.map((dish, idx) => {
                const count = dish.review_count ?? 0;
                return (
                  <Link
                    key={`${dish.id}-${idx}`}
                    to={`/product/${dish.slug}`}
                    className="w-72 sm:w-80 shrink-0 bg-white rounded-2xl border border-[#EAECEF] hover:border-[#0B8F4D]/45 p-3 flex items-center gap-3.5 shadow-xs hover:shadow-md transition-all"
                  >
                    <img
                      src={resolveFoodImage(dish.image_key, dish.custom_image_url)}
                      alt={dish.name}
                      loading="lazy"
                      className="w-16 h-16 rounded-xl object-cover shrink-0 bg-[#FFF8ED] border border-[#EEEEEE]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-[#202124] truncate">{dish.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <StarRatingBar rating={dish.avg_rating ?? 0} size="xs" />
                        <span className="text-[11px] text-[#666666] font-medium font-num">
                          ({count} {count === 1 ? 'customer' : 'customers'})
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="text-xs font-extrabold text-[#0B8F4D] font-num">
                          {dish.price !== null ? formatINR(dish.price) : 'Seasonal'}
                        </span>
                        {dish.nutrition && Boolean(dish.nutrition.is_verified) && (
                          <span className="text-[10px] font-semibold text-[#123B16] bg-[#E8F5E9] px-2 py-0.5 rounded-md font-num">
                            {dish.nutrition.calories_kcal} kcal
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </FadeIn>
      )}
    </section>
  );
}
