import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  UtensilsCrossed,
  Eye,
  EyeOff,
  X,
  ArrowRight,
  Coffee,
  Salad,
  Flame,
  Dumbbell,
} from 'lucide-react';
import { api, extractApiError } from '../services/api';
import { CustomMenu } from '../types';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { MediaPickerField } from './MediaPickerField';
import { resolveFoodImage } from '../assets/mediaMap';

interface AdminMenusModuleProps {
  onOpenMenuProducts: (divisionName: string) => void;
  onSelectCoreModule: (moduleId: string) => void;
}

const CORE_MENUS = [
  {
    id: 'green-menu',
    name: 'Green Menu',
    url: '/green-menu',
    subtitle: 'Wholesome Breakfast, Balanced Lunch, Sprouts & Dinner',
    icon: Salad,
  },
  {
    id: 'cafe-menu',
    name: 'Cafe Menu',
    url: '/cafe-menu',
    subtitle: 'Artisanal Multigrain Sandwiches, Pasta, Toasts & Cold Brews',
    icon: Coffee,
  },
  {
    id: 'diet-menu',
    name: 'Diet Menu',
    url: '/diet-menu',
    subtitle: 'Calorie-Smart Low-GI Weight Management Dishes',
    icon: Flame,
  },
  {
    id: 'gym-menu',
    name: 'Gym Menu',
    url: '/gym-menu',
    subtitle: 'High-Protein Lean Chicken, Fish, Paneer & Recovery Bowls',
    icon: Dumbbell,
  },
];

