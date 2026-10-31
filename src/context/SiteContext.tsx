import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, cachedGet, invalidateApiCache } from '../services/api';
import { Category, Product, SiteBootstrap } from '../types';
import { useRealtime } from '../hooks/useRealtime';

interface SiteContextValue {
  site: SiteBootstrap;
  loading: boolean;
  refreshSite: () => Promise<void>;
}

const DEFAULT_BOOTSTRAP: SiteBootstrap = {
  settings: {
    site_name: 'TrimPlate',
    tagline: 'Eat Smart. Stay Trim.',
    currency_symbol: '₹',
    delivery_charge: '40',
    free_delivery_threshold: '599',
    tax_percentage: '5',
    phone: '+91 98300 45120',
    whatsapp_order_number: '919830045120',
    whatsapp_order_enabled: '1',
    email: 'hello@trimplate.in',
    address: '24 Park Street, Park Circus, Kolkata - 700016',
    business_hours: 'Mon – Sun: 7:30 AM – 10:30 PM',
    announcement_enabled: '1',
    announcement_text: 'Fresh Macro-Balanced Meals Crafted Daily in Kolkata — Subscribe & Save up to 20%!',
    announcement_delivery_info: 'Free Express Delivery on Orders Above ₹599',
    upi_id: 'trimplate.kitchen@okicici',
    cod_enabled: '1',
    upi_enabled: '1',
  },
  navigation: [],
  customMenus: [],
  categories: [],
  heroSlides: [],
  homepageSections: [],
  banners: [],
  activeOffers: [],
  testimonials: [],
  approvedReviews: [],
  gallery: [],
  plans: [],
  dietitians: [],
};

const SiteContext = createContext<SiteContextValue>({
  site: DEFAULT_BOOTSTRAP,
  loading: true,
  refreshSite: async () => {},
});

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [site, setSite] = useState<SiteBootstrap>(DEFAULT_BOOTSTRAP);
  const [loading, setLoading] = useState(true);

  const warmCatalogCache = useCallback(() => {
    // Background warm-prefetch so navigating between Home, Green Menu, Cafe Menu, Diet/Gym, and Custom Menus is instant
    cachedGet<Product[]>('/products', undefined, 60000).catch(() => {});
    cachedGet<Category[]>('/categories', undefined, 60000).catch(() => {});
  }, []);

  const refreshSite = useCallback(async () => {
    try {
      invalidateApiCache('/site/bootstrap');
      const { data } = await api.get<SiteBootstrap>('/site/bootstrap');
      setSite(data);
      warmCatalogCache();
    } catch {
      // keep fallback settings if offline
    } finally {
      setLoading(false);
    }
  }, [warmCatalogCache]);

  useEffect(() => {
    refreshSite();
  }, [refreshSite]);

  useRealtime(
    useCallback(
      (msg) => {
        if (
          msg.event === 'site_settings_updated' ||
          msg.event === 'review_updated' ||
          msg.event === 'product_updated'
        ) {
          invalidateApiCache();
          refreshSite();
        }
      },
      [refreshSite]
    )
  );

  return (
    <SiteContext.Provider value={{ site, loading, refreshSite }}>{children}</SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
