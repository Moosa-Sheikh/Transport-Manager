import { useState } from "react";
import { MoveHorizontal, Loader2, Filter, X, ChevronRight } from "lucide-react";
import { useGetShiftingReport, useListTrucks, useListDrivers } from "@workspace/api-client-react";
import { Link } from "wouter";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

type MovementFilter = "customer_shifting" | "in_house_shifting";

interface Filters {
  date_from?: string;
  date_to?: string;
  truck_id?: number;
  driver_id?: number;
  status?: "Open" | "Closed";
  movement_type?: MovementFilter;
}

export default function ShiftingReportPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);

  const query = useGetShiftingReport({
    date_from: filters.date_from,
    date_to: filters.date_to,
    truck_id: filters.truck_id,
    driver_id: filters.driver_id,
    status: filters.status,
    movement_type: filters.movement_type,
  });

  const trucksQuery = useListTrucks({});
  const driversQuery = useListDrivers({});

  const rows = query.data ?? [];
  const totalRevenue = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalExpenses = rows.reduce((s, r) => s + r.totalExpenses, 0);
  const totalCommission = rows.reduce((s, r) => s + r.driverCommission, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
  const totalProfit = rows.reduce((s, r) => s + (r.profit ?? 0), 0);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => setFilters({});

  function routeLabel(row: (typeof rows)[number]) {
    if (row.movementType === "customer_shifting") {
      const from = row.fromWarehouseName ?? row.fromCityName ?? "";
      const to = row.toWarehouseName ?? row.toCityName ?? "";
      if (from && to) return `${from} → ${to}`;
      if (from) return from;
      if (to) return to;
      return "—";
    }
    return row.inhouseWarehouseName ?? "—";
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <MoveHorizontal className="w-6 h-6 text-purple-600 print:hidden" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shifting Report</h2>
            <p className="text-sm text-gray-500 mt-0.5">Customer & in-house shifting movements</p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              activeFilterCount > 0
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            Print / Export
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1 bg-gray-100 rounded-lg p-1 text-sm w-fit print:hidden">
        <button
          onClick={() => setFilters((f) => { const { movement_type, ...rest } = f; return rest; })}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${!filters.movement_type ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          All Shifts
        </button>
        <button
          onClick={() => setFilters((f) => ({ ...f, movement_type: "customer_shifting" }))}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${filters.movement_type === "customer_shifting" ? "bg-white shadow text-teal-700" : "text-gray-500 hover:text-gray-700"}`}
        >
          Customer Shifts
        </button>
        <button
          onClick={() => setFilters((f) => ({ ...f, movement_type: "in_house_shifting" }))}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${filters.movement_type === "in_house_shifting" ? "bg-white shadow text-orange-700" : "text-gray-500 hover:text-gray-700"}`}
        >
          In-House Shifts
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Filter Shifts</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
              <input
                type="date"
                value={filters.date_from ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
              <input
                type="date"
                value={filters.date_to ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Truck</label>
              <select
                value={filters.truck_id ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, truck_id: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Trucks</option>
                {trucksQuery.data?.map((t) => (
                  <option key={t.id} value={t.id}>{t.truckNumber}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
              <select
                value={filters.driver_id ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, driver_id: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Drivers</option>
                {driversQuery.data?.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={filters.status ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as "Open" | "Closed" | undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Status</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 text-center">
            <div className="text-[10px] font-medium text-purple-600 uppercase mb-1">Total Shifts</div>
            <div className="text-xl font-bold text-purple-800">{rows.length}</div>
          </div>
          <div className="bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-3 text-center">
            <div className="text-[10px] font-medium text-teal-600 uppercase mb-1">Revenue</div>
            <div className="text-xl font-bold text-teal-800">{formatPKR(totalRevenue)}</div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3 text-center">
            <div className="text-[10px] font-medium text-orange-600 uppercase mb-1">Expenses</div>
            <div className="text-xl font-bold text-orange-800">{formatPKR(totalExpenses)}</div>
          </div>
          <div className="bg-gradient-to-r from-pink-50 to-pink-100 border border-pink-200 rounded-lg p-3 text-center">
            <div className="text-[10px] font-medium text-pink-600 uppercase mb-1">Commission</div>
            <div className="text-xl font-bold text-pink-800">{formatPKR(totalCommission)}</div>
          </div>
          <div className={`bg-gradient-to-r border rounded-lg p-3 text-center ${
            totalProfit >= 0
              ? "from-green-50 to-green-100 border-green-200"
              : "from-red-50 to-red-100 border-red-200"
          }`}>
            <div className={`text-[10px] font-medium uppercase mb-1 ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>Net (Rev − Cost)</div>
            <div className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(totalProfit)}</div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {query.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading shifting report...
          </div>
        ) : !rows.length ? (
          <div className="p-8 text-center text-gray-500">
            No shifts found.{" "}
            {activeFilterCount > 0
              ? "Try adjusting your filters."
              : (
                <span>
                  <Link href="/trips/create" className="text-purple-600 hover:underline">Create a shifting record</Link> to get started.
                </span>
              )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50 border-b border-purple-200">
                  <th className="text-left px-3 py-3 font-medium text-purple-700">ID</th>
                  <th className="text-left px-3 py-3 font-medium text-purple-700">Date</th>
                  <th className="text-left px-3 py-3 font-medium text-purple-700">Type</th>
                  <th className="text-left px-3 py-3 font-medium text-purple-700">Truck</th>
                  <th className="text-left px-3 py-3 font-medium text-purple-700">Driver</th>
                  <th className="text-left px-3 py-3 font-medium text-purple-700">Customer</th>
                  <th className="text-left px-3 py-3 font-medium text-purple-700">Route / Location</th>
                  <th className="text-left px-3 py-3 font-medium text-purple-700">Item</th>
                  <th className="text-right px-3 py-3 font-medium text-purple-700">Rounds</th>
                  <th className="text-right px-3 py-3 font-medium text-purple-700">Rate</th>
                  <th className="text-right px-3 py-3 font-medium text-purple-700">Revenue</th>
                  <th className="text-right px-3 py-3 font-medium text-purple-700">Expenses</th>
                  <th className="text-right px-3 py-3 font-medium text-purple-700">Commission</th>
                  <th className="text-right px-3 py-3 font-medium text-purple-700">Profit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isCustomer = row.movementType === "customer_shifting";
                  return (
                    <tr key={row.tripId} className="border-b border-gray-100 hover:bg-purple-50/30">
                      <td className="px-3 py-3 font-medium text-gray-900">
                        <Link href={`/trips/${row.tripId}`} className="text-purple-700 hover:underline">
                          #{row.tripId}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                        {new Date(row.tripDate + "T00:00:00").toLocaleDateString("en-PK", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          isCustomer ? "bg-teal-100 text-teal-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {isCustomer ? "Customer" : "In-House"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{row.truckNumber}</td>
                      <td className="px-3 py-3 text-gray-700">{row.driverName}</td>
                      <td className="px-3 py-3 text-gray-700">{isCustomer ? (row.customerName ?? "—") : <span className="text-gray-400 italic text-xs">Internal</span>}</td>
                      <td className="px-3 py-3 text-gray-700 text-xs">{routeLabel(row)}</td>
                      <td className="px-3 py-3 text-gray-700">{isCustomer ? (row.itemName ?? "—") : <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-3 text-right text-gray-700">{row.rounds ?? 0}</td>
                      <td className="px-3 py-3 text-right text-gray-700">
                        {row.ratePerRound != null && row.ratePerRound > 0 ? formatPKR(Number(row.ratePerRound)) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-teal-700 font-medium">
                        {isCustomer ? formatPKR(row.revenue ?? 0) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-orange-700 font-medium">
                        {formatPKR(row.totalExpenses)}
                      </td>
                      <td className="px-3 py-3 text-right text-pink-700 font-medium">
                        {row.driverCommission > 0 ? formatPKR(row.driverCommission) : "—"}
                      </td>
                      <td className={`px-3 py-3 text-right font-semibold ${
                        isCustomer
                          ? (row.profit ?? 0) >= 0 ? "text-green-700" : "text-red-700"
                          : "text-red-700"
                      }`}>
                        {isCustomer ? formatPKR(row.profit ?? 0) : `(${formatPKR(row.totalCost)})`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-purple-50 border-t-2 border-purple-200 font-semibold">
                  <td className="px-3 py-3 text-purple-800" colSpan={10}>
                    Total ({rows.length} shifts)
                  </td>
                  <td className="px-3 py-3 text-right text-teal-800">{formatPKR(totalRevenue)}</td>
                  <td className="px-3 py-3 text-right text-orange-800">{formatPKR(totalExpenses)}</td>
                  <td className="px-3 py-3 text-right text-pink-800">{formatPKR(totalCommission)}</td>
                  <td className={`px-3 py-3 text-right ${totalProfit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(totalProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
