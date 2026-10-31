import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { api, cachedGet, peekCached } from '../services/api';
import { CmsPage } from '../types';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { SEOHead } from '../components/SEOHead';
import { FadeIn } from '../components/FadeIn';
import { resolveFoodImage } from '../assets/mediaMap';

export function CmsContentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { site } = useSite();
  const { showToast } = useToast();

  const [page, setPage] = useState<CmsPage | null>(() =>
    slug ? peekCached<CmsPage>(`/pages/${slug}`) || null : null
  );
  const [loading, setLoading] = useState<boolean>(() => !page);

  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const cached = peekCached<CmsPage>(`/pages/${slug}`);
    if (cached) {
      setPage(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    cachedGet<CmsPage>(`/pages/${slug}`, undefined, 60000)
      .then((data) => setPage(data))
      .catch(() => {
        if (!cached) setPage(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post('/contact-inquiry', form);
      showToast(data.message || 'Message sent!');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not send message', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 space-y-4">
        <div className="h-10 w-64 bg-[#F5F6F7] rounded-xl animate-pulse" />
        <div className="h-48 bg-[#F5F6F7] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-extrabold text-[#202124]">Page Not Found</h1>
        <p className="text-sm text-[#777777]">The requested page does not exist or is unpublished.</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-xl bg-[#0B8F4D] text-white text-sm font-semibold"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const s = site.settings;
  const isContactPage = page.slug === 'contact-us';

  return (
    <div className="bg-white min-h-screen">
      <SEOHead
        title={page.seo_title || page.title}
        description={page.seo_description || page.hero_subtitle}
        ogImage={page.og_image || page.banner_image}
      />

      {/* Page Hero */}
      <section className="relative bg-[#123B16] text-white overflow-hidden">
        {page.banner_image && (
          <img
            src={resolveFoodImage(page.banner_image)}
            alt={page.title}
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <nav className="flex items-center gap-1.5 text-xs text-white/75 mb-3">
            <Link to="/" className="hover:text-white">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#8CCB16] font-semibold">{page.title}</span>
          </nav>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">{page.title}</h1>
          {page.hero_subtitle && (
            <p className="text-sm sm:text-lg text-white/85 mt-3 max-w-2xl leading-relaxed">
              {page.hero_subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Content Area */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        {isContactPage ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div
                className="prose prose-sm max-w-none text-[#777777] space-y-4 leading-relaxed [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#202124]"
                dangerouslySetInnerHTML={{ __html: page.content_html }}
              />

              <div className="bg-[#FFF8ED] rounded-3xl border border-[#EEEEEE] p-6 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#0B8F4D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#202124]">Central Kitchen & Studio</p>
                    <p className="text-[#777777]">{s.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#0B8F4D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#202124]">Phone & WhatsApp</p>
                    <p className="text-[#777777] font-num">{s.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#0B8F4D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#202124]">Email Desk</p>
                    <p className="text-[#777777]">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#0B8F4D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#202124]">Operating Hours</p>
                    <p className="text-[#777777]">{s.business_hours}</p>
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleContactSubmit}
              className="lg:col-span-7 bg-white rounded-3xl border border-[#EEEEEE] p-6 sm:p-8 shadow-xs space-y-4"
            >
              <h2 className="text-2xl font-extrabold text-[#202124]">Send Us a Message</h2>
              <p className="text-xs text-[#777777]">
                Questions about custom macros, corporate meal plans, or an existing order? Write to
                us below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#777777] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#777777] mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm font-num outline-none focus:border-[#0B8F4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#777777] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#777777] mb-1">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Diet Plan Consultation / Catering"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#777777] mb-1">
                  Your Message *
                </label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D]"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 bg-[#0B8F4D] hover:bg-[#09773F] text-white text-sm font-bold px-6 py-3.5 rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Submit Inquiry'}
              </button>
            </form>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-[#EEEEEE] p-6 sm:p-10 shadow-xs">
            <div
              className="space-y-4 text-sm sm:text-base text-[#444] leading-relaxed [&_h3]:text-xl [&_h3]:font-extrabold [&_h3]:text-[#123B16] [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: page.content_html }}
            />
          </div>
        )}
      </FadeIn>
    </div>
  );
}
