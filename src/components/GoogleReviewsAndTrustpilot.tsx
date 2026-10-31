import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  ExternalLink,
  PenLine,
  X,
  CornerDownRight,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, formatINR } from '../services/api';
import { CustomerReview, OrderRecord } from '../types';
import { FadeIn } from './FadeIn';

export function GoogleGLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.86c2.26-2.09 3.56-5.17 3.56-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.6H1.29C.47 8.23 0 10.06 0 12s.47 3.77 1.29 5.4l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.98 3.09c.95-2.85 3.6-4.94 6.73-4.94z"
      />
    </svg>
  );
}

const AVATAR_PALETTE = [
  'bg-[#0B8F4D] text-white',
  'bg-[#1A73E8] text-white',
  'bg-[#123B16] text-white',
  'bg-[#D93025] text-white',
  'bg-[#E37400] text-white',
  'bg-[#7B1FA2] text-white',
];

function formatReviewDate(raw: string): string {
  if (!raw) return 'Verified Review';
  const dt = new Date(raw.replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return raw.slice(0, 10);
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AboveFooterGoogleReviewsSection() {
  const { site, refreshSite } = useSite();
  const { user } = useAuth();
  const { showToast } = useToast();

  const s = site.settings;
  const isEnabled = s.google_reviews_enabled !== '0';

  const reviewsList: CustomerReview[] = useMemo(() => {
    const approved = site.approvedReviews || [];
    if (approved.length > 0) return approved;
    return (site.testimonials || []).map((t) => ({
      id: 10000 + t.id,
      user_id: 0,
      product_id: null,
      customer_name: t.customer_name,
      reviewer_location: [t.designation, t.location].filter(Boolean).join(' · '),
      review_source: 'Google',
      rating: t.rating || 5,
      comment: t.comment,
      admin_reply: '',
      show_on_home: 1,
      is_approved: 1,
      created_at: '',
    }));
  }, [site.approvedReviews, site.testimonials]);

  const [cardsPerView, setCardsPerView] = useState<number>(3);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const autoSlideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Write Review Modal State (Individual one-time item review per order)
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [myOrders, setMyOrders] = useState<OrderRecord[]>([]);
  const [myReviews, setMyReviews] = useState<CustomerReview[]>([]);
  const [submittedNotice, setSubmittedNotice] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reviewForm, setReviewForm] = useState({
    order_id: '',
    order_item_id: '',
    product_id: '',
    reviewer_location: 'Kolkata',
    rating: 5,
    comment: '',
  });

  useEffect(() => {
    const updateVisibleCards = () => {
      if (window.innerWidth < 768) {
        setCardsPerView(1);
      } else if (window.innerWidth < 1024) {
        setCardsPerView(2);
      } else {
        setCardsPerView(3);
      }
    };
    updateVisibleCards();
    window.addEventListener('resize', updateVisibleCards);
    return () => window.removeEventListener('resize', updateVisibleCards);
  }, []);

  const maxStartIndex = Math.max(0, reviewsList.length - cardsPerView);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
  }, [maxStartIndex]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev <= 0 ? maxStartIndex : prev - 1));
  }, [maxStartIndex]);

  useEffect(() => {
    if (activeIndex > maxStartIndex) {
      setActiveIndex(0);
    }
  }, [activeIndex, maxStartIndex]);

  // Smooth Auto-Sliding Timer with Pause On Hover / Drag
  useEffect(() => {
    if (!isEnabled || paused || modalOpen || reviewsList.length <= cardsPerView) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    autoSlideTimerRef.current = setInterval(() => {
      goNext();
    }, 4200);

    return () => {
      if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current);
    };
  }, [isEnabled, paused, modalOpen, reviewsList.length, cardsPerView, goNext]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setPaused(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setTouchStartX(clientX);
    setTouchDeltaX(0);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const delta = clientX - touchStartX;
    // Limit delta range for smooth dragging feel
    setTouchDeltaX(Math.max(-120, Math.min(120, delta)));
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null) {
      if (touchDeltaX < -35) {
        goNext();
      } else if (touchDeltaX > 35) {
        goPrev();
      }
    }
    setTouchStartX(null);
    setTouchDeltaX(0);
    setIsDragging(false);
    setTimeout(() => setPaused(false), 2500);
  };

  const isOrderItemReviewed = (
    orderId: number,
    item: { id: number; product_id?: number | null },
    revs: CustomerReview[]
  ) =>
    revs.some(
      (r) =>
        Number(r.order_id) === orderId &&
        ((item.product_id && Number(r.product_id) === Number(item.product_id)) ||
          (r.order_item_id && Number(r.order_item_id) === Number(item.id)))
    );

  useEffect(() => {
    if (modalOpen && user) {
      Promise.allSettled([
        api.get<OrderRecord[]>('/orders'),
        api.get<CustomerReview[]>('/reviews/my'),
      ]).then(([ordRes, revRes]) => {
        const ords = ordRes.status === 'fulfilled' ? ordRes.value.data : [];
        const revs = revRes.status === 'fulfilled' ? revRes.value.data : [];
        setMyOrders(ords);
        setMyReviews(revs);
        const firstOrd = ords.find(
          (o) =>
            o.order_status !== 'Cancelled' &&
            o.items.some((it) => !isOrderItemReviewed(o.id, it, revs))
        );
        if (firstOrd) {
          const firstItem = firstOrd.items.find((it) => !isOrderItemReviewed(firstOrd.id, it, revs));
          setReviewForm((prev) => ({
            ...prev,
            order_id: String(firstOrd.id),
            order_item_id: firstItem ? String(firstItem.id) : '',
            product_id: firstItem?.product_id ? String(firstItem.product_id) : '',
          }));
        }
      });
    }
  }, [modalOpen, user]);

  const unreviewedOrders = useMemo(
    () =>
      myOrders.filter(
        (o) =>
          o.order_status !== 'Cancelled' &&
          o.items.some((it) => !isOrderItemReviewed(o.id, it, myReviews))
      ),
    [myOrders, myReviews]
  );

  const selectedModalOrder = useMemo(
    () => unreviewedOrders.find((o) => String(o.id) === reviewForm.order_id) || null,
    [unreviewedOrders, reviewForm.order_id]
  );

  const unreviewedModalItems = useMemo(() => {
    if (!selectedModalOrder) return [];
    return selectedModalOrder.items.filter(
      (it) => !isOrderItemReviewed(selectedModalOrder.id, it, myReviews)
    );
  }, [selectedModalOrder, myReviews]);

  if (!isEnabled || reviewsList.length === 0) return null;

  const avgScore = site.reviewStats?.avgRating
    ? Number(site.reviewStats.avgRating).toFixed(1)
    : (
        reviewsList.reduce((acc, item) => acc + Number(item.rating || 5), 0) / reviewsList.length
      ).toFixed(1);

  const totalVerifiedCount =
    site.reviewStats?.totalApprovedCount && site.reviewStats.totalApprovedCount > 0
      ? site.reviewStats.totalApprovedCount
      : reviewsList.length;

  const googleUrl =
    s.google_review_url ||
    'https://www.google.com/maps/search/?api=1&query=TrimPlate+Healthy+Kitchen+Park+Street+Kolkata';
  const businessLabel =
    s.google_business_name || 'TrimPlate — Healthy Kitchen & Cafe, Kolkata';

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.order_id) return;
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        order_id: Number(reviewForm.order_id),
        order_item_id: reviewForm.order_item_id ? Number(reviewForm.order_item_id) : null,
        reviewer_location: reviewForm.reviewer_location,
        product_id: reviewForm.product_id ? Number(reviewForm.product_id) : null,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      setSubmittedNotice('Thank you for your review!');
      setReviewForm((prev) => ({
        ...prev,
        comment: '',
        rating: 5,
        order_id: '',
        order_item_id: '',
        product_id: '',
      }));
      await refreshSite();
      showToast('Thank you for your review!');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="bg-[#F8FAF9] border-t border-[#E6ECE8] py-14 lg:py-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Verified Google and Customer Reviews"
    >
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Summary Header Card */}
        <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 sm:p-6 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-center shrink-0">
              <GoogleGLogo className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-[#202124] tracking-tight">
                  Google Reviews &amp; Verified Ratings
                </h2>
                <span className="text-xs text-[#777777] hidden sm:inline">·</span>
                <span className="text-xs font-medium text-[#5F6368] hidden sm:inline">
                  {businessLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-1">
                <span className="text-xl font-extrabold text-[#202124] font-num leading-none">
                  {avgScore}
                </span>
                <div className="flex items-center gap-0.5 text-[#FBBC04]" aria-label={`${avgScore} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((st) => (
                    <Star
                      key={st}
                      className={`w-4 h-4 ${
                        Number(avgScore) >= st - 0.3
                          ? 'fill-[#FBBC04] text-[#FBBC04]'
                          : 'fill-[#E0E0E0] text-[#E0E0E0]'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-[#5F6368] font-medium">
                  Based on <strong className="font-num text-[#202124]">{totalVerifiedCount}</strong>{' '}
                  approved Google &amp; customer reviews
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSubmittedNotice('');
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            >
              <PenLine className="w-4 h-4" />
              Write a Review
            </button>

            <a
              href={googleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#DADCE0] bg-white hover:bg-[#F8F9FA] text-[#202124] text-xs sm:text-sm font-semibold transition-colors"
            >
              <GoogleGLogo className="w-4 h-4" />
              <span>View on Google</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#5F6368]" />
            </a>

            {reviewsList.length > cardsPerView && (
              <div className="flex items-center gap-1.5 pl-1">
                <button
                  type="button"
                  onClick={() => {
                    goPrev();
                    setPaused(true);
                    setTimeout(() => setPaused(false), 4000);
                  }}
                  aria-label="Previous reviews"
                  className="p-2.5 rounded-xl border border-[#DADCE0] bg-white hover:bg-[#F8F9FA] text-[#202124] transition-colors shadow-xs cursor-pointer hover:border-[#0B8F4D]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    goNext();
                    setPaused(true);
                    setTimeout(() => setPaused(false), 4000);
                  }}
                  aria-label="Next reviews"
                  className="p-2.5 rounded-xl border border-[#DADCE0] bg-white hover:bg-[#F8F9FA] text-[#202124] transition-colors shadow-xs cursor-pointer hover:border-[#0B8F4D]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Auto-Sliding Reviews Viewport with Drag & Swipe Support */}
        <div
          className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={isDragging ? handleTouchMove : undefined}
          onMouseUp={handleTouchEnd}
          onMouseLeave={() => {
            if (isDragging) handleTouchEnd();
            setPaused(false);
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none hidden sm:block absolute inset-y-0 left-0 w-8 z-10 bg-gradient-to-r from-[#F8FAF9] to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none hidden sm:block absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-[#F8FAF9] to-transparent"
          />
          <div
            className={`flex ${isDragging ? '' : 'transition-transform duration-500 ease-out'} -mx-2.5`}
            style={{
              width: `${(reviewsList.length * 100) / cardsPerView}%`,
              transform: `translateX(calc(-${(activeIndex * 100) / reviewsList.length}% + ${touchDeltaX}px))`,
            }}
          >
            {reviewsList.map((rev, idx) => {
              const avatarStyle = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
              const isGoogle = (rev.review_source || 'Google').toLowerCase() === 'google';

              return (
                <div
                  key={rev.id}
                  className="px-2.5 shrink-0"
                  style={{ width: `${100 / reviewsList.length}%` }}
                >
                  <article className="bg-white rounded-2xl border border-[#EAECEF] p-6 h-full flex flex-col justify-between shadow-xs hover:border-[#0B8F4D]/35 transition-colors">
                    <div>
                      {/* Reviewer Top Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div
                              className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center ${avatarStyle}`}
                            >
                              {rev.customer_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white shadow-xs flex items-center justify-center border border-[#EEEEEE]">
                              {isGoogle ? (
                                <GoogleGLogo className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-[#0B8F4D]" />
                              )}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#202124] truncate">
                              {rev.customer_name}
                            </p>
                            <p className="text-[11px] text-[#5F6368] truncate">
                              {rev.reviewer_location || 'Kolkata'} ·{' '}
                              <span>{formatReviewDate(rev.created_at)}</span>
                            </p>
                          </div>
                        </div>

                        {isGoogle ? (
                          <GoogleGLogo className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <span className="text-[11px] font-semibold text-[#0B8F4D] shrink-0">
                            Verified Order
                          </span>
                        )}
                      </div>

                      {/* Star Rating Row */}
                      <div className="flex items-center gap-1.5 mt-3.5 mb-2.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                rev.rating >= star
                                  ? 'fill-[#FBBC04] text-[#FBBC04]'
                                  : 'fill-[#E0E0E0] text-[#E0E0E0]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-[#202124] font-num">
                          {Number(rev.rating).toFixed(1)}
                        </span>
                      </div>

                      {/* Review Comment */}
                      <p className="text-sm text-[#3C4043] leading-relaxed line-clamp-4">
                        &ldquo;{rev.comment}&rdquo;
                      </p>

                      {/* Official TrimPlate Kitchen Reply if present */}
                      {rev.admin_reply && (
                        <div className="mt-3.5 pt-3 border-t border-[#F1F3F4] text-xs text-[#5F6368]">
                          <p className="font-bold text-[#123B16] flex items-center gap-1 mb-0.5">
                            <CornerDownRight className="w-3 h-3 text-[#0B8F4D]" />
                            Response from TrimPlate Kitchen
                          </p>
                          <p className="leading-relaxed">{rev.admin_reply}</p>
                        </div>
                      )}
                    </div>

                    {/* Dish Link Footer if tied to a specific menu item */}
                    {rev.product_name && (
                      <div className="mt-4 pt-3 border-t border-[#F4F5F6] flex items-center justify-between text-xs">
                        <span className="text-[#777777] truncate">
                          Reviewed:{' '}
                          {rev.product_slug ? (
                            <Link
                              to={`/product/${rev.product_slug}`}
                              className="font-semibold text-[#0B8F4D] hover:underline"
                            >
                              {rev.product_name}
                            </Link>
                          ) : (
                            <strong className="text-[#202124]">{rev.product_name}</strong>
                          )}
                        </span>
                      </div>
                    )}
                  </article>
                </div>
              );
            })}
          </div>
        </div>

        {/* Slide Progress Dots, Counter & Swipe Tip */}
        {maxStartIndex > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-2">
            <p className="text-xs text-[#5F6368] font-medium">
              Showing <strong className="text-[#202124] font-num">{activeIndex + 1}</strong>–
              <strong className="text-[#202124] font-num">
                {Math.min(activeIndex + cardsPerView, reviewsList.length)}
              </strong>{' '}
              of <strong className="text-[#202124] font-num">{reviewsList.length}</strong> Google reviews
            </p>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: maxStartIndex + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    setPaused(true);
                    setTimeout(() => setPaused(false), 4000);
                  }}
                  aria-label={`Go to review slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === idx
                      ? 'w-7 bg-[#0B8F4D]'
                      : 'w-2 bg-[#CFD8D3] hover:bg-[#9AA9A1]'
                  }`}
                />
              ))}
            </div>
            <div className="text-[11px] font-medium text-[#777777] hidden md:block">
              ← Drag or swipe horizontally to slide →
            </div>
          </div>
        )}
      </FadeIn>

      {/* Write a Customer Review Modal (Individual One-Time Item Review · Immediate Publish) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 animate-tp-fade-in">
          <div className="bg-white rounded-3xl border border-[#EEEEEE] shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-tp-scale-fade">
            <div className="flex items-start justify-between gap-4 border-b border-[#EEEEEE] pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#202124]">
                  Share Your TrimPlate Experience
                </h3>
                <p className="text-xs text-[#777777] mt-0.5">
                  Rate any ordered item once — your verified rating is recorded immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubmittedNotice('');
                  setModalOpen(false);
                }}
                className="p-1.5 rounded-xl text-[#777777] hover:bg-[#F5F6F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submittedNotice ? (
              <div className="bg-[#E8F5E9] border border-[#0B8F4D]/30 rounded-2xl p-6 text-center space-y-3">
                <CheckCircle2 className="w-11 h-11 text-[#0B8F4D] mx-auto" />
                <p className="text-base font-extrabold text-[#123B16]">{submittedNotice}</p>
                <p className="text-xs text-[#3C4043] leading-relaxed">
                  We truly appreciate your feedback! Your verified rating is now live.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedNotice('');
                    setModalOpen(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
                >
                  Done
                </button>
              </div>
            ) : !user ? (
              <div className="space-y-4 py-2 text-center">
                <p className="text-xs text-[#555555] leading-relaxed">
                  Please sign in to rate an ordered item from your account. Each ordered item can be reviewed once.
                </p>
                <Link
                  to="/login?redirect=/account?tab=orders"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
                >
                  Sign In to Rate Your Order
                </Link>
              </div>
            ) : unreviewedOrders.length === 0 ? (
              <div className="bg-[#F8FAF9] border border-[#E6EAE8] rounded-2xl p-5 space-y-2.5 text-center">
                <CheckCircle2 className="w-8 h-8 text-[#0B8F4D] mx-auto" />
                <p className="text-sm font-bold text-[#202124]">
                  {myOrders.length > 0
                    ? 'Thank You for Your Reviews!'
                    : 'No Orders Available to Review Yet'}
                </p>
                <p className="text-xs text-[#666666] leading-relaxed">
                  {myOrders.length > 0
                    ? 'You have already shared your one-time review for each eligible ordered item.'
                    : 'Place an order first — each ordered item unlocks one verified customer review.'}
                </p>
                <Link
                  to="/account?tab=orders"
                  onClick={() => setModalOpen(false)}
                  className="inline-block text-xs font-bold text-[#0B8F4D] hover:underline pt-1"
                >
                  View My Orders →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Select Order *
                  </label>
                  <select
                    required
                    value={reviewForm.order_id}
                    onChange={(e) => {
                      const nextOrd = unreviewedOrders.find((o) => String(o.id) === e.target.value);
                      const firstItem = nextOrd?.items.find(
                        (it) => !isOrderItemReviewed(nextOrd.id, it, myReviews)
                      );
                      setReviewForm({
                        ...reviewForm,
                        order_id: e.target.value,
                        order_item_id: firstItem ? String(firstItem.id) : '',
                        product_id: firstItem?.product_id ? String(firstItem.product_id) : '',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs font-semibold bg-white"
                  >
                    {unreviewedOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        Order #{o.order_code} · {formatINR(o.total_amount)} ({o.order_status})
                      </option>
                    ))}
                  </select>
                </div>

                {unreviewedModalItems.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Select Individual Item to Review *
                    </label>
                    <select
                      value={reviewForm.order_item_id}
                      onChange={(e) => {
                        const chosen = unreviewedModalItems.find(
                          (it) => String(it.id) === e.target.value
                        );
                        setReviewForm({
                          ...reviewForm,
                          order_item_id: e.target.value,
                          product_id: chosen?.product_id ? String(chosen.product_id) : '',
                        });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                    >
                      {unreviewedModalItems.map((it) => (
                        <option key={it.id} value={String(it.id)}>
                          {it.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1.5">
                      Your Star Rating *
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className={`p-2 rounded-xl border transition-colors ${
                            reviewForm.rating >= star
                              ? 'bg-amber-50 border-amber-300 text-[#FBBC04]'
                              : 'bg-white border-[#EEEEEE] text-[#CCCCCC]'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Area / City
                    </label>
                    <input
                      type="text"
                      value={reviewForm.reviewer_location}
                      onChange={(e) =>
                        setReviewForm({ ...reviewForm, reviewer_location: e.target.value })
                      }
                      placeholder="e.g. Salt Lake, Kolkata"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Your Feedback (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Share a quick note about freshness, taste, or portion macros..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#F5F6F7] text-xs font-bold text-[#202124]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function FooterTrustpilotWidget() {
  const { site } = useSite();
  const s = site.settings;

  if (s.trustpilot_enabled === '0') return null;

  const dynamicAvg = site.reviewStats?.avgRating ? Number(site.reviewStats.avgRating) : 4.9;
  const customScore = s.trustpilot_score ? Number(s.trustpilot_score) : NaN;
  const score = !Number.isNaN(customScore) && customScore > 0 ? customScore : dynamicAvg;

  const baseCount = Number(s.trustpilot_base_reviews ?? 128);
  const liveApprovedCount = site.reviewStats?.totalApprovedCount || 0;
  const totalTrustpilotReviews = Math.max(1, (Number.isNaN(baseCount) ? 128 : baseCount) + liveApprovedCount);

  const ratingLabel =
    score >= 4.5 ? 'Excellent' : score >= 3.8 ? 'Great' : score >= 3.0 ? 'Average' : 'Rated';

  const trustpilotUrl = s.trustpilot_url || 'https://www.trustpilot.com/review/trimplate.in';

  return (
    <a
      href={trustpilotUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/12 transition-colors group"
      aria-label={`Trustpilot ${ratingLabel} ${score.toFixed(1)} out of 5 based on ${totalTrustpilotReviews} reviews`}
    >
      {/* Trustpilot Brand Wordmark + Signature Emerald Star */}
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#00B67A"
            d="M12 1.5l3.09 6.26L22 8.77l-5 4.87 1.18 6.88L12 17.27l-6.18 3.25L7 13.64 2 8.77l6.91-1.01L12 1.5z"
          />
        </svg>
        <span className="text-sm font-extrabold tracking-tight text-white">Trustpilot</span>
      </div>

      {/* 5 Signature Trustpilot Emerald Star Boxes */}
      <div className="flex items-center gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((box) => {
          const filled = score >= box - 0.25;
          const half = !filled && score >= box - 0.75;
          return (
            <span
              key={box}
              className={`w-5 h-5 rounded-[3px] flex items-center justify-center ${
                filled
                  ? 'bg-[#00B67A]'
                  : half
                  ? 'bg-gradient-to-r from-[#00B67A] from-50% to-white/20 to-50%'
                  : 'bg-white/20'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#FFFFFF"
                  d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77 5.82 21 7 14.14 2 9.27l7.1-1.01L12 2z"
                />
              </svg>
            </span>
          );
        })}
      </div>

      {/* TrustScore & Review Count */}
      <div className="flex items-center gap-2 text-xs text-white/85">
        <span className="font-bold text-white">{ratingLabel}</span>
        <span className="text-white/40">·</span>
        <span>
          TrustScore <strong className="font-num text-white">{score.toFixed(1)}</strong>
        </span>
        <span className="text-white/40">·</span>
        <span className="underline decoration-white/30 group-hover:decoration-[#00B67A] font-num">
          {totalTrustpilotReviews} reviews
        </span>
      </div>
    </a>
  );
}
