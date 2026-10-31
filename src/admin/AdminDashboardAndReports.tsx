import React, { useEffect, useState } from 'react';
import {
  IndianRupee,
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Users,
  CalendarRange,
  UserPlus,
  Download,
  AlertTriangle,
  Stethoscope,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { api, formatINR } from '../services/api';
import { useToast } from '../context/ToastContext';

const CHART_COLORS = ['#0B8F4D', '#123B16', '#8CCB16', '#F59E0B', '#0284C7', '#7C3AED'];

export function AdminDashboardView({ onNavigateModule }: { onNavigateModule: (mod: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div key={n} className="h-28 rounded-2xl bg-white border border-[#EEEEEE] animate-pulse" />
        ))}
      </div>
    );
  }

  const s = data.summary;
  const statCards = [
    { label: 'Total Revenue', val: formatINR(s.totalRevenue), icon: IndianRupee, color: 'text-[#0B8F4D] bg-[#E8F5E9]' },
    { label: "Today's Revenue", val: formatINR(s.todayRevenue), icon: TrendingUp, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Total Orders', val: s.totalOrders, icon: ShoppingBag, color: 'text-sky-700 bg-sky-50' },
    { label: 'Pending Orders', val: s.pendingOrders, icon: Clock, color: 'text-amber-700 bg-amber-50' },
    { label: 'Completed Orders', val: s.completedOrders, icon: CheckCircle2, color: 'text-[#0B8F4D] bg-[#E8F5E9]' },
    { label: 'Total Customers', val: s.totalCustomers, icon: Users, color: 'text-violet-700 bg-violet-50' },
    { label: 'Active Subscriptions', val: s.activeSubscriptions, icon: CalendarRange, color: 'text-[#123B16] bg-[#FFF8ED]' },
    { label: 'New Customers (30d)', val: s.newCustomers, icon: UserPlus, color: 'text-teal-700 bg-teal-50' },
  ];

  return (
    <div className="space-y-8">
      {/* 8 Real SQL Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-2xl border border-[#EEEEEE] p-5 flex items-center justify-between shadow-xs"
          >
            <div>
              <p className="text-xs font-semibold text-[#777777]">{c.label}</p>
              <p className="text-2xl font-extrabold text-[#202124] font-num mt-1">{c.val}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Dietitian Clinical Desk & Live Order Quick Strip */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#E8F5E9] text-[#0B8F4D] flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#202124]">
              Clinical Dietitian &amp; 1-on-1 Consultation Desk
            </p>
            <p className="text-xs text-[#666666] font-num">
              {s.totalDietitians ?? 3} Certified Dietitians Live on Home Page ·{' '}
              <strong className="text-[#0B8F4D]">{s.pendingConsultations ?? 0} Pending</strong>{' '}
              Consultation Requests
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigateModule('dietitians')}
          className="px-4 py-2.5 rounded-xl bg-[#0B8F4D] hover:bg-[#123B16] text-white text-xs font-bold transition-colors"
        >
          Manage Dietitians &amp; Bookings →
        </button>
      </div>

      {/* 6 Real SQL Recharts Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Daily Revenue Chart */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
          <h3 className="text-sm font-extrabold text-[#202124] mb-4">1. Daily Revenue (SQL Computed)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#0B8F4D" fill="#E8F5E9" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Monthly Revenue Chart */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
          <h3 className="text-sm font-extrabold text-[#202124] mb-4">2. Monthly Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#0B8F4D" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Order Statistics */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
          <h3 className="text-sm font-extrabold text-[#202124] mb-4">3. Order Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.orderStats}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={({ status, count }: any) => `${status}: ${count}`}
                >
                  {data.orderStats.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Subscription Growth */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
          <h3 className="text-sm font-extrabold text-[#202124] mb-4">4. Subscription Growth & Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.subscriptionGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#123B16" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Top-Selling Products */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
          <h3 className="text-sm font-extrabold text-[#202124] mb-4">5. Top-Selling Products (Units Sold)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topSellingProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="units_sold" fill="#8CCB16" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Category Performance */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
          <h3 className="text-sm font-extrabold text-[#202124] mb-4">6. Category Sales Performance (₹)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#123B16" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4 Real SQL Summary Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Table 1: Recent Orders */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#202124]">Recent Orders</h3>
            <button
              type="button"
              onClick={() => onNavigateModule('orders')}
              className="text-xs font-bold text-[#0B8F4D]"
            >
              Manage All →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAFAFA] text-[#777777]">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {data.recentOrders.map((o: any) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-num font-bold">#{o.order_code}</td>
                    <td className="px-4 py-3">{o.customer_name}</td>
                    <td className="px-4 py-3 font-num font-semibold">{formatINR(o.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#0B8F4D]">{o.order_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Low-Stock Products */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#202124] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Low-Stock Products (≤ 15 portions)
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule('products')}
              className="text-xs font-bold text-[#0B8F4D]"
            >
              Restock →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAFAFA] text-[#777777]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Menu</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {data.lowStockProducts.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-[#777777]">{p.menu_division}</td>
                    <td className="px-4 py-3 font-num">{formatINR(p.price)}</td>
                    <td className="px-4 py-3 font-num font-extrabold text-amber-600">
                      {p.stock_qty} left
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3: Latest Subscriptions */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#202124]">Latest Subscriptions</h3>
            <button
              type="button"
              onClick={() => onNavigateModule('subscriptions')}
              className="text-xs font-bold text-[#0B8F4D]"
            >
              View All →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAFAFA] text-[#777777]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {data.latestSubscriptions.map((sub: any) => (
                  <tr key={sub.id}>
                    <td className="px-4 py-3 font-num font-bold">{sub.subscription_code}</td>
                    <td className="px-4 py-3">{sub.customer_name}</td>
                    <td className="px-4 py-3">{sub.plan_name}</td>
                    <td className="px-4 py-3 font-bold text-[#0B8F4D]">{sub.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 4: Recent Customers */}
        <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#202124]">Recent Customers</h3>
            <button
              type="button"
              onClick={() => onNavigateModule('customers')}
              className="text-xs font-bold text-[#0B8F4D]"
            >
              View Directory →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAFAFA] text-[#777777]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Preference</th>
                  <th className="px-4 py-3">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {data.recentCustomers.map((c: any) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-semibold">{c.name}</td>
                    <td className="px-4 py-3 font-num">{c.mobile}</td>
                    <td className="px-4 py-3">{c.dietary_preference || 'Both'}</td>
                    <td className="px-4 py-3 font-num font-bold">{c.total_orders || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminReportsView() {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data));
  }, []);

  const handleExportExcel = async () => {
    try {
      const { data: excel } = await api.get('/admin/export-excel');
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excel.base64}`;
      link.download = excel.filename;
      link.click();
      showToast('Exported Trimplate_Cafe_And_Green_Menu.xlsx');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleExportRevenueCsv = () => {
    if (!data?.monthlyRevenue) return;
    const rows = [
      ['Month', 'Orders', 'Revenue (INR)'],
      ...data.monthlyRevenue.map((r: any) => [r.month, r.orders, r.revenue]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TrimPlate_Revenue_Report.csv';
    a.click();
    showToast('Revenue CSV downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124]">Business Reports & Data Exports</h2>
          <p className="text-xs text-[#777777] mt-1">
            Download real-time SQL sales reports or export the complete Cafe & Green Menu Excel
            workbook.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportRevenueCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#123B16] text-xs font-bold text-[#123B16] hover:bg-[#F5F6F7]"
          >
            <Download className="w-4 h-4" /> Export Revenue CSV
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B8F4D] text-white text-xs font-bold"
          >
            <Download className="w-4 h-4" /> Export Full Menu (.xlsx)
          </button>
        </div>
      </div>

      {data && (
        <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EEEEEE]">
            <h3 className="text-sm font-extrabold text-[#202124]">
              Product Sales & Inventory Valuation
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAFAFA] text-[#777777]">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Division</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Units Sold</th>
                  <th className="px-5 py-3">Gross Sales</th>
                  <th className="px-5 py-3">Current Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {data.topSellingProducts.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3.5 font-bold">{p.name}</td>
                    <td className="px-5 py-3.5">{p.menu_division}</td>
                    <td className="px-5 py-3.5">{p.category_name}</td>
                    <td className="px-5 py-3.5 font-num font-bold">{p.units_sold}</td>
                    <td className="px-5 py-3.5 font-num font-bold text-[#0B8F4D]">
                      {formatINR(p.gross_sales)}
                    </td>
                    <td className="px-5 py-3.5 font-num">{p.stock_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
