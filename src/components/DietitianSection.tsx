import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Star,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Dietitian, HomepageSection } from '../types';
import { resolveFoodImage } from '../assets/mediaMap';
import { api, formatINR } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface DietitianSectionProps {
  section?: HomepageSection;
  dietitians: Dietitian[];
}

const HEALTH_GOALS = [
  'Weight & Fat Loss',
  'High-Protein Muscle Gain',
  'Diabetes / Low-GI Sugar Control',
  'PCOS, Thyroid & Hormonal Balance',
  'Gut Health & Clean Eating Reset',
  'Custom Daily Meal Plan Guidance',
];

const TIME_SLOTS = [
  '10:00 AM – 10:30 AM',
  '11:30 AM – 12:00 PM',
  '1:00 PM – 1:30 PM',
  '4:30 PM – 5:00 PM',
  '6:00 PM – 6:30 PM',
  '7:30 PM – 8:00 PM',
];

export function DietitianSection({ section, dietitians }: DietitianSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDietitianId, setSelectedDietitianId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [healthGoal, setHealthGoal] = useState(HEALTH_GOALS[0]);
  const [dietaryPreference, setDietaryPreference] = useState('Both');
  const [consultationMode, setConsultationMode] = useState<'Video Call' | 'Phone Call' | 'In-Studio'>('Video Call');
  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [preferredSlot, setPreferredSlot] = useState(TIME_SLOTS[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingCode: string;
    dietitianName: string;
    preferredDate: string;
    preferredSlot: string;
    consultationMode: string;
    feeAmount: number;
    hasActiveSubscription: boolean;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name || '');
      setCustomerPhone((prev) => prev || user.mobile || '');
      setCustomerEmail((prev) => prev || user.email || '');
      if (user.customerProfile?.dietary_preference) {
        setDietaryPreference(user.customerProfile.dietary_preference);
      }
    }
  }, [user]);

  const activeDietitians = dietitians.filter((d) => Boolean(d.is_active));
  if (activeDietitians.length === 0) return null;

  const limit = section?.product_limit ? Math.max(1, Number(section.product_limit)) : 6;
  const displayedDietitians = activeDietitians.slice(0, Math.max(3, limit));

  const openBookingModal = (dietitian?: Dietitian) => {
    setConfirmedBooking(null);
    setSelectedDietitianId(dietitian ? dietitian.id : activeDietitians[0]?.id || '');
    setBookingOpen(true);
  };

  const selectedDietitianObj =
    activeDietitians.find((d) => d.id === Number(selectedDietitianId)) || activeDietitians[0];

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || customerPhone.trim().length < 8) {
      showToast('Please enter your name and valid mobile number.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/dietitian-consultations', {
        dietitian_id: selectedDietitianObj ? selectedDietitianObj.id : null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        health_goal: healthGoal,
        dietary_preference: dietaryPreference,
        consultation_mode: consultationMode,
        preferred_date: preferredDate,
        preferred_slot: preferredSlot,
        notes: notes.trim(),
      });
      setConfirmedBooking({
        bookingCode: data.bookingCode,
        dietitianName: data.dietitianName,
        preferredDate: data.preferredDate,
        preferredSlot: data.preferredSlot,
        consultationMode: data.consultationMode,
        feeAmount: data.feeAmount,
        hasActiveSubscription: data.hasActiveSubscription,
      });
      setNotes('');
      showToast(`Dietitian consultation #${data.bookingCode} booked!`);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not submit consultation request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const title = section?.title || 'Personal 1-on-1 Certified Dietitian Guidance';
  const subtitle = section?.subtitle || 'CLINICAL & SPORTS NUTRITION DESK';
  const description =
    section?.description ||
    'Every body has unique metabolic needs. Consult 1-on-1 with our in-house clinical and sports dietitians to map your exact daily calorie, protein, and micronutrient blueprint — complimentary with 15 & 30-Day Meal Plans or available as an individual session.';

  const highlights: string[] =
    Array.isArray(section?.config?.highlights) && section!.config.highlights.length > 0
      ? section!.config.highlights
      : [
          'Custom Calorie & Macro Blueprint',
          'PCOS, Sugar Control & Gut Protocols',
          'Complimentary with 15 & 30-Day Plans',
        ];

  return (
    <section
      id="dietitian-desk"
      className="py-16 lg:py-24 border-b border-[#EEEEEE]"
      style={{ backgroundColor: section?.bg_color || '#FFFFFF' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Editorial Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B8F4D] inline-flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#0B8F4D]" />
              <span>{subtitle}</span>
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#202124] leading-tight">
              {title}
            </h2>
            <p className="text-sm sm:text-base text-[#666666] leading-relaxed">
              {description}
            </p>
            <p className="text-xs font-semibold text-[#123B16] pt-1">
              {highlights.join('  ·  ')}
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => openBookingModal()}
              className="inline-flex items-center gap-2 bg-[#0B8F4D] hover:bg-[#123B16] text-white text-sm font-bold px-6 py-3.5 rounded-xl shadow-xs transition-colors"
            >
              {section?.cta_text || 'Book 1-on-1 Consultation'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Column Certified Dietitian Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {displayedDietitians.map((doc) => (
            <div
              key={doc.id}
              className="group bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* 4:3 Studio Portrait */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[#F4F7F5]">
                  <img
                    src={resolveFoodImage(doc.image_url, doc.image_url)}
                    alt={doc.name}
                    className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-[#EEEEEE] flex items-center gap-1.5 text-xs font-bold text-[#202124] font-num">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{Number(doc.rating || 4.9).toFixed(1)}</span>
                    <span className="text-[#999999]">·</span>
                    <span className="text-[#666666] font-medium">
                      {doc.consultations_count}+ Consultations
                    </span>
                  </div>
                </div>

                {/* Clean Unboxed Metadata */}
                <div className="p-6 space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B8F4D]">
                    {doc.specialization}
                  </p>
                  <h3 className="text-xl font-extrabold text-[#202124]">{doc.name}</h3>
                  <p className="text-xs font-semibold text-[#555555]">
                    {doc.credentials}
                    {doc.experience_years ? ` · ${doc.experience_years}+ Yrs Exp` : ''}
                    {doc.languages ? ` · ${doc.languages}` : ''}
                  </p>
                  {doc.bio && (
                    <p className="text-xs text-[#666666] leading-relaxed pt-0.5">{doc.bio}</p>
                  )}

                  <div className="pt-2 text-xs text-[#666666] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0B8F4D] shrink-0" />
                    <span>
                      {doc.available_days} · {doc.available_slots}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aligned Pricing & Consultation Action Footer */}
              <div className="px-6 py-4 bg-[#FAFBF9] border-t border-[#EEEEEE] flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-[#123B16] font-num">
                    {doc.consultation_fee > 0 ? formatINR(doc.consultation_fee) : 'Complimentary'}
                    <span className="text-xs font-normal text-[#777777]"> / session</span>
                  </p>
                  {Boolean(doc.free_with_subscription) && (
                    <p className="text-[11px] font-semibold text-[#0B8F4D]">
                      Free with 15 &amp; 30-Day Plans
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openBookingModal(doc)}
                  className="px-4 py-2.5 rounded-xl bg-[#0B8F4D] hover:bg-[#123B16] text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  Book Consultation
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Informational Strip Linking Meal Plans + Dietitian Desk */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFF8ED] border border-[#EDE6D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#123B16]">
                Included Complimentary with 15-Day Fitness &amp; 30-Day Transformation Subscriptions
              </p>
              <p className="text-xs text-[#666666] mt-0.5">
                Our dietitians coordinate directly with TrimPlate chefs so your daily meals match your exact prescribed macros.
              </p>
            </div>
          </div>
          <Link
            to="/subscriptions"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#123B16] hover:text-[#0B8F4D] whitespace-nowrap"
          >
            Explore Meal Subscriptions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Interactive 1-on-1 Dietitian Consultation Booking Modal */}
      {bookingOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setBookingOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#EEEEEE] my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#123B16] text-white px-6 py-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8CCB16]">
                  TrimPlate Clinical Nutrition Desk
                </p>
                <h3 className="text-lg sm:text-xl font-extrabold mt-0.5">
                  {confirmedBooking
                    ? 'Consultation Request Confirmed'
                    : 'Schedule 1-on-1 Dietitian Consultation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBookingOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {confirmedBooking ? (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#E8F5E9]/65 border border-[#0B8F4D]/25">
                  <CheckCircle2 className="w-7 h-7 text-[#0B8F4D] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-base font-extrabold text-[#123B16]">
                      Booking Reference #{confirmedBooking.bookingCode}
                    </p>
                    <p className="text-xs text-[#202124] leading-relaxed">
                      Thank you! Your 1-on-1 consultation request with{' '}
                      <strong>{confirmedBooking.dietitianName}</strong> has been received by our Nutrition Desk.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#FAFAFA] rounded-2xl p-5 border border-[#EEEEEE]">
                  <div>
                    <p className="text-[#777777]">Assigned Dietitian</p>
                    <p className="font-bold text-[#202124] mt-0.5">{confirmedBooking.dietitianName}</p>
                  </div>
                  <div>
                    <p className="text-[#777777]">Consultation Mode</p>
                    <p className="font-bold text-[#202124] mt-0.5">{confirmedBooking.consultationMode}</p>
                  </div>
                  <div>
                    <p className="text-[#777777]">Preferred Date &amp; Time</p>
                    <p className="font-bold text-[#202124] font-num mt-0.5">
                      {confirmedBooking.preferredDate} · {confirmedBooking.preferredSlot}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#777777]">Session Fee</p>
                    <p className="font-bold text-[#0B8F4D] font-num mt-0.5">
                      {confirmedBooking.feeAmount === 0
                        ? '₹0 (Complimentary Active Subscriber)'
                        : `${formatINR(confirmedBooking.feeAmount)} (Payable on confirmation)`}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setBookingOpen(false)}
                    className="px-6 py-3 rounded-xl bg-[#0B8F4D] hover:bg-[#123B16] text-white text-xs font-bold transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitBooking} className="p-6 sm:p-7 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Dietitian Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1.5">
                    Select Certified Dietitian
                  </label>
                  <select
                    value={selectedDietitianId}
                    onChange={(e) =>
                      setSelectedDietitianId(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] bg-white text-xs font-semibold text-[#202124] outline-none focus:border-[#0B8F4D]"
                  >
                    {activeDietitians.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.credentials}) — {d.specialization} · {formatINR(d.consultation_fee)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs outline-none focus:border-[#0B8F4D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Mobile / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs font-num outline-none focus:border-[#0B8F4D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs outline-none focus:border-[#0B8F4D]"
                    />
                  </div>
                </div>

                {/* Health Goal & Dietary Preference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Primary Health / Fitness Goal
                    </label>
                    <select
                      value={healthGoal}
                      onChange={(e) => setHealthGoal(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] bg-white text-xs outline-none focus:border-[#0B8F4D]"
                    >
                      {HEALTH_GOALS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Dietary Preference
                    </label>
                    <select
                      value={dietaryPreference}
                      onChange={(e) => setDietaryPreference(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] bg-white text-xs outline-none focus:border-[#0B8F4D]"
                    >
                      <option value="Veg">100% Vegetarian</option>
                      <option value="Non-Veg">Non-Vegetarian (Chicken / Fish / Egg)</option>
                      <option value="Eggetarian">Eggetarian</option>
                      <option value="Both">Flexible (Veg &amp; Non-Veg)</option>
                      <option value="Vegan">Plant-Based / Dairy-Free</option>
                    </select>
                  </div>
                </div>

                {/* Consultation Mode */}
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1.5">
                    Consultation Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { mode: 'Video Call' as const, icon: Video, label: 'Video Call' },
                      { mode: 'Phone Call' as const, icon: Phone, label: 'Phone Call' },
                      { mode: 'In-Studio' as const, icon: MapPin, label: 'Park St. Studio' },
                    ].map((opt) => {
                      const active = consultationMode === opt.mode;
                      return (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => setConsultationMode(opt.mode)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            active
                              ? 'border-[#0B8F4D] bg-[#E8F5E9] text-[#123B16]'
                              : 'border-[#EEEEEE] bg-white text-[#666666] hover:border-[#CCCCCC]'
                          }`}
                        >
                          <opt.icon className="w-3.5 h-3.5 text-[#0B8F4D]" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date & Time Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      <Calendar className="w-3.5 h-3.5 inline mr-1 text-[#0B8F4D]" />
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs font-num outline-none focus:border-[#0B8F4D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      <Clock className="w-3.5 h-3.5 inline mr-1 text-[#0B8F4D]" />
                      Preferred Time Slot *
                    </label>
                    <select
                      value={preferredSlot}
                      onChange={(e) => setPreferredSlot(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] bg-white text-xs font-num outline-none focus:border-[#0B8F4D]"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Notes */}
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Medical Conditions, Allergies or Target Weight Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Share any blood work notes, food allergies, workout routine, or target calories..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs outline-none focus:border-[#0B8F4D]"
                  />
                </div>

                {/* Fee Summary & Submit */}
                <div className="pt-3 border-t border-[#EEEEEE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs">
                    <span className="text-[#777777]">Consultation Fee: </span>
                    <strong className="text-sm text-[#123B16] font-num">
                      {selectedDietitianObj ? formatINR(selectedDietitianObj.consultation_fee) : '₹299'}
                    </strong>
                    <p className="text-[11px] text-[#0B8F4D] font-semibold mt-0.5">
                      Active TrimPlate subscribers automatically qualify for ₹0 complimentary sessions.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setBookingOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-[#F5F6F7] text-xs font-bold text-[#202124]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-xl bg-[#0B8F4D] hover:bg-[#123B16] text-white text-xs font-bold transition-colors disabled:opacity-60"
                    >
                      {submitting ? 'Booking...' : 'Confirm Consultation'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
