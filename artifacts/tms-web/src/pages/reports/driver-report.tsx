import { useState } from "react";
import { UserCog, Loader2 } from "lucide-react";
import { useGetDriverReport } from "@workspace/api-client-react";
import ReportFilterBar, { type ReportFilters } from "./report-filters";
import ReportActions from "./report-actions";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function DriverReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({});

  const query = useGetDriverReport({
    date_from: filters.date_from,
    date_to: filters.date_to,
  });

  const data = query.data || [];
  const totals = data.reduce(
    (acc, r) => ({
      trips: acc.trips + r.totalTrips,
      income: acc.income + r.totalIncome,
      expenses: acc.expenses + r.totalExpenses,
      advances: acc.advances + r.totalAdvances,
      salary: acc.salary + r.totalSalary,
      netPaid: acc.netPaid + r.netPaid,
      profit: acc.profit + r.profitGenerated,
      loans: acc.loans + r.totalLoans,
      loanReturned: acc.loanReturned + r.totalLoanReturned,
      loanBalance: acc.loanBalance + r.outstandingLoanBalance,
    }),
    { trips: 0, income: 0, expenses: 0, advances: 0, salary: 0, netPaid: 0, profit: 0, loans: 0, loanReturned: 0, loanBalance: 0 }
  );

  const csvParams = new URLSearchParams();
  csvParams.set("type", "drivers");
  if (filters.date_from) csvParams.set("date_from", filters.date_from);
  if (filters.date_to) csvParams.set("date_to", filters.date_to);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <UserCog className="w-6 h-6 text-green-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Driver Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="driver-report" />
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
          <div className="p-8 text-center text-gray-500">No driver data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Trips</th>
                  <th className="text-right px-4 py-3 font-medium text-blue-700">Income</th>
                  <th className="text-right px-4 py-3 font-medium text-orange-700">Expenses</th>
                  <th className="text-right px-4 py-3 font-medium text-purple-700">Advances</th>
                  <th className="text-right px-4 py-3 font-medium text-indigo-700">Salary</th>
                  <th className="text-right px-4 py-3 font-medium text-red-700">Net Paid</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Profit</th>
                  <th className="text-right px-4 py-3 font-medium text-cyan-700">Loans</th>
                  <th className="text-right px-4 py-3 font-medium text-teal-700">Returned</th>
                  <th className="text-right px-4 py-3 font-medium text-amber-700">Loan Bal.</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.driverId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.driverName}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{r.totalTrips}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{formatPKR(r.totalIncome)}</td>
                    <td className="px-4 py-3 text-right text-orange-700">{formatPKR(r.totalExpenses)}</td>
                    <td className="px-4 py-3 text-right text-purple-700">{formatPKR(r.totalAdvances)}</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{formatPKR(r.totalSalary)}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-medium">{formatPKR(r.netPaid)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.profitGenerated >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPKR(r.profitGenerated)}</td>
                    <td className="px-4 py-3 text-right text-cyan-700">{formatPKR(r.totalLoans)}</td>
                    <td className="px-4 py-3 text-right text-teal-700">{formatPKR(r.totalLoanReturned)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.outstandingLoanBalance > 0 ? "text-amber-700" : "text-green-700"}`}>{formatPKR(r.outstandingLoanBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Totals</td>
                  <td className="px-4 py-3 text-right text-gray-800">{totals.trips}</td>
                  <td className="px-4 py-3 text-right text-blue-800">{formatPKR(totals.income)}</td>
                  <td className="px-4 py-3 text-right text-orange-800">{formatPKR(totals.expenses)}</td>
                  <td className="px-4 py-3 text-right text-purple-800">{formatPKR(totals.advances)}</td>
                  <td className="px-4 py-3 text-right text-indigo-800">{formatPKR(totals.salary)}</td>
                  <td className="px-4 py-3 text-right text-red-800">{formatPKR(totals.netPaid)}</td>
                  <td className={`px-4 py-3 text-right ${totals.profit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(totals.profit)}</td>
                  <td className="px-4 py-3 text-right text-cyan-800">{formatPKR(totals.loans)}</td>
                  <td className="px-4 py-3 text-right text-teal-800">{formatPKR(totals.loanReturned)}</td>
                  <td className={`px-4 py-3 text-right ${totals.loanBalance > 0 ? "text-amber-800" : "text-green-800"}`}>{formatPKR(totals.loanBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
