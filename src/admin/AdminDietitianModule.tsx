import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  Save,
  Star,
  UserCheck,
} from 'lucide-react';
import { api, formatINR } from '../services/api';
import { Dietitian, DietitianConsultation } from '../types';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { useRealtime } from '../hooks/useRealtime';
import { MediaPickerField } from './MediaPickerField';
import { resolveFoodImage } from '../assets/mediaMap';

export function AdminDietitianModule() {
  const { site, refreshSite } = useSite();
  const { showToast, requestConfirm } = useToast();

  const [activeTab, setActiveTab] = useState<'consultations' | 'team'>('consultations');
  const [dietitians, setDietitians] = useState<Dietitian[]>([]);
  const [consultations, setConsultations] = useState<DietitianConsultation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [editingDoc, setEditingDoc] = useState<Partial<Dietitian> | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  const loadAll = useCallback(() => {
    api
      .get<Dietitian[]>('/admin/dietitians')
      .then((res) => setDietitians(res.data))
      .catch(() => {});
    api
      .get<DietitianConsultation[]>('/admin/dietitian-consultations')
      .then((res) => {
        setConsultations(res.data);
        const drafts: Record<number, string> = {};
        res.data.forEach((c) => {
          drafts[c.id] = c.admin_notes || '';
        });
        setNoteDrafts(drafts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useRealtime(
    useCallback(
      (msg) => {
        if (
          msg.event === 'dietitian_booking_created' ||
          msg.event === 'dietitian_booking_updated' ||
          msg.event === 'site_settings_updated'
        ) {
          loadAll();
        }
      },
      [loadAll]
    )
  );

  const homeDietitianSection = site.homepageSections.find(
    (s) => s.section_key === 'dietitian_consultation'
  );

  const handleToggleHomeSection = async () => {
    if (!homeDietitianSection) return;
    try {
      await api.put(`/cms/homepage-sections/${homeDietitianSection.id}`, {
        ...homeDietitianSection,
        is_enabled: !homeDietitianSection.is_enabled,
      });
      await refreshSite();
      showToast(
        !homeDietitianSection.is_enabled
          ? 'Dietitian section enabled on Home Page'
          : 'Dietitian section hidden on Home Page'
      );
    } catch {
      showToast('Failed to update Home Page section visibility', 'error');
    }
  };

  const handleSaveDietitian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc?.name?.trim()) return;
    try {
      if (editingDoc.id) {
        await api.put(`/admin/dietitians/${editingDoc.id}`, editingDoc);
        showToast('Dietitian profile updated');
      } else {
        await api.post('/admin/dietitians', editingDoc);
        showToast('New Dietitian added to Home Page');
      }
      setEditingDoc(null);
      loadAll();
      await refreshSite();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not save dietitian profile', 'error');
    }
  };

  const handleToggleDietitianActive = async (doc: Dietitian) => {
    try {
      const next = !Boolean(doc.is_active);
      await api.patch(`/admin/dietitians/${doc.id}/toggle`, { is_active: next });
      loadAll();
      await refreshSite();
      showToast(`${doc.name} is now ${next ? 'Live on Home Page' : 'Hidden'}`);
    } catch {
      showToast('Failed to toggle visibility', 'error');
    }
  };

  const handleUpdateBooking = async (
    bookingId: number,
    patch: Partial<DietitianConsultation>
  ) => {
    try {
      await api.patch(`/admin/dietitian-consultations/${bookingId}`, patch);
      loadAll();
      showToast('Consultation booking updated');
    } catch {
      showToast('Could not update booking', 'error');
    }
  };

  const pendingCount = consultations.filter((c) => c.status === 'Pending').length;
  const confirmedCount = consultations.filter((c) => c.status === 'Confirmed').length;
  const completedCount = consultations.filter((c) => c.status === 'Completed').length;

  const filteredConsultations = consultations.filter((c) =>
    statusFilter === 'All' ? true : c.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Home Page Live Status */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[#0B8F4D]" />
            <h2 className="text-xl font-extrabold text-[#202124]">
              Clinical Dietitian &amp; 1-on-1 Consultations
            </h2>
          </div>
          <p className="text-xs text-[#777777]">
            Manage certified dietitians displayed on the Home Page and coordinate incoming 1-on-1 customer consultation bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {homeDietitianSection && (
            <button
              type="button"
              onClick={handleToggleHomeSection}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                homeDietitianSection.is_enabled
                  ? 'bg-[#E8F5E9] border-[#0B8F4D]/30 text-[#123B16]'
                  : 'bg-[#F5F6F7] border-[#EEEEEE] text-[#777777]'
              }`}
            >
              {homeDietitianSection.is_enabled ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-[#0B8F4D]" /> Showing on Home Page
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Hidden on Home Page
                </>
              )}
            </button>
          )}

          <div className="inline-flex bg-[#F5F7F6] p-1 rounded-xl border border-[#EEEEEE]">
            <button
              type="button"
              onClick={() => setActiveTab('consultations')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'consultations'
                  ? 'bg-[#0B8F4D] text-white'
                  : 'text-[#666666] hover:text-[#202124]'
              }`}
            >
              Consultation Bookings ({consultations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'team'
                  ? 'bg-[#0B8F4D] text-white'
                  : 'text-[#666666] hover:text-[#202124]'
              }`}
            >
              Dietitian Team ({dietitians.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: CONSULTATION BOOKINGS */}
      {activeTab === 'consultations' && (
        <div className="space-y-5">
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-4">
              <p className="text-xs font-semibold text-[#777777]">Total Requests</p>
              <p className="text-2xl font-extrabold text-[#202124] font-num mt-1">
                {consultations.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-4">
              <p className="text-xs font-semibold text-[#777777]">Pending Confirmation</p>
              <p className="text-2xl font-extrabold text-amber-600 font-num mt-1">
                {pendingCount}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-4">
              <p className="text-xs font-semibold text-[#777777]">Confirmed Upcoming</p>
              <p className="text-2xl font-extrabold text-[#0B8F4D] font-num mt-1">
                {confirmedCount}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-4">
              <p className="text-xs font-semibold text-[#777777]">Completed Sessions</p>
              <p className="text-2xl font-extrabold text-[#123B16] font-num mt-1">
                {completedCount}
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    statusFilter === st
                      ? 'bg-[#0B8F4D] text-white'
                      : 'bg-white border border-[#EEEEEE] text-[#555555]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings List */}
          {filteredConsultations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-10 text-center text-xs text-[#777777]">
              No dietitian consultation bookings in this filter yet.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultations.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-[#EEEEEE] p-5 space-y-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-[#123B16] font-num">
                          #{b.booking_code}
                        </span>
                        <span className="text-[#CCCCCC]">·</span>
                        <span className="text-sm font-bold text-[#202124]">{b.customer_name}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                            b.status === 'Confirmed'
                              ? 'bg-[#E8F5E9] text-[#0B8F4D]'
                              : b.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700'
                              : b.status === 'Completed'
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <p className="text-xs text-[#666666] flex flex-wrap items-center gap-x-3 gap-y-1 font-num">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-[#0B8F4D]" /> {b.customer_phone}
                        </span>
                        {b.customer_email && (
                          <span className="inline-flex items-center gap-1 font-sans">
                            <Mail className="w-3.5 h-3.5 text-[#0B8F4D]" /> {b.customer_email}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#0B8F4D]" /> {b.preferred_date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#0B8F4D]" /> {b.preferred_slot}
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-extrabold text-[#0B8F4D] font-num">
                        {Number(b.fee_amount) === 0
                          ? 'Complimentary (Subscriber)'
                          : formatINR(b.fee_amount)}
                      </p>
                      <p className="text-[11px] text-[#777777]">{b.consultation_mode}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAFBF9] border border-[#EEEEEE] text-xs space-y-1">
                    <p className="text-[#202124]">
                      <strong>Goal:</strong> {b.health_goal} · <strong>Diet:</strong>{' '}
                      {b.dietary_preference} · <strong>Dietitian:</strong> {b.dietitian_name}
                    </p>
                    {b.notes && (
                      <p className="text-[#666666]">
                        <strong>Customer Notes:</strong> {b.notes}
                      </p>
                    )}
                  </div>

                  {/* Admin Controls */}
                  <div className="pt-2 border-t border-[#EEEEEE] grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                    <div className="lg:col-span-3">
                      <select
                        value={b.status}
                        onChange={(e) =>
                          handleUpdateBooking(b.id, {
                            status: e.target.value as DietitianConsultation['status'],
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] bg-white text-xs font-bold"
                      >
                        <option value="Pending">Pending Confirmation</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="lg:col-span-3">
                      <select
                        value={b.dietitian_id || ''}
                        onChange={(e) =>
                          handleUpdateBooking(b.id, {
                            dietitian_id: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] bg-white text-xs"
                      >
                        <option value="">Assign Dietitian...</option>
                        {dietitians.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-6 flex items-center gap-2">
                      <input
                        type="text"
                        value={noteDrafts[b.id] ?? ''}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                        }
                        placeholder="Meeting link or dietitian note for customer..."
                        className="flex-1 px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs outline-none focus:border-[#0B8F4D]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateBooking(b.id, { admin_notes: noteDrafts[b.id] || '' })
                        }
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold shrink-0"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirm({
                            title: 'Delete Consultation Record?',
                            message: `Delete consultation #${b.booking_code} for ${b.customer_name}?`,
                            destructive: true,
                            onConfirm: async () => {
                              await api.delete(`/admin/dietitian-consultations/${b.id}`);
                              loadAll();
                              showToast('Booking deleted');
                            },
                          })
                        }
                        className="p-2 rounded-xl hover:bg-red-50 text-red-600 shrink-0"
                        title="Delete booking"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIETITIAN PROFILES & HOME PAGE TEAM */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#666666]">
              Add, edit, or hide certified dietitians displayed on the TrimPlate Home Page.
            </p>
            <button
              type="button"
              onClick={() =>
                setEditingDoc({
                  name: '',
                  credentials: 'M.Sc. Clinical Nutrition, RD',
                  specialization: 'Weight Loss & Balanced Metabolic Health',
                  experience_years: 6,
                  languages: 'English, Bengali, Hindi',
                  bio: '',
                  consultation_fee: 299,
                  free_with_subscription: 1,
                  available_days: 'Mon – Sat',
                  available_slots: '10:00 AM – 2:00 PM, 4:30 PM – 7:30 PM',
                  image_url: 'dietitian_ananya',
                  rating: 4.9,
                  consultations_count: 150,
                  sort_order: dietitians.length + 1,
                  is_active: 1,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Add Certified Dietitian
            </button>
          </div>

          {editingDoc && (
            <form
              onSubmit={handleSaveDietitian}
              className="bg-white rounded-3xl border border-[#0B8F4D]/40 p-6 space-y-4 shadow-sm"
            >
              <h3 className="text-base font-extrabold text-[#202124]">
                {editingDoc.id ? `Edit ${editingDoc.name}` : 'Add Certified Dietitian'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Full Name (with Dt.) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dt. Ananya Sen"
                    value={editingDoc.name || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Qualifications &amp; Credentials *</label>
                  <input
                    type="text"
                    required
                    placeholder="M.Sc. Clinical Nutrition, CDE"
                    value={editingDoc.credentials || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, credentials: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Specialization Focus *</label>
                  <input
                    type="text"
                    required
                    placeholder="Fat Loss, PCOS & Metabolic Health"
                    value={editingDoc.specialization || ''}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, specialization: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingDoc.experience_years ?? 5}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, experience_years: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingDoc.consultation_fee ?? 299}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, consultation_fee: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Spoken Languages</label>
                  <input
                    type="text"
                    value={editingDoc.languages || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, languages: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Available Days</label>
                  <input
                    type="text"
                    value={editingDoc.available_days || ''}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, available_days: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1">Available Time Windows</label>
                  <input
                    type="text"
                    value={editingDoc.available_slots || ''}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, available_slots: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Rating (1–5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={4}
                    max={5}
                    value={editingDoc.rating ?? 4.9}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, rating: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Consultations Completed</label>
                  <input
                    type="number"
                    min={0}
                    value={editingDoc.consultations_count ?? 150}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, consultations_count: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Free with 15/30-Day Subscriptions?
                  </label>
                  <select
                    value={editingDoc.free_with_subscription ? '1' : '0'}
                    onChange={(e) =>
                      setEditingDoc({
                        ...editingDoc,
                        free_with_subscription: e.target.value === '1' ? 1 : 0,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs bg-white"
                  >
                    <option value="1">Yes — Complimentary for Subscribers</option>
                    <option value="0">No — Paid Standalone Session</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold mb-1">Short Clinical Bio</label>
                  <textarea
                    rows={2}
                    value={editingDoc.bio || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, bio: e.target.value })}
                    placeholder="Describe clinical expertise and nutrition approach..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <MediaPickerField
                    label="Dietitian Studio Portrait"
                    value={editingDoc.image_url || 'dietitian_ananya'}
                    onChange={(url) => setEditingDoc({ ...editingDoc, image_url: url })}
                    folder="Dietitian Team"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Display Sort Order</label>
                  <input
                    type="number"
                    value={editingDoc.sort_order ?? 1}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, sort_order: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EEEEEE] text-xs font-num"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EEEEEE]">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl bg-[#F5F6F7] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
                >
                  Save Dietitian Profile
                </button>
              </div>
            </form>
          )}

          {/* Dietitians Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dietitians.map((doc) => {
              const active = Boolean(doc.is_active);
              return (
                <div
                  key={doc.id}
                  className={`bg-white rounded-2xl border overflow-hidden flex flex-col justify-between ${
                    active ? 'border-[#EEEEEE]' : 'border-dashed border-gray-300 opacity-75'
                  }`}
                >
                  <div>
                    <div className="relative aspect-[4/3] bg-[#F4F7F5]">
                      <img
                        src={resolveFoodImage(doc.image_url, doc.image_url)}
                        alt={doc.name}
                        className="w-full h-full object-cover object-top"
                      />
                      <span
                        className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          active
                            ? 'bg-[#0B8F4D] text-white'
                            : 'bg-black/70 text-white'
                        }`}
                      >
                        {active ? 'Live on Home' : 'Hidden'}
                      </span>
                    </div>
                    <div className="p-5 space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#0B8F4D]">
                        {doc.specialization}
                      </p>
                      <h3 className="text-base font-extrabold text-[#202124]">{doc.name}</h3>
                      <p className="text-xs text-[#666666]">
                        {doc.credentials} · {doc.experience_years} Yrs · {doc.languages}
                      </p>
                      <p className="text-xs text-[#777777] line-clamp-2 pt-1">{doc.bio}</p>
                      <p className="text-xs font-bold text-[#123B16] font-num pt-1 flex items-center gap-2">
                        <span>{formatINR(doc.consultation_fee)} / session</span>
                        <span className="text-[#CCCCCC]">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {Number(doc.rating).toFixed(1)} ({doc.consultations_count}+)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-[#FAFAFA] border-t border-[#EEEEEE] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleDietitianActive(doc)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#123B16] hover:text-[#0B8F4D]"
                    >
                      {active ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-[#0B8F4D]" /> Show Live
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingDoc(doc)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0B8F4D]"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirm({
                            title: 'Remove Dietitian Profile?',
                            message: `Permanently delete ${doc.name} from TrimPlate?`,
                            destructive: true,
                            onConfirm: async () => {
                              await api.delete(`/admin/dietitians/${doc.id}`);
                              loadAll();
                              await refreshSite();
                              showToast('Dietitian profile removed');
                            },
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs font-bold text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
