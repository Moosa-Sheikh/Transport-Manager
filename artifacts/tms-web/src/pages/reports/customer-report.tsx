import { useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { useGetCustomerReport } from "@workspace/api-client-react";
import ReportFilterBar, { type ReportFilters } from "./report-filters";
import ReportActions from "./report-actions";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function CustomerReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({});

  const query = useGetCustomerReport({
    date_from: filters.date_from,
    date_to: filters.date_to,
    customer_id: filters.customer_id,
  });

  const data = query.data || [];
  const totals = data.reduce(
    (acc, r) => ({
      trips: acc.trips + r.totalTrips,
      freight: acc.freight + r.totalFreight,
      received: acc.received + r.totalReceived,
      dues: acc.dues + r.totalDues,
      outstanding: acc.outstanding + r.outstandingBalance,
    }),
    { trips: 0, freight: 0, received: 0, dues: 0, outstanding: 0 }
  );

  const csvParams = new URLSearchParams();
  csvParams.set("type", "customers");
  if (filters.date_from) csvParams.set("date_from", filters.date_from);
  if (filters.date_to) csvParams.set("date_to", filters.date_to);
  if (filters.customer_id) csvParams.set("customer_id", String(filters.customer_id));

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600 print:hidden" />
          <h2 className="text-2xl font-bold text-gray-900">Customer Report</h2>
        </div>
        <ReportActions csvUrl={`/reports/export/csv?${csvParams}`} title="customer-report" />
      </div>

      <div className="print:hidden">
        <ReportFilterBar filters={filters} onChange={setFilters} showCustomer />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {query.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading report...
          </div>
        ) : !data.length ? (
          <div className="p-8 text-center text-gray-500">No customer data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Trips</th>
                  <th className="text-right px-4 py-3 font-medium text-blue-700">Total Freight</th>
                  <th className="text-right px-4 py-3 font-medium text-green-700">Received</th>
                  <th className="text-right px-4 py-3 font-medium text-orange-700">Total Dues</th>
                  <th className="text-right px-4 py-3 font-medium text-red-700">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.customerId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.customerName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.companyName ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{r.totalTrips}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{formatPKR(r.totalFreight)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatPKR(r.totalReceived)}</td>
                    <td className="px-4 py-3 text-right text-orange-700">{formatPKR(r.totalDues)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.outstandingBalance > 0 ? "text-red-700" : "text-green-700"}`}>{formatPKR(r.outstandingBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Totals</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-gray-800">{totals.trips}</td>
                  <td className="px-4 py-3 text-right text-blue-800">{formatPKR(totals.freight)}</td>
                  <td className="px-4 py-3 text-right text-green-800">{formatPKR(totals.received)}</td>
                  <td className="px-4 py-3 text-right text-orange-800">{formatPKR(totals.dues)}</td>
                  <td className={`px-4 py-3 text-right ${totals.outstanding > 0 ? "text-red-800" : "text-green-800"}`}>{formatPKR(totals.outstanding)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
