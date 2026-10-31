import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronRight, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { cachedGet, peekCached, extractApiError } from '../services/api';
import { Product, Category, CustomMenu } from '../types';
import { useSite } from '../context/SiteContext';
import { SEOHead } from '../components/SEOHead';
import { WebsiteProductCard } from '../components/WebsiteProductCard';
import { FadeIn } from '../components/FadeIn';
import { TrimPlateMarqueeStrip } from '../components/BrandMarqueeAndHighlights';
import { resolveFoodImage } from '../assets/mediaMap';

interface MenuCatalogPageProps {
  division?: string;
}

export function MenuCatalogPage({ division: propDivision }: MenuCatalogPageProps) {
  const { slug } = useParams<{ slug?: string }>();
  const { site } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolve custom menu metadata instantaneously from bootstrap if available
  const bootstrapMenu = useMemo(
    () => (slug ? (site.customMenus || []).find((m) => m.slug === slug) || null : null),
    [slug, site.customMenus]
  );

  const [fetchedCustomMenu, setFetchedCustomMenu] = useState<CustomMenu | null>(null);
  const customMenu = bootstrapMenu || fetchedCustomMenu;

  const activeDivision = propDivision || customMenu?.division_name || '';

  // Instantaneous initial state from SWR cache or SiteBootstrap!
  const [products, setProducts] = useState<Product[]>(() => {
    const allCached = peekCached<Product[]>('/products');
    if (allCached && activeDivision) {
      return allCached.filter((p) => p.menu_division === activeDivision);
    }
    if (activeDivision) {
      return peekCached<Product[]>('/products', { division: activeDivision }) || [];
    }
    return [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const sourceCats = site.categories && site.categories.length > 0
      ? site.categories
      : peekCached<Category[]>('/categories') || [];
    return activeDivision ? sourceCats.filter((c) => c.menu_division === activeDivision) : [];
  });

  const [loading, setLoading] = useState<boolean>(() => products.length === 0);
  const [loadError, setLoadError] = useState<string>('');
  const [menuNotFound, setMenuNotFound] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  const activeCategorySlug = searchParams.get('category') || 'all';
  const bannerTarget =
    activeDivision === 'Cafe Menu'
      ? 'cafe-menu'
      : activeDivision === 'Green Menu'
      ? 'green-menu'
      : slug || '';
  const banner = site.banners.find((b) => b.page_target === bannerTarget);

  const fetchCatalog = useCallback(async () => {
    setLoadError('');
    setMenuNotFound(false);

    try {
      let targetDivision = propDivision || bootstrapMenu?.division_name || '';

      if (!propDivision && slug && !bootstrapMenu) {
        try {
          const menuData = await cachedGet<CustomMenu>(`/menus/${slug}`, undefined, 30000);
          setFetchedCustomMenu(menuData);
          targetDivision = menuData.division_name;
        } catch {
          setMenuNotFound(true);
          setLoading(false);
          return;
        }
      }

      if (!targetDivision) {
        setLoading(false);
        return;
      }

      // Check full catalog cache first so switching tabs/menus resolves in 0ms
      const cachedAll = peekCached<Product[]>('/products');
      const cachedCats =
        site.categories && site.categories.length > 0
          ? site.categories
          : peekCached<Category[]>('/categories');

      if (cachedAll && cachedCats) {
        setProducts(cachedAll.filter((p) => p.menu_division === targetDivision));
        setCategories(cachedCats.filter((c) => c.menu_division === targetDivision));
        setLoading(false);
      } else {
        setLoading(true);
      }

      const [catsData, prodsData] = await Promise.all([
        cachedGet<Category[]>('/categories', undefined, 45000),
        cachedGet<Product[]>('/products', { division: targetDivision }, 45000),
      ]);

      setCategories(catsData.filter((c) => c.menu_division === targetDivision));
      setProducts(prodsData);
    } catch (err: any) {
      setLoadError(extractApiError(err, 'Unable to load menu items right now.'));
    } finally {
      setLoading(false);
    }
  }, [propDivision, slug, bootstrapMenu, site.categories]);

  useEffect(() => {
    setSearch('');
    fetchCatalog();
  }, [fetchCatalog]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (vegOnly && !p.is_veg) return false;
      if (activeCategorySlug !== 'all' && p.category_slug !== activeCategorySlug) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, vegOnly, activeCategorySlug, search]);

  if (menuNotFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-5">
        <SEOHead title="Menu Not Found" />
        <div className="w-14 h-14 rounded-2xl bg-[#FFF8ED] text-[#0B8F4D] flex items-center justify-center mx-auto">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202124]">
          This Menu Is Currently Unavailable
        </h1>
        <p className="text-sm text-[#777777] max-w-md mx-auto">
          The requested menu may have been renamed or temporarily paused by our kitchen team. Explore
          our active Green Menu and Cafe Menu below.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to="/green-menu"
            className="px-6 py-3 rounded-xl bg-[#0B8F4D] text-white text-sm font-bold"
          >
            Explore Green Menu
          </Link>
          <Link
            to="/cafe-menu"
            className="px-6 py-3 rounded-xl border border-[#EEEEEE] text-[#202124] text-sm font-semibold hover:bg-[#F5F6F7]"
          >
            Explore Cafe Menu
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = customMenu?.name || banner?.title || activeDivision || 'TrimPlate Menu';
  const pageSubtitle =
    customMenu?.subtitle ||
    banner?.subtitle ||
    (activeDivision === 'Cafe Menu'
      ? 'TrimPlate Culinary Cafe'
      : activeDivision === 'Green Menu'
      ? 'Wholesome Daily Nutrition'
      : customMenu?.badge_text || 'Specialty Menu');
  const pageDescription =
    customMenu?.description ||
    banner?.description ||
    (activeDivision === 'Cafe Menu'
      ? 'Artisanal multigrain sandwiches, whole-wheat pasta, toasts, refreshing mocktails & specialty coffee.'
      : 'Good morning juices, wholesome breakfasts, balanced lunches, sprouts chaat & light dinners.');
  const heroBgColor =
    customMenu?.bg_color ||
    banner?.bg_color ||
    (activeDivision === 'Cafe Menu' ? '#FFF8ED' : '#123B16');
  const heroIsLightBg =
    heroBgColor.toUpperCase() === '#FFF8ED' ||
    heroBgColor.toUpperCase() === '#FFFFFF' ||
    heroBgColor.toUpperCase() === '#E8F5E9';
  const heroImageKey =
    customMenu?.image_url ||
    banner?.image_url ||
    (activeDivision === 'Cafe Menu' ? 'cafe_sandwich' : 'hero_slide_green');

  return (
    <div className="bg-white min-h-screen">
      <SEOHead title={pageTitle} description={pageDescription} ogImage={heroImageKey} />

      {/* Page Hero Banner (Supports Core Menus & Unlimited Future Custom Menus) */}
      <section
        className="relative overflow-hidden border-b border-[#EEEEEE]"
        style={{ backgroundColor: heroBgColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <nav
              className={`flex items-center gap-1.5 text-xs ${
                heroIsLightBg ? 'text-[#777777]' : 'text-white/75'
              }`}
            >
              <Link to="/" className="hover:underline">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span
                className={
                  heroIsLightBg ? 'text-[#0B8F4D] font-semibold' : 'text-[#8CCB16] font-semibold'
                }
              >
                {customMenu?.name || activeDivision}
              </span>
            </nav>

            <p
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                heroIsLightBg ? 'text-[#0B8F4D]' : 'text-[#8CCB16]'
              }`}
            >
              {pageSubtitle}
            </p>
            <h1
              className={`text-3xl sm:text-5xl font-extrabold leading-tight ${
                heroIsLightBg ? 'text-[#123B16]' : 'text-white'
              }`}
            >
              {pageTitle}
            </h1>
            <p
              className={`text-sm sm:text-base max-w-2xl leading-relaxed ${
                heroIsLightBg ? 'text-[#555555]' : 'text-white/85'
              }`}
            >
              {pageDescription}
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="aspect-[16/10] rounded-3xl overflow-hidden shadow-lg border border-white/15 bg-black/10">
              <img
                src={resolveFoodImage(heroImageKey)}
                alt={pageTitle}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <TrimPlateMarqueeStrip />

      {/* Category Filter Bar + Search + Pure Veg Toggle */}
      <div className="sticky top-16 sm:top-20 z-30 bg-white/95 backdrop-blur-md border-b border-[#EEEEEE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#0B8F4D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${customMenu?.name || activeDivision} dishes...`}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7F8F9] border border-[#EEEEEE] text-sm outline-none focus:border-[#0B8F4D] focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setVegOnly((v) => !v)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  vegOnly
                    ? 'bg-[#E8F5E9] border-[#0B8F4D] text-[#123B16]'
                    : 'bg-white border-[#EEEEEE] text-[#202124] hover:border-[#0B8F4D]'
                }`}
              >
                <span className="w-3 h-3 rounded-xs border border-[#0B8F4D] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0B8F4D]" />
                </span>
                Pure Veg Only
              </button>

              <span className="text-xs font-semibold text-[#777777] font-num">
                {filteredProducts.length} items
              </span>
            </div>
          </div>

          {/* Horizontal Category Tabs */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeCategorySlug === 'all'
                    ? 'bg-[#0B8F4D] text-white'
                    : 'bg-[#F5F6F7] text-[#202124] hover:bg-[#E8F5E9]'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSearchParams({ category: cat.slug })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    activeCategorySlug === cat.slug
                      ? 'bg-[#0B8F4D] text-white'
                      : 'bg-[#F5F6F7] text-[#202124] hover:bg-[#E8F5E9]'
                  }`}
                >
                  {cat.name}
                  {typeof cat.product_count === 'number' ? ` (${cat.product_count})` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <FadeIn className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loadError && products.length === 0 ? (
          <div className="text-center py-16 bg-[#FFF8ED] rounded-3xl border border-[#EEEEEE] p-8 space-y-3">
            <p className="text-base font-bold text-[#202124]">{loadError}</p>
            <button
              type="button"
              onClick={fetchCatalog}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              <RefreshCw className="w-4 h-4" /> Retry Loading Menu
            </button>
          </div>
        ) : loading && products.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-80 rounded-2xl bg-[#F5F6F7] animate-pulse border border-[#EEEEEE]"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#FFF8ED] rounded-3xl border border-[#EEEEEE] p-8 space-y-3">
            <SlidersHorizontal className="w-10 h-10 text-[#0B8F4D] mx-auto" />
            <h3 className="text-lg font-bold text-[#202124]">
              {products.length === 0
                ? `Dishes for ${customMenu?.name || activeDivision} are being plated`
                : 'No dishes match your current filter'}
            </h3>
            <p className="text-sm text-[#777777] max-w-md mx-auto">
              {products.length === 0
                ? 'Our culinary team is updating dishes in this menu. Check back shortly or explore our Green & Cafe Menus.'
                : 'Try clearing your search keyword or switching to All Categories.'}
            </p>
            {products.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setVegOnly(false);
                  setSearchParams({});
                }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
              >
                Reset All Filters
              </button>
            ) : (
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  to="/green-menu"
                  className="px-5 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
                >
                  Browse Green Menu
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <WebsiteProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </FadeIn>
    </div>
  );
}
