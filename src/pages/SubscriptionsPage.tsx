import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CalendarRange,
  CheckCircle2,
  PauseCircle,
  Truck,
  Utensils,
  X,
  ShoppingBag,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { SEOHead } from '../components/SEOHead';
import { WebsiteSubscriptionCard } from '../components/WebsiteSubscriptionCard';
import { FadeIn } from '../components/FadeIn';
import { TrimPlateMarqueeStrip } from '../components/BrandMarqueeAndHighlights';
import { SubscriptionPlan } from '../types';
import { formatINR } from '../services/api';

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

export function SubscriptionsPage() {
  const { site } = useSite();
  const { addSubscriptionToCart, setIsCartDrawerOpen } = useCart();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [menuPreference, setMenuPreference] = useState<string>(
    searchParams.get('pref') || 'Diet Menu'
  );
  const [selectedMeals, setSelectedMeals] = useState<string[]>([
    'Breakfast',
    'Lunch',
    'Snacks',
    'Dinner',
  ]);
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    () => new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [deliverySlot, setDeliverySlot] = useState('8:00 AM - 10:00 AM');

  useEffect(() => {
    const planId = searchParams.get('plan');
    if (planId && site.plans.length > 0) {
      const found = site.plans.find((p) => String(p.id) === planId);
      if (found) setSelectedPlan(found);
    }
  }, [searchParams, site.plans]);

  const toggleMealSlot = (slot: string) => {
    setSelectedMeals((prev) => {
      if (prev.includes(slot)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== slot);
      }
      return [...prev, slot];
    });
  };

  const handleConfirmPlan = (goToCheckout: boolean) => {
    if (!selectedPlan) return;
    addSubscriptionToCart(selectedPlan, {
      menuPreference,
      selectedMeals: selectedMeals.join(', '),
      isVegOnly,
      startDate,
      deliverySlot,
    });
    showToast(`${selectedPlan.name} (${menuPreference}) added to your bag!`);
    setSelectedPlan(null);
    if (goToCheckout) {
      navigate('/checkout');
    } else {
      setIsCartDrawerOpen(true);
    }
  };

  return (
    <div className="bg-white">
      <SEOHead
        title="Healthy Meal Subscription Plans (3, 7, 15 & 30 Days)"
        description="Subscribe to TrimPlate daily Diet Menu, Gym High-Protein Menu or Sugar Control meal plans starting at ₹299. Pause or skip delivery days anytime."
      />

      {/* Hero Header */}
      <section className="bg-[#123B16] text-white py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#8CCB16]">
            Flexible Daily Nutrition
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold mt-2 leading-tight">
            Choose Your Healthy Meal Subscription
          </h1>
          <p className="text-sm sm:text-base text-white/85 mt-3 leading-relaxed">
            Chef-prepared Diet, Gym Protein, Sugar-Control and Wholesome Tiffin plans delivered fresh
            every morning. Pause or skip any date directly from your account.
          </p>
        </div>
      </section>

      <TrimPlateMarqueeStrip />

      {/* Plans Grid */}
      <FadeIn>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {site.plans.map((plan) => (
            <WebsiteSubscriptionCard
              key={plan.id}
              plan={plan}
              onSelect={(pl) => setSelectedPlan(pl)}
            />
          ))}
        </div>

        {/* Subscription Assurances */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-[#FFF8ED] rounded-3xl p-8 border border-[#EEEEEE]">
          {[
            {
              icon: Truck,
              title: 'Daily Fresh Delivery',
              desc: 'Insulated morning or lunch-hour slot delivery straight from our kitchen.',
            },
            {
              icon: Utensils,
              title: 'Custom Meal Preferences',
              desc: 'Pick Diet Menu, Gym High-Protein, Sugar Control or Homestyle Tiffin.',
            },
            {
              icon: PauseCircle,
              title: 'Pause or Skip Days',
              desc: 'Travelling? Pause your subscription or skip single dates with one click.',
            },
            {
              icon: CheckCircle2,
              title: 'Transparent Billing',
              desc: 'Pay via UPI, Cash on Delivery, or Online Gateway with instant invoices.',
            },
          ].map((f, idx) => (
            <div key={idx} className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white text-[#0B8F4D] border border-[#EEEEEE] flex items-center justify-center">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#202124]">{f.title}</h3>
              <p className="text-xs text-[#777777] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      </FadeIn>

      {/* Interactive Plan Customization Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-tp-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#EEEEEE] max-h-[92vh] overflow-y-auto animate-tp-scale-fade">
            <div className="flex items-start justify-between gap-4 border-b border-[#EEEEEE] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B8F4D]">
                  {selectedPlan.subtitle}
                </span>
                <h2 className="text-2xl font-extrabold text-[#202124]">
                  Configure {selectedPlan.name} ({formatINR(selectedPlan.price)})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="p-2 rounded-xl hover:bg-[#F5F6F7] text-[#777777]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 mt-5">
              {/* Menu Track */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#202124] mb-2">
                  1. Select Nutrition Track
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    'Diet Menu',
                    'Gym Menu',
                    'Sugar Control',
                    'Balanced Tiffin',
                    ...(site.customMenus || [])
                      .filter((m) => Boolean(m.is_active))
                      .map((m) => m.name),
                  ].map((track) => (
                    <button
                      key={track}
                      type="button"
                      onClick={() => setMenuPreference(track)}
                      className={`px-4 py-3 rounded-xl border text-left text-xs font-bold transition-colors ${
                        menuPreference === track
                          ? 'bg-[#E8F5E9] border-[#0B8F4D] text-[#123B16]'
                          : 'bg-white border-[#EEEEEE] text-[#202124] hover:border-[#0B8F4D]'
                      }`}
                    >
                      {track}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#202124] mb-2">
                  2. Dietary Preference
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsVegOnly(false)}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold ${
                      !isVegOnly
                        ? 'bg-[#E8F5E9] border-[#0B8F4D] text-[#123B16]'
                        : 'border-[#EEEEEE] text-[#777777]'
                    }`}
                  >
                    Veg + Lean Chicken / Egg / Fish
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVegOnly(true)}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold ${
                      isVegOnly
                        ? 'bg-[#E8F5E9] border-[#0B8F4D] text-[#123B16]'
                        : 'border-[#EEEEEE] text-[#777777]'
                    }`}
                  >
                    100% Pure Vegetarian
                  </button>
                </div>
              </div>

              {/* Meal Slots */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#202124] mb-2">
                  3. Meals to Include Daily
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MEAL_SLOTS.map((slot) => {
                    const active = selectedMeals.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleMealSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold ${
                          active
                            ? 'bg-[#0B8F4D] border-[#0B8F4D] text-white'
                            : 'bg-white border-[#EEEEEE] text-[#777777]'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Date & Delivery Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#202124] mb-1.5">
                    4. Start Date
                  </label>
                  <div className="relative">
                    <CalendarRange className="w-4 h-4 text-[#0B8F4D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#EEEEEE] text-sm font-num outline-none focus:border-[#0B8F4D]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#202124] mb-1.5">
                    5. Preferred Delivery Slot
                  </label>
                  <select
                    value={deliverySlot}
                    onChange={(e) => setDeliverySlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D] bg-white"
                  >
                    <option value="7:30 AM - 9:30 AM">Morning (7:30 AM – 9:30 AM)</option>
                    <option value="8:00 AM - 10:00 AM">Standard (8:00 AM – 10:00 AM)</option>
                    <option value="12:00 PM - 1:30 PM">Lunch Window (12:00 PM – 1:30 PM)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EEEEEE] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleConfirmPlan(false)}
                  className="py-3.5 px-4 rounded-xl border border-[#0B8F4D] text-[#0B8F4D] text-sm font-bold hover:bg-[#E8F5E9] inline-flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> Add to Bag
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmPlan(true)}
                  className="py-3.5 px-4 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold"
                >
                  Proceed to Checkout · {formatINR(selectedPlan.price)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