export function AdminMenusModule({
  onOpenMenuProducts,
  onSelectCoreModule,
}: AdminMenusModuleProps) {
  const { refreshSite } = useSite();
  const { showToast, requestConfirm } = useToast();

  const [menus, setMenus] = useState<CustomMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const loadMenus = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CustomMenu[]>('/admin/menus');
      setMenus(data);
    } catch (err: any) {
      showToast(extractApiError(err, 'Could not load custom menus'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenus();
  }, []);

  const openCreateModal = () => {
    setEditing({
      name: '',
      slug: '',
      subtitle: 'Freshly Crafted Specialty Selection',
      description: '',
      image_url: 'hero_bowl',
      bg_color: '#123B16',
      badge_text: 'New Menu',
      starter_category_name: '',
      show_in_header: true,
      show_on_home: true,
      sort_order: menus.length + 1,
      is_active: true,
    });
  };

  const openEditModal = (m: CustomMenu) => {
    setEditing({
      ...m,
      show_in_header: Boolean(m.show_in_header),
      show_on_home: Boolean(m.show_on_home),
      is_active: Boolean(m.is_active),
    });
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name?.trim()) {
      showToast('Please enter a Menu Name', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await api.put(`/admin/menus/${editing.id}`, editing);
        showToast(`Menu "${editing.name}" updated!`);
      } else {
        const { data } = await api.post('/admin/menus', editing);
        showToast(
          `New menu "${editing.name}" created at /menu/${data.slug}! You can now add dishes to it.`
        );
      }
      setEditing(null);
      await loadMenus();
      await refreshSite();
    } catch (err: any) {
      showToast(extractApiError(err, 'Failed to save menu'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: CustomMenu) => {
    try {
      const { data } = await api.patch(`/admin/menus/${m.id}/toggle`);
      showToast(`${m.name} is now ${data.is_active ? 'Live on Website' : 'Paused'}`);
      await loadMenus();
      await refreshSite();
    } catch (err: any) {
      showToast(extractApiError(err, 'Could not toggle menu status'), 'error');
    }
  };

  const handleDelete = (m: CustomMenu) => {
    requestConfirm({
      title: `Delete "${m.name}"?`,
      message: `Remove custom menu "${m.name}"? (Note: If dishes exist inside this menu, move or delete them first.)`,
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/menus/${m.id}`);
          showToast(`Deleted "${m.name}"`);
          await loadMenus();
          await refreshSite();
        } catch (err: any) {
          showToast(extractApiError(err, 'Cannot delete menu while it still contains dishes'), 'error');
        }
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-3xl border border-[#EEEEEE] p-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#0B8F4D]">
            Dynamic Menu Architecture
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#202124] mt-0.5">
            Menus Builder &amp; Future Menu Launches
          </h2>
          <p className="text-xs text-[#777777] mt-1 max-w-2xl">
            Launch unlimited new menus anytime (e.g., <strong>Keto Menu</strong>,{' '}
            <strong>Corporate Lunch</strong>, <strong>Smoothie Bar</strong>,{' '}
            <strong>Kids Healthy Menu</strong>). Each new menu automatically gets its own live{' '}
            <code className="font-mono text-[#123B16]">/menu/your-slug</code> page, starter
            category, navbar dropdown link, and homepage card.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Create New Menu
        </button>
      </div>

      {/* Custom Menus List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-[#202124]">
            Custom &amp; Specialty Menus ({menus.length})
          </h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 rounded-2xl bg-white border border-[#EEEEEE] animate-pulse" />
            <div className="h-44 rounded-2xl bg-white border border-[#EEEEEE] animate-pulse" />
          </div>
        ) : menus.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-[#0B8F4D]/40 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF8ED] text-[#0B8F4D] flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-[#202124]">
              Ready Whenever You Launch Your Next Menu
            </h4>
            <p className="text-xs text-[#777777] max-w-md mx-auto leading-relaxed">
              Click <strong>Create New Menu</strong> above to publish a brand-new menu division on
              your website in seconds — zero code edits needed.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Launch First Custom Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {menus.map((m) => {
              const active = Boolean(m.is_active);
              return (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl border border-[#EEEEEE] overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div className="p-5 sm:p-6 flex items-start gap-4">
                    <img
                      src={resolveFoodImage(m.image_url)}
                      alt={m.name}
                      className="w-20 h-20 rounded-2xl object-cover border border-[#EEEEEE] shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-extrabold text-[#202124] truncate">
                          {m.name}
                        </h4>
                        <span
                          className={`text-[11px] font-bold ${
                            active ? 'text-[#0B8F4D]' : 'text-[#777777]'
                          }`}
                        >
                          · {active ? 'Live' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[#0B8F4D]">/menu/{m.slug}</p>
                      <p className="text-xs text-[#666666] line-clamp-2">
                        {m.description || m.subtitle}
                      </p>
                      <p className="text-[11px] text-[#777777] font-num pt-1">
                        {m.category_count ?? 0} categories · {m.product_count ?? 0} dishes ·{' '}
                        {m.show_in_header ? 'In Header Nav' : 'Hidden from Nav'} ·{' '}
                        {m.show_on_home ? 'On Homepage' : 'Menu Page Only'}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-[#FAFAFA] border-t border-[#EEEEEE] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenMenuProducts(m.division_name)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
                      >
                        Manage Dishes ({m.product_count ?? 0}) <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        to={`/menu/${m.slug}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-[#EEEEEE] text-xs font-bold text-[#123B16] hover:border-[#0B8F4D]"
                      >
                        View Page <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(m)}
                        className="p-2 rounded-xl bg-white border border-[#EEEEEE] text-[#555555] hover:text-[#0B8F4D]"
                        title={active ? 'Pause Menu' : 'Activate Menu'}
                      >
                        {active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(m)}
                        className="p-2 rounded-xl bg-white border border-[#EEEEEE] text-[#0B8F4D] hover:bg-[#E8F5E9]"
                        title="Edit Menu"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m)}
                        className="p-2 rounded-xl bg-white border border-[#EEEEEE] text-red-600 hover:bg-red-50"
                        title="Delete Menu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Built-in Core Menus Reference */}
      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-[#202124]">Core TrimPlate Menus (4)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CORE_MENUS.map((cm) => (
            <div
              key={cm.id}
              className="bg-white rounded-2xl border border-[#EEEEEE] p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-[#FFF8ED] text-[#0B8F4D] flex items-center justify-center">
                  <cm.icon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-extrabold text-[#202124]">{cm.name}</h4>
                <p className="text-xs text-[#777777] leading-relaxed">{cm.subtitle}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#F4F5F6]">
                <button
                  type="button"
                  onClick={() => onSelectCoreModule(cm.id)}
                  className="text-xs font-bold text-[#0B8F4D] hover:underline"
                >
                  Edit Dishes →
                </button>
                <Link
                  to={cm.url}
                  className="text-xs font-semibold text-[#777777] hover:text-[#123B16] inline-flex items-center gap-1"
                >
                  Live <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit Custom Menu Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMenu}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
              <h3 className="text-lg font-extrabold text-[#202124]">
                {editing.id ? `Edit Menu: ${editing.name}` : 'Create New Website Menu'}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg hover:bg-[#F5F6F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Menu Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keto Menu / Smoothie Bar / Kids Menu"
                  value={editing.name || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = !editing.id
                      ? name
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '')
                      : editing.slug;
                    setEditing({ ...editing, name, slug: autoSlug });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Live URL Slug (/menu/...)</label>
                <input
                  type="text"
                  required
                  placeholder="keto-menu"
                  value={editing.slug || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]+/g, '-')
                        .replace(/(^-|-$)/g, ''),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Banner Eyebrow / Subtitle</label>
                <input
                  type="text"
                  placeholder="Low-Carb High-Healthy-Fat Culinary Bowls"
                  value={editing.subtitle || ''}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Hero Background Theme</label>
                <select
                  value={editing.bg_color || '#123B16'}
                  onChange={(e) => setEditing({ ...editing, bg_color: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                >
                  <option value="#123B16">Forest Green (#123B16)</option>
                  <option value="#0B8F4D">TrimPlate Green (#0B8F4D)</option>
                  <option value="#FFF8ED">Warm Cream (#FFF8ED)</option>
                  <option value="#E8F5E9">Soft Mint (#E8F5E9)</option>
                </select>
              </div>

              {!editing.id && (
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Starter Category Name (Auto-created)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Signature Keto Bowls"
                    value={editing.starter_category_name || ''}
                    onChange={(e) =>
                      setEditing({ ...editing, starter_category_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1">Sort Order</label>
                <input
                  type="number"
                  value={editing.sort_order ?? 10}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs font-num"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1">Menu Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the dishes, nutritional focus, and culinary style of this menu..."
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEEEEE] text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <MediaPickerField
                  label="Menu Banner Photography"
                  value={editing.image_url || 'hero_bowl'}
                  onChange={(url) => setEditing({ ...editing, image_url: url })}
                  folder="Menus"
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.show_in_header)}
                    onChange={(e) => setEditing({ ...editing, show_in_header: e.target.checked })}
                    className="accent-[#0B8F4D]"
                  />
                  Show in Header Navbar
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.show_on_home)}
                    onChange={(e) => setEditing({ ...editing, show_on_home: e.target.checked })}
                    className="accent-[#0B8F4D]"
                  />
                  Show on Homepage
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.is_active)}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="accent-[#0B8F4D]"
                  />
                  Menu Active (Live)
                </label>
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
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#0B8F4D] hover:bg-[#09773F] text-white text-xs font-bold disabled:opacity-60"
              >
                {saving ? 'Saving...' : editing.id ? 'Save Menu Changes' : 'Publish New Menu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
