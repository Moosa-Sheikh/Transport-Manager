import { useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { useGetProfitReport } from "@workspace/api-client-react";
import ReportFilterBar, { type ReportFilters } from "./report-filters";
import ReportActions from "./report-actions";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function ProfitReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({});

  const query = useGetProfitReport({
    date_from: filters.date_from,
    date_to: filters.date_to,
  });

  const data = query.data;

  const csvParams = new URLSearchParams();
  csvParams.set("type", "profit");
  if (filters.date_from) csvParams.set("date_from", filters.date_from);
  if (filters.date_to) csvParams.set("date_to", filters.date_to);

  const dateLabel = filters.date_from && filters.date_to
    ? `${new Date(filters.date_from + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })} — ${new Date(filters.date_to + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}`
    : filters.date_from
    ? `From ${new Date(filters.date_from + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}`
    : filters.date_to
    ? `Until ${new Date(filters.date_to + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}`
    : "All Time";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-emerald-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Profit Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="profit-report" />
      </div>

      <div className="print:hidden">
        <ReportFilterBar filters={filters} onChange={setFilters} />
      </div>

      {query.isLoading ? (
        <div className="p-8 text-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading report...
        </div>
      ) : data ? (
        <div>
          <div className="text-center mb-6">
            <span className="text-sm text-gray-500">Period: </span>
            <span className="text-sm font-medium text-gray-800">{dateLabel}</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 font-medium text-gray-700">Total Income</td>
                  <td className="px-6 py-4 text-right text-xl font-bold text-blue-700">{formatPKR(data.totalIncome)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 font-medium text-gray-700">Total Expenses</td>
                  <td className="px-6 py-4 text-right text-xl font-bold text-orange-700">{formatPKR(data.totalExpenses)}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-800">Expected Profit (Income − Expenses)</td>
                  <td className={`px-6 py-4 text-right text-xl font-bold ${data.expectedProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPKR(data.expectedProfit)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 font-medium text-gray-700">Total Driver Advances</td>
                  <td className="px-6 py-4 text-right text-xl font-bold text-purple-700">{formatPKR(data.totalAdvances)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 font-medium text-gray-700">Total Driver Salary</td>
                  <td className="px-6 py-4 text-right text-xl font-bold text-indigo-700">{formatPKR(data.totalSalary)}</td>
                </tr>
                <tr className={`border-b border-gray-200 ${data.actualProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <td className="px-6 py-4 font-semibold text-gray-800">Actual Profit (Income − Expenses − Advances)</td>
                  <td className={`px-6 py-4 text-right text-2xl font-bold ${data.actualProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPKR(data.actualProfit)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 font-medium text-gray-700">Total Received from Customers</td>
                  <td className="px-6 py-4 text-right text-xl font-bold text-green-700">{formatPKR(data.totalReceived)}</td>
                </tr>
                <tr className={`${data.outstanding > 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <td className="px-6 py-4 font-semibold text-gray-800">Outstanding (Income − Received)</td>
                  <td className={`px-6 py-4 text-right text-2xl font-bold ${data.outstanding > 0 ? "text-red-700" : "text-green-700"}`}>{formatPKR(data.outstanding)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
