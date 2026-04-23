import { useState, useRef, useEffect } from "react";
import { UserCog, Loader2, Filter, ChevronDown, ChevronUp, ChevronsUpDown, Info } from "lucide-react";
import { Link } from "wouter";
import { useGetDriverReport, useListDrivers } from "@workspace/api-client-react";
import ReportActions from "./report-actions";

type TripFilter = "Mix" | "Open" | "Closed";
type SortKey = "driverName" | "totalTrips" | "openTrips" | "closedTrips" | "driverCommission" | "totalExpenses" | "totalAdvances" | "totalSalary" | "netPaid" | "outstandingLoanBalance";
type SortDir = "asc" | "desc";

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

function getInitialFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    date_from: params.get("date_from") || getMonthStart(0),
    date_to: params.get("date_to") || getToday(),
    driver_id: params.get("driver_id") ? Number(params.get("driver_id")) : undefined as number | undefined,
  };
}

export default function DriverReportPage() {
  const initF = getInitialFilters();
  const [dateFrom, setDateFrom] = useState(initF.date_from);
  const [dateTo, setDateTo] = useState(initF.date_to);
  const [driverId, setDriverId] = useState<number | undefined>(initF.driver_id);
  const [tripFilter, setTripFilter] = useState<TripFilter>("Mix");
  const [sortKey, setSortKey] = useState<SortKey>("driverName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [activePreset, setActivePreset] = useState<string>("thisMonth");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const driversQuery = useListDrivers({});
  const allDrivers = driversQuery.data || [];

  const reportQuery = useGetDriverReport({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    driver_id: driverId,
    trip_status: tripFilter === "Mix" ? undefined : (tripFilter as "Open" | "Closed"),
  });

  const data = reportQuery.data || [];

  const sortedData = [...data].sort((a, b) => {
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

  const totals = data.reduce(
    (acc, r) => ({
      trips: acc.trips + r.totalTrips,
      open: acc.open + r.openTrips,
      closed: acc.closed + r.closedTrips,
      commission: acc.commission + r.driverCommission,
      expenses: acc.expenses + r.totalExpenses,
      advances: acc.advances + r.totalAdvances,
      salary: acc.salary + r.totalSalary,
      netPaid: acc.netPaid + r.netPaid,
      loanBalance: acc.loanBalance + r.outstandingLoanBalance,
    }),
    { trips: 0, open: 0, closed: 0, commission: 0, expenses: 0, advances: 0, salary: 0, netPaid: 0, loanBalance: 0 }
  );

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
      setSortDir(key === "driverName" ? "asc" : "desc");
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

  function buildTripsLink(dId: number, status?: "Open" | "Closed") {
    const p = new URLSearchParams();
    p.set("driver_id", String(dId));
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    if (status) p.set("trip_status", status);
    return `/trips?${p}`;
  }

  const csvParams = new URLSearchParams();
  csvParams.set("type", "drivers");
  if (dateFrom) csvParams.set("date_from", dateFrom);
  if (dateTo) csvParams.set("date_to", dateTo);
  if (driverId) csvParams.set("driver_id", String(driverId));

  const selectedDriverName = driverId ? allDrivers.find((d) => d.id === driverId)?.name : undefined;

  const hasFilters = !!driverId;

  function clearFilters() {
    setDriverId(undefined);
    setPage(1);
  }

  const presetBtnClass = (p: string) =>
    `px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
      activePreset === p
        ? "bg-green-700 text-white"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <UserCog className="w-6 h-6 text-green-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Driver Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="driver-report" />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActivePreset(""); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div ref={dropdownRef} className="relative sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left flex items-center justify-between bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <span className={!selectedDriverName ? "text-gray-500" : "text-gray-900"}>
                {selectedDriverName ?? "All Drivers"}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <button
                  onClick={() => { setDriverId(undefined); setDropdownOpen(false); setPage(1); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                >
                  All Drivers
                </button>
                {allDrivers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setDriverId(d.id); setDropdownOpen(false); setPage(1); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${driverId === d.id ? "bg-green-50 text-green-700 font-medium" : "text-gray-800"}`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1 border-t border-gray-100">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span><span className="font-semibold text-amber-700">Open</span> = trips in progress · <span className="font-semibold text-green-700">Closed</span> = completed · Trip counts are clickable links · <span className="font-semibold text-amber-600">Amber rows</span> = outstanding loan balance</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {reportQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading report...
          </div>
        ) : !data.length ? (
          <div className="p-8 text-center text-gray-500">No driver data found for the selected filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th
                      onClick={() => handleSort("driverName")}
                      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Driver <SortIcon col="driverName" />
                    </th>
                    <th
                      onClick={() => handleSort("totalTrips")}
                      className="text-right px-3 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Total <SortIcon col="totalTrips" />
                    </th>
                    <th
                      onClick={() => handleSort("openTrips")}
                      className="text-right px-3 py-3 font-medium text-amber-700 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Open <SortIcon col="openTrips" />
                    </th>
                    <th
                      onClick={() => handleSort("closedTrips")}
                      className="text-right px-3 py-3 font-medium text-green-700 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Closed <SortIcon col="closedTrips" />
                    </th>
                    <th
                      onClick={() => handleSort("driverCommission")}
                      className="text-right px-3 py-3 font-medium text-purple-700 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Commission <SortIcon col="driverCommission" />
                    </th>
                    <th
                      onClick={() => handleSort("totalExpenses")}
                      className="text-right px-3 py-3 font-medium text-orange-700 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Expenses <SortIcon col="totalExpenses" />
                    </th>
                    <th
                      onClick={() => handleSort("totalAdvances")}
                      className="text-right px-3 py-3 font-medium text-blue-700 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Advances <SortIcon col="totalAdvances" />
                    </th>
                    <th
                      onClick={() => handleSort("totalSalary")}
                      className="text-right px-3 py-3 font-medium text-indigo-700 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Salary <SortIcon col="totalSalary" />
                    </th>
                    <th
                      onClick={() => handleSort("netPaid")}
                      className="text-right px-3 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Net Paid <SortIcon col="netPaid" />
                    </th>
                    <th
                      onClick={() => handleSort("outstandingLoanBalance")}
                      className="text-right px-3 py-3 font-medium text-amber-700 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      Loan Bal. <SortIcon col="outstandingLoanBalance" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedData.map((r) => {
                    const hasLoan = r.outstandingLoanBalance > 0;
                    return (
                      <tr
                        key={r.driverId}
                        className={`border-b border-gray-100 ${hasLoan ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {hasLoan && <span className="inline-block w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
                            {r.driverName}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={buildTripsLink(r.driverId)} className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                            {r.totalTrips}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {r.openTrips > 0 ? (
                            <Link href={buildTripsLink(r.driverId, "Open")} className="font-semibold text-amber-600 hover:text-amber-800 hover:underline cursor-pointer">
                              {r.openTrips}
                            </Link>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {r.closedTrips > 0 ? (
                            <Link href={buildTripsLink(r.driverId, "Closed")} className="font-semibold text-green-600 hover:text-green-800 hover:underline cursor-pointer">
                              {r.closedTrips}
                            </Link>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-purple-700">{formatPKR(r.driverCommission)}</td>
                        <td className="px-3 py-3 text-right text-orange-700">{formatPKR(r.totalExpenses)}</td>
                        <td className="px-3 py-3 text-right text-blue-700">{formatPKR(r.totalAdvances)}</td>
                        <td className="px-3 py-3 text-right text-indigo-700">{formatPKR(r.totalSalary)}</td>
                        <td className="px-3 py-3 text-right font-medium text-gray-700">{formatPKR(r.netPaid)}</td>
                        <td className={`px-3 py-3 text-right font-medium ${hasLoan ? "text-amber-700" : "text-green-700"}`}>
                          {formatPKR(r.outstandingLoanBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="px-4 py-3 text-gray-700">
                      Totals {data.length > 0 ? `(${data.length} driver${data.length !== 1 ? "s" : ""})` : ""}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-800">{totals.trips}</td>
                    <td className="px-3 py-3 text-right text-amber-700">{totals.open}</td>
                    <td className="px-3 py-3 text-right text-green-700">{totals.closed}</td>
                    <td className="px-3 py-3 text-right text-purple-800">{formatPKR(totals.commission)}</td>
                    <td className="px-3 py-3 text-right text-orange-800">{formatPKR(totals.expenses)}</td>
                    <td className="px-3 py-3 text-right text-blue-800">{formatPKR(totals.advances)}</td>
                    <td className="px-3 py-3 text-right text-indigo-800">{formatPKR(totals.salary)}</td>
                    <td className="px-3 py-3 text-right text-gray-800">{formatPKR(totals.netPaid)}</td>
                    <td className={`px-3 py-3 text-right ${totals.loanBalance > 0 ? "text-amber-800" : "text-green-800"}`}>{formatPKR(totals.loanBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.length)} of {data.length} drivers
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
                      className={`px-3 py-1 text-xs border rounded-md ${p === page ? "bg-green-700 text-white border-green-700" : "border-gray-300 hover:bg-gray-100"}`}
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
