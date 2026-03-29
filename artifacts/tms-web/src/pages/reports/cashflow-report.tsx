import { useState } from "react";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { useGetCashFlowReport } from "@workspace/api-client-react";
import ReportFilterBar, { type ReportFilters } from "./report-filters";
import ReportActions from "./report-actions";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function CashFlowReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({});

  const query = useGetCashFlowReport({
    date_from: filters.date_from,
    date_to: filters.date_to,
  });

  const data = query.data || [];
  const totals = data.reduce(
    (acc, r) => ({ totalIn: acc.totalIn + r.totalIn, totalOut: acc.totalOut + r.totalOut }),
    { totalIn: 0, totalOut: 0 }
  );

  const csvParams = new URLSearchParams();
  csvParams.set("type", "cashflow");
  if (filters.date_from) csvParams.set("date_from", filters.date_from);
  if (filters.date_to) csvParams.set("date_to", filters.date_to);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <ArrowDownUp className="w-6 h-6 text-purple-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Cash Flow Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="cashflow-report" />
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
          <div className="p-8 text-center text-gray-500">No cash flow data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-green-700">Total IN</th>
                  <th className="text-right px-4 py-3 font-medium text-red-700">Total OUT</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Net</th>
                  <th className="text-right px-4 py-3 font-medium text-blue-700">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.date} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(r.date + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">{formatPKR(r.totalIn)}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-medium">{formatPKR(r.totalOut)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.net >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPKR(r.net)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.runningBalance >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatPKR(r.runningBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Totals ({data.length} days)</td>
                  <td className="px-4 py-3 text-right text-green-800">{formatPKR(totals.totalIn)}</td>
                  <td className="px-4 py-3 text-right text-red-800">{formatPKR(totals.totalOut)}</td>
                  <td className={`px-4 py-3 text-right ${totals.totalIn - totals.totalOut >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(totals.totalIn - totals.totalOut)}</td>
                  <td className="px-4 py-3 text-right text-blue-800">{data.length ? formatPKR(data[data.length - 1].runningBalance) : "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
