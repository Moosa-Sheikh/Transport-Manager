import { useState } from "react";
import { BookOpen, Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useListCashBook, useListCustomers, useListDrivers, useListTrips } from "@workspace/api-client-react";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

const CATEGORY_OPTIONS = [
  { value: "customer_payments", label: "Customer Payments" },
  { value: "customer_dues", label: "Customer Dues" },
  { value: "driver_advances", label: "Driver Advances" },
  { value: "driver_loans", label: "Driver Loans" },
  { value: "driver_salaries", label: "Driver Salaries" },
  { value: "owner_loans", label: "Owner Loans" },
  { value: "other_loans", label: "Other Loans" },
];

export default function CashBookPage() {
  const [filters, setFilters] = useState<{
    date_from?: string;
    date_to?: string;
    entry_type?: "IN" | "OUT";
    category?: string;
    customer_id?: number;
    driver_id?: number;
    trip_id?: number;
    month?: string;
  }>({});

  const [showFilters, setShowFilters] = useState(false);

  const apiFilters: Record<string, unknown> = {};
  if (filters.month) {
    const [y, m] = filters.month.split("-").map(Number);
    apiFilters.date_from = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    apiFilters.date_to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  } else {
    if (filters.date_from) apiFilters.date_from = filters.date_from;
    if (filters.date_to) apiFilters.date_to = filters.date_to;
  }
  if (filters.entry_type) apiFilters.entry_type = filters.entry_type;
  if (filters.category) apiFilters.category = filters.category;
  if (filters.customer_id) apiFilters.customer_id = filters.customer_id;
  if (filters.driver_id) apiFilters.driver_id = filters.driver_id;
  if (filters.trip_id) apiFilters.trip_id = filters.trip_id;

  const cashBookQuery = useListCashBook(apiFilters as any);
  const customersQuery = useListCustomers({});
  const driversQuery = useListDrivers({});
  const tripsQuery = useListTrips({});

  const data = cashBookQuery.data;

  const hasActiveFilters = !!(filters.date_from || filters.date_to || filters.entry_type || filters.category || filters.customer_id || filters.driver_id || filters.trip_id || filters.month);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Cash Book</h2>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
            showFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Filter Entries</span>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters({})}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <input
                type="month"
                value={filters.month ?? ""}
                onChange={(e) => setFilters((f) => ({
                  ...f,
                  month: e.target.value || undefined,
                  date_from: e.target.value ? undefined : f.date_from,
                  date_to: e.target.value ? undefined : f.date_to,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
              <input
                type="date"
                value={filters.month ? "" : (filters.date_from ?? "")}
                disabled={!!filters.month}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
              <input
                type="date"
                value={filters.month ? "" : (filters.date_to ?? "")}
                disabled={!!filters.month}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entry Type</label>
              <select
                value={filters.entry_type ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, entry_type: (e.target.value || undefined) as "IN" | "OUT" | undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="IN">Cash IN</option>
                <option value="OUT">Cash OUT</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={filters.category ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
              <select
                value={filters.customer_id ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, customer_id: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Customers</option>
                {customersQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
              <select
                value={filters.driver_id ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, driver_id: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Drivers</option>
                {driversQuery.data?.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Trip</label>
              <select
                value={filters.trip_id ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, trip_id: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Trips</option>
                {tripsQuery.data?.map((t) => (
                  <option key={t.id} value={t.id}>Trip #{t.id} — {t.fromCity} → {t.toCity}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-xs font-medium text-green-600 uppercase mb-1">Total Cash IN</div>
            <div className="text-xl font-bold text-green-800">{formatPKR(data.totalIn)}</div>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-xs font-medium text-red-600 uppercase mb-1">Total Cash OUT</div>
            <div className="text-xl font-bold text-red-800">{formatPKR(data.totalOut)}</div>
          </div>
          <div className={`bg-gradient-to-r border rounded-lg p-4 text-center ${
            data.balance >= 0
              ? "from-blue-50 to-blue-100 border-blue-200"
              : "from-red-50 to-red-100 border-red-200"
          }`}>
            <div className={`text-xs font-medium uppercase mb-1 ${data.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>Balance</div>
            <div className={`text-xl font-bold ${data.balance >= 0 ? "text-blue-800" : "text-red-800"}`}>{formatPKR(data.balance)}</div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {cashBookQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading cash book...
          </div>
        ) : !data?.entries.length ? (
          <div className="p-8 text-center text-gray-500">No entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-green-700">Amount IN</th>
                  <th className="text-right px-4 py-3 font-medium text-red-700">Amount OUT</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(entry.entryDate + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        entry.entryType === "IN"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {entry.entryType === "IN" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{entry.description || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {entry.entryType === "IN" ? formatPKR(Number(entry.amount)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-700">
                      {entry.entryType === "OUT" ? formatPKR(Number(entry.amount)) : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${entry.runningBalance >= 0 ? "text-blue-700" : "text-red-700"}`}>
                      {formatPKR(entry.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
