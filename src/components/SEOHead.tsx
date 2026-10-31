import { useEffect } from 'react';
import { useSite } from '../context/SiteContext';
import { resolveFoodImage } from '../assets/mediaMap';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
}

export function SEOHead({ title, description, ogImage }: SEOHeadProps) {
  const { site } = useSite();
  const s = site.settings;

  useEffect(() => {
    const finalTitle = title
      ? `${title} | ${s.business_name || s.site_name || 'TrimPlate'}`
      : s.default_seo_title || 'TrimPlate | Eat Smart. Stay Trim. – Healthy Food & Diet Meal Subscriptions';
    const finalDesc =
      description ||
      s.default_seo_description ||
      'Order fresh macro-balanced meals, wholesome sandwiches, salads, high-protein gym bowls and customizable daily diet subscriptions from TrimPlate.';
    const finalImg = resolveFoodImage(ogImage || s.default_og_image || 'hero_slide_feast');

    document.title = finalTitle;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', finalDesc);
    setMeta('meta[property="og:title"]', finalTitle);
    setMeta('meta[property="og:description"]', finalDesc);
    setMeta('meta[property="og:image"]', finalImg);
    setMeta('meta[name="twitter:title"]', finalTitle);
    setMeta('meta[name="twitter:description"]', finalDesc);
  }, [title, description, ogImage, s]);

  return null;
}
