import { useState } from "react";
import { Truck, Loader2 } from "lucide-react";
import { useGetTruckReport } from "@workspace/api-client-react";
import ReportFilterBar, { type ReportFilters } from "./report-filters";
import ReportActions from "./report-actions";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function TruckReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({});

  const query = useGetTruckReport({
    date_from: filters.date_from,
    date_to: filters.date_to,
  });

  const data = query.data || [];
  const totals = data.reduce(
    (acc, r) => ({
      trips: acc.trips + r.totalTrips,
      income: acc.income + r.totalIncome,
      expenses: acc.expenses + r.totalExpenses,
      profit: acc.profit + r.profit,
    }),
    { trips: 0, income: 0, expenses: 0, profit: 0 }
  );

  const csvParams = new URLSearchParams();
  csvParams.set("type", "trucks");
  if (filters.date_from) csvParams.set("date_from", filters.date_from);
  if (filters.date_to) csvParams.set("date_to", filters.date_to);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-orange-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Truck Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="truck-report" />
      </div>

      <div className="print:hidden">
        <ReportFilterBar filters={filters} onChange={setFilters} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {query.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading report...
          </div>
        ) : !data.length ? (
          <div className="p-8 text-center text-gray-500">No truck data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Truck Number</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total Trips</th>
                  <th className="text-right px-4 py-3 font-medium text-blue-700">Total Income</th>
                  <th className="text-right px-4 py-3 font-medium text-orange-700">Total Expenses</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.truckId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.truckNumber}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{r.totalTrips}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{formatPKR(r.totalIncome)}</td>
                    <td className="px-4 py-3 text-right text-orange-700">{formatPKR(r.totalExpenses)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.profit >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPKR(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Totals</td>
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
