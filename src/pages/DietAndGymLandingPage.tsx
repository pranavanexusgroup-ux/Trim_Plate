import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowRight, Flame, CheckCircle2 } from 'lucide-react';
import { cachedGet, peekCached } from '../services/api';
import { Product } from '../types';
import { useSite } from '../context/SiteContext';
import { SEOHead } from '../components/SEOHead';
import { WebsiteProductCard } from '../components/WebsiteProductCard';
import { FadeIn } from '../components/FadeIn';
import { TrimPlateMarqueeStrip } from '../components/BrandMarqueeAndHighlights';
import { resolveFoodImage } from '../assets/mediaMap';

interface DietAndGymLandingPageProps {
  mode: 'diet' | 'gym';
}

export function DietAndGymLandingPage({ mode }: DietAndGymLandingPageProps) {
  const { site } = useSite();
  const dietKey = mode === 'diet' ? 'diet' : 'gym';
  const pageTarget = mode === 'diet' ? 'diet-menu' : 'gym-menu';
  const banner = site.banners.find((b) => b.page_target === pageTarget);

  const [products, setProducts] = useState<Product[]>(() => {
    const all = peekCached<Product[]>('/products');
    if (all) return all.filter((p) => p.diet_types.includes(dietKey));
    return peekCached<Product[]>('/products', { diet: dietKey }) || [];
  });
  const [mealTime, setMealTime] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(() => products.length === 0);

  useEffect(() => {
    const all = peekCached<Product[]>('/products');
    if (all) {
      setProducts(all.filter((p) => p.diet_types.includes(dietKey)));
      setLoading(false);
    } else {
      setLoading(true);
    }
    cachedGet<Product[]>('/products', { diet: dietKey }, 45000)
      .then((data) => setProducts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dietKey]);

  const filtered =
    mealTime === 'All'
      ? products
      : products.filter((p) => p.meal_time.toLowerCase() === mealTime.toLowerCase());

  const sampleSchedule =
    mode === 'diet'
      ? [
          { slot: 'Breakfast', item: 'Oats with Fruits & Chia Seeds', macro: '240 kcal · 9g Protein' },
          { slot: 'Lunch', item: 'Brown Rice, Grilled Chicken & Salad', macro: '410 kcal · 34g Protein' },
          { slot: 'Snacks', item: 'Sprouts Chaat with Cucumber & Lemon', macro: '130 kcal · 9g Protein' },
          { slot: 'Dinner', item: 'Clear Vegetable Soup & 2 Whole Wheat Roti', macro: '260 kcal · 9g Protein' },
        ]
      : [
          { slot: 'Breakfast', item: '6 Egg White Omelette, Banana & Peanut Butter', macro: '380 kcal · 31g Protein' },
          { slot: 'Lunch', item: 'Brown Rice, Herb Chicken Breast & Veggies', macro: '460 kcal · 42g Protein' },
          { slot: 'Snacks', item: 'Whey Protein Shake & Roasted Almonds', macro: '260 kcal · 26g Protein' },
          { slot: 'Dinner', item: 'Grilled Fish Fillet & Steamed Broccoli', macro: '350 kcal · 38g Protein' },
        ];

  return (
    <div className="bg-white">
      <SEOHead
        title={banner?.title || (mode === 'diet' ? 'Diet Menu – Weight Loss' : 'Gym Protein Menu')}
        description={banner?.description}
        ogImage={banner?.image_url}
      />

      {/* Dynamic CMS Banner */}
      <section
        className="text-white"
        style={{ backgroundColor: banner?.bg_color || (mode === 'diet' ? '#0B8F4D' : '#123B16') }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-4">
            <nav className="flex items-center gap-1.5 text-xs text-white/80">
              <Link to="/" className="hover:text-white">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-[#8CCB16]">
                {mode === 'diet' ? 'Diet Menu' : 'Gym Menu'}
              </span>
            </nav>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8CCB16]">
              {banner?.subtitle ||
                (mode === 'diet' ? 'Calorie-Smart Weight Management' : 'High-Protein Muscle Fuel')}
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
              {banner?.title ||
                (mode === 'diet'
                  ? 'Lose Weight. Stay Energized.'
                  : 'High Protein. Build Lean Muscle.')}
            </h1>
            <p className="text-sm sm:text-base text-white/90 max-w-2xl leading-relaxed">
              {banner?.description ||
                (mode === 'diet'
                  ? 'Macro-counted low-GI bowls, sprouts, oats and balanced tiffins designed for sustainable fat loss.'
                  : 'Precision protein meals crafted with egg whites, lean chicken breast, grilled fish and complex carbs.')}
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to={`/subscriptions?pref=${mode === 'diet' ? 'Diet Menu' : 'Gym Menu'}`}
                className="inline-flex items-center gap-2 bg-white text-[#123B16] hover:bg-[#FFF8ED] text-sm font-bold px-6 py-3.5 rounded-xl transition-colors"
              >
                {banner?.cta_text || 'Start Daily Meal Plan'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-3xl overflow-hidden aspect-[4/3] border border-white/20 shadow-xl">
              <img
                src={resolveFoodImage(
                  banner?.image_url || (mode === 'diet' ? 'hero_slide_green' : 'hero_slide_gym')
                )}
                alt={mode}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <TrimPlateMarqueeStrip />

      {/* 1-Day Sample Macro Blueprint */}
      <FadeIn>
      <section className="bg-[#FFF8ED] border-b border-[#EEEEEE] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B8F4D]">
                <Flame className="w-4 h-4" /> Sample 1-Day Rotation
              </span>
              <h2 className="text-2xl font-extrabold text-[#202124] mt-1">
                {mode === 'diet' ? 'Weight-Loss Daily Meal Blueprint' : 'Gym Recovery Daily Meal Blueprint'}
              </h2>
            </div>
            <Link
              to={`/subscriptions?pref=${mode === 'diet' ? 'Diet Menu' : 'Gym Menu'}`}
              className="text-sm font-bold text-[#0B8F4D] hover:text-[#123B16] inline-flex items-center gap-1"
            >
              Subscribe from ₹299 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sampleSchedule.map((s) => (
              <div key={s.slot} className="bg-white p-5 rounded-2xl border border-[#EEEEEE] shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B8F4D]">
                  {s.slot}
                </span>
                <p className="text-sm font-bold text-[#202124] mt-1.5">{s.item}</p>
                <p className="text-xs text-[#777777] mt-2 inline-flex items-center gap-1 font-num">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0B8F4D]" /> {s.macro}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </FadeIn>

      {/* À La Carte Dishes Grid */}
      <FadeIn>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#202124]">
              Order Individual {mode === 'diet' ? 'Diet' : 'High-Protein'} Dishes
            </h2>
            <p className="text-sm text-[#777777] mt-1">
              Order single bowls immediately or bundle them into a recurring subscription.
            </p>
          </div>

          <div className="inline-flex flex-wrap gap-1.5 bg-[#F8F9FA] p-1.5 rounded-xl border border-[#EEEEEE]">
            {['All', 'Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMealTime(t)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                  mealTime === t ? 'bg-[#0B8F4D] text-white' : 'text-[#777777] hover:text-[#202124]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-[#F5F6F7] animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            key={mealTime}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-tp-fade-in"
          >
            {filtered.map((product) => (
              <WebsiteProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
      </FadeIn>
    </div>
  );
}
