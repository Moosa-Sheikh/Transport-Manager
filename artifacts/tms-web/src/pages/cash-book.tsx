import { useState } from "react";
import { BookOpen, Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useListCashBook } from "@workspace/api-client-react";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function CashBookPage() {
  const [filters, setFilters] = useState<{
    date_from?: string;
    date_to?: string;
    entry_type?: "IN" | "OUT";
  }>({});

  const [showFilters, setShowFilters] = useState(false);

  const cashBookQuery = useListCashBook({
    date_from: filters.date_from,
    date_to: filters.date_to,
    entry_type: filters.entry_type,
  });

  const data = cashBookQuery.data;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Cash Book</h2>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
            showFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Filter Entries</span>
            {(filters.date_from || filters.date_to || filters.entry_type) && (
              <button
                onClick={() => setFilters({})}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
              <input
                type="date"
                value={filters.date_from ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
              <input
                type="date"
                value={filters.date_to ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entry Type</label>
              <select
                value={filters.entry_type ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, entry_type: (e.target.value || undefined) as "IN" | "OUT" | undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="IN">Cash IN</option>
                <option value="OUT">Cash OUT</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-xs font-medium text-green-600 uppercase mb-1">Total Cash IN</div>
            <div className="text-xl font-bold text-green-800">{formatPKR(data.totalIn)}</div>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-xs font-medium text-red-600 uppercase mb-1">Total Cash OUT</div>
            <div className="text-xl font-bold text-red-800">{formatPKR(data.totalOut)}</div>
          </div>
          <div className={`bg-gradient-to-r border rounded-lg p-4 text-center ${
            data.balance >= 0
              ? "from-blue-50 to-blue-100 border-blue-200"
              : "from-red-50 to-red-100 border-red-200"
          }`}>
            <div className={`text-xs font-medium uppercase mb-1 ${data.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>Balance</div>
            <div className={`text-xl font-bold ${data.balance >= 0 ? "text-blue-800" : "text-red-800"}`}>{formatPKR(data.balance)}</div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {cashBookQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading cash book...
          </div>
        ) : !data?.entries.length ? (
          <div className="p-8 text-center text-gray-500">No entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-green-700">Amount IN</th>
                  <th className="text-right px-4 py-3 font-medium text-red-700">Amount OUT</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(entry.entryDate + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        entry.entryType === "IN"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {entry.entryType === "IN" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{entry.description || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {entry.entryType === "IN" ? formatPKR(Number(entry.amount)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-700">
                      {entry.entryType === "OUT" ? formatPKR(Number(entry.amount)) : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${entry.runningBalance >= 0 ? "text-blue-700" : "text-red-700"}`}>
                      {formatPKR(entry.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
