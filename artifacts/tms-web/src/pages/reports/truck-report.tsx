import { useState, useRef, useEffect } from "react";
import { Truck, Loader2, Filter, ChevronDown, X, ChevronUp, ChevronsUpDown, Info } from "lucide-react";
import { Link } from "wouter";
import { useGetTruckReport, useListTrucks } from "@workspace/api-client-react";
import ReportActions from "./report-actions";

type TripFilter = "Mix" | "Open" | "Closed";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getMonthStart(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return d.toISOString().split("T")[0];
}

function getMonthEnd(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  return d.toISOString().split("T")[0];
}

function getYearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

const PAGE_SIZE = 10;

type SortKey = "truckNumber" | "totalTrips" | "openTrips" | "closedTrips" | "totalIncome" | "totalExpenses" | "driverCommission" | "profit";
type SortDir = "asc" | "desc";

function getInitialFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    date_from: params.get("date_from") || getMonthStart(0),
    date_to: params.get("date_to") || getToday(),
  };
}

export default function TruckReportPage() {
  const initF = getInitialFilters();
  const [dateFrom, setDateFrom] = useState(initF.date_from);
  const [dateTo, setDateTo] = useState(initF.date_to);
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<"All" | "Owned" | "Rented">("All");
  const [selectedTruckIds, setSelectedTruckIds] = useState<Set<number>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [activePreset, setActivePreset] = useState<string>("thisMonth");
  const [tripFilter, setTripFilter] = useState<TripFilter>("Mix");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const trucksQuery = useListTrucks({});
  const allTrucks = trucksQuery.data || [];

  const reportQuery = useGetTruckReport({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    trip_status: tripFilter === "Mix" ? undefined : (tripFilter as "Open" | "Closed"),
  });

  const reportData = reportQuery.data || [];

  const truckOwnerMap = new Map(allTrucks.map((t) => [t.id, t.ownerType as "Owned" | "Rented"]));

  const filteredData = reportData.filter((r) => {
    const ownerType = truckOwnerMap.get(r.truckId);
    if (ownerTypeFilter !== "All" && ownerType !== ownerTypeFilter) return false;
    if (selectedTruckIds.size > 0 && !selectedTruckIds.has(r.truckId)) return false;
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    return sortDir === "asc" ? aNum - bNum : bNum - aNum;
  });

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const pagedData = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = filteredData.reduce(
    (acc, r) => ({
      trips: acc.trips + r.totalTrips,
      open: acc.open + r.openTrips,
      closed: acc.closed + r.closedTrips,
      income: acc.income + r.totalIncome,
      expenses: acc.expenses + r.totalExpenses,
      commission: acc.commission + r.driverCommission,
      profit: acc.profit + r.profit,
    }),
    { trips: 0, open: 0, closed: 0, income: 0, expenses: 0, commission: 0, profit: 0 }
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
    setPage(1);
  }

  function selectAll() {
    setSelectedTruckIds(new Set(trucksForDropdown.map((t) => t.id)));
    setPage(1);
  }

  function clearAll() {
    setSelectedTruckIds(new Set());
    setPage(1);
  }

  function applyPreset(preset: string) {
    setActivePreset(preset);
    setPage(1);
    if (preset === "thisMonth") { setDateFrom(getMonthStart(0)); setDateTo(getToday()); }
    else if (preset === "lastMonth") { setDateFrom(getMonthStart(-1)); setDateTo(getMonthEnd(-1)); }
    else if (preset === "thisYear") { setDateFrom(getYearStart()); setDateTo(getToday()); }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "truckNumber" ? "asc" : "desc");
    }
    setPage(1);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 text-gray-400 inline" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1 text-blue-600 inline" />
      : <ChevronDown className="w-3 h-3 ml-1 text-blue-600 inline" />;
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

  function buildTripsLink(truckId: number, status?: "Open" | "Closed") {
    const p = new URLSearchParams();
    p.set("truck_id", String(truckId));
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    if (status) p.set("trip_status", status);
    return `/trips?${p}`;
  }

  const csvParams = new URLSearchParams();
  csvParams.set("type", "trucks");
  if (dateFrom) csvParams.set("date_from", dateFrom);
  if (dateTo) csvParams.set("date_to", dateTo);

  const hasFilters = ownerTypeFilter !== "All" || selectedTruckIds.size > 0;

  function clearFilters() {
    setOwnerTypeFilter("All");
    setSelectedTruckIds(new Set());
    setPage(1);
  }

  const selectedTruckLabel =
    selectedTruckIds.size === 0
      ? "All Trucks"
      : selectedTruckIds.size === 1
      ? allTrucks.find((t) => selectedTruckIds.has(t.id))?.truckNumber ?? "1 selected"
      : `${selectedTruckIds.size} trucks selected`;

  const presetBtnClass = (p: string) =>
    `px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
      activePreset === p
        ? "bg-orange-600 text-white"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-orange-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Truck Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="truck-report" />
      </div>

      <div className="print:hidden mb-6 p-4 bg-white border border-gray-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button onClick={() => applyPreset("thisMonth")} className={presetBtnClass("thisMonth")}>This Month</button>
            <button onClick={() => applyPreset("lastMonth")} className={presetBtnClass("lastMonth")}>Last Month</button>
            <button onClick={() => applyPreset("thisYear")} className={presetBtnClass("thisYear")}>This Year</button>
          </div>
          <div className="h-5 w-px bg-gray-300" />
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            {(["Mix", "Open", "Closed"] as TripFilter[]).map((v) => {
              const labels: Record<TripFilter, string> = { Mix: "Mix (Open + Closed)", Open: "Open Trips Only", Closed: "Closed Trips Only" };
              const active: Record<TripFilter, string> = {
                Mix: "bg-gray-700 text-white shadow-sm",
                Open: "bg-amber-600 text-white shadow-sm",
                Closed: "bg-green-700 text-white shadow-sm",
              };
              const inactive: Record<TripFilter, string> = {
                Mix: "bg-white text-gray-600 hover:bg-gray-50",
                Open: "bg-white text-amber-700 hover:bg-amber-50",
                Closed: "bg-white text-green-700 hover:bg-green-50",
              };
              return (
                <button
                  key={v}
                  onClick={() => { setTripFilter(v); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-300 last:border-r-0 ${tripFilter === v ? active[v] : inactive[v]}`}
                >
                  {labels[v]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setActivePreset(""); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActivePreset(""); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Truck Type</label>
            <select
              value={ownerTypeFilter}
              onChange={(e) => {
                setOwnerTypeFilter(e.target.value as "All" | "Owned" | "Rented");
                setSelectedTruckIds(new Set());
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left flex items-center justify-between bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                        className="rounded border-gray-300 text-orange-600"
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
          <div className="flex flex-wrap gap-1.5">
            {allTrucks.filter((t) => selectedTruckIds.has(t.id)).map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                {t.truckNumber}
                <X className="w-3 h-3 cursor-pointer hover:text-orange-600" onClick={() => toggleTruck(t.id)} />
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1 border-t border-gray-100">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span><span className="font-semibold text-amber-700">Open</span> = trips in progress · <span className="font-semibold text-green-700">Closed</span> = completed · Numbers are clickable links to the trip list</span>
        </div>
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th
                      onClick={() => handleSort("truckNumber")}
                      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                    >
                      Truck Number <SortIcon col="truckNumber" />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                    <th
                      onClick={() => handleSort("totalTrips")}
                      className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                    >
                      Total <SortIcon col="totalTrips" />
                    </th>
                    <th
                      onClick={() => handleSort("openTrips")}
                      className="text-right px-4 py-3 font-medium text-amber-700 cursor-pointer hover:bg-gray-100 select-none"
                    >
                      Open <SortIcon col="openTrips" />
                    </th>
                    <th
                      onClick={() => handleSort("closedTrips")}
                      className="text-right px-4 py-3 font-medium text-green-700 cursor-pointer hover:bg-gray-100 select-none"
                    >
                      Closed <SortIcon col="closedTrips" />
                    </th>
                    <th
                      onClick={() => handleSort("totalIncome")}
                      className="text-right px-4 py-3 font-medium text-blue-700 cursor-pointer hover:bg-gray-100 select-none"
                    >
                      Income <SortIcon col="totalIncome" />
                    </th>
                    <th
                      onClick={() => handleSort("totalExpenses")}
                      className="text-right px-4 py-3 font-medium text-orange-700 cursor-pointer hover:bg-gray-100 select-none"
                    >
                      Truck Exp <SortIcon col="totalExpenses" />
                    </th>
                    <th
                      onClick={() => handleSort("driverCommission")}
                      className="text-right px-4 py-3 font-medium text-purple-700 cursor-pointer hover:bg-gray-100 select-none"
                    >
                      Driver Comm <SortIcon col="driverCommission" />
                    </th>
                    <th
                      onClick={() => handleSort("profit")}
                      className="text-right px-4 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                    >
                      Net Profit <SortIcon col="profit" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedData.map((r) => {
                    const ownerType = truckOwnerMap.get(r.truckId);
                    const isLoss = r.profit < 0;
                    return (
                      <tr
                        key={r.truckId}
                        className={`border-b border-gray-100 hover:bg-opacity-80 ${isLoss ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {isLoss && <span className="inline-block w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                            {r.truckNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {ownerType && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ownerType === "Owned" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              {ownerType}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={buildTripsLink(r.truckId)} className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                            {r.totalTrips}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.openTrips > 0 ? (
                            <Link href={buildTripsLink(r.truckId, "Open")} className="font-semibold text-amber-600 hover:text-amber-800 hover:underline cursor-pointer">
                              {r.openTrips}
                            </Link>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.closedTrips > 0 ? (
                            <Link href={buildTripsLink(r.truckId, "Closed")} className="font-semibold text-green-600 hover:text-green-800 hover:underline cursor-pointer">
                              {r.closedTrips}
                            </Link>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-700">{formatPKR(r.totalIncome)}</td>
                        <td className="px-4 py-3 text-right text-orange-700">{formatPKR(r.totalExpenses)}</td>
                        <td className="px-4 py-3 text-right text-purple-700">{formatPKR(r.driverCommission)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${r.profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {formatPKR(r.profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="px-4 py-3 text-gray-700" colSpan={2}>
                      Totals {filteredData.length > 0 ? `(${filteredData.length} truck${filteredData.length !== 1 ? "s" : ""})` : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-800">{totals.trips}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{totals.open}</td>
                    <td className="px-4 py-3 text-right text-green-700">{totals.closed}</td>
                    <td className="px-4 py-3 text-right text-blue-800">{formatPKR(totals.income)}</td>
                    <td className="px-4 py-3 text-right text-orange-800">{formatPKR(totals.expenses)}</td>
                    <td className="px-4 py-3 text-right text-purple-800">{formatPKR(totals.commission)}</td>
                    <td className={`px-4 py-3 text-right ${totals.profit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(totals.profit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredData.length)} of {filteredData.length} trucks
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 text-xs border rounded-md ${p === page ? "bg-orange-600 text-white border-orange-600" : "border-gray-300 hover:bg-gray-100"}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
