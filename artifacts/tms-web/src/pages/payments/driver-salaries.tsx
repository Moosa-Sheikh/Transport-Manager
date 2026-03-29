import { useState } from "react";
import { Banknote, Loader2, Plus } from "lucide-react";
import { useListDriverSalaries, useAddDriverSalary, useListDrivers, getListDriverSalariesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function DriverSalariesPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [filters, setFilters] = useState<{ driver_id?: number; month?: string; year?: number }>({});

  const [form, setForm] = useState({
    driverId: "", month: "", year: String(new Date().getFullYear()), amount: "", paymentDate: "", notes: "",
  });

  const driversQuery = useListDrivers({});
  const salariesQuery = useListDriverSalaries({
    driver_id: filters.driver_id,
    month: filters.month,
    year: filters.year,
  });

  const addMutation = useAddDriverSalary({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDriverSalariesQueryKey({ driver_id: filters.driver_id, month: filters.month, year: filters.year }) });
        setForm({ driverId: "", month: "", year: String(new Date().getFullYear()), amount: "", paymentDate: "", notes: "" });
        setSuccessMsg("Salary payment recorded");
        setTimeout(() => setSuccessMsg(""), 3000);
      },
      onError: (err: Error & { message?: string }) => {
        setErrorMsg(err.message || "Failed to add salary");
        setTimeout(() => setErrorMsg(""), 4000);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.driverId || !form.month || !form.year || !form.amount || !form.paymentDate) return;
    addMutation.mutate({
      data: {
        driverId: Number(form.driverId),
        month: form.month,
        year: Number(form.year),
        amount: form.amount,
        paymentDate: form.paymentDate,
        notes: form.notes || undefined,
      },
    });
  };

  const totalPaid = (salariesQuery.data || []).reduce((sum, s) => sum + Number(s.amount), 0);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Banknote className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Driver Salaries</h2>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{errorMsg}</div>
      )}

      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Record Salary Payment</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Driver *</label>
              <select value={form.driverId} onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                <option value="">Select</option>
                {(driversQuery.data || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month *</label>
              <select value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                <option value="">Select</option>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year *</label>
              <input type="number" min="2020" max="2030" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
              <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date *</label>
              <input type="date" value={form.paymentDate} onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <button type="submit" disabled={addMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
            {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </form>
      </div>

      <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Filter Salaries</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
            <select value={filters.driver_id ?? ""} onChange={(e) => setFilters((f) => ({ ...f, driver_id: e.target.value ? Number(e.target.value) : undefined }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Drivers</option>
              {(driversQuery.data || []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <select value={filters.month ?? ""} onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value || undefined }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Months</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
            <input type="number" min="2020" max="2030" value={filters.year ?? ""} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value ? Number(e.target.value) : undefined }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="All Years" />
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4 text-center">
        <div className="text-xs font-medium text-indigo-600 uppercase mb-1">Total Salary Paid</div>
        <div className="text-xl font-bold text-indigo-800">{formatPKR(totalPaid)}</div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {salariesQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading salaries...
          </div>
        ) : !salariesQuery.data?.length ? (
          <div className="p-8 text-center text-gray-500">No salary payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Month</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Year</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Payment Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {salariesQuery.data.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{s.driverName}</td>
                    <td className="px-4 py-3 text-gray-700">{s.month}</td>
                    <td className="px-4 py-3 text-gray-700">{s.year}</td>
                    <td className="px-4 py-3 text-right text-indigo-700 font-semibold">{formatPKR(Number(s.amount))}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(s.paymentDate + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.notes || "—"}</td>
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
