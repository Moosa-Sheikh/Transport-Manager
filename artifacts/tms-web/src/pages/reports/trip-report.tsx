import { useState } from "react";
import { Route, Loader2 } from "lucide-react";
import { useGetTripReport } from "@workspace/api-client-react";
import ReportFilterBar, { type ReportFilters } from "./report-filters";
import ReportActions from "./report-actions";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function TripReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({});

  const query = useGetTripReport({
    date_from: filters.date_from,
    date_to: filters.date_to,
    driver_id: filters.driver_id,
    truck_id: filters.truck_id,
    status: filters.status,
  });

  const data = query.data || [];
  const totals = data.reduce(
    (acc, r) => ({
      income: acc.income + r.totalIncome,
      expenses: acc.expenses + r.totalExpenses,
      commission: acc.commission + (r.driverCommission ?? 0),
      advances: acc.advances + r.totalAdvances,
      expectedProfit: acc.expectedProfit + r.expectedProfit,
      actualProfit: acc.actualProfit + r.actualProfit,
      received: acc.received + r.totalReceived,
      outstanding: acc.outstanding + r.outstanding,
    }),
    { income: 0, expenses: 0, commission: 0, advances: 0, expectedProfit: 0, actualProfit: 0, received: 0, outstanding: 0 }
  );

  const csvParams = new URLSearchParams();
  csvParams.set("type", "trips");
  if (filters.date_from) csvParams.set("date_from", filters.date_from);
  if (filters.date_to) csvParams.set("date_to", filters.date_to);
  if (filters.driver_id) csvParams.set("driver_id", String(filters.driver_id));
  if (filters.truck_id) csvParams.set("truck_id", String(filters.truck_id));
  if (filters.status) csvParams.set("status", filters.status);

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <Route className="w-6 h-6 text-blue-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Trip Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="trip-report" />
      </div>

      <div className="print:hidden">
        <ReportFilterBar filters={filters} onChange={setFilters} showDriver showTruck showStatus />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {query.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading report...
          </div>
        ) : !data.length ? (
          <div className="p-8 text-center text-gray-500">No trips found for selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-3 font-medium text-gray-600">ID</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Driver</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Truck</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Route</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-3 py-3 font-medium text-blue-700">Income</th>
                  <th className="text-right px-3 py-3 font-medium text-orange-700">Expenses</th>
                  <th className="text-right px-3 py-3 font-medium text-cyan-700">Commission</th>
                  <th className="text-right px-3 py-3 font-medium text-purple-700">Advances</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600">Exp. Profit</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600">Act. Profit</th>
                  <th className="text-right px-3 py-3 font-medium text-green-700">Received</th>
                  <th className="text-right px-3 py-3 font-medium text-red-700">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.tripId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">#{r.tripId}</td>
                    <td className="px-3 py-2 text-gray-700">{new Date(r.tripDate + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short" })}</td>
                    <td className="px-3 py-2 text-gray-700">{r.driverName}</td>
                    <td className="px-3 py-2 text-gray-700">{r.truckNumber}</td>
                    <td className="px-3 py-2 text-gray-700">{r.fromCity} → {r.toCity}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "Open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700 font-medium">{formatPKR(r.totalIncome)}</td>
                    <td className="px-3 py-2 text-right text-orange-700">{formatPKR(r.totalExpenses)}</td>
                    <td className="px-3 py-2 text-right text-cyan-700">{formatPKR(r.driverCommission ?? 0)}</td>
                    <td className="px-3 py-2 text-right text-purple-700">{formatPKR(r.totalAdvances)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${r.expectedProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPKR(r.expectedProfit)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${r.actualProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPKR(r.actualProfit)}</td>
                    <td className="px-3 py-2 text-right text-green-700">{formatPKR(r.totalReceived)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${r.outstanding > 0 ? "text-red-700" : "text-green-700"}`}>{formatPKR(r.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                  <td colSpan={6} className="px-3 py-3 text-gray-700">Totals ({data.length} trips)</td>
                  <td className="px-3 py-3 text-right text-blue-800">{formatPKR(totals.income)}</td>
                  <td className="px-3 py-3 text-right text-orange-800">{formatPKR(totals.expenses)}</td>
                  <td className="px-3 py-3 text-right text-cyan-800">{formatPKR(totals.commission)}</td>
                  <td className="px-3 py-3 text-right text-purple-800">{formatPKR(totals.advances)}</td>
                  <td className={`px-3 py-3 text-right ${totals.expectedProfit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(totals.expectedProfit)}</td>
                  <td className={`px-3 py-3 text-right ${totals.actualProfit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(totals.actualProfit)}</td>
                  <td className="px-3 py-3 text-right text-green-800">{formatPKR(totals.received)}</td>
                  <td className={`px-3 py-3 text-right ${totals.outstanding > 0 ? "text-red-800" : "text-green-800"}`}>{formatPKR(totals.outstanding)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
