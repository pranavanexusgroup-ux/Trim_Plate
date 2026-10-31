import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Upload,
  Download,
  Search,
  CheckCircle2,
  X,
  MessageCircle,
  ExternalLink,
  Save,
  ArrowUp,
  ArrowDown,
  Images,
} from 'lucide-react';
import { api, formatINR, buildWhatsAppLink } from '../services/api';
import {
  Product,
  Category,
  CustomMenu,
  SubscriptionPlan,
  OrderRecord,
  SubscriptionRecord,
} from '../types';
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRealtime } from '../hooks/useRealtime';
import { MediaPickerField } from './MediaPickerField';
import { resolveFoodImage, getProductGalleryUrls } from '../assets/mediaMap';

const LABEL_OPTIONS = ['New Arrival', 'Bestseller', 'Featured', 'Special Offer', 'Limited Stock'];

// 1. PRODUCTS & MENU DIVISIONS MANAGER (WITH EXCEL IMPORT / EXPORT & DYNAMIC CUSTOM MENUS)
export function ProductsManager({
  presetDivision,
  presetDiet,
  titleOverride,
}: {
  presetDivision?: string;
  presetDiet?: 'diet' | 'gym';
  titleOverride?: string;
}) {
  const { refreshSite } = useSite();
  const { showToast, requestConfirm } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customMenus, setCustomMenus] = useState<CustomMenu[]>([]);
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);

  const load = () => {
    api
      .get<Product[]>('/products', {
        params: {
          division: presetDivision || 'all',
          diet: presetDiet || 'all',
          include_unavailable: '1',
        },
      })
      .then((r) => setProducts(r.data));
    api.get<Category[]>('/categories?all=1').then((r) => setCategories(r.data));
    api
      .get<CustomMenu[]>('/admin/menus')
      .then((r) => setCustomMenus(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    setDivisionFilter('all');
    load();
  }, [presetDivision, presetDiet]);

  const allDivisionOptions = React.useMemo(() => {
    const base = ['Green Menu', 'Cafe Menu'];
    for (const m of customMenus) {
      if (m.division_name && !base.includes(m.division_name)) {
        base.push(m.division_name);
      }
    }
    return base;
  }, [customMenus]);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Workbook = String(reader.result || '').split(',')[1];
      try {
        const { data } = await api.post('/admin/import-excel', { base64Workbook });
        showToast(`Imported ${data.importedCount} menu rows from Excel!`);
        load();
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Excel import failed', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportExcel = async () => {
    const { data } = await api.get('/admin/export-excel');
    const a = document.createElement('a');
    a.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.base64}`;
    a.download = data.filename;
    a.click();
    showToast('Exported Trimplate_Cafe_And_Green_Menu.xlsx');
  };

  const openCreateModal = () => {
    const defaultDiv = presetDivision || 'Green Menu';
    const defaultImg = defaultDiv === 'Cafe Menu' ? 'cafe_sandwich' : 'hero_bowl';
    const firstCat = categories.find((c) => c.menu_division === defaultDiv) || categories[0];
    setEditing({
      category_id: firstCat?.id || 1,
      menu_division: defaultDiv,
      name: '',
      description: '',
      price: '',
      is_veg: true,
      stock_qty: 50,
      display_labels: ['New Arrival'],
      diet_types: presetDiet ? [presetDiet] : [],
      meal_time: 'Lunch',
      is_available: true,
      image_key: defaultImg,
      custom_image_url: defaultImg,
      gallery_urls: [],
      seo_title: '',
      seo_description: '',
      nutrition: {
        calories_kcal: '',
        protein_g: '',
        carbs_g: '',
        fat_g: '',
        fiber_g: '',
        sugar_g: '',
        is_verified: 1,
      },
      variants: [],
    });
  };

  const openEditModal = (p: Product) => {
    const primaryImg =
      p.images?.find((i) => Number(i.is_primary) === 1)?.image_url ||
      p.custom_image_url ||
      p.image_key ||
      'hero_bowl';
    const extraGallery = (p.images || [])
      .filter((i) => Number(i.is_primary) !== 1 && i.image_url !== primaryImg)
      .map((i) => i.image_url);

    setEditing({
      ...p,
      price: p.price === null ? '' : p.price,
      custom_image_url: primaryImg,
      gallery_urls: extraGallery,
      nutrition: p.nutrition || {
        calories_kcal: '',
        protein_g: '',
        carbs_g: '',
        fat_g: '',
        fiber_g: '',
        sugar_g: '',
        is_verified: 1,
      },
      variants: p.variants || [],
    });
  };

  const handleBulkGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    e.target.value = '';

    const readAsDataUrl = (f: File) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(f);
      });

    const uploadedUrls: string[] = [];
    for (const file of files) {
      const dataUrl = await readAsDataUrl(file);
      if (dataUrl) {
        uploadedUrls.push(dataUrl);
        api
          .post('/cms/media', {
            title: file.name.replace(/\.[^.]+$/, ''),
            file_url: dataUrl,
            folder: 'Products',
            alt_text: file.name,
          })
          .catch(() => {});
      }
    }

    if (uploadedUrls.length > 0) {
      setEditing((prev: any) =>
        prev
          ? {
              ...prev,
              gallery_urls: [...(prev.gallery_urls || []), ...uploadedUrls],
            }
          : prev
      );
      showToast(
        `${uploadedUrls.length} gallery ${uploadedUrls.length === 1 ? 'photo' : 'photos'} added to slider`
      );
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name) return;
    if (editing.id) {
      await api.put(`/products/${editing.id}`, editing);
      showToast('Product updated');
    } else {
      await api.post('/products', editing);
      showToast('New product added to catalog');
    }
    setEditing(null);
    load();
    refreshSite();
  };

  const filtered = products.filter((p) => {
    if (!presetDivision && divisionFilter !== 'all' && p.menu_division !== divisionFilter) {
      return false;
    }
    return (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category_name.toLowerCase().includes(search.toLowerCase()) ||
      p.menu_division.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">
            {titleOverride || 'Products & Menu Catalog'} ({filtered.length})
          </h2>
          <p className="text-xs text-[#777777]">
            Add/edit dishes across Green Menu, Cafe Menu &amp; any Custom Menu, with variants, macros &amp; Excel sync.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#123B16] text-xs font-bold text-[#123B16] cursor-pointer hover:bg-[#F5F6F7]">
            <Upload className="w-4 h-4" /> Import Excel (.xlsx)
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
          </label>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] bg-white text-xs font-bold text-[#202124]"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Search & Menu Division Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name, category or menu..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#EEEEEE] text-xs outline-none focus:border-[#0B8F4D]"
          />
        </div>
        {!presetDivision && (
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-[#EEEEEE] text-xs font-bold text-[#202124]"
          >
            <option value="all">All Menu Divisions</option>
            {allDivisionOptions.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Product Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
              <h3 className="text-lg font-extrabold text-[#202124]">
                {editing.id ? `Edit ${editing.name}` : 'Create New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg hover:bg-[#F5F6F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  Price (₹) — Leave blank if seasonal
                </label>
                <input
                  type="number"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                  placeholder="e.g. 149"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-sm font-num"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Menu Division</label>
                <select
                  value={editing.menu_division}
                  onChange={(e) => {
                    const div = e.target.value;
                    const cat = categories.find((c) => c.menu_division === div);
                    setEditing({
                      ...editing,
                      menu_division: div,
                      category_id: cat ? cat.id : editing.category_id,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  {allDivisionOptions.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Category</label>
                <select
                  value={editing.category_id}
                  onChange={(e) =>
                    setEditing({ ...editing, category_id: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  {categories
                    .filter((c) => c.menu_division === editing.menu_division)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Meal Time</label>
                <select
                  value={editing.meal_time || 'All Day'}
                  onChange={(e) => setEditing({ ...editing, meal_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  <option value="All Day">All Day</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Stock Portions</label>
                <input
                  type="number"
                  value={editing.stock_qty}
                  onChange={(e) => setEditing({ ...editing, stock_qty: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Food Type</label>
                <select
                  value={editing.is_veg ? 'veg' : 'nonveg'}
                  onChange={(e) => setEditing({ ...editing, is_veg: e.target.value === 'veg' })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  <option value="veg">Pure Vegetarian</option>
                  <option value="nonveg">Egg / Chicken / Fish</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Availability</label>
                <select
                  value={editing.is_available ? '1' : '0'}
                  onChange={(e) =>
                    setEditing({ ...editing, is_available: e.target.value === '1' })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  <option value="1">Available</option>
                  <option value="0">Unavailable</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                />
              </div>

              {/* Product Display Labels */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1.5">Product Badges / Labels</label>
                <div className="flex flex-wrap gap-2">
                  {LABEL_OPTIONS.map((lbl) => {
                    const active = (editing.display_labels || []).includes(lbl);
                    return (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? editing.display_labels.filter((x: string) => x !== lbl)
                            : [...(editing.display_labels || []), lbl];
                          setEditing({ ...editing, display_labels: next });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                          active
                            ? 'bg-[#0B8F4D] border-[#0B8F4D] text-white'
                            : 'border-[#EEEEEE] text-[#777777]'
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Diet Tags */}
              <div>
                <label className="block text-xs font-bold mb-1.5">Diet / Gym Tags</label>
                <div className="flex flex-wrap gap-2">
                  {['diet', 'gym', 'sugar-control'].map((dt) => {
                    const active = (editing.diet_types || []).includes(dt);
                    return (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? editing.diet_types.filter((x: string) => x !== dt)
                            : [...(editing.diet_types || []), dt];
                          setEditing({ ...editing, diet_types: next });
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                          active
                            ? 'bg-[#123B16] border-[#123B16] text-white'
                            : 'border-[#EEEEEE] text-[#777777]'
                        }`}
                      >
                        {dt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Image & Multi-Image Product Gallery Slider */}
              <div className="sm:col-span-3 space-y-4 rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA] p-4">
                <MediaPickerField
                  label="Primary Dish Image (Slide #1 — Main Cover Photo)"
                  value={editing.custom_image_url || editing.image_key || 'hero_bowl'}
                  onChange={(u) => setEditing({ ...editing, custom_image_url: u })}
                  folder="Products"
                />

                <div className="pt-3 border-t border-[#E8ECE9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#123B16] flex items-center gap-1.5">
                        <Images className="w-4 h-4 text-[#0B8F4D]" />
                        Additional Product Slider Images (
                        <span className="font-num">
                          {1 + (editing.gallery_urls || []).filter((u: string) => Boolean(u && u.trim())).length}
                        </span>{' '}
                        total photos)
                      </p>
                      <p className="text-[11px] text-[#777777]">
                        Customers can click left/right arrows on product cards &amp; detail pages to slide through all photos.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Upload Multiple Photos
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleBulkGalleryUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            gallery_urls: [...(editing.gallery_urls || []), 'quinoa_avocado'],
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#0B8F4D] text-[#0B8F4D] hover:bg-[#E8F5E9] text-xs font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Gallery Photo
                      </button>
                    </div>
                  </div>

                  {(editing.gallery_urls || []).length === 0 ? (
                    <p className="text-xs text-[#777777] bg-white rounded-xl border border-dashed border-[#DADCE0] p-3 text-center">
                      No extra slider photos added yet. Click &ldquo;Upload Multiple Photos&rdquo; or &ldquo;Add Gallery Photo&rdquo; to add more angles.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {(editing.gallery_urls || []).map((gUrl: string, gIdx: number) => (
                        <div
                          key={`gal-${gIdx}`}
                          className="bg-white rounded-xl border border-[#EEEEEE] p-3 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-extrabold text-[#123B16] font-num">
                              Slider Photo #{gIdx + 2}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const prevPrimary =
                                    editing.custom_image_url || editing.image_key || 'hero_bowl';
                                  const nextGallery = [...editing.gallery_urls];
                                  nextGallery[gIdx] = prevPrimary;
                                  setEditing({
                                    ...editing,
                                    custom_image_url: gUrl,
                                    gallery_urls: nextGallery,
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-[#E8F5E9] text-[#0B8F4D] text-[11px] font-bold hover:bg-[#0B8F4D] hover:text-white transition-colors"
                              >
                                Make Primary
                              </button>
                              <button
                                type="button"
                                disabled={gIdx === 0}
                                onClick={() => {
                                  if (gIdx === 0) return;
                                  const copy = [...editing.gallery_urls];
                                  const tmp = copy[gIdx - 1];
                                  copy[gIdx - 1] = copy[gIdx];
                                  copy[gIdx] = tmp;
                                  setEditing({ ...editing, gallery_urls: copy });
                                }}
                                title="Move earlier in slider"
                                className="p-1 rounded-lg border border-[#EEEEEE] text-[#202124] disabled:opacity-35 hover:bg-[#F5F6F7]"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={gIdx === editing.gallery_urls.length - 1}
                                onClick={() => {
                                  if (gIdx >= editing.gallery_urls.length - 1) return;
                                  const copy = [...editing.gallery_urls];
                                  const tmp = copy[gIdx + 1];
                                  copy[gIdx + 1] = copy[gIdx];
                                  copy[gIdx] = tmp;
                                  setEditing({ ...editing, gallery_urls: copy });
                                }}
                                title="Move later in slider"
                                className="p-1 rounded-lg border border-[#EEEEEE] text-[#202124] disabled:opacity-35 hover:bg-[#F5F6F7]"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditing({
                                    ...editing,
                                    gallery_urls: editing.gallery_urls.filter(
                                      (_: string, idx: number) => idx !== gIdx
                                    ),
                                  })
                                }
                                title="Remove photo"
                                className="p-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <MediaPickerField
                            label={`Photo #${gIdx + 2} Source`}
                            value={gUrl}
                            onChange={(nextUrl) => {
                              const copy = [...editing.gallery_urls];
                              copy[gIdx] = nextUrl;
                              setEditing({ ...editing, gallery_urls: copy });
                            }}
                            folder="Products"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Variants */}
              <div className="sm:col-span-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold">Portion / Size Variants (Optional)</label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        variants: [
                          ...(editing.variants || []),
                          { variant_name: '', price: '' },
                        ],
                      })
                    }
                    className="text-xs font-bold text-[#0B8F4D]"
                  >
                    + Add Variant
                  </button>
                </div>
                {(editing.variants || []).map((v: any, i: number) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Size (e.g. Veg / Chicken / Large)"
                      value={v.variant_name}
                      onChange={(e) => {
                        const copy = [...editing.variants];
                        copy[i] = { ...copy[i], variant_name: e.target.value };
                        setEditing({ ...editing, variants: copy });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#EEEEEE] text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Price ₹"
                      value={v.price}
                      onChange={(e) => {
                        const copy = [...editing.variants];
                        copy[i] = { ...copy[i], price: e.target.value };
                        setEditing({ ...editing, variants: copy });
                      }}
                      className="w-28 px-3 py-1.5 rounded-xl border border-[#EEEEEE] text-xs font-num"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          variants: editing.variants.filter((_: any, idx: number) => idx !== i),
                        })
                      }
                      className="text-red-600 text-xs font-bold px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Verified Nutrition */}
              <div className="sm:col-span-3 bg-[#FFF8ED] rounded-2xl p-4 space-y-2 border border-[#EEEEEE]">
                <label className="block text-xs font-bold text-[#123B16]">
                  Verified Nutritional Information (Optional — Leave blank if unverified)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    ['calories_kcal', 'kcal'],
                    ['protein_g', 'Protein g'],
                    ['carbs_g', 'Carbs g'],
                    ['fat_g', 'Fat g'],
                    ['fiber_g', 'Fiber g'],
                    ['sugar_g', 'Sugar g'],
                  ].map(([field, placeholder]) => (
                    <input
                      key={field}
                      type="number"
                      placeholder={placeholder}
                      value={editing.nutrition?.[field] ?? ''}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          nutrition: { ...editing.nutrition, [field]: e.target.value },
                        })
                      }
                      className="px-2.5 py-2 rounded-xl bg-white border border-[#EEEEEE] text-xs font-num"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#EEEEEE]">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2.5 rounded-xl bg-[#F5F6F7] text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Data Table */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAFAFA] text-[#777777]">
              <tr>
                <th className="px-5 py-3.5">Dish</th>
                <th className="px-5 py-3.5">Division / Category</th>
                <th className="px-5 py-3.5">Price</th>
                <th className="px-5 py-3.5">Stock</th>
                <th className="px-5 py-3.5">Labels</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE]">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveFoodImage(p.image_key, p.custom_image_url)}
                        alt={p.name}
                        className="w-11 h-11 rounded-xl object-cover border border-[#EEEEEE]"
                      />
                      <div>
                        <p className="font-bold text-[#202124]">{p.name}</p>
                        <p className="text-[11px] text-[#777777]">
                          {p.is_veg ? 'Veg' : 'Non-Veg'} · {p.meal_time} ·{' '}
                          <span className="text-[#0B8F4D] font-semibold font-num">
                            {getProductGalleryUrls(p).length} photos
                          </span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-[#123B16]">{p.menu_division}</p>
                    <p className="text-[#777777]">{p.category_name}</p>
                  </td>
                  <td className="px-5 py-3.5 font-num font-bold text-[#0B8F4D]">
                    {p.price === null ? 'Unpriced' : formatINR(p.price)}
                  </td>
                  <td className="px-5 py-3.5 font-num">
                    <span className={p.stock_qty <= 10 ? 'text-amber-600 font-bold' : ''}>
                      {p.stock_qty}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#777777]">
                    {p.display_labels.join(', ') || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-1.5 rounded-lg hover:bg-[#F5F6F7] text-[#0B8F4D]"
                    >
                      <Edit3 className="w-4 h-4 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: 'Delete Product?',
                          message: `Permanently delete "${p.name}"?`,
                          destructive: true,
                          onConfirm: async () => {
                            await api.delete(`/products/${p.id}`);
                            load();
                          },
                        })
                      }
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 2. CATEGORIES MANAGER
export function CategoriesManager() {
  const { showToast, requestConfirm } = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [customMenus, setCustomMenus] = useState<CustomMenu[]>([]);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const load = () => {
    api.get<Category[]>('/categories?all=1').then((r) => setCats(r.data));
    api
      .get<CustomMenu[]>('/admin/menus')
      .then((r) => setCustomMenus(r.data))
      .catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  const allDivisionOptions = React.useMemo(() => {
    const base = ['Green Menu', 'Cafe Menu'];
    for (const m of customMenus) {
      if (m.division_name && !base.includes(m.division_name)) {
        base.push(m.division_name);
      }
    }
    return base;
  }, [customMenus]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name) return;
    if (editing.id) {
      await api.put(`/categories/${editing.id}`, editing);
    } else {
      await api.post('/categories', editing);
    }
    setEditing(null);
    load();
    showToast('Category saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">Category & Subcategory Management</h2>
          <p className="text-xs text-[#777777]">
            Manage categories across Cafe Menu, Green Menu &amp; all Custom Menus.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              name: '',
              menu_division: 'Green Menu',
              description: '',
              image_key: 'hero_bowl',
              sort_order: 20,
              is_active: 1,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl border border-[#0B8F4D]/40 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={editing.name || ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Menu Division</label>
              <select
                value={editing.menu_division || 'Green Menu'}
                onChange={(e) => setEditing({ ...editing, menu_division: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
              >
                {allDivisionOptions.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Sort Order</label>
              <input
                type="number"
                value={editing.sort_order ?? 10}
                onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Visibility</label>
              <select
                value={editing.is_active ? '1' : '0'}
                onChange={(e) =>
                  setEditing({ ...editing, is_active: e.target.value === '1' ? 1 : 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
              >
                <option value="1">Visible</option>
                <option value="0">Hidden</option>
              </select>
            </div>
          </div>
          <MediaPickerField
            label="Category Image"
            value={editing.custom_image_url || editing.image_key || 'hero_bowl'}
            onChange={(u) => setEditing({ ...editing, custom_image_url: u })}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl bg-[#F5F6F7] text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              Save Category
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAFAFA] text-[#777777]">
            <tr>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Menu Division</th>
              <th className="px-5 py-3">Products</th>
              <th className="px-5 py-3">Sort</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {cats.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-3.5 font-bold">{c.name}</td>
                <td className="px-5 py-3.5">{c.menu_division}</td>
                <td className="px-5 py-3.5 font-num font-bold">{c.product_count ?? 0}</td>
                <td className="px-5 py-3.5 font-num">{c.sort_order}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      c.is_active ? 'bg-[#E8F5E9] text-[#0B8F4D]' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {c.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="font-bold text-[#0B8F4D]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      requestConfirm({
                        title: 'Delete Category?',
                        message: `Remove "${c.name}"?`,
                        destructive: true,
                        onConfirm: async () => {
                          try {
                            await api.delete(`/categories/${c.id}`);
                            load();
                          } catch (err: any) {
                            showToast(err.response?.data?.error || 'Cannot delete', 'error');
                          }
                        },
                      })
                    }
                    className="font-bold text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 3. SUBSCRIPTION PLANS MANAGER
export function SubscriptionPlansManager() {
  const { refreshSite } = useSite();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const load = () =>
    api.get<SubscriptionPlan[]>('/subscription-plans?all=1').then((r) => setPlans(r.data));
  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...editing,
      benefits:
        typeof editing.benefitsText === 'string'
          ? editing.benefitsText
              .split('\n')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : editing.benefits,
    };
    if (editing.id) {
      await api.put(`/subscription-plans/${editing.id}`, payload);
    } else {
      await api.post('/subscription-plans', payload);
    }
    setEditing(null);
    await load();
    await refreshSite();
    showToast('Subscription plan saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">Subscription Plan Builder</h2>
          <p className="text-xs text-[#777777]">
            Create unlimited custom durations, prices, badges & daily meal benefits.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              name: '10 Days',
              subtitle: 'Detox Plan',
              duration_days: 10,
              price: 899,
              original_price: 1099,
              badge_text: 'New Plan',
              card_theme: 'green',
              meals_included: 'Breakfast, Lunch, Snacks, Dinner',
              benefitsText: 'Daily fresh delivery\nPause or skip days anytime',
              is_active: true,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Create Plan
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl border border-[#0B8F4D]/40 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              required
              placeholder="Plan Title (e.g. 7 Days)"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
            <input
              type="text"
              placeholder="Subtitle (e.g. Healthy Plan)"
              value={editing.subtitle}
              onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
              className="px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
            <input
              type="number"
              placeholder="Duration Days"
              value={editing.duration_days}
              onChange={(e) => setEditing({ ...editing, duration_days: Number(e.target.value) })}
              className="px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
            />
            <input
              type="number"
              placeholder="Price ₹"
              value={editing.price}
              onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
              className="px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
            />
            <input
              type="text"
              placeholder="Badge (e.g. Save 20%)"
              value={editing.badge_text || ''}
              onChange={(e) => setEditing({ ...editing, badge_text: e.target.value })}
              className="px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
            <select
              value={editing.card_theme || 'green'}
              onChange={(e) => setEditing({ ...editing, card_theme: e.target.value })}
              className="px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
            >
              <option value="blue">Blue Card</option>
              <option value="green">Green Card</option>
              <option value="amber">Cream/Amber Card</option>
              <option value="purple">Purple Card</option>
            </select>
            <input
              type="text"
              placeholder="Meals Included"
              value={editing.meals_included || ''}
              onChange={(e) => setEditing({ ...editing, meals_included: e.target.value })}
              className="md:col-span-2 px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
            <textarea
              rows={3}
              placeholder="Benefits (one per line)"
              value={editing.benefitsText ?? (editing.benefits || []).join('\n')}
              onChange={(e) => setEditing({ ...editing, benefitsText: e.target.value })}
              className="md:col-span-4 px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl bg-[#F5F6F7] text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              Save Plan
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((pl) => (
          <div
            key={pl.id}
            className="bg-white rounded-2xl border border-[#EEEEEE] p-5 flex flex-col justify-between"
          >
            <div>
              <span className="text-[11px] font-bold uppercase text-[#0B8F4D]">{pl.subtitle}</span>
              <h3 className="text-lg font-extrabold text-[#202124]">{pl.name}</h3>
              <p className="text-2xl font-extrabold text-[#0B8F4D] font-num mt-1">
                {formatINR(pl.price)}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-[#777777]">
                {pl.benefits.map((b, idx) => (
                  <li key={idx}>• {b}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EEEEEE] flex justify-between">
              <button
                type="button"
                onClick={() =>
                  setEditing({ ...pl, benefitsText: (pl.benefits || []).join('\n') })
                }
                className="text-xs font-bold text-[#0B8F4D]"
              >
                Edit Plan
              </button>
              <button
                type="button"
                onClick={async () => {
                  await api.delete(`/subscription-plans/${pl.id}`);
                  await load();
                  await refreshSite();
                }}
                className="text-xs font-bold text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. ORDERS & DELIVERY MANAGEMENT (WITH WHATSAPP ORDER NUMBER ROUTING)
export function OrdersAndDeliveryManager({
  deliveryOnly = false,
  highlightOrderCode = null,
}: {
  deliveryOnly?: boolean;
  highlightOrderCode?: string | null;
}) {
  const { site, refreshSite } = useSite();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [storeWaInput, setStoreWaInput] = useState(
    site.settings.whatsapp_order_number || '919830045120'
  );
  const [savingWa, setSavingWa] = useState(false);

  useEffect(() => {
    setStoreWaInput(site.settings.whatsapp_order_number || '919830045120');
  }, [site.settings.whatsapp_order_number]);

  const load = useCallback(() => {
    api.get<OrderRecord[]>('/orders?scope=all').then((r) => setOrders(r.data));
    api.get<any[]>('/staff').then((r) => setStaff(r.data));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (highlightOrderCode) {
      setStatusFilter('All');
    }
  }, [highlightOrderCode]);

  useRealtime(
    useCallback(
      (msg) => {
        if (msg.event === 'order_created' || msg.event === 'order_status_updated') {
          load();
        }
      },
      [load]
    )
  );

  const handleSaveStoreWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = storeWaInput.trim();
    if (!cleaned || cleaned.replace(/\D/g, '').length < 10) {
      showToast('Enter a valid WhatsApp number (with country code, e.g. 919830045120)', 'error');
      return;
    }
    setSavingWa(true);
    try {
      await api.put('/settings', {
        ...site.settings,
        whatsapp_order_number: cleaned,
        whatsapp_url: `https://wa.me/${cleaned.replace(/\D/g, '')}`,
      });
      await refreshSite();
      showToast('Kitchen Order WhatsApp Number updated!');
    } catch {
      showToast('Could not save WhatsApp number', 'error');
    } finally {
      setSavingWa(false);
    }
  };

  const filtered = orders.filter((o) => {
    if (deliveryOnly && o.order_status === 'Cancelled') return false;
    if (statusFilter !== 'All' && o.order_status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">
            {deliveryOnly ? 'Kitchen Dispatch & Delivery Assignment' : 'Order Management'}
          </h2>
          <p className="text-xs text-[#777777]">
            Update live kitchen status, assign delivery riders, reconcile payments &amp; send WhatsApp updates.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['All', 'Placed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  statusFilter === st
                    ? 'bg-[#0B8F4D] text-white'
                    : 'bg-white border border-[#EEEEEE]'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Store Order Receiving WhatsApp Configuration Bar */}
      {!deliveryOnly && (
        <form
          onSubmit={handleSaveStoreWhatsapp}
          className="bg-white rounded-2xl border border-[#0B8F4D]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#123B16]">
                Official Order Receiving WhatsApp Number
              </p>
              <p className="text-[11px] text-[#777777]">
                Every customer checkout order links directly to this WhatsApp number, and each order captures the customer&apos;s WhatsApp number below.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={storeWaInput}
              onChange={(e) => setStoreWaInput(e.target.value)}
              placeholder="e.g. 919830045120"
              className="w-40 px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num outline-none focus:border-[#0B8F4D]"
            />
            <button
              type="submit"
              disabled={savingWa}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" /> {savingWa ? 'Saving...' : 'Save Number'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {filtered.map((o) => {
          const isHighlighted = Boolean(highlightOrderCode && o.order_code === highlightOrderCode);
          const custName = o.customer_name || o.customer_name_snapshot || 'Customer';
          const custPhone = o.customer_mobile || o.customer_phone_snapshot || '';
          const custWhatsapp = o.customer_whatsapp || custPhone;
          const itemsLine = o.items.map((it) => `${it.quantity}× ${it.item_name}`).join(', ');
          const addressLine =
            o.delivery_address_snapshot || `${o.address_line1 || ''}, ${o.address_area || ''}`;

          const customerWaUrl = buildWhatsAppLink(
            custWhatsapp,
            `Hello ${custName}, update on your TrimPlate Order #${o.order_code} (${itemsLine}): Current Status is *${o.order_status}*. Total: ₹${Math.round(
              o.total_amount
            )} (${o.payment_method}). Thank you for choosing TrimPlate!`
          );
          const storeTicketWaUrl = buildWhatsAppLink(
            site.settings.whatsapp_order_number || storeWaInput,
            `*Kitchen Ticket · Order #${o.order_code}*\nCustomer: ${custName}\nWhatsApp: ${custWhatsapp}\nItems: ${itemsLine}\nTotal: ₹${Math.round(
              o.total_amount
            )} (${o.payment_method} - ${o.payment_status})\nAddress: ${addressLine}`
          );

          return (
            <div
              key={o.id}
              className={`bg-white rounded-2xl border p-5 space-y-3 shadow-xs transition-colors ${
                isHighlighted
                  ? 'border-[#0B8F4D] ring-2 ring-[#0B8F4D]/20 bg-[#F9FDFB]'
                  : 'border-[#EEEEEE]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-[#202124] font-num flex flex-wrap items-center gap-2">
                    <span>
                      Order #{o.order_code} · {custName} ({custPhone})
                    </span>
                    {custWhatsapp && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0B8F4D]">
                        · <MessageCircle className="w-3.5 h-3.5" /> WhatsApp: {custWhatsapp}
                      </span>
                    )}
                    {isHighlighted && (
                      <span className="px-2 py-0.5 rounded bg-[#0B8F4D] text-white text-[10px] font-bold uppercase tracking-wider font-sans">
                        Selected Alert
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#777777]">
                    {addressLine} · {o.payment_method} ({o.payment_status})
                    {o.payment_reference ? ` · UTR: ${o.payment_reference}` : ''}
                  </p>
                </div>
                <span className="text-lg font-extrabold text-[#0B8F4D] font-num">
                  {formatINR(o.total_amount)}
                </span>
              </div>

              <div className="text-xs text-[#777777] flex flex-wrap gap-2">
                {o.items.map((it) => (
                  <span key={it.id} className="bg-[#FFF8ED] px-2.5 py-1 rounded-lg text-[#202124]">
                    {it.quantity} × {it.item_name}
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-[#EEEEEE] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={o.order_status}
                    onChange={async (e) => {
                      await api.patch(`/orders/${o.id}/status`, { order_status: e.target.value });
                      showToast(`Order #${o.order_code} → ${e.target.value}`);
                      load();
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#EEEEEE] text-xs font-bold bg-white"
                  >
                    <option value="Placed">Placed</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <select
                    value={o.assigned_staff_id || ''}
                    onChange={async (e) => {
                      await api.patch(`/orders/${o.id}/status`, {
                        assigned_staff_id: e.target.value ? Number(e.target.value) : null,
                      });
                      showToast('Delivery partner assigned');
                      load();
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                  >
                    <option value="">Assign Rider...</option>
                    {staff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.zone})
                      </option>
                    ))}
                  </select>

                  {customerWaUrl && (
                    <a
                      href={customerWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4FAF6] border border-[#0B8F4D]/30 text-[#0B8F4D] hover:bg-[#E8F5E9] text-xs font-bold transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Customer
                    </a>
                  )}

                  {storeTicketWaUrl && (
                    <a
                      href={storeTicketWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#EEEEEE] hover:border-[#0B8F4D] text-[#123B16] text-xs font-semibold transition-colors"
                    >
                      Kitchen WA Ticket <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {o.payment_status !== 'Paid' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await api.patch(`/orders/${o.id}/status`, { payment_status: 'Paid' });
                      showToast(`Order #${o.order_code} marked Paid`);
                      load();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] text-xs font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verify & Mark Paid
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 5. CUSTOMERS DIRECTORY WITH DRILLDOWN
export function CustomersManager() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [drilldown, setDrilldown] = useState<any | null>(null);

  useEffect(() => {
    api.get('/customers').then((r) => setCustomers(r.data));
  }, []);

  const openDetails = async (c: any) => {
    const { data } = await api.get(`/customers/${c.id}/details`);
    setDrilldown({ customer: c, ...data });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold text-[#202124]">
        Registered Customers ({customers.length})
      </h2>
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAFAFA] text-[#777777]">
            <tr>
              <th className="px-5 py-3.5">Customer</th>
              <th className="px-5 py-3.5">Mobile / Email</th>
              <th className="px-5 py-3.5">Preference</th>
              <th className="px-5 py-3.5">Orders</th>
              <th className="px-5 py-3.5">Active Subs</th>
              <th className="px-5 py-3.5">Lifetime Spend</th>
              <th className="px-5 py-3.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-4 font-bold">{c.name}</td>
                <td className="px-5 py-4 font-num">
                  {c.mobile} {c.email ? `· ${c.email}` : ''}
                </td>
                <td className="px-5 py-4">{c.dietary_preference || 'Both'}</td>
                <td className="px-5 py-4 font-num font-bold">{c.total_orders || 0}</td>
                <td className="px-5 py-4 font-num font-bold text-[#0B8F4D]">{c.active_subs || 0}</td>
                <td className="px-5 py-4 font-num font-bold">{formatINR(c.lifetime_spend)}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => openDetails(c)}
                    className="font-bold text-[#0B8F4D]"
                  >
                    View History →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drilldown && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[#EEEEEE] pb-3">
              <h3 className="text-lg font-extrabold text-[#202124]">
                {drilldown.customer.name} — Customer Profile
              </h3>
              <button type="button" onClick={() => setDrilldown(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs font-bold uppercase text-[#0B8F4D]">
              Orders ({drilldown.orders.length})
            </p>
            <div className="space-y-2 text-xs">
              {drilldown.orders.map((o: any) => (
                <div key={o.id} className="p-3 rounded-xl bg-[#FAFAFA] flex justify-between">
                  <span className="font-num font-bold">#{o.order_code}</span>
                  <span>{o.order_status}</span>
                  <span className="font-num font-bold">{formatINR(o.total_amount)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs font-bold uppercase text-[#0B8F4D]">
              Subscriptions ({drilldown.subscriptions.length})
            </p>
            <div className="space-y-2 text-xs">
              {drilldown.subscriptions.map((s: any) => (
                <div key={s.id} className="p-3 rounded-xl bg-[#FFF8ED] flex justify-between">
                  <span className="font-num font-bold">{s.subscription_code}</span>
                  <span>
                    {s.plan_name} ({s.menu_preference})
                  </span>
                  <span className="font-bold text-[#0B8F4D]">{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 6. SUBSCRIPTIONS, PAYMENTS, COUPONS, STAFF & PROFILE
export function SubscriptionsAdminManager() {
  const { showToast } = useToast();
  const [subs, setSubs] = useState<SubscriptionRecord[]>([]);
  const load = () =>
    api.get<SubscriptionRecord[]>('/subscriptions?scope=all').then((r) => setSubs(r.data));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold text-[#202124]">Active & Historical Subscriptions</h2>
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAFAFA] text-[#777777]">
            <tr>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Plan & Track</th>
              <th className="px-5 py-3">Dates & Slot</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-4 font-num font-bold">{s.subscription_code}</td>
                <td className="px-5 py-4">
                  {s.customer_name} ({s.customer_mobile})
                </td>
                <td className="px-5 py-4 font-semibold">
                  {s.plan_name} · {s.menu_preference}
                </td>
                <td className="px-5 py-4 font-num text-[#777777]">
                  {s.start_date} → {s.end_date} ({s.delivery_slot})
                </td>
                <td className="px-5 py-4">
                  <select
                    value={s.status}
                    onChange={async (e) => {
                      await api.patch(`/subscriptions/${s.id}/status`, { status: e.target.value });
                      showToast('Subscription status updated');
                      load();
                    }}
                    className="px-2.5 py-1 rounded-lg border border-[#EEEEEE] font-bold bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PaymentsAdminManager() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const load = () => api.get('/payments?scope=all').then((r) => setPayments(r.data));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold text-[#202124]">Payments & UPI UTR Reconciliation</h2>
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAFAFA] text-[#777777]">
            <tr>
              <th className="px-5 py-3">Txn ID</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Method & UTR</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3.5 font-num font-bold">{p.transaction_id}</td>
                <td className="px-5 py-3.5">{p.customer_name}</td>
                <td className="px-5 py-3.5 font-num">#{p.order_code || '—'}</td>
                <td className="px-5 py-3.5 font-num">
                  {p.method} {p.gateway_reference ? `(UTR: ${p.gateway_reference})` : ''}
                </td>
                <td className="px-5 py-3.5 font-num font-bold">{formatINR(p.amount)}</td>
                <td className="px-5 py-3.5">
                  {p.status !== 'Completed' && p.order_id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await api.patch(`/orders/${p.order_id}/status`, { payment_status: 'Paid' });
                        showToast('Reconciled & marked Completed');
                        load();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#E8F5E9] text-[#0B8F4D] font-bold"
                    >
                      Verify & Complete
                    </button>
                  ) : (
                    <span className="font-bold text-[#0B8F4D]">{p.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CouponsAdminManager() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 15,
    min_order_amount: 199,
    max_discount: 200,
    expires_at: '2027-12-31',
  });

  const load = () => api.get('/coupons').then((r) => setCoupons(r.data));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold text-[#202124]">Coupon Codes</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post('/coupons', form);
          setForm({ ...form, code: '', description: '' });
          load();
          showToast('Coupon created');
        }}
        className="bg-white rounded-2xl border border-[#EEEEEE] p-5 grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <input
          type="text"
          required
          placeholder="CODE *"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num uppercase"
        />
        <input
          type="text"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="md:col-span-2 px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
        />
        <select
          value={form.discount_type}
          onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
          className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
        >
          <option value="percentage">% Off</option>
          <option value="flat">Flat ₹</option>
        </select>
        <input
          type="number"
          value={form.discount_value}
          onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
          className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
        />
        <button type="submit" className="py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold">
          + Add Coupon
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAFAFA] text-[#777777]">
            <tr>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Discount</th>
              <th className="px-5 py-3">Min Order</th>
              <th className="px-5 py-3">Used</th>
              <th className="px-5 py-3">Expires</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-3.5 font-num font-extrabold text-[#0B8F4D]">{c.code}</td>
                <td className="px-5 py-3.5 font-num">
                  {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`}
                </td>
                <td className="px-5 py-3.5 font-num">₹{c.min_order_amount}</td>
                <td className="px-5 py-3.5 font-num">{c.used_count}</td>
                <td className="px-5 py-3.5 font-num">{c.expires_at}</td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={async () => {
                      await api.delete(`/coupons/${c.id}`);
                      load();
                    }}
                    className="font-bold text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StaffAdminManager() {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    role: 'Delivery Partner',
    mobile: '',
    zone: 'Park Street & Central',
  });
  const load = () => api.get('/staff').then((r) => setStaff(r.data));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold text-[#202124]">Kitchen & Delivery Staff</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post('/staff', form);
          setForm({ name: '', role: 'Delivery Partner', mobile: '', zone: 'Park Street & Central' });
          load();
          showToast('Staff member added');
        }}
        className="bg-white rounded-2xl border border-[#EEEEEE] p-5 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <input
          type="text"
          required
          placeholder="Full Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
        >
          <option value="Delivery Partner">Delivery Partner</option>
          <option value="Head Nutrition Chef">Head Nutrition Chef</option>
          <option value="Store Manager">Store Manager</option>
        </select>
        <input
          type="tel"
          required
          placeholder="Mobile *"
          value={form.mobile}
          onChange={(e) => setForm({ ...form, mobile: e.target.value })}
          className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
        />
        <input
          type="text"
          placeholder="Zone"
          value={form.zone}
          onChange={(e) => setForm({ ...form, zone: e.target.value })}
          className="px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs"
        />
        <button type="submit" className="py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold">
          + Add Staff
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {staff.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-2xl border border-[#EEEEEE] p-5 flex justify-between items-start"
          >
            <div>
              <span className="text-[11px] font-bold uppercase text-[#0B8F4D]">{s.role}</span>
              <p className="text-sm font-bold text-[#202124] mt-0.5">{s.name}</p>
              <p className="text-xs text-[#777777] font-num">
                {s.mobile} · {s.zone}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await api.delete(`/staff/${s.id}`);
                load();
              }}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminProfileModule({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pw, setPw] = useState({ current_password: '', new_password: '' });

  return (
    <div className="max-w-xl bg-white rounded-3xl border border-[#EEEEEE] p-6 sm:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#202124]">Admin Profile & Security</h2>
        <p className="text-xs text-[#777777] mt-1">
          Signed in as <strong>{user?.name}</strong> ({user?.email})
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.put('/auth/password', pw);
            setPw({ current_password: '', new_password: '' });
            showToast('Admin password updated!');
          } catch (err: any) {
            showToast(err.response?.data?.error || 'Could not update password', 'error');
          }
        }}
        className="space-y-3"
      >
        <label className="block text-xs font-bold">Change Admin Password</label>
        <input
          type="password"
          required
          placeholder="Current Password"
          value={pw.current_password}
          onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="New Password (min 6 characters)"
          value={pw.new_password}
          onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
        >
          Update Password
        </button>
      </form>

      <div className="pt-4 border-t border-[#EEEEEE]">
        <button
          type="button"
          onClick={onLogout}
          className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold"
        >
          Sign Out of Admin CMS
        </button>
      </div>
    </div>
  );
}
