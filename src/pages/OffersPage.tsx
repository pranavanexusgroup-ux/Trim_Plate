import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Tag, ArrowRight, Clock } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { SEOHead } from '../components/SEOHead';
import { FadeIn } from '../components/FadeIn';
import { TrimPlateMarqueeStrip } from '../components/BrandMarqueeAndHighlights';
import { resolveFoodImage } from '../assets/mediaMap';

export function OffersPage() {
  const { site } = useSite();
  const { showToast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const banner = site.banners.find((b) => b.page_target === 'offers');

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    showToast(`Coupon code ${code} copied!`);
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className="bg-white min-h-screen">
      <SEOHead
        title={banner?.title || 'Special Offers & Promo Codes'}
        description={
          banner?.description ||
          'Save on healthy meals, Cafe Menu combos and 30-day Diet Subscriptions with active TrimPlate promo codes.'
        }
      />

      {/* Dynamic Banner */}
      <section
        className="text-white py-14 lg:py-20"
        style={{ backgroundColor: banner?.bg_color || '#123B16' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#8CCB16]">
            <Tag className="w-4 h-4" /> {banner?.subtitle || 'Active Deals & Seasonal Savings'}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold mt-2 leading-tight">
            {banner?.title || 'Exclusive Healthy Meal Offers'}
          </h1>
          <p className="text-sm sm:text-base text-white/85 mt-3">
            {banner?.description ||
              'Copy any active coupon code below and apply it at checkout. Expired campaigns are automatically retired.'}
          </p>
        </div>
      </section>

      <TrimPlateMarqueeStrip />

      <FadeIn>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        {site.activeOffers.length === 0 ? (
          <div className="text-center py-16 bg-[#FFF8ED] rounded-3xl border border-[#EEEEEE] p-8">
            <h2 className="text-xl font-bold text-[#202124]">
              New Seasonal Offers Coming Soon!
            </h2>
            <p className="text-sm text-[#777777] mt-2">
              Explore our Green Menu or save 20% every day with our 30-Day Best Value Meal Plan.
            </p>
            <Link
              to="/subscriptions"
              className="mt-5 inline-flex items-center gap-2 bg-[#0B8F4D] text-white text-sm font-semibold px-6 py-3 rounded-xl"
            >
              View Subscription Plans <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {site.activeOffers.map((offer) => (
              <div
                key={offer.id}
                className="bg-white rounded-3xl border border-[#EEEEEE] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-[#123B16] overflow-hidden">
                    <img
                      src={resolveFoodImage(offer.banner_image)}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-4 left-4 bg-[#0B8F4D] text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-xs font-num">
                      {offer.discount_type === 'percentage'
                        ? `${offer.discount_value}% OFF`
                        : `FLAT ₹${offer.discount_value} OFF`}
                    </span>
                  </div>

                  <div className="p-6 space-y-3">
                    <h2 className="text-xl font-extrabold text-[#202124]">{offer.title}</h2>
                    <p className="text-sm text-[#777777] leading-relaxed">{offer.description}</p>

                    <div className="pt-2 space-y-1 text-xs text-[#777777] font-num">
                      <p>
                        Minimum Order: <strong className="text-[#202124]">₹{offer.min_order_value}</strong>
                        {offer.max_discount > 0 ? ` · Max Discount: ₹${offer.max_discount}` : ''}
                      </p>
                      <p className="inline-flex items-center gap-1.5 text-[#0B8F4D] font-medium">
                        <Clock className="w-3.5 h-3.5" /> Valid until{' '}
                        {offer.end_datetime.replace('T', ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-4 border-t border-[#F4F5F6] flex items-center justify-between gap-3 bg-[#FAFAFA]">
                  {offer.coupon_code ? (
                    <button
                      type="button"
                      onClick={() => copyCode(offer.coupon_code)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#0B8F4D] bg-white text-xs font-extrabold text-[#123B16] font-num hover:bg-[#E8F5E9]"
                    >
                      {copied === offer.coupon_code ? (
                        <Check className="w-4 h-4 text-[#0B8F4D]" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#0B8F4D]" />
                      )}
                      {offer.coupon_code}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-[#0B8F4D]">Auto-Applied</span>
                  )}

                  <Link
                    to={offer.cta_url || '/green-menu'}
                    className="inline-flex items-center gap-1.5 bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    {offer.cta_text || 'Order Now'} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </FadeIn>
    </div>
  );
}
