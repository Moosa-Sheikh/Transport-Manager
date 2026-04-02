import { useState } from "react";
import { Loader2, Plus, Banknote, Trash2, X, Pencil } from "lucide-react";
import {
  useListDriverLoans,
  useCreateDriverLoan,
  useUpdateDriverLoan,
  useDeleteDriverLoan,
  useRepayDriverLoan,
  useListDrivers,
} from "@workspace/api-client-react";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

const statusColors: Record<string, string> = {
  Outstanding: "bg-red-100 text-red-800",
  Partial: "bg-blue-100 text-blue-800",
  Cleared: "bg-green-100 text-green-800",
};

export default function DriverLoansPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; amount: string; loanDate: string; returnDate: string; notes: string } | null>(null);
  const [repayId, setRepayId] = useState<number | null>(null);

  const params: Record<string, unknown> = {};
  if (filters.driver_id) params.driver_id = Number(filters.driver_id);
  if (filters.status) params.status = filters.status as "Outstanding" | "Partial" | "Cleared";
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.amount_min) params.amount_min = Number(filters.amount_min);
  if (filters.amount_max) params.amount_max = Number(filters.amount_max);

  const loansQuery = useListDriverLoans(params);
  const driversQuery = useListDrivers({});
  const createMutation = useCreateDriverLoan();
  const updateMutation = useUpdateDriverLoan();
  const deleteMutation = useDeleteDriverLoan();
  const repayMutation = useRepayDriverLoan();
  const loans = loansQuery.data ?? [];
  const drivers = driversQuery.data ?? [];

  const totalOutstanding = loans.reduce((sum, l) => sum + (l.balance ?? 0), 0);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createMutation.mutateAsync({
      data: {
        driverId: Number(fd.get("driverId")),
        amount: fd.get("amount") as string,
        loanDate: fd.get("loanDate") as string,
        returnDate: (fd.get("returnDate") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      },
    });
    setShowAdd(false);
    loansQuery.refetch();
  };

  const handleRepay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!repayId) return;
    const fd = new FormData(e.currentTarget);
    await repayMutation.mutateAsync({
      id: repayId,
      data: {
        amount: fd.get("amount") as string,
        paymentDate: fd.get("paymentDate") as string,
        notes: (fd.get("notes") as string) || undefined,
      },
    });
    setRepayId(null);
    loansQuery.refetch();
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    const fd = new FormData(e.currentTarget);
    await updateMutation.mutateAsync({
      id: editItem.id,
      data: {
        amount: fd.get("amount") as string,
        loanDate: fd.get("loanDate") as string,
        returnDate: (fd.get("returnDate") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      },
    });
    setEditItem(null);
    loansQuery.refetch();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this driver loan?")) return;
    await deleteMutation.mutateAsync({ id });
    loansQuery.refetch();
  };

  const clearFilters = () => setFilters({});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Driver Loans</h2>
          <p className="text-sm text-gray-500 mt-1">Total Outstanding: <span className="font-semibold text-red-600">{formatPKR(totalOutstanding)}</span></p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Loan
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <select value={filters.driver_id ?? ""} onChange={(e) => setFilters({ ...filters, driver_id: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Drivers</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            <option value="Outstanding">Outstanding</option>
            <option value="Partial">Partial</option>
            <option value="Cleared">Cleared</option>
          </select>
          <input type="date" value={filters.date_from ?? ""} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="From" />
          <input type="date" value={filters.date_to ?? ""} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="To" />
          <input type="number" value={filters.amount_min ?? ""} onChange={(e) => setFilters({ ...filters, amount_min: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Min Amount" />
          <div className="flex gap-2">
            <input type="number" value={filters.amount_max ?? ""} onChange={(e) => setFilters({ ...filters, amount_max: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" placeholder="Max Amount" />
            {Object.values(filters).some(Boolean) && (
              <button onClick={clearFilters} className="text-gray-500 hover:text-gray-700" title="Clear filters"><X className="w-5 h-5" /></button>
            )}
          </div>
        </div>
      </div>

      {loansQuery.isLoading ? (
        <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading...</div>
      ) : loans.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">No driver loans found</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Returned</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loans.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{l.driverName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatPKR(Number(l.amount))}</td>
                  <td className="px-4 py-3 text-sm text-green-700 text-right">{formatPKR(Number(l.amountReturned))}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-700 text-right">{formatPKR(l.balance ?? 0)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.loanDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.returnDate ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[l.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{l.notes ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditItem({ id: l.id, amount: String(l.amount), loanDate: l.loanDate, returnDate: l.returnDate ?? "", notes: l.notes ?? "" })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {l.status !== "Cleared" && (
                        <button onClick={() => setRepayId(l.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Record Repayment">
                          <Banknote className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(l.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Driver Loan</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <select name="driverId" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select driver</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
                <input name="amount" type="number" step="0.01" min="0.01" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Date</label>
                <input name="loanDate" type="date" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Return Date (optional)</label>
                <input name="returnDate" type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Notes (optional)</label>
                <textarea name="notes" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="What is the loan for?" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {createMutation.isPending ? "Adding..." : "Add Loan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Driver Loan</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
                <input name="amount" type="number" step="0.01" min="0.01" required defaultValue={editItem.amount} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Date</label>
                <input name="loanDate" type="date" required defaultValue={editItem.loanDate} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Return Date (optional)</label>
                <input name="returnDate" type="date" defaultValue={editItem.returnDate} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea name="notes" rows={2} defaultValue={editItem.notes} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {repayId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Record Repayment</h3>
            <form onSubmit={handleRepay} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repayment Amount</label>
                <input name="amount" type="number" step="0.01" min="0.01" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input name="paymentDate" type="date" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea name="notes" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setRepayId(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={repayMutation.isPending} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {repayMutation.isPending ? "Recording..." : "Record Repayment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
