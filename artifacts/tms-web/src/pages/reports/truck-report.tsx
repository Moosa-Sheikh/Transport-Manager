import { useState, useRef, useEffect } from "react";
import { Truck, Loader2, Filter, ChevronDown, X } from "lucide-react";
import { Link } from "wouter";
import { useGetTruckReport, useListTrucks } from "@workspace/api-client-react";
import ReportActions from "./report-actions";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

function getInitialFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    date_from: params.get("date_from") || "",
    date_to: params.get("date_to") || "",
  };
}

export default function TruckReportPage() {
  const initF = getInitialFilters();
  const [dateFrom, setDateFrom] = useState(initF.date_from);
  const [dateTo, setDateTo] = useState(initF.date_to);
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<"All" | "Owned" | "Rented">("All");
  const [selectedTruckIds, setSelectedTruckIds] = useState<Set<number>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const trucksQuery = useListTrucks({});
  const allTrucks = trucksQuery.data || [];

  const reportQuery = useGetTruckReport({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const reportData = reportQuery.data || [];

  const truckOwnerMap = new Map(allTrucks.map((t) => [t.id, t.ownerType as "Owned" | "Rented"]));

  const filteredData = reportData.filter((r) => {
    const ownerType = truckOwnerMap.get(r.truckId);
    if (ownerTypeFilter !== "All" && ownerType !== ownerTypeFilter) return false;
    if (selectedTruckIds.size > 0 && !selectedTruckIds.has(r.truckId)) return false;
    return true;
  });

  const totals = filteredData.reduce(
    (acc, r) => ({
      trips: acc.trips + r.totalTrips,
      income: acc.income + r.totalIncome,
      expenses: acc.expenses + r.totalExpenses,
      profit: acc.profit + r.profit,
    }),
    { trips: 0, income: 0, expenses: 0, profit: 0 }
  );

  const trucksForDropdown = allTrucks.filter((t) =>
    ownerTypeFilter === "All" ? true : t.ownerType === ownerTypeFilter
  );

  function toggleTruck(id: number) {
    setSelectedTruckIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedTruckIds(new Set(trucksForDropdown.map((t) => t.id)));
  }

  function clearAll() {
    setSelectedTruckIds(new Set());
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function buildTripsLink(truckId: number) {
    const p = new URLSearchParams();
    p.set("truck_id", String(truckId));
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    return `/trips?${p}`;
  }

  const csvParams = new URLSearchParams();
  csvParams.set("type", "trucks");
  if (dateFrom) csvParams.set("date_from", dateFrom);
  if (dateTo) csvParams.set("date_to", dateTo);

  const hasFilters = dateFrom || dateTo || ownerTypeFilter !== "All" || selectedTruckIds.size > 0;

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setOwnerTypeFilter("All");
    setSelectedTruckIds(new Set());
  }

  const selectedTruckLabel =
    selectedTruckIds.size === 0
      ? "All Trucks"
      : selectedTruckIds.size === 1
      ? allTrucks.find((t) => selectedTruckIds.has(t.id))?.truckNumber ?? "1 selected"
      : `${selectedTruckIds.size} trucks selected`;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-orange-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Truck Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="truck-report" />
      </div>

      <div className="print:hidden mb-6 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Truck Type</label>
            <select
              value={ownerTypeFilter}
              onChange={(e) => {
                setOwnerTypeFilter(e.target.value as "All" | "Owned" | "Rented");
                setSelectedTruckIds(new Set());
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">All (Owned + Rented)</option>
              <option value="Owned">Owned Only</option>
              <option value="Rented">Rented Only</option>
            </select>
          </div>

          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Truck Number</label>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left flex items-center justify-between bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <span className={selectedTruckIds.size === 0 ? "text-gray-500" : "text-gray-900"}>
                {selectedTruckLabel}
              </span>
              <div className="flex items-center gap-1">
                {selectedTruckIds.size > 0 && (
                  <X
                    className="w-3 h-3 text-gray-400 hover:text-gray-700"
                    onClick={(e) => { e.stopPropagation(); clearAll(); }}
                  />
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 sticky top-0 bg-white">
                  <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select All</button>
                  <button onClick={clearAll} className="text-xs text-gray-500 hover:underline">Clear</button>
                </div>
                {trucksForDropdown.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">No trucks found</div>
                ) : (
                  trucksForDropdown.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTruckIds.has(t.id)}
                        onChange={() => toggleTruck(t.id)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-gray-800 font-medium">{t.truckNumber}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.ownerType === "Owned" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {t.ownerType}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {selectedTruckIds.size > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {allTrucks.filter((t) => selectedTruckIds.has(t.id)).map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                {t.truckNumber}
                <X className="w-3 h-3 cursor-pointer hover:text-orange-600" onClick={() => toggleTruck(t.id)} />
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {reportQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading report...
          </div>
        ) : !filteredData.length ? (
          <div className="p-8 text-center text-gray-500">No truck data found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Truck Number</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total Trips</th>
                  <th className="text-right px-4 py-3 font-medium text-blue-700">Total Income</th>
                  <th className="text-right px-4 py-3 font-medium text-orange-700">Total Expenses</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Profit</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((r) => {
                  const ownerType = truckOwnerMap.get(r.truckId);
                  return (
                    <tr key={r.truckId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.truckNumber}</td>
                      <td className="px-4 py-3">
                        {ownerType && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ownerType === "Owned" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {ownerType}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={buildTripsLink(r.truckId)}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {r.totalTrips}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-blue-700">{formatPKR(r.totalIncome)}</td>
                      <td className="px-4 py-3 text-right text-orange-700">{formatPKR(r.totalExpenses)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${r.profit >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPKR(r.profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                  <td className="px-4 py-3 text-gray-700" colSpan={2}>
                    Totals {selectedTruckIds.size > 0 ? `(${filteredData.length} trucks)` : ""}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800">{totals.trips}</td>
                  <td className="px-4 py-3 text-right text-blue-800">{formatPKR(totals.income)}</td>
                  <td className="px-4 py-3 text-right text-orange-800">{formatPKR(totals.expenses)}</td>
                  <td className={`px-4 py-3 text-right ${totals.profit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(totals.profit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
