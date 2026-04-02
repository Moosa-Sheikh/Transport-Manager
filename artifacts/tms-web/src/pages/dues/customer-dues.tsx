import { useState } from "react";
import { Loader2, Plus, Banknote, Trash2, Search, X, Pencil } from "lucide-react";
import {
  useListCustomerDues,
  useCreateCustomerDue,
  useUpdateCustomerDue,
  useDeleteCustomerDue,
  useRepayCustomerDue,
  useListCustomers,
} from "@workspace/api-client-react";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Partial: "bg-blue-100 text-blue-800",
  Cleared: "bg-green-100 text-green-800",
};

export default function CustomerDuesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; dueAmount: string; dueDate: string; biltyNumber: string; notes: string } | null>(null);
  const [repayId, setRepayId] = useState<number | null>(null);

  const params: Record<string, unknown> = {};
  if (filters.customer_id) params.customer_id = Number(filters.customer_id);
  if (filters.status) params.status = filters.status as "Pending" | "Partial" | "Cleared";
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.bilty_number) params.bilty_number = filters.bilty_number;
  if (filters.amount_min) params.amount_min = Number(filters.amount_min);
  if (filters.amount_max) params.amount_max = Number(filters.amount_max);

  const duesQuery = useListCustomerDues(params);
  const customersQuery = useListCustomers({});
  const createMutation = useCreateCustomerDue();
  const updateMutation = useUpdateCustomerDue();
  const deleteMutation = useDeleteCustomerDue();
  const repayMutation = useRepayCustomerDue();
  const dues = duesQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const totalOutstanding = dues.reduce((sum, d) => sum + (d.balance ?? 0), 0);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createMutation.mutateAsync({
      data: {
        customerId: Number(fd.get("customerId")),
        dueAmount: fd.get("dueAmount") as string,
        dueDate: fd.get("dueDate") as string,
        biltyNumber: (fd.get("biltyNumber") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      },
    });
    setShowAdd(false);
    duesQuery.refetch();
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
    duesQuery.refetch();
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    const fd = new FormData(e.currentTarget);
    await updateMutation.mutateAsync({
      id: editItem.id,
      data: {
        dueAmount: fd.get("dueAmount") as string,
        dueDate: fd.get("dueDate") as string,
        biltyNumber: (fd.get("biltyNumber") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      },
    });
    setEditItem(null);
    duesQuery.refetch();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this customer due?")) return;
    await deleteMutation.mutateAsync({ id });
    duesQuery.refetch();
  };

  const clearFilters = () => setFilters({});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Dues</h2>
          <p className="text-sm text-gray-500 mt-1">Total Outstanding: <span className="font-semibold text-red-600">{formatPKR(totalOutstanding)}</span></p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Due
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <select value={filters.customer_id ?? ""} onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Customers</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Cleared">Cleared</option>
          </select>
          <input type="date" value={filters.date_from ?? ""} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="From" />
          <input type="date" value={filters.date_to ?? ""} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="To" />
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" value={filters.bilty_number ?? ""} onChange={(e) => setFilters({ ...filters, bilty_number: e.target.value })} className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm w-full" placeholder="Bilty #" />
          </div>
          <input type="number" value={filters.amount_min ?? ""} onChange={(e) => setFilters({ ...filters, amount_min: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Min Amount" />
          <div className="flex gap-2">
            <input type="number" value={filters.amount_max ?? ""} onChange={(e) => setFilters({ ...filters, amount_max: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" placeholder="Max Amount" />
            {Object.values(filters).some(Boolean) && (
              <button onClick={clearFilters} className="text-gray-500 hover:text-gray-700" title="Clear filters"><X className="w-5 h-5" /></button>
            )}
          </div>
        </div>
      </div>

      {duesQuery.isLoading ? (
        <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading...</div>
      ) : dues.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">No customer dues found</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bilty #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Due Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dues.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{d.customerName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{d.biltyNumber ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{d.tripId ? `#${d.tripId}` : "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatPKR(Number(d.dueAmount))}</td>
                  <td className="px-4 py-3 text-sm text-green-700 text-right">{formatPKR(Number(d.paidAmount))}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-700 text-right">{formatPKR(d.balance ?? 0)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{d.dueDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{d.notes ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditItem({ id: d.id, dueAmount: String(d.dueAmount), dueDate: d.dueDate, biltyNumber: d.biltyNumber ?? "", notes: d.notes ?? "" })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {d.status !== "Cleared" && (
                        <button onClick={() => setRepayId(d.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Record Payment">
                          <Banknote className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
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
            <h3 className="text-lg font-semibold mb-4">Add Customer Due</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select name="customerId" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Amount</label>
                <input name="dueAmount" type="number" step="0.01" min="0.01" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input name="dueDate" type="date" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bilty Number (optional)</label>
                <input name="biltyNumber" type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea name="notes" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {createMutation.isPending ? "Adding..." : "Add Due"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Customer Due</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Amount</label>
                <input name="dueAmount" type="number" step="0.01" min="0.01" required defaultValue={editItem.dueAmount} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input name="dueDate" type="date" required defaultValue={editItem.dueDate} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bilty Number (optional)</label>
                <input name="biltyNumber" type="text" defaultValue={editItem.biltyNumber} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
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
            <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
            <form onSubmit={handleRepay} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
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
                  {repayMutation.isPending ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
