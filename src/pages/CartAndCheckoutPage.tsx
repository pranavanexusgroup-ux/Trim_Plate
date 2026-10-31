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

  const [deliveryDate, setDeliveryDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash on Delivery' | 'UPI' | 'Online Payment Gateway'
  >('Cash on Delivery');
  const [upiReference, setUpiReference] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [copiedWaReceipt, setCopiedWaReceipt] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderCode: string;
    paymentStatus: string;
    total: number;
    customerWhatsapp: string;
    storeWhatsappNumber: string;
    whatsappMessage: string;
    whatsappOrderUrl: string;
  } | null>(null);

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
    try {
      const orderTotalSnapshot = totalAmount;
      const { data } = await api.post('/orders', {
        items,
        customer_name: customerName || user.name,
        customer_phone: resolvedPhone,
        customer_whatsapp: resolvedWhatsapp,
        address_id: chosenAddr ? chosenAddr.id : null,
        delivery_address_text: addressSnapshot,
        delivery_date: deliveryDate,
        subtotal,
        delivery_charge: deliveryCharge,
        gst_amount: gstAmount,
        coupon_code: appliedCoupon?.code || '',
        discount_amount: appliedCoupon?.discount || 0,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_reference: paymentMethod === 'UPI' ? upiReference.trim() : '',
        delivery_notes: deliveryNotes,
      });

      const fallbackMsg = `TrimPlate Order #${data.orderCode} | Total: ₹${Math.round(
        orderTotalSnapshot
      )} | Customer: ${customerName || user.name} | WhatsApp: ${resolvedWhatsapp}`;
      const waUrl =
        data.whatsappOrderUrl || buildWhatsAppLink(storeOrderWhatsApp, fallbackMsg);

      clearCart();
      setConfirmedOrder({
        orderCode: data.orderCode,
        paymentStatus: data.paymentStatus,
        total: orderTotalSnapshot,
        customerWhatsapp: data.customerWhatsapp || resolvedWhatsapp,
        storeWhatsappNumber: data.storeWhatsappNumber || storeOrderWhatsApp,
        whatsappMessage: data.whatsappMessage || fallbackMsg,
        whatsappOrderUrl: waUrl,
      });
      showToast(`Order #${data.orderCode} placed! WhatsApp order ticket ready.`);
    } catch (err: any) {
      showToast(extractApiError(err, 'Could not place order'), 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-20 text-center">
        <SEOHead title="Order Confirmed" />
        <div className="bg-white rounded-3xl border border-[#EEEEEE] p-8 sm:p-12 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#0B8F4D]">
            Order Received
          </span>
          <h1 className="text-3xl font-extrabold text-[#202124]">
            Thank You! Order #{confirmedOrder.orderCode}
          </h1>
          <p className="text-sm text-[#777777] leading-relaxed">
            Our central kitchen has received your order totaling{' '}
            <strong className="text-[#202124] font-num">{formatINR(confirmedOrder.total)}</strong>.
            Payment status:{' '}
            <strong className="text-[#0B8F4D]">{confirmedOrder.paymentStatus}</strong>.
          </p>

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

          <div className="pt-3 flex flex-wrap justify-center gap-3">
            <Link
              to="/account?tab=orders"
              className="px-6 py-3.5 rounded-xl bg-[#123B16] hover:bg-[#0B8F4D] text-white text-sm font-bold transition-colors"
            >
              Track Order Status
            </Link>
            <Link
              to="/green-menu"
              className="px-6 py-3.5 rounded-xl border border-[#EEEEEE] text-[#202124] text-sm font-semibold hover:bg-[#F5F6F7]"
            >
              Continue Browsing
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

                  {/* 2. Delivery Address & Date */}
                  <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-[#202124] flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#0B8F4D]" /> 2. Delivery Address & Schedule
                      </h2>
                      {user && (
                        <button
                          type="button"
                          onClick={() => setShowNewAddressForm((v) => !v)}
                          className="text-xs font-bold text-[#0B8F4D] hover:underline"
                        >
                          + Add New Address
                        </button>
                      )}
                    </div>

                    {user && user.addresses && user.addresses.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {user.addresses.map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`p-4 rounded-2xl border text-left transition-colors ${
                              selectedAddressId === addr.id
                                ? 'bg-[#E8F5E9] border-[#0B8F4D]'
                                : 'bg-white border-[#EEEEEE] hover:border-[#0B8F4D]/40'
                            }`}
                          >
                            <span className="text-xs font-bold uppercase text-[#0B8F4D]">
                              {addr.label}
                            </span>
                            <p className="text-sm font-semibold text-[#202124] mt-1">
                              {addr.line1}
                            </p>
                            <p className="text-xs text-[#777777]">
                              {addr.area}, {addr.city} - {addr.pincode}
                            </p>
                          </button>
                        ))}
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
                      <div className="p-4 rounded-2xl bg-[#FFF8ED] border border-[#EEEEEE] space-y-3">
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
                          className="px-4 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
                        >
                          Save Address
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
                          placeholder="e.g., Less spicy, leave with security..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Honest Payment Method */}
                  <div className="bg-white rounded-3xl border border-[#EEEEEE] p-6 space-y-4">
                    <h2 className="text-lg font-bold text-[#202124]">3. Payment Method</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Cash on Delivery')}
                        className={`p-4 rounded-2xl border text-left transition-colors ${
                          paymentMethod === 'Cash on Delivery'
                            ? 'bg-[#E8F5E9] border-[#0B8F4D]'
                            : 'border-[#EEEEEE]'
                        }`}
                      >
                        <Banknote className="w-5 h-5 text-[#0B8F4D] mb-1.5" />
                        <p className="text-sm font-bold text-[#202124]">Cash on Delivery</p>
                        <p className="text-[11px] text-[#777777]">Pay cash or scan on doorstep</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-4 rounded-2xl border text-left transition-colors ${
                          paymentMethod === 'UPI'
                            ? 'bg-[#E8F5E9] border-[#0B8F4D]'
                            : 'border-[#EEEEEE]'
                        }`}
                      >
                        <QrCode className="w-5 h-5 text-[#0B8F4D] mb-1.5" />
                        <p className="text-sm font-bold text-[#202124]">Direct UPI Transfer</p>
                        <p className="text-[11px] text-[#777777]">GPay / PhonePe / Paytm UTR</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Online Payment Gateway')}
                        className={`p-4 rounded-2xl border text-left transition-colors ${
                          paymentMethod === 'Online Payment Gateway'
                            ? 'bg-[#E8F5E9] border-[#0B8F4D]'
                            : 'border-[#EEEEEE]'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-[#0B8F4D] mb-1.5" />
                        <p className="text-sm font-bold text-[#202124]">Online Gateway</p>
                        <p className="text-[11px] text-[#777777]">Cards / NetBanking</p>
                      </button>
                    </div>

                    {paymentMethod === 'UPI' && (
                      <div className="p-4 rounded-2xl bg-[#FFF8ED] border border-[#0B8F4D]/30 space-y-3">
                        <p className="text-xs text-[#202124]">
                          Transfer <strong className="font-num">{formatINR(totalAmount)}</strong> to
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
                            Your payment status will show as Verification Pending until reconciled by
                            our accounts desk.
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
                      className="text-xs font-bold text-red-600 hover:underline"
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
                      className="px-4 py-2.5 rounded-xl bg-[#123B16] hover:bg-[#0B8F4D] text-white text-xs font-bold transition-colors"
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
                    {formatINR(totalAmount)}
                  </span>
                </div>

                {!isCheckoutRoute ? (
                  <button
                    type="button"
                    onClick={() => navigate('/checkout')}
                    className="w-full py-4 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={placingOrder}
                    className="w-full py-4 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60"
                  >
                    {placingOrder
                      ? 'Confirming Order...'
                      : `Place Order · ${formatINR(totalAmount)}`}
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
      </div>
    </div>
  );
}
