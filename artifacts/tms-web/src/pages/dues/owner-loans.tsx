import { useState } from "react";
import { Loader2, Plus, Banknote, Trash2, Search, X, Pencil, Eye } from "lucide-react";
import { Link } from "wouter";
import {
  useListOwnerLoans,
  useCreateOwnerLoan,
  useUpdateOwnerLoan,
  useDeleteOwnerLoan,
  useRepayOwnerLoan,
  useListCustomers,
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

export default function OwnerLoansPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; borrowedFrom: string; amount: string; loanDate: string; returnDate: string; notes: string; sourceId?: number } | null>(null);
  const [repayId, setRepayId] = useState<number | null>(null);
  const [sourceType, setSourceType] = useState<string>("");
  const [addBorrowedFrom, setAddBorrowedFrom] = useState<string>("");
  const [editSourceType, setEditSourceType] = useState<string>("");
  const [editBorrowedFrom, setEditBorrowedFrom] = useState<string>("");

  const customersQuery = useListCustomers({});
  const driversQuery = useListDrivers({});
  const customersList = customersQuery.data ?? [];
  const driversList = driversQuery.data ?? [];

  const params: Record<string, unknown> = {};
  if (filters.borrowed_from) params.borrowed_from = filters.borrowed_from;
  if (filters.status) params.status = filters.status as "Outstanding" | "Partial" | "Cleared";
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.amount_min) params.amount_min = Number(filters.amount_min);
  if (filters.amount_max) params.amount_max = Number(filters.amount_max);

  const loansQuery = useListOwnerLoans(params);
  const createMutation = useCreateOwnerLoan();
  const updateMutation = useUpdateOwnerLoan();
  const deleteMutation = useDeleteOwnerLoan();
  const repayMutation = useRepayOwnerLoan();
  const loans = loansQuery.data ?? [];

  const totalOutstanding = loans.reduce((sum, l) => sum + (l.balance ?? 0), 0);

  const resolveSourceName = (st: string, si: string): string | undefined => {
    if (st === "Customer" && si) {
      return customersList.find((c) => String(c.id) === si)?.name;
    }
    if (st === "Driver" && si) {
      return driversList.find((d) => String(d.id) === si)?.name;
    }
    return undefined;
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const st = fd.get("sourceType") as string;
    const si = fd.get("sourceId") as string;
    const autoName = resolveSourceName(st, si);
    await createMutation.mutateAsync({
      data: {
        borrowedFrom: autoName || (fd.get("borrowedFrom") as string),
        sourceType: st ? st as "Customer" | "Driver" | "Other" : undefined,
        sourceId: si ? Number(si) : undefined,
        amount: fd.get("amount") as string,
        loanDate: fd.get("loanDate") as string,
        returnDate: (fd.get("returnDate") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      },
    });
    setShowAdd(false);
    setSourceType("");
    setAddBorrowedFrom("");
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
    const st = fd.get("sourceType") as string;
    const si = fd.get("sourceId") as string;
    await updateMutation.mutateAsync({
      id: editItem.id,
      data: {
        borrowedFrom: fd.get("borrowedFrom") as string,
        sourceType: st ? st as "Customer" | "Driver" | "Other" : undefined,
        sourceId: si ? Number(si) : undefined,
        amount: fd.get("amount") as string,
        loanDate: fd.get("loanDate") as string,
        returnDate: (fd.get("returnDate") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      },
    });
    setEditItem(null);
    setEditSourceType("");
    loansQuery.refetch();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this loan?")) return;
    await deleteMutation.mutateAsync({ id });
    loansQuery.refetch();
  };

  const clearFilters = () => setFilters({});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Owner Loans</h2>
          <p className="text-sm text-gray-500 mt-1">Total Outstanding: <span className="font-semibold text-red-600">{formatPKR(totalOutstanding)}</span></p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Loan
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" value={filters.borrowed_from ?? ""} onChange={(e) => setFilters({ ...filters, borrowed_from: e.target.value })} className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm w-full" placeholder="Borrowed From" />
          </div>
          <select value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            <option value="Outstanding">Outstanding</option>
            <option value="Partial">Partial</option>
            <option value="Cleared">Cleared</option>
          </select>
          <input type="date" value={filters.date_from ?? ""} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={filters.date_to ?? ""} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
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
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">No owner loans found</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrowed From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
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
                  <td className="px-4 py-3 text-sm text-gray-900">{l.borrowedFrom}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.sourceType ?? "-"}</td>
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
                      <Link href={`/dues/owner/${l.id}`} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="View Details">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => { setEditItem({ id: l.id, borrowedFrom: l.borrowedFrom, amount: String(l.amount), loanDate: l.loanDate, returnDate: l.returnDate ?? "", notes: l.notes ?? "", sourceId: l.sourceId ?? undefined }); setEditSourceType(l.sourceType ?? ""); setEditBorrowedFrom(l.borrowedFrom); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
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
            <h3 className="text-lg font-semibold mb-4">Add Owner Loan</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                <select name="sourceType" value={sourceType} onChange={(e) => { setSourceType(e.target.value); setAddBorrowedFrom(""); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">-- None (manual entry) --</option>
                  <option value="Customer">Customer</option>
                  <option value="Driver">Driver</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {sourceType === "Customer" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
                  <select name="sourceId" required onChange={(e) => { const name = resolveSourceName("Customer", e.target.value); if (name) setAddBorrowedFrom(name); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">-- Select --</option>
                    {customersList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {sourceType === "Driver" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Driver</label>
                  <select name="sourceId" required onChange={(e) => { const name = resolveSourceName("Driver", e.target.value); if (name) setAddBorrowedFrom(name); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">-- Select --</option>
                    {driversList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {sourceType === "Other" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Reference (optional)</label>
                  <input name="sourceId" type="number" min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Reference ID" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Borrowed From</label>
                <input name="borrowedFrom" type="text" required value={addBorrowedFrom} onChange={(e) => setAddBorrowedFrom(e.target.value)} readOnly={sourceType === "Customer" || sourceType === "Driver"} className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${sourceType === "Customer" || sourceType === "Driver" ? "bg-gray-100" : ""}`} />
                {(sourceType === "Customer" || sourceType === "Driver") && <p className="text-xs text-gray-500 mt-1">Auto-filled from selected {sourceType.toLowerCase()}</p>}
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
                <textarea name="notes" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
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
            <h3 className="text-lg font-semibold mb-4">Edit Owner Loan</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                <select name="sourceType" value={editSourceType} onChange={(e) => { setEditSourceType(e.target.value); if (e.target.value !== "Customer" && e.target.value !== "Driver") setEditBorrowedFrom(editItem.borrowedFrom); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">-- None (manual entry) --</option>
                  <option value="Customer">Customer</option>
                  <option value="Driver">Driver</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {editSourceType === "Customer" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
                  <select name="sourceId" required defaultValue={editItem.sourceId ?? ""} onChange={(e) => { const name = resolveSourceName("Customer", e.target.value); if (name) setEditBorrowedFrom(name); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">-- Select --</option>
                    {customersList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {editSourceType === "Driver" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Driver</label>
                  <select name="sourceId" required defaultValue={editItem.sourceId ?? ""} onChange={(e) => { const name = resolveSourceName("Driver", e.target.value); if (name) setEditBorrowedFrom(name); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">-- Select --</option>
                    {driversList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {editSourceType === "Other" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Reference (optional)</label>
                  <input name="sourceId" type="number" min="1" defaultValue={editItem.sourceId ?? ""} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Reference ID" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Borrowed From</label>
                <input name="borrowedFrom" type="text" required value={editBorrowedFrom} onChange={(e) => setEditBorrowedFrom(e.target.value)} readOnly={editSourceType === "Customer" || editSourceType === "Driver"} className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${editSourceType === "Customer" || editSourceType === "Driver" ? "bg-gray-100" : ""}`} />
                {(editSourceType === "Customer" || editSourceType === "Driver") && <p className="text-xs text-gray-500 mt-1">Auto-filled from selected {editSourceType.toLowerCase()}</p>}
              </div>
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
