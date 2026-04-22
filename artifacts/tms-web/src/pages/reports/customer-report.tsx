import { useState, useMemo } from "react";
import { Users, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useGetCustomerReport } from "@workspace/api-client-react";
import ReportFilterBar, { type ReportFilters } from "./report-filters";
import ReportActions from "./report-actions";

const PAGE_SIZE = 10;

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

function TripLink({ count, customerId, status, dateFrom, dateTo }: { count: number; customerId: number; status: "Open" | "Closed"; dateFrom?: string; dateTo?: string }) {
  if (count === 0) return <span className="text-gray-400">0</span>;
  const params = new URLSearchParams({ customer_id: String(customerId), status });
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const color = status === "Open" ? "text-amber-600 hover:text-amber-800" : "text-green-700 hover:text-green-900";
  return (
    <a href={`/trips?${params}`} className={`font-semibold underline underline-offset-2 ${color}`}>
      {count}
    </a>
  );
}

function currentMonthRange(): { date_from: string; date_to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    date_from: `${y}-${m}-01`,
    date_to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getInitialFilters(): ReportFilters {
  const params = new URLSearchParams(window.location.search);
  const f: ReportFilters = {};
  if (params.get("customer_id")) f.customer_id = Number(params.get("customer_id"));
  if (params.get("date_from")) {
    f.date_from = params.get("date_from")!;
    f.date_to = params.get("date_to") ?? undefined;
  } else {
    const { date_from, date_to } = currentMonthRange();
    f.date_from = date_from;
    f.date_to = date_to;
  }
  return f;
}

type TripFilter = "Mix" | "Open" | "Closed";

export default function CustomerReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(getInitialFilters);
  const [tripFilter, setTripFilter] = useState<TripFilter>("Mix");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const query = useGetCustomerReport({
    date_from: filters.date_from,
    date_to: filters.date_to,
    customer_id: filters.customer_id,
    status: filters.status as "Outstanding" | "Cleared" | undefined,
    trip_status: tripFilter === "Mix" ? undefined : (tripFilter as "Open" | "Closed"),
  });

  const allData = query.data || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return allData;
    const q = search.trim().toLowerCase();
    return allData.filter(
      (r) => r.customerName.toLowerCase().includes(q) || (r.companyName ?? "").toLowerCase().includes(q)
    );
  }, [allData, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totals = filtered.reduce(
    (acc, r) => ({
      openTrips: acc.openTrips + r.openTrips,
      closedTrips: acc.closedTrips + r.closedTrips,
      freight: acc.freight + r.totalFreight,
      expenses: acc.expenses + r.totalExpenses,
      received: acc.received + r.totalReceived,
      netBalance: acc.netBalance + r.netBalance,
      dues: acc.dues + r.totalDues,
      outstanding: acc.outstanding + r.outstandingBalance,
      totalLoans: acc.totalLoans + r.totalLoans,
      loanBalance: acc.loanBalance + r.loanBalance,
    }),
    { openTrips: 0, closedTrips: 0, freight: 0, expenses: 0, received: 0, netBalance: 0, dues: 0, outstanding: 0, totalLoans: 0, loanBalance: 0 }
  );

  const handleFiltersChange = (f: ReportFilters) => {
    setFilters(f);
    setPage(1);
  };

  const handleTripFilter = (v: TripFilter) => {
    setTripFilter(v);
    setPage(1);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const csvParams = new URLSearchParams();
  csvParams.set("type", "customers");
  if (filters.date_from) csvParams.set("date_from", filters.date_from);
  if (filters.date_to) csvParams.set("date_to", filters.date_to);
  if (filters.customer_id) csvParams.set("customer_id", String(filters.customer_id));
  if (filters.status) csvParams.set("status", filters.status);

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Customer Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="customer-report" />
      </div>

      <div className="print:hidden">
        <ReportFilterBar filters={filters} onChange={handleFiltersChange} showCustomer showStatus statusOptions={[{ value: "Outstanding", label: "Outstanding" }, { value: "Cleared", label: "Cleared" }]} />

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600">Calculate data for:</span>
          {(["Mix", "Open", "Closed"] as TripFilter[]).map((v) => {
            const labels: Record<TripFilter, string> = { Mix: "Mix (Open + Closed)", Open: "Open Trips Only", Closed: "Closed Trips Only" };
            const active: Record<TripFilter, string> = {
              Mix: "bg-gray-700 text-white shadow-sm",
              Open: "bg-amber-600 text-white shadow-sm",
              Closed: "bg-green-700 text-white shadow-sm",
            };
            const inactive: Record<TripFilter, string> = {
              Mix: "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50",
              Open: "bg-white text-amber-700 border border-amber-300 hover:bg-amber-50",
              Closed: "bg-white text-green-700 border border-green-300 hover:bg-green-50",
            };
            return (
              <button key={v} onClick={() => handleTripFilter(v)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tripFilter === v ? active[v] : inactive[v]}`}>
                {labels[v]}
              </button>
            );
          })}
          {tripFilter !== "Mix" && (
            <span className="text-xs text-gray-400 ml-1">
              — showing {tripFilter === "Open" ? "open" : "closed"} trip data only for all customers
            </span>
          )}
        </div>

        <div className="mt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by customer or company name..."
            className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 print:hidden">
        <span><span className="font-semibold text-amber-700">Open</span> = trips still in progress (clickable → opens trip list)</span>
        <span><span className="font-semibold text-green-700">Closed</span> = completed trips (clickable → opens trip list)</span>
        <span><span className="font-semibold text-purple-700">Net Balance</span> = Total Billed − Received &nbsp;(red = customer still owes you)</span>
        <span><span className="font-semibold text-orange-700">Dues Outstanding</span> = unpaid from dues/IOU system</span>
        <span><span className="font-semibold text-red-700">Loan Balance</span> = money given to customer not yet returned</span>
      </div>

      <div className="mt-3 bg-white border border-gray-200 rounded-lg overflow-hidden">
        {query.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading report...
          </div>
        ) : !filtered.length ? (
          <div className="p-8 text-center text-gray-500">
            {search ? `No customers match "${search}".` : "No customer data found."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-3 font-semibold text-gray-600" rowSpan={2}>Customer</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-600" rowSpan={2}>Company</th>
                    <th colSpan={2} className="text-center px-3 py-1.5 font-semibold text-indigo-700 border-b border-indigo-200 bg-indigo-50">Trips</th>
                    <th colSpan={4} className="text-center px-3 py-1.5 font-semibold text-blue-700 border-b border-blue-200 bg-blue-50">Billing</th>
                    <th colSpan={2} className="text-center px-3 py-1.5 font-semibold text-orange-700 border-b border-orange-200 bg-orange-50">Dues</th>
                    <th colSpan={2} className="text-center px-3 py-1.5 font-semibold text-purple-700 border-b border-purple-200 bg-purple-50">Loans</th>
                  </tr>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                    <th className="text-center px-3 py-2 font-medium text-amber-700 bg-amber-50">Open</th>
                    <th className="text-center px-3 py-2 font-medium text-green-700 bg-green-50">Closed</th>
                    <th className="text-right px-3 py-2 font-medium text-blue-700">Total Billed</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Expenses</th>
                    <th className="text-right px-3 py-2 font-medium text-green-700">Received</th>
                    <th className="text-right px-3 py-2 font-medium text-purple-700">Net Balance</th>
                    <th className="text-right px-3 py-2 font-medium text-orange-600">Total Dues</th>
                    <th className="text-right px-3 py-2 font-medium text-red-700">Outstanding</th>
                    <th className="text-right px-3 py-2 font-medium text-purple-600">Total Loans</th>
                    <th className="text-right px-3 py-2 font-medium text-red-700">Loan Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r) => (
                    <tr key={r.customerId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-900">{r.customerName}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{r.companyName ?? "-"}</td>
                      <td className="px-3 py-3 text-center">
                        <TripLink count={r.openTrips} customerId={r.customerId} status="Open" dateFrom={filters.date_from} dateTo={filters.date_to} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <TripLink count={r.closedTrips} customerId={r.customerId} status="Closed" dateFrom={filters.date_from} dateTo={filters.date_to} />
                      </td>
                      <td className="px-3 py-3 text-right text-blue-700">{formatPKR(r.totalFreight)}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{formatPKR(r.totalExpenses)}</td>
                      <td className="px-3 py-3 text-right text-green-700">{formatPKR(r.totalReceived)}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${r.netBalance > 0 ? "text-red-700" : r.netBalance < 0 ? "text-green-700" : "text-gray-500"}`}>
                        {formatPKR(r.netBalance)}
                      </td>
                      <td className="px-3 py-3 text-right text-orange-700">{formatPKR(r.totalDues)}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${r.outstandingBalance > 0 ? "text-red-700" : "text-green-600"}`}>
                        {formatPKR(r.outstandingBalance)}
                      </td>
                      <td className="px-3 py-3 text-right text-purple-700">{formatPKR(r.totalLoans)}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${r.loanBalance > 0 ? "text-red-700" : "text-green-600"}`}>
                        {formatPKR(r.loanBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold text-sm">
                    <td className="px-3 py-3 text-gray-700" colSpan={2}>
                      Totals
                      {filtered.length !== allData.length && (
                        <span className="ml-1 text-xs font-normal text-gray-500">({filtered.length} matching)</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-amber-800">{totals.openTrips}</td>
                    <td className="px-3 py-3 text-center text-green-800">{totals.closedTrips}</td>
                    <td className="px-3 py-3 text-right text-blue-800">{formatPKR(totals.freight)}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{formatPKR(totals.expenses)}</td>
                    <td className="px-3 py-3 text-right text-green-800">{formatPKR(totals.received)}</td>
                    <td className={`px-3 py-3 text-right ${totals.netBalance > 0 ? "text-red-800" : "text-green-800"}`}>{formatPKR(totals.netBalance)}</td>
                    <td className="px-3 py-3 text-right text-orange-800">{formatPKR(totals.dues)}</td>
                    <td className={`px-3 py-3 text-right ${totals.outstanding > 0 ? "text-red-800" : "text-green-800"}`}>{formatPKR(totals.outstanding)}</td>
                    <td className="px-3 py-3 text-right text-purple-800">{formatPKR(totals.totalLoans)}</td>
                    <td className={`px-3 py-3 text-right ${totals.loanBalance > 0 ? "text-red-800" : "text-green-800"}`}>{formatPKR(totals.loanBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 print:hidden">
                <span className="text-sm text-gray-500">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} customers
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-sm rounded-md border transition-colors ${
                        p === safePage
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
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
