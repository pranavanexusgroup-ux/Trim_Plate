import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  CheckCircle2,
  MapPin,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Truck,
  Zap,
  Sparkles,
  Leaf,
  Flame,
  ShieldAlert,
  AlertCircle,
  Loader2,
  CheckCheck,
  Box,
  UtensilsCrossed,
  BellRing,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { SEOHead } from '../components/SEOHead';
import { resolveFoodImage } from '../assets/mediaMap';
import { api, formatINR, buildWhatsAppLink, extractApiError } from '../services/api';

export function CartAndCheckoutPage() {
  const location = useLocation();
  const isCheckoutRoute = location.pathname === '/checkout';
  const navigate = useNavigate();

  const {
    items,
    appliedCoupon,
    subtotal,
    deliveryCharge,
    freeDeliveryThreshold,
    taxRatePercent,
    gstAmount,
    totalAmount,
    updateQuantity,
    removeItem,
    setCoupon,
    clearCart,
  } = useCart();

  const { user, addAddress } = useAuth();
  const { site } = useSite();
  const { showToast } = useToast();

  const [couponInput, setCouponInput] = useState(
    () => appliedCoupon?.code || localStorage.getItem('tp_pending_promo') || ''
  );
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Checkout Form State
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.mobile || '');
  const [sameWhatsappAsPhone, setSameWhatsappAsPhone] = useState(true);
  const [customerWhatsapp, setCustomerWhatsapp] = useState(user?.mobile || '');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    user?.addresses?.[0]?.id || null
  );
  const [customAddressText, setCustomAddressText] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: 'Home',
    line1: '',
    area: '',
    city: 'Kolkata',
    pincode: '700016',
  });

  // Service Selection States with animated visual feedback
  const [deliveryService, setDeliveryService] = useState<'standard' | 'priority' | 'scheduled'>(
    'standard'
  );
  const [scheduledSlot, setScheduledSlot] = useState<string>('Lunch (12:30 PM - 1:30 PM)');
  const [ecoCutlery, setEcoCutlery] = useState<boolean>(false);
  const [thermalSleeve, setThermalSleeve] = useState<boolean>(true);
  const [contactlessDrop, setContactlessDrop] = useState<boolean>(false);

  const [deliveryDate, setDeliveryDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash on Delivery' | 'UPI' | 'Online Payment Gateway'
  >('Cash on Delivery');
  const [upiReference, setUpiReference] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderProgressStep, setOrderProgressStep] = useState<number>(0);
  const [copiedWaReceipt, setCopiedWaReceipt] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderCode: string;
    paymentStatus: string;
    paymentMethod: string;
    upiReference?: string;
    total: number;
    deliveryService: string;
    scheduledSlot?: string;
    ecoCutlery: boolean;
    thermalSleeve: boolean;
    contactlessDrop: boolean;
    addressSnapshot: string;
    customerWhatsapp: string;
    storeWhatsappNumber: string;
    whatsappMessage: string;
    whatsappOrderUrl: string;
  } | null>(null);

  // Priority delivery fee computation
  const priorityServiceFee = deliveryService === 'priority' ? 30 : 0;
  const finalPayableTotal = totalAmount + priorityServiceFee;

  React.useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name || '');
      setCustomerPhone((prev) => prev || user.mobile || '');
      setCustomerWhatsapp((prev) => prev || user.mobile || '');
      if (!selectedAddressId && user.addresses?.[0]?.id) {
        setSelectedAddressId(user.addresses[0].id);
      }
    }
  }, [user, selectedAddressId]);

  const storeOrderWhatsApp =
    site.settings.whatsapp_order_number || site.settings.phone || '+91 98300 45120';

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    try {
      const { data } = await api.post('/coupons/validate', {
        code: couponInput.trim(),
        subtotal,
      });
      setCoupon({ code: data.coupon.code, discount: data.discount });
      localStorage.removeItem('tp_pending_promo');
      showToast(`Coupon ${data.coupon.code} applied! Saved ${formatINR(data.discount)}`);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Invalid coupon code', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newAddr.line1.trim() || !newAddr.area.trim()) {
      showToast('Please enter street address and area', 'error');
      return;
    }
    try {
      await addAddress({
        label: newAddr.label,
        recipient_name: customerName || user?.name || 'Customer',
        mobile: customerPhone || user?.mobile || '',
        line1: newAddr.line1,
        area: newAddr.area,
        city: newAddr.city,
        pincode: newAddr.pincode,
        is_default: 1,
      });
      setShowNewAddressForm(false);
      showToast('Delivery address saved');
    } catch {
      showToast('Failed to save address', 'error');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to complete your order', 'info');
      navigate('/login?redirect=/checkout');
      return;
    }
    if (items.length === 0) return;

    const chosenAddr = user.addresses?.find((a) => a.id === selectedAddressId);
    const addressSnapshot = chosenAddr
      ? `${chosenAddr.line1}, ${chosenAddr.area}, ${chosenAddr.city} - ${chosenAddr.pincode}`
      : customAddressText.trim();

    if (!addressSnapshot) {
      showToast('Please select or enter a delivery address', 'error');
      return;
    }

    if (paymentMethod === 'UPI' && upiReference.trim().length < 8) {
      showToast(
        'Please enter your 12-digit UPI UTR / Transaction Reference ID after paying.',
        'error'
      );
      return;
    }

    const resolvedPhone = (customerPhone || user.mobile || '').trim();
    const resolvedWhatsapp = (
      sameWhatsappAsPhone ? resolvedPhone : customerWhatsapp || resolvedPhone
    ).trim();

    if (!resolvedWhatsapp || resolvedWhatsapp.replace(/\D/g, '').length < 10) {
      showToast('Please enter a valid 10-digit WhatsApp / Mobile number for order updates.', 'error');
      return;
    }

    setPlacingOrder(true);
    setOrderProgressStep(1); // Step 1: Validating services & slots

    try {
      await new Promise((r) => setTimeout(r, 450));
      setOrderProgressStep(2); // Step 2: Allocating kitchen station & insulated bag

      const serviceSummaryNote = [
        `Service: ${
          deliveryService === 'priority'
            ? 'Priority Hot Express (+₹30)'
            : deliveryService === 'scheduled'
            ? `Scheduled Window (${scheduledSlot})`
            : 'Standard Fresh Dispatch'
        }`,
        `Eco-Cutlery: ${ecoCutlery ? 'Yes' : 'No'}`,
        `Thermal Bag: ${thermalSleeve ? 'Insulated Thermal Sleeve' : 'Standard'}`,
        `Contactless: ${contactlessDrop ? 'Yes (Leave at door & ring)' : 'Hand Delivery'}`,
        deliveryNotes.trim() ? `Note: ${deliveryNotes.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const orderTotalSnapshot = finalPayableTotal;

      await new Promise((r) => setTimeout(r, 400));
      setOrderProgressStep(3); // Step 3: Generating order receipt & WhatsApp ticket

      const { data } = await api.post('/orders', {
        items,
        customer_name: customerName || user.name,
        customer_phone: resolvedPhone,
        customer_whatsapp: resolvedWhatsapp,
        address_id: chosenAddr ? chosenAddr.id : null,
        delivery_address_text: addressSnapshot,
        delivery_date: deliveryDate,
        subtotal,
        delivery_charge: deliveryCharge + priorityServiceFee,
        gst_amount: gstAmount,
        coupon_code: appliedCoupon?.code || '',
        discount_amount: appliedCoupon?.discount || 0,
        total_amount: orderTotalSnapshot,
        payment_method: paymentMethod,
        payment_reference: paymentMethod === 'UPI' ? upiReference.trim() : '',
        delivery_notes: serviceSummaryNote,
      });

      const fallbackMsg = `TrimPlate Order #${data.orderCode} | Total: ₹${Math.round(
        orderTotalSnapshot
      )} | Service: ${deliveryService.toUpperCase()} | Payment: ${paymentMethod} (${
        data.paymentStatus
      }) | Customer: ${customerName || user.name} | WhatsApp: ${resolvedWhatsapp}`;
      const waUrl =
        data.whatsappOrderUrl || buildWhatsAppLink(storeOrderWhatsApp, fallbackMsg);

      clearCart();
      setConfirmedOrder({
        orderCode: data.orderCode,
        paymentStatus: data.paymentStatus,
        paymentMethod: paymentMethod,
        upiReference: paymentMethod === 'UPI' ? upiReference.trim() : undefined,
        total: orderTotalSnapshot,
        deliveryService:
          deliveryService === 'priority'
            ? 'Priority Hot Express (30-40 mins)'
            : deliveryService === 'scheduled'
            ? `Pre-Scheduled Window (${scheduledSlot})`
            : 'Standard Fresh Dispatch (45-60 mins)',
        scheduledSlot: deliveryService === 'scheduled' ? scheduledSlot : undefined,
        ecoCutlery,
        thermalSleeve,
        contactlessDrop,
        addressSnapshot,
        customerWhatsapp: data.customerWhatsapp || resolvedWhatsapp,
        storeWhatsappNumber: data.storeWhatsappNumber || storeOrderWhatsApp,
        whatsappMessage: data.whatsappMessage || fallbackMsg,
        whatsappOrderUrl: waUrl,
      });
      showToast(`Order #${data.orderCode} placed successfully!`);
    } catch (err: any) {
      showToast(extractApiError(err, 'Could not place order'), 'error');
    } finally {
      setPlacingOrder(false);
      setOrderProgressStep(0);
    }
  };

  if (confirmedOrder) {
    const isPaymentPending =
      confirmedOrder.paymentStatus?.toLowerCase().includes('pending') ||
      confirmedOrder.paymentMethod === 'Cash on Delivery' ||
      confirmedOrder.paymentMethod === 'UPI';

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <SEOHead title="Order Confirmed — TrimPlate" />

        <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 sm:p-10 shadow-lg space-y-6 animate-tp-scale-fade">
          {/* Top Celebration Icon & Heading */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center mx-auto shadow-inner animate-tp-pulse-glow">
                <CheckCircle2 className="w-11 h-11 text-[#0B8F4D]" />
              </div>
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0B8F4D] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                ✓
              </span>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] text-[#0B8F4D] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Order Placed &amp; Kitchen Allocated
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202124]">
                Thank You! Order #{confirmedOrder.orderCode}
              </h1>
              <p className="text-sm text-[#666666] max-w-lg mx-auto">
                Our chef brigade has initiated your freshly prepared meal assembly.
              </p>
            </div>
          </div>

          {/* DYNAMIC ANIMATED PAYMENT STATUS BANNER */}
          {confirmedOrder.paymentMethod === 'Cash on Delivery' ? (
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-5 shadow-xs animate-tp-pulse-amber">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping shrink-0" />
                      Payment Status: Pending on Doorstep
                    </span>
                    <span className="text-base font-extrabold text-amber-900 font-num">
                      Amount Due: {formatINR(confirmedOrder.total)}
                    </span>
                  </div>
                  <p className="text-xs text-amber-950/80 leading-relaxed">
                    Please keep <strong className="font-num">{formatINR(confirmedOrder.total)}</strong> in
                    cash ready, or ask the TrimPlate delivery partner for their instant UPI QR scan code
                    at your doorstep upon arrival.
                  </p>
                </div>
              </div>
            </div>
          ) : confirmedOrder.paymentMethod === 'UPI' ? (
            <div className="rounded-2xl border-2 border-teal-500/60 bg-[#F0FAF7] p-5 shadow-xs animate-tp-pulse-glow">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping shrink-0" />
                      Payment Status: UPI Verification Pending
                    </span>
                    <span className="text-base font-extrabold text-teal-950 font-num">
                      Total: {formatINR(confirmedOrder.total)}
                    </span>
                  </div>
                  <p className="text-xs text-teal-900/85 leading-relaxed">
                    Reference UTR ID:{' '}
                    <strong className="font-num font-mono bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-950">
                      {confirmedOrder.upiReference || 'Logged'}
                    </strong>
                    . Our accounts desk automatically reconciles your UTR in 5–10 minutes. Your food prep
                    is already queued without delay!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-[#0B8F4D] bg-[#E8F5E9]/60 p-5 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#0B8F4D] text-white flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#123B16] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#0B8F4D]" />
                      Payment Status: Verified &amp; Paid
                    </span>
                    <span className="text-base font-extrabold text-[#123B16] font-num">
                      {formatINR(confirmedOrder.total)} Paid
                    </span>
                  </div>
                  <p className="text-xs text-[#202124]/80 leading-relaxed">
                    Online transaction completed successfully. Digital payment voucher registered to
                    your customer account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ANIMATED SELECTED SERVICES & KITCHEN BREAKDOWN */}
          <div className="rounded-2xl bg-[#FAFCFA] border border-[#DCE8E0] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6EFEA] pb-3">
              <h3 className="text-sm font-extrabold text-[#123B16] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0B8F4D]" /> Selected Services Breakdown
              </h3>
              <span className="text-[11px] font-bold text-[#0B8F4D] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
                Active Preferences
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Delivery Service Selection */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E2EBE5] space-y-1 shadow-2xs">
                <span className="text-[10px] font-bold text-[#777777] uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#0B8F4D]" /> Delivery Service Selected
                </span>
                <p className="text-xs font-bold text-[#202124] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0B8F4D]" />
                  {confirmedOrder.deliveryService}
                </p>
                {confirmedOrder.scheduledSlot && (
                  <p className="text-[11px] text-[#0B8F4D] font-medium">
                    Slot: {confirmedOrder.scheduledSlot}
                  </p>
                )}
              </div>

              {/* Payment Service Mode */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E2EBE5] space-y-1 shadow-2xs">
                <span className="text-[10px] font-bold text-[#777777] uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#0B8F4D]" /> Payment Method
                </span>
                <p className="text-xs font-bold text-[#202124] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0B8F4D]" />
                  {confirmedOrder.paymentMethod}
                </p>
                <p className="text-[11px] text-[#777777] font-num">
                  Status: <strong className="text-[#123B16]">{confirmedOrder.paymentStatus}</strong>
                </p>
              </div>

              {/* Kitchen & Packaging Add-ons */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E2EBE5] space-y-2 sm:col-span-2 shadow-2xs">
                <span className="text-[10px] font-bold text-[#777777] uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-[#0B8F4D]" /> Kitchen &amp; Packaging Options
                </span>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      confirmedOrder.thermalSleeve
                        ? 'bg-[#E8F5E9] text-[#123B16] border border-[#0B8F4D]/30'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Flame className="w-3 h-3 text-[#0B8F4D]" /> Insulated Thermal Sleeve: Active
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      confirmedOrder.ecoCutlery
                        ? 'bg-[#E8F5E9] text-[#123B16] border border-[#0B8F4D]/30'
                        : 'bg-[#F5F5F5] text-[#777777]'
                    }`}
                  >
                    <UtensilsCrossed className="w-3 h-3 text-[#0B8F4D]" /> Eco Wooden Cutlery:{' '}
                    {confirmedOrder.ecoCutlery ? 'Included' : 'Not Requested (Save Paper)'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      confirmedOrder.contactlessDrop
                        ? 'bg-[#E8F5E9] text-[#123B16] border border-[#0B8F4D]/30'
                        : 'bg-[#F5F5F5] text-[#777777]'
                    }`}
                  >
                    <BellRing className="w-3 h-3 text-[#0B8F4D]" /> Contactless Drop-off:{' '}
                    {confirmedOrder.contactlessDrop ? 'Active' : 'Hand-to-Hand Delivery'}
                  </span>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E2EBE5] space-y-1 sm:col-span-2 shadow-2xs">
                <span className="text-[10px] font-bold text-[#777777] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0B8F4D]" /> Dispatch Address
                </span>
                <p className="text-xs font-semibold text-[#202124] leading-relaxed">
                  {confirmedOrder.addressSnapshot}
                </p>
              </div>
            </div>
          </div>

          {/* 4-STAGE ANIMATED LIVE PROGRESS TRACKER */}
          <div className="pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#777777] mb-3 text-center sm:text-left">
              Live Kitchen &amp; Dispatch Timeline
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-semibold">
              <div className="p-3 rounded-xl border border-[#0B8F4D] bg-[#E8F5E9] text-[#123B16] flex items-center gap-2 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B8F4D] animate-ping shrink-0" />
                <span className="font-bold">1. Confirmed</span>
              </div>
              <div className="p-3 rounded-xl border border-[#E2EBE5] bg-white text-[#777777] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#CCCCCC] shrink-0" />
                <span>2. Chef Assembly</span>
              </div>
              <div className="p-3 rounded-xl border border-[#E2EBE5] bg-white text-[#777777] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#CCCCCC] shrink-0" />
                <span>3. Packed in Sleeve</span>
              </div>
              <div className="p-3 rounded-xl border border-[#E2EBE5] bg-white text-[#777777] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#CCCCCC] shrink-0" />
                <span>4. Out for Delivery</span>
              </div>
            </div>
          </div>

          {/* Direct WhatsApp Order Dispatch Box */}
          <div className="rounded-2xl bg-[#F4FAF6] border border-[#0B8F4D]/25 p-5 text-left space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#0B8F4D]" />
                <p className="text-sm font-extrabold text-[#123B16]">
                  WhatsApp Order Confirmation &amp; Kitchen Ticket
                </p>
              </div>
              <span className="text-xs font-semibold text-[#0B8F4D] font-num">
                Your WhatsApp: {confirmedOrder.customerWhatsapp}
              </span>
            </div>
            <p className="text-xs text-[#555555] leading-relaxed">
              Your WhatsApp number has been saved with Order{' '}
              <strong className="font-num">#{confirmedOrder.orderCode}</strong> for live kitchen and
              rider updates. You can also send your itemized order ticket directly to TrimPlate&apos;s
              Kitchen WhatsApp (<span className="font-num font-semibold">+{confirmedOrder.storeWhatsappNumber}</span>)
              in one tap:
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {confirmedOrder.whatsappOrderUrl && (
                <a
                  href={confirmedOrder.whatsappOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> Send Order on WhatsApp{' '}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(confirmedOrder.whatsappMessage);
                  setCopiedWaReceipt(true);
                  showToast('WhatsApp order summary copied!');
                  setTimeout(() => setCopiedWaReceipt(false), 2500);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-[#DCE5DF] text-xs font-bold text-[#123B16] hover:bg-[#E8F5E9]/60 transition-colors"
              >
                {copiedWaReceipt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0B8F4D]" /> Copied Receipt
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#0B8F4D]" /> Copy Summary
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/account?tab=orders"
              className="px-6 py-3.5 rounded-xl bg-[#123B16] hover:bg-[#0B8F4D] text-white text-sm font-bold transition-colors"
            >
              Track Order Status in Account
            </Link>
            <Link
              to="/green-menu"
              className="px-6 py-3.5 rounded-xl border border-[#EEEEEE] text-[#202124] text-sm font-semibold hover:bg-[#F5F6F7]"
            >
              Order More Meals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] min-h-screen py-10 lg:py-14">
      <SEOHead title={isCheckoutRoute ? 'Secure Checkout' : 'Shopping Cart'} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#202124]">
              {isCheckoutRoute ? 'Checkout & Delivery' : 'Your Shopping Cart'}
            </h1>
            <p className="text-sm text-[#777777] mt-1">
              {subtotal >= freeDeliveryThreshold
                ? 'Free Express Delivery unlocked on your order!'
                : `Orders above ${formatINR(freeDeliveryThreshold)} qualify for Free Express Delivery.`}
            </p>
          </div>
          {isCheckoutRoute ? (
            <Link to="/cart" className="text-sm font-bold text-[#0B8F4D] hover:underline">
              ← Back to Cart
            </Link>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EEEEEE] p-12 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-[#0B8F4D] mx-auto" />
            <h2 className="text-xl font-bold text-[#202124]">Your shopping cart is empty</h2>
            <p className="text-sm text-[#777777] max-w-md mx-auto">
              Add healthy bowls, cafe sandwiches, cold coffee or a daily meal subscription plan to
              get started.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                to="/green-menu"
                className="px-6 py-3 rounded-xl bg-[#0B8F4D] text-white text-sm font-bold"
              >
                Explore Green Menu
              </Link>
              <Link
                to="/cafe-menu"
                className="px-6 py-3 rounded-xl border border-[#EEEEEE] text-[#202124] text-sm font-semibold"
              >
                Explore Cafe Menu
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Cart Items OR Checkout Form */}
            <div className="lg:col-span-7 space-y-6">
              {!isCheckoutRoute ? (
                <div className="bg-white rounded-3xl border border-[#EEEEEE] divide-y divide-[#EEEEEE] overflow-hidden">
                  {items.map((item) => (
                    <div
                      key={item.key}
                      className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      <img
                        src={resolveFoodImage(item.image_key, item.custom_image_url)}
                        alt={item.name}
                        className="w-20 h-20 rounded-2xl object-cover border border-[#EEEEEE] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B8F4D]">
                          {item.item_type === 'subscription' ? 'Meal Plan' : 'Menu Item'}
                        </span>
                        <h3 className="text-base font-bold text-[#202124]">{item.name}</h3>
                        {item.variant_name && (
                          <p className="text-xs text-[#777777] mt-0.5">{item.variant_name}</p>
                        )}
                        <p className="text-sm font-semibold text-[#777777] mt-1 font-num">
                          {formatINR(item.unit_price)} each
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="inline-flex items-center border border-[#EEEEEE] rounded-xl bg-[#FAFAFA]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, -1)}
                            className="p-2.5 hover:text-[#0B8F4D]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-sm font-bold font-num">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, 1)}
                            className="p-2.5 hover:text-[#0B8F4D]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-base font-extrabold text-[#202124] font-num w-20 text-right">
                          {formatINR(item.unit_price * item.quantity)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="p-2 text-[#777777] hover:text-red-600"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">
                  {!user && (
                    <div className="bg-[#FFF8ED] border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[#202124]">
                          Sign in to complete your order & track live kitchen status
                        </p>
                        <p className="text-xs text-[#777777] mt-0.5">
                          Your shopping cart items will be saved automatically.
                        </p>
                      </div>
                      <Link
                        to="/login?redirect=/checkout"
                        className="px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold whitespace-nowrap"
                      >
                        Sign In
                      </Link>
                    </div>
                  )}

                  {/* 1. Customer Contact & WhatsApp Number */}
                  <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-bold text-[#202124]">
                        1. Recipient &amp; WhatsApp Details
                      </h2>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B8F4D] font-num">
                        <MessageCircle className="w-3.5 h-3.5" /> Kitchen WhatsApp: {storeOrderWhatsApp}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#777777] mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Recipient Name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#777777] mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomerPhone(val);
                            if (sameWhatsappAsPhone) {
                              setCustomerWhatsapp(val);
                            }
                          }}
                          placeholder="10-digit Mobile"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm font-num outline-none focus:border-[#0B8F4D]"
                        />
                      </div>
                    </div>

                    {/* Dedicated WhatsApp Order Number Field */}
                    <div className="pt-1 border-t border-[#F3F4F5] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123B16]">
                          <MessageCircle className="w-3.5 h-3.5 text-[#0B8F4D]" /> WhatsApp Number
                          for Order Updates *
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#555555] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={sameWhatsappAsPhone}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSameWhatsappAsPhone(checked);
                              if (checked) {
                                setCustomerWhatsapp(customerPhone);
                              }
                            }}
                            className="rounded accent-[#0B8F4D]"
                          />
                          Same as Mobile Number
                        </label>
                      </div>

                      {!sameWhatsappAsPhone ? (
                        <input
                          type="tel"
                          required
                          value={customerWhatsapp}
                          onChange={(e) => setCustomerWhatsapp(e.target.value)}
                          placeholder="Enter 10-digit WhatsApp Number (e.g. 9830012345)"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#0B8F4D]/40 bg-[#F9FDFB] text-sm font-num outline-none focus:border-[#0B8F4D]"
                        />
                      ) : (
                        <p className="text-xs text-[#666666]">
                          Order receipt &amp; rider updates will be linked to WhatsApp{' '}
                          <strong className="font-num text-[#123B16]">
                            {customerPhone || user?.mobile || 'entered above'}
                          </strong>
                          . Uncheck if your WhatsApp is on a different number.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2. Delivery Address & Schedule */}
                  <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-[#202124] flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#0B8F4D]" /> 2. Delivery Address
                      </h2>
                      {user && (
                        <button
                          type="button"
                          onClick={() => setShowNewAddressForm((v) => !v)}
                          className="text-xs font-bold text-[#0B8F4D] hover:underline cursor-pointer"
                        >
                          + Add New Address
                        </button>
                      )}
                    </div>

                    {user && user.addresses && user.addresses.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {user.addresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => setSelectedAddressId(addr.id)}
                              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                                isSelected
                                  ? 'bg-[#F2FAF5] border-[#0B8F4D] ring-2 ring-[#0B8F4D] scale-[1.01] shadow-xs'
                                  : 'bg-white border-[#EEEEEE] hover:border-[#0B8F4D]/50 hover:bg-[#FAFDFB]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase text-[#0B8F4D]">
                                  {addr.label}
                                </span>
                                {isSelected && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0B8F4D] text-white text-[10px] font-bold animate-tp-scale-fade">
                                    <Check className="w-3 h-3" /> Selected Address
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-[#202124] mt-1.5">
                                {addr.line1}
                              </p>
                              <p className="text-xs text-[#777777] mt-0.5">
                                {addr.area}, {addr.city} - {addr.pincode}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        rows={2}
                        required
                        value={customAddressText}
                        onChange={(e) => setCustomAddressText(e.target.value)}
                        placeholder="Enter complete flat / building / street address & pincode..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                      />
                    )}

                    {showNewAddressForm && (
                      <div className="p-4 rounded-2xl bg-[#FFF8ED] border border-[#EEEEEE] space-y-3 animate-tp-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="text"
                            placeholder="Label (Home / Office)"
                            value={newAddr.label}
                            onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-white border border-[#EEEEEE] text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Area (e.g. Salt Lake)"
                            value={newAddr.area}
                            onChange={(e) => setNewAddr({ ...newAddr, area: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-white border border-[#EEEEEE] text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Pincode"
                            value={newAddr.pincode}
                            onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-white border border-[#EEEEEE] text-xs font-num"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Flat / House No., Building, Street"
                          value={newAddr.line1}
                          onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#EEEEEE] text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleSaveNewAddress}
                          className="px-4 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold cursor-pointer"
                        >
                          Save Address
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. Delivery Speed, Meal Window & Kitchen Service Selection (Animated) */}
                  <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F2F1] pb-3">
                      <div>
                        <h2 className="text-lg font-bold text-[#202124] flex items-center gap-2">
                          <Zap className="w-5 h-5 text-[#0B8F4D]" /> 3. Delivery Speed &amp; Kitchen Options
                        </h2>
                        <p className="text-xs text-[#777777] mt-0.5">
                          Select your preferred dispatch speed, delivery slot window, and packaging preferences.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#0B8F4D] bg-[#E8F5E9] px-2.5 py-1 rounded-full">
                        Live Service Picker
                      </span>
                    </div>

                    {/* Delivery Speed / Service Tier Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Standard Dispatch */}
                      <button
                        type="button"
                        onClick={() => setDeliveryService('standard')}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                          deliveryService === 'standard'
                            ? 'bg-[#F2FAF5] border-[#0B8F4D] ring-2 ring-[#0B8F4D] scale-[1.01] shadow-xs'
                            : 'bg-white border-[#EEEEEE] hover:border-[#0B8F4D]/50 hover:bg-[#FAFDFB]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center">
                            <Truck className="w-4 h-4" />
                          </div>
                          {deliveryService === 'standard' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B8F4D] bg-[#E8F5E9] px-2 py-0.5 rounded-full animate-tp-scale-fade">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0B8F4D] animate-ping" />
                              Selected Service
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-[#888888]">
                              Regular Route
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#202124]">Standard Fresh Dispatch</p>
                        <p className="text-xs text-[#666666] mt-0.5">45–60 mins • Eco-friendly route</p>
                        <p className="text-[11px] font-bold text-[#0B8F4D] mt-2">
                          {deliveryCharge === 0 ? 'FREE EXPRESS' : `Standard Delivery (${formatINR(deliveryCharge)})`}
                        </p>
                      </button>

                      {/* Priority Hot Express */}
                      <button
                        type="button"
                        onClick={() => setDeliveryService('priority')}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                          deliveryService === 'priority'
                            ? 'bg-[#F2FAF5] border-[#0B8F4D] ring-2 ring-[#0B8F4D] scale-[1.01] shadow-xs'
                            : 'bg-white border-[#EEEEEE] hover:border-[#0B8F4D]/50 hover:bg-[#FAFDFB]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                            <Zap className="w-4 h-4" />
                          </div>
                          {deliveryService === 'priority' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B8F4D] bg-[#E8F5E9] px-2 py-0.5 rounded-full animate-tp-scale-fade">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0B8F4D] animate-ping" />
                              Selected Service
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              +₹30 Express
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#202124]">Priority Hot Express</p>
                        <p className="text-xs text-[#666666] mt-0.5">30–40 mins • Dedicated courier</p>
                        <p className="text-[11px] font-bold text-amber-800 mt-2">
                          Steaming/Chilled Guaranteed (+₹30)
                        </p>
                      </button>

                      {/* Pre-Scheduled Meal Window */}
                      <button
                        type="button"
                        onClick={() => setDeliveryService('scheduled')}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                          deliveryService === 'scheduled'
                            ? 'bg-[#F2FAF5] border-[#0B8F4D] ring-2 ring-[#0B8F4D] scale-[1.01] shadow-xs'
                            : 'bg-white border-[#EEEEEE] hover:border-[#0B8F4D]/50 hover:bg-[#FAFDFB]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                          {deliveryService === 'scheduled' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B8F4D] bg-[#E8F5E9] px-2 py-0.5 rounded-full animate-tp-scale-fade">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0B8F4D] animate-ping" />
                              Selected Service
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-[#888888]">
                              Custom Slot
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#202124]">Pre-Scheduled Meal Window</p>
                        <p className="text-xs text-[#666666] mt-0.5">Cooked right before your time</p>
                        <p className="text-[11px] font-bold text-[#0B8F4D] mt-2">
                          Flexible Meal Schedule
                        </p>
                      </button>
                    </div>

                    {/* If Scheduled Service is active, show animated slot selector */}
                    {deliveryService === 'scheduled' && (
                      <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#0B8F4D]/30 space-y-3 animate-tp-fade-in">
                        <label className="block text-xs font-bold text-[#123B16]">
                          Choose Desired Meal Dispatch Window *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            'Lunch (12:30 PM - 1:30 PM)',
                            'Evening Healthy Bites (4:30 PM - 5:30 PM)',
                            'Dinner & Post-Workout (7:30 PM - 8:30 PM)',
                            'Breakfast / Morning Tiffin (8:00 AM - 9:00 AM)',
                          ].map((slot) => {
                            const isSlotActive = scheduledSlot === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setScheduledSlot(slot)}
                                className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all duration-150 flex items-center justify-between cursor-pointer ${
                                  isSlotActive
                                    ? 'bg-[#E8F5E9] border-[#0B8F4D] text-[#123B16] ring-1 ring-[#0B8F4D]'
                                    : 'bg-white border-[#E0E6E2] text-[#444444] hover:bg-[#F3F6F4]'
                                }`}
                              >
                                <span>{slot}</span>
                                {isSlotActive && <Check className="w-3.5 h-3.5 text-[#0B8F4D]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Date and Custom Kitchen Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-[#777777] mb-1">
                          Delivery Date
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-[#0B8F4D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="date"
                            min={new Date().toISOString().slice(0, 10)}
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm font-num outline-none focus:border-[#0B8F4D]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#777777] mb-1">
                          Kitchen / Delivery Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="e.g., Less spicy, leave with reception/security..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                        />
                      </div>
                    </div>

                    {/* Kitchen Packaging & Dispatch Add-ons (Animated Switches) */}
                    <div className="pt-2 border-t border-[#F0F2F1] space-y-3">
                      <label className="block text-xs font-bold text-[#123B16] uppercase tracking-wider">
                        Kitchen Packaging &amp; Delivery Preferences
                      </label>

                      <div className="space-y-2.5">
                        {/* Thermal Bag Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-[#E6EAE8] bg-[#FAFCFB] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center shrink-0">
                              <Flame className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#202124]">
                                Insulated Thermal Fresh Sleeve
                              </p>
                              <p className="text-[11px] text-[#777777]">
                                Keeps warm bowls steaming hot and smoothies cold in transit
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setThermalSleeve((v) => !v)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                              thermalSleeve ? 'bg-[#0B8F4D]' : 'bg-[#D1D5DB]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                thermalSleeve ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Eco Cutlery Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-[#E6EAE8] bg-[#FAFCFB] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center shrink-0">
                              <Leaf className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#202124]">
                                Include Eco Wooden Cutlery &amp; Napkins
                              </p>
                              <p className="text-[11px] text-[#777777]">
                                Leave off if eating at home or office to save trees &amp; plastic
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEcoCutlery((v) => !v)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                              ecoCutlery ? 'bg-[#0B8F4D]' : 'bg-[#D1D5DB]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                ecoCutlery ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Contactless Drop-off Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-[#E6EAE8] bg-[#FAFCFB] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center shrink-0">
                              <BellRing className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#202124]">
                                Contactless Doorstep Drop-off
                              </p>
                              <p className="text-[11px] text-[#777777]">
                                Rider leaves order securely at doorstep and rings bell
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setContactlessDrop((v) => !v)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                              contactlessDrop ? 'bg-[#0B8F4D]' : 'bg-[#D1D5DB]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                contactlessDrop ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Payment Method with Animated Selection & Status Previews */}
                  <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-[#202124] flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#0B8F4D]" /> 4. Payment Method &amp; Status
                      </h2>
                      <span className="text-xs font-bold text-[#0B8F4D] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
                        Secure Checkout
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Cash on Delivery */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Cash on Delivery')}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                          paymentMethod === 'Cash on Delivery'
                            ? 'bg-[#F2FAF5] border-[#0B8F4D] ring-2 ring-[#0B8F4D] scale-[1.01] shadow-xs'
                            : 'border-[#EEEEEE] bg-white hover:border-[#0B8F4D]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Banknote className="w-5 h-5 text-[#0B8F4D]" />
                          {paymentMethod === 'Cash on Delivery' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B8F4D] bg-[#E8F5E9] px-2 py-0.5 rounded-full animate-tp-scale-fade">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#202124]">Cash on Delivery</p>
                        <p className="text-[11px] text-[#777777] mb-2">Pay cash or scan on doorstep</p>

                        {/* Animated Status Preview Tag */}
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 animate-tp-pulse-amber">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                            Pending on Doorstep
                          </span>
                        </div>
                      </button>

                      {/* Direct UPI Transfer */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                          paymentMethod === 'UPI'
                            ? 'bg-[#F2FAF5] border-[#0B8F4D] ring-2 ring-[#0B8F4D] scale-[1.01] shadow-xs'
                            : 'border-[#EEEEEE] bg-white hover:border-[#0B8F4D]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <QrCode className="w-5 h-5 text-[#0B8F4D]" />
                          {paymentMethod === 'UPI' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B8F4D] bg-[#E8F5E9] px-2 py-0.5 rounded-full animate-tp-scale-fade">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#202124]">Direct UPI Transfer</p>
                        <p className="text-[11px] text-[#777777] mb-2">GPay / PhonePe / Paytm UTR</p>

                        {/* Animated Status Preview Tag */}
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[10px] font-bold border border-teal-300 animate-tp-pulse-glow">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-ping" />
                            Pending Verification
                          </span>
                        </div>
                      </button>

                      {/* Online Payment Gateway */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Online Payment Gateway')}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                          paymentMethod === 'Online Payment Gateway'
                            ? 'bg-[#F2FAF5] border-[#0B8F4D] ring-2 ring-[#0B8F4D] scale-[1.01] shadow-xs'
                            : 'border-[#EEEEEE] bg-white hover:border-[#0B8F4D]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <CreditCard className="w-5 h-5 text-[#0B8F4D]" />
                          {paymentMethod === 'Online Payment Gateway' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B8F4D] bg-[#E8F5E9] px-2 py-0.5 rounded-full animate-tp-scale-fade">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#202124]">Online Gateway</p>
                        <p className="text-[11px] text-[#777777] mb-2">Cards / NetBanking</p>

                        {/* Animated Status Preview Tag */}
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
                            <Check className="w-3 h-3 text-[#0B8F4D]" />
                            Instant Verification
                          </span>
                        </div>
                      </button>
                    </div>

                    {paymentMethod === 'UPI' && (
                      <div className="p-4 rounded-2xl bg-[#F0FAF7] border border-[#0B8F4D]/30 space-y-3 animate-tp-fade-in">
                        <p className="text-xs text-[#202124]">
                          Transfer <strong className="font-num">{formatINR(finalPayableTotal)}</strong> to
                          official Merchant VPA:{' '}
                          <strong className="font-num text-[#0B8F4D]">
                            {site.settings.upi_vpa || site.settings.upi_id || 'trimplate@hdfcbank'}
                          </strong>
                        </p>
                        <div>
                          <label className="block text-xs font-bold text-[#202124] mb-1">
                            Enter 12-Digit UPI UTR / Reference Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={upiReference}
                            onChange={(e) => setUpiReference(e.target.value)}
                            placeholder="e.g. 429811048592"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#EEEEEE] text-sm font-num outline-none focus:border-[#0B8F4D]"
                          />
                          <p className="text-[11px] text-[#777777] mt-1">
                            Your payment status will show as{' '}
                            <strong className="text-teal-800">Verification Pending</strong> until reconciled by
                            our accounts desk within 5-10 minutes.
                          </p>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'Online Payment Gateway' && (
                      <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EEEEEE] text-xs text-[#777777]">
                        Requires an active Razorpay/Stripe merchant key configured in{' '}
                        <strong>Admin → Website Settings</strong>. For immediate ordering without a
                        live merchant key, choose Cash on Delivery or Direct UPI.
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Right Column: Order Summary & Coupon */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
              {/* Coupon Box */}
              <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#202124] mb-2.5">
                  Have a Promo Code?
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#E8F5E9] border border-[#0B8F4D]/30">
                    <span className="inline-flex items-center gap-2 text-xs font-extrabold text-[#123B16] font-num">
                      <Tag className="w-4 h-4 text-[#0B8F4D]" /> {appliedCoupon.code} (−
                      {formatINR(appliedCoupon.discount)})
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoupon(null)}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g. TRIMFIRST20)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs font-num uppercase outline-none focus:border-[#0B8F4D]"
                    />
                    <button
                      type="submit"
                      disabled={validatingCoupon}
                      className="px-4 py-2.5 rounded-xl bg-[#123B16] hover:bg-[#0B8F4D] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                )}
              </div>

              {/* Price Summary */}
              <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#202124]">Order Summary</h2>
                <div className="space-y-2.5 text-sm border-b border-[#EEEEEE] pb-4">
                  <div className="flex justify-between text-[#777777]">
                    <span>Items Subtotal</span>
                    <span className="font-num font-semibold text-[#202124]">
                      {formatINR(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#777777]">
                    <span>Delivery Fee</span>
                    <span className="font-num font-semibold text-[#0B8F4D]">
                      {deliveryCharge === 0 ? 'FREE' : formatINR(deliveryCharge)}
                    </span>
                  </div>
                  {deliveryService === 'priority' && (
                    <div className="flex justify-between text-amber-800 font-semibold">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-600" /> Priority Express Fee
                      </span>
                      <span className="font-num">+₹30</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#777777]">
                    <span>GST ({taxRatePercent}%)</span>
                    <span className="font-num font-semibold text-[#202124]">
                      {formatINR(gstAmount)}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-[#0B8F4D] font-semibold">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span className="font-num">−{formatINR(appliedCoupon.discount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-base font-extrabold text-[#202124]">Grand Total</span>
                  <span className="text-2xl font-extrabold text-[#0B8F4D] font-num">
                    {formatINR(finalPayableTotal)}
                  </span>
                </div>

                {!isCheckoutRoute ? (
                  <button
                    type="button"
                    onClick={() => navigate('/checkout')}
                    className="w-full py-4 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={placingOrder}
                    className="w-full py-4 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {placingOrder
                      ? 'Confirming Kitchen Order...'
                      : `Place Order · ${formatINR(finalPayableTotal)}`}
                  </button>
                )}

                <p className="text-[11px] text-[#777777] flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck className="w-4 h-4 text-[#0B8F4D]" /> Freshly prepared in FSSAI
                  certified TrimPlate kitchen
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ANIMATED ORDER CONFIRMING MODAL OVERLAY */}
        {placingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-tp-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-[#EEEEEE] shadow-2xl text-center space-y-5 animate-tp-scale-fade">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center mx-auto shadow-inner animate-tp-pulse-glow">
                  <Loader2 className="w-8 h-8 text-[#0B8F4D] animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B8F4D]">
                  {orderProgressStep === 1
                    ? 'Step 1/3: Checking Kitchen Services'
                    : orderProgressStep === 2
                    ? 'Step 2/3: Allocating Chef Station'
                    : 'Step 3/3: Finalizing Order Ticket'}
                </span>
                <h3 className="text-xl font-extrabold text-[#202124]">
                  Confirming Your TrimPlate Order
                </h3>
                <p className="text-xs text-[#777777] leading-relaxed">
                  {orderProgressStep === 1
                    ? 'Validating kitchen service slot & fresh ingredients stock...'
                    : orderProgressStep === 2
                    ? 'Allocating chef brigade station and thermal insulation packaging...'
                    : 'Generating your WhatsApp kitchen ticket and order receipt...'}
                </p>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full bg-[#E8ECE9] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#0B8F4D] h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width:
                      orderProgressStep === 1 ? '35%' : orderProgressStep === 2 ? '75%' : '100%',
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-[#666666]">
                <span className={orderProgressStep >= 1 ? 'text-[#0B8F4D]' : ''}>
                  ✓ Services
                </span>
                <span className={orderProgressStep >= 2 ? 'text-[#0B8F4D]' : ''}>
                  ✓ Chef Station
                </span>
                <span className={orderProgressStep >= 3 ? 'text-[#0B8F4D]' : ''}>
                  ✓ Live Ticket
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
