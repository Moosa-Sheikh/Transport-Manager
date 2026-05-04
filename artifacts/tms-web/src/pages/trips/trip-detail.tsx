import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Lock, Loader2, ChevronRight, Trash2, Plus } from "lucide-react";
import {
  useGetTrip,
  useCloseTrip,
  useDeleteTrip,
  useListTripLoads,
  useAddTripLoad,
  useDeleteTripLoad,
  useListTripExpenses,
  useAddTripExpense,
  useDeleteTripExpense,
  useListTripCustomerPayments,
  useAddTripCustomerPayment,
  useListTripDriverAdvances,
  useAddTripDriverAdvance,
  useUpdateTripCommission,
  useListCustomers,
  useListExpenseTypes,
  useListItems,
  useListTripCustomerDues,
  useListTripRoundEntries,
  useAddTripRoundEntry,
  useDeleteTripRoundEntry,
  getGetTripQueryKey,
  getGetTripQueryOptions,
  getListTripLoadsQueryKey,
  getListTripLoadsQueryOptions,
  getListTripExpensesQueryKey,
  getListTripExpensesQueryOptions,
  getListTripCustomerPaymentsQueryKey,
  getListTripCustomerPaymentsQueryOptions,
  getListTripDriverAdvancesQueryKey,
  getListTripDriverAdvancesQueryOptions,
  getListTripCustomerDuesQueryOptions,
  getListTripRoundEntriesQueryKey,
  getListTripRoundEntriesQueryOptions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function TripDetailPage() {
  const [, params] = useRoute("/trips/:id");
  const tripId = Number(params?.id);
  const queryClient = useQueryClient();
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [deleteTripConfirm, setDeleteTripConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteExpenseConfirmId, setDeleteExpenseConfirmId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [loadForm, setLoadForm] = useState({
    biltyNumber: "", customerId: "", itemDescription: "", weight: "",
    freight: "", loadingCharges: "", unloadingCharges: "", brokerCommission: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    expenseTypeId: "", amount: "", expenseDate: "", expenseCategory: "", customerId: "", notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "", paymentDate: "", paymentMode: "", notes: "", customerId: "",
  });

  const [advanceForm, setAdvanceForm] = useState({
    amount: "", advanceDate: "", notes: "",
  });

  const [commissionValue, setCommissionValue] = useState<string | null>(null);
  const [editingCommission, setEditingCommission] = useState(false);

  const tripDefaults = getGetTripQueryOptions(tripId);
  const tripQuery = useGetTrip(tripId, {
    query: { ...tripDefaults, enabled: Number.isFinite(tripId) && tripId > 0 },
  });

  const loadsDefaults = getListTripLoadsQueryOptions(tripId);
  const loadsQuery = useListTripLoads(tripId, {
    query: { ...loadsDefaults, enabled: Number.isFinite(tripId) && tripId > 0 },
  });

  const expensesDefaults = getListTripExpensesQueryOptions(tripId);
  const expensesQuery = useListTripExpenses(tripId, {
    query: { ...expensesDefaults, enabled: Number.isFinite(tripId) && tripId > 0 },
  });

  const paymentsDefaults = getListTripCustomerPaymentsQueryOptions(tripId);
  const paymentsQuery = useListTripCustomerPayments(tripId, {
    query: { ...paymentsDefaults, enabled: Number.isFinite(tripId) && tripId > 0 },
  });

  const advancesDefaults = getListTripDriverAdvancesQueryOptions(tripId);
  const advancesQuery = useListTripDriverAdvances(tripId, {
    query: { ...advancesDefaults, enabled: Number.isFinite(tripId) && tripId > 0 },
  });

  const customerDuesDefaults = getListTripCustomerDuesQueryOptions(tripId);
  const customerDuesQuery = useListTripCustomerDues(tripId, {
    query: { ...customerDuesDefaults, enabled: Number.isFinite(tripId) && tripId > 0 },
  });

  const customersQuery = useListCustomers({});
  const expenseTypesQuery = useListExpenseTypes({});
  const itemsQuery = useListItems({});

  const roundEntriesDefaults = getListTripRoundEntriesQueryOptions(tripId);
  const roundEntriesQuery = useListTripRoundEntries(tripId, {
    query: { ...roundEntriesDefaults, enabled: Number.isFinite(tripId) && tripId > 0 },
  });

  const [roundEntryForm, setRoundEntryForm] = useState({ itemId: "", ratePerRound: "", rounds: "1", entryDate: "", notes: "" });
  const [deleteRoundEntryId, setDeleteRoundEntryId] = useState<number | null>(null);

  const addRoundEntryMutation = useAddTripRoundEntry({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        queryClient.invalidateQueries({ queryKey: getListTripRoundEntriesQueryKey(tripId) });
        setRoundEntryForm({ itemId: "", ratePerRound: "", rounds: "1", entryDate: "", notes: "" });
        showSuccess("Round entry added");
      },
      onError: (err: Error & { message?: string }) => {
        setErrorMsg(err.message || "Failed to add round entry");
        setTimeout(() => setErrorMsg(""), 4000);
      },
    },
  });

  const deleteRoundEntryMutation = useDeleteTripRoundEntry({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        queryClient.invalidateQueries({ queryKey: getListTripRoundEntriesQueryKey(tripId) });
        setDeleteRoundEntryId(null);
        showSuccess("Round entry deleted");
      },
    },
  });

  const handleAddRoundEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundEntryForm.itemId || !roundEntryForm.ratePerRound || !roundEntryForm.rounds) return;
    addRoundEntryMutation.mutate({
      id: tripId,
      data: {
        itemId: Number(roundEntryForm.itemId),
        ratePerRound: roundEntryForm.ratePerRound,
        rounds: Number(roundEntryForm.rounds),
        entryDate: roundEntryForm.entryDate || undefined,
        notes: roundEntryForm.notes || undefined,
      },
    });
  };

  const handleRoundEntryItemChange = (val: string) => {
    setRoundEntryForm((f) => {
      const next = { ...f, itemId: val };
      if (val && !f.ratePerRound) {
        const it = itemsQuery.data?.find((i) => i.id === Number(val));
        if (it?.defaultRatePerRound) next.ratePerRound = String(Number(it.defaultRatePerRound));
      }
      return next;
    });
  };

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getGetTripQueryKey(tripId) });
    queryClient.invalidateQueries({ queryKey: getListTripLoadsQueryKey(tripId) });
    queryClient.invalidateQueries({ queryKey: getListTripExpensesQueryKey(tripId) });
    queryClient.invalidateQueries({ queryKey: getListTripCustomerPaymentsQueryKey(tripId) });
    queryClient.invalidateQueries({ queryKey: getListTripDriverAdvancesQueryKey(tripId) });
  }

  const [, navigate] = useLocation();

  const closeMutation = useCloseTrip({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setCloseConfirm(false);
        showSuccess("Trip closed successfully");
      },
    },
  });

  const deleteTripMutation = useDeleteTrip({
    mutation: {
      onSuccess: () => {
        navigate("/trips");
      },
    },
  });

  const addLoadMutation = useAddTripLoad({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setLoadForm({ biltyNumber: "", customerId: "", itemDescription: "", weight: "", freight: "", loadingCharges: "", unloadingCharges: "", brokerCommission: "" });
        showSuccess("Load added successfully");
      },
      onError: (err: Error & { message?: string }) => {
        setErrorMsg(err.message || "Failed to add load");
        setTimeout(() => setErrorMsg(""), 4000);
      },
    },
  });

  const deleteLoadMutation = useDeleteTripLoad({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setDeleteConfirmId(null);
        showSuccess("Load deleted");
      },
    },
  });

  const addExpenseMutation = useAddTripExpense({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setExpenseForm({ expenseTypeId: "", amount: "", expenseDate: "", expenseCategory: "", customerId: "", notes: "" });
        showSuccess("Expense added successfully");
      },
      onError: (err: Error & { message?: string }) => {
        setErrorMsg(err.message || "Failed to add expense");
        setTimeout(() => setErrorMsg(""), 4000);
      },
    },
  });

  const deleteExpenseMutation = useDeleteTripExpense({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setDeleteExpenseConfirmId(null);
        showSuccess("Expense deleted");
      },
    },
  });

  const addPaymentMutation = useAddTripCustomerPayment({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setPaymentForm({ amount: "", paymentDate: "", paymentMode: "", notes: "", customerId: "" });
        showSuccess("Payment recorded successfully");
      },
      onError: (err: Error & { message?: string }) => {
        setErrorMsg(err.message || "Failed to add payment");
        setTimeout(() => setErrorMsg(""), 4000);
      },
    },
  });

  const addAdvanceMutation = useAddTripDriverAdvance({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setAdvanceForm({ amount: "", advanceDate: "", notes: "" });
        showSuccess("Advance recorded successfully");
      },
      onError: (err: Error & { message?: string }) => {
        setErrorMsg(err.message || "Failed to add advance");
        setTimeout(() => setErrorMsg(""), 4000);
      },
    },
  });

  const updateCommissionMutation = useUpdateTripCommission({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setEditingCommission(false);
        showSuccess("Driver commission updated");
      },
      onError: (err: Error & { message?: string }) => {
        setErrorMsg(err.message || "Failed to update commission");
        setTimeout(() => setErrorMsg(""), 4000);
      },
    },
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAddLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadForm.biltyNumber.trim() || !loadForm.customerId) return;
    addLoadMutation.mutate({
      id: tripId,
      data: {
        biltyNumber: loadForm.biltyNumber.trim(),
        customerId: Number(loadForm.customerId),
        itemDescription: loadForm.itemDescription || undefined,
        weight: loadForm.weight || undefined,
        freight: loadForm.freight || undefined,
        loadingCharges: loadForm.loadingCharges || undefined,
        unloadingCharges: loadForm.unloadingCharges || undefined,
        brokerCommission: loadForm.brokerCommission || undefined,
      },
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.expenseTypeId || !expenseForm.amount || !expenseForm.expenseDate || !expenseForm.expenseCategory) return;
    if (expenseForm.expenseCategory === "customer" && !expenseForm.customerId) return;
    addExpenseMutation.mutate({
      id: tripId,
      data: {
        expenseTypeId: Number(expenseForm.expenseTypeId),
        amount: expenseForm.amount,
        expenseDate: expenseForm.expenseDate,
        expenseCategory: expenseForm.expenseCategory as "driver" | "truck" | "customer",
        customerId: expenseForm.expenseCategory === "customer" ? Number(expenseForm.customerId) : undefined,
        notes: expenseForm.notes || undefined,
      },
    });
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const lockedCustomerId = trip?.movementType === "customer_shifting" && trip?.customerId
      ? String(trip.customerId)
      : null;
    const effectiveCustomerId = lockedCustomerId ?? (hasSingleLoadCustomer ? autoCustomerId : paymentForm.customerId);
    if (!paymentForm.amount || !paymentForm.paymentDate || !effectiveCustomerId) return;
    addPaymentMutation.mutate({
      id: tripId,
      data: {
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        paymentMode: paymentForm.paymentMode || undefined,
        notes: paymentForm.notes || undefined,
        customerId: Number(effectiveCustomerId),
      },
    });
  };

  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceForm.amount || !advanceForm.advanceDate) return;
    addAdvanceMutation.mutate({
      id: tripId,
      data: {
        amount: advanceForm.amount,
        advanceDate: advanceForm.advanceDate,
        notes: advanceForm.notes || undefined,
      },
    });
  };

  const trip = tripQuery.data;
  const loadsData = loadsQuery.data;
  const expensesData = expensesQuery.data;
  const paymentsData = paymentsQuery.data;
  const advancesData = advancesQuery.data;
  const customerDuesData = customerDuesQuery.data;

  const loadCustomers = (() => {
    if (trip?.movementType === "customer_shifting" && trip.customerId) {
      return [{ id: trip.customerId, name: trip.customerName ?? "" }];
    }
    if (!loadsData?.loads?.length) return [];
    const seen = new Map<number, string>();
    for (const l of loadsData.loads) {
      if (l.customerId && !seen.has(l.customerId)) {
        seen.set(l.customerId, l.customerName ?? "");
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  })();
  const hasSingleLoadCustomer = loadCustomers.length === 1;
  const autoCustomerId = hasSingleLoadCustomer ? String(loadCustomers[0].id) : "";

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/trips" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Trip #{tripId}</h2>
        {trip?.movementType === "in_house_shifting" && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            In-House Shift
          </span>
        )}
        {trip?.movementType === "customer_shifting" && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
            Customer Shift
          </span>
        )}
        {trip?.status === "Open" && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDeleteTripConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => setCloseConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
            >
              <Lock className="w-4 h-4" />
              Close Trip
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{errorMsg}</div>
      )}

      {closeConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Close Trip</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCloseConfirm(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => closeMutation.mutate({ id: tripId })}
                disabled={closeMutation.isPending}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {closeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Close Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTripConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-red-700 mb-2">Delete Trip</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this trip? All related loads, expenses, payments, advances, and cash book entries will be permanently removed.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTripConfirm(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => deleteTripMutation.mutate({ id: tripId })}
                disabled={deleteTripMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleteTripMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Load</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this load?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => deleteLoadMutation.mutate({ id: tripId, loadId: deleteConfirmId })}
                disabled={deleteLoadMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteExpenseConfirmId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Expense</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this expense?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteExpenseConfirmId(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => deleteExpenseMutation.mutate({ id: tripId, expenseId: deleteExpenseConfirmId })}
                disabled={deleteExpenseMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleteExpenseMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {tripQuery.isLoading ? (
        <div className="p-8 text-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading trip details...
        </div>
      ) : !trip ? (
        <div className="p-8 text-center text-gray-500">Trip not found.</div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Trip Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Date</div>
                <div className="text-sm text-gray-900">
                  {new Date(trip.tripDate + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Status</div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trip.status === "Open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {trip.status}
                </span>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">{trip.movementType === "in_house_shifting" ? "Warehouse" : "Route"}</div>
                {trip.movementType === "in_house_shifting" ? (
                  <div className="text-sm text-gray-900 font-medium">
                    {trip.inhouseWarehouseName ?? "—"}
                    {trip.inhouseWarehouseCityName && <span className="text-xs text-gray-500 ml-1">({trip.inhouseWarehouseCityName})</span>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-900 flex items-center gap-2">
                    <span className="font-medium">{trip.fromWarehouseName ?? trip.fromCityName ?? "—"}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{trip.toWarehouseName ?? trip.toCityName ?? "—"}</span>
                  </div>
                )}
              </div>
              {trip.movementType === "in_house_shifting" && (
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Company</div>
                  <div className="text-sm text-gray-900 font-medium">{trip.companyName ?? trip.customerName ?? "—"}</div>
                </div>
              )}
              {trip.movementType === "in_house_shifting" && trip.customerName && (
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Customer</div>
                  <div className="text-sm text-gray-900">{trip.customerName}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Truck</div>
                <div className="text-sm text-gray-900">{trip.truckNumber}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Driver</div>
                <div className="text-sm text-gray-900">{trip.driverName}</div>
              </div>
              {trip.movementType === "in_house_shifting" && trip.notes && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Purpose / Notes</div>
                  <div className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded p-2">{trip.notes}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Driver Commission</div>
                {editingCommission && trip.status === "Open" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={commissionValue ?? ""}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        updateCommissionMutation.mutate({
                          id: tripId,
                          data: { driverCommission: commissionValue || "0" },
                        });
                      }}
                      disabled={updateCommissionMutation.isPending}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateCommissionMutation.isPending ? "..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingCommission(false)}
                      className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 font-medium">
                      {formatPKR(Number(trip.driverCommission ?? 0))}
                    </span>
                    {trip.status === "Open" && (
                      <button
                        onClick={() => {
                          setCommissionValue(trip.driverCommission ?? "0");
                          setEditingCommission(true);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {trip.movementType === "customer_shifting" && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Shifting Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {trip.customerName && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Customer</div>
                    <div className="text-sm text-gray-900 font-medium">{trip.customerName}</div>
                  </div>
                )}
                {trip.itemName && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Item</div>
                    <div className="text-sm text-gray-900 font-medium">{trip.itemName}{trip.itemUnit ? ` (${trip.itemUnit})` : ""}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Rounds</div>
                  <div className="text-sm text-gray-900 font-medium">{trip.rounds ?? 0}</div>
                </div>
                {trip.movementType === "customer_shifting" && trip.ratePerRound && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Rate / Round</div>
                    <div className="text-sm text-gray-900 font-medium">{formatPKR(Number(trip.ratePerRound))}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Commission / Round</div>
                  <div className="text-sm text-gray-900 font-medium">{formatPKR(Number(trip.commissionPerRound ?? 0))}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total Commission</div>
                  <div className="text-sm text-purple-700 font-semibold">{formatPKR(Number(trip.driverCommissionTotal ?? 0))}</div>
                </div>
              </div>
            </div>
          )}

          {trip.movementType === "in_house_shifting" ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-teal-600 uppercase mb-1">Revenue</div>
                <div className="text-lg font-bold text-teal-800">{formatPKR(trip.income)}</div>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-orange-600 uppercase mb-1">Expenses</div>
                <div className="text-lg font-bold text-orange-800">{formatPKR(trip.expense)}</div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-purple-600 uppercase mb-1">Commission</div>
                <div className="text-lg font-bold text-purple-800">{formatPKR(Number(trip.driverCommissionTotal ?? 0))}</div>
              </div>
              <div className={`bg-gradient-to-r border rounded-lg p-3 text-center ${
                trip.profit >= 0 ? "from-green-50 to-green-100 border-green-200" : "from-red-50 to-red-100 border-red-200"
              }`}>
                <div className={`text-[10px] font-medium uppercase mb-1 ${trip.profit >= 0 ? "text-green-600" : "text-red-600"}`}>Profit</div>
                <div className={`text-lg font-bold ${trip.profit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(trip.profit)}</div>
              </div>
            </div>
          ) : trip.movementType === "customer_shifting" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <div className="bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-teal-600 uppercase mb-1">Revenue</div>
                <div className="text-lg font-bold text-teal-800">{formatPKR(trip.income)}</div>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-orange-600 uppercase mb-1">Expenses</div>
                <div className="text-lg font-bold text-orange-800">{formatPKR(trip.expense)}</div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-purple-600 uppercase mb-1">Commission</div>
                <div className="text-lg font-bold text-purple-800">{formatPKR(Number(trip.driverCommissionTotal ?? 0))}</div>
              </div>
              <div className={`bg-gradient-to-r border rounded-lg p-3 text-center ${
                trip.profit >= 0 ? "from-green-50 to-green-100 border-green-200" : "from-red-50 to-red-100 border-red-200"
              }`}>
                <div className={`text-[10px] font-medium uppercase mb-1 ${trip.profit >= 0 ? "text-green-600" : "text-red-600"}`}>Profit</div>
                <div className={`text-lg font-bold ${trip.profit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(trip.profit)}</div>
              </div>
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-emerald-600 uppercase mb-1">Received</div>
                <div className="text-lg font-bold text-emerald-800">{formatPKR(trip.totalReceived)}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-blue-600 uppercase mb-1">Income</div>
                <div className="text-lg font-bold text-blue-800">{formatPKR(trip.income)}</div>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-orange-600 uppercase mb-1">Expenses</div>
                <div className="text-lg font-bold text-orange-800">{formatPKR(trip.expense)}</div>
              </div>
              <div className={`bg-gradient-to-r border rounded-lg p-3 text-center ${
                trip.profit >= 0
                  ? "from-green-50 to-green-100 border-green-200"
                  : "from-red-50 to-red-100 border-red-200"
              }`}>
                <div className={`text-[10px] font-medium uppercase mb-1 ${trip.profit >= 0 ? "text-green-600" : "text-red-600"}`}>Expected Profit</div>
                <div className={`text-lg font-bold ${trip.profit >= 0 ? "text-green-800" : "text-red-800"}`}>{formatPKR(trip.profit)}</div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-purple-600 uppercase mb-1">Advances</div>
                <div className="text-lg font-bold text-purple-800">{formatPKR(trip.totalAdvances)}</div>
              </div>
              <div className={`bg-gradient-to-r border rounded-lg p-3 text-center ${
                trip.actualProfit >= 0
                  ? "from-emerald-50 to-emerald-100 border-emerald-200"
                  : "from-red-50 to-red-100 border-red-200"
              }`}>
                <div className={`text-[10px] font-medium uppercase mb-1 ${trip.actualProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>Actual Profit</div>
                <div className={`text-lg font-bold ${trip.actualProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>{formatPKR(trip.actualProfit)}</div>
              </div>
              <div className="bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-3 text-center">
                <div className="text-[10px] font-medium text-teal-600 uppercase mb-1">Received</div>
                <div className="text-lg font-bold text-teal-800">{formatPKR(trip.totalReceived)}</div>
              </div>
            </div>
          )}

          {trip.movementType === "in_house_shifting" && (
            <>
              {trip.status === "Open" && (
                <div className="bg-orange-50/50 border border-orange-200 rounded-lg p-6 mb-6">
                  <h3 className="text-sm font-semibold text-orange-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Round Entry
                  </h3>
                  <form onSubmit={handleAddRoundEntry} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Item *</label>
                      <select value={roundEntryForm.itemId} onChange={(e) => handleRoundEntryItemChange(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required>
                        <option value="">Select item</option>
                        {itemsQuery.data?.map((it) => (<option key={it.id} value={it.id}>{it.name} ({it.unit})</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rate / Round (PKR) *</label>
                      <input type="number" min="0" step="0.01" value={roundEntryForm.ratePerRound} onChange={(e) => setRoundEntryForm((f) => ({ ...f, ratePerRound: e.target.value }))} placeholder="0" className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rounds *</label>
                      <input type="number" min="1" step="1" value={roundEntryForm.rounds} onChange={(e) => setRoundEntryForm((f) => ({ ...f, rounds: e.target.value }))} className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                      <input type="date" value={roundEntryForm.entryDate} onChange={(e) => setRoundEntryForm((f) => ({ ...f, entryDate: e.target.value }))} className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" disabled={addRoundEntryMutation.isPending} className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
                        {addRoundEntryMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Add
                      </button>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-5">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                      <input type="text" value={roundEntryForm.notes} onChange={(e) => setRoundEntryForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider p-4 border-b border-gray-200">
                  Round Entries ({roundEntriesQuery.data?.entries?.length ?? 0})
                </h3>
                {!roundEntriesQuery.data?.entries?.length ? (
                  <div className="p-8 text-center text-sm text-gray-500">No round entries yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Item</th>
                          <th className="px-4 py-3 text-right">Rate / Round</th>
                          <th className="px-4 py-3 text-right">Rounds</th>
                          <th className="px-4 py-3 text-right">Revenue</th>
                          <th className="px-4 py-3 text-left">Notes</th>
                          {trip.status === "Open" && <th className="px-4 py-3"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {roundEntriesQuery.data.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-4 py-3 text-gray-700">{entry.entryDate ?? trip.tripDate}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{entry.itemName}{entry.itemUnit ? ` (${entry.itemUnit})` : ""}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{formatPKR(Number(entry.ratePerRound))}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{entry.rounds}</td>
                            <td className="px-4 py-3 text-right font-semibold text-teal-700">{formatPKR(entry.revenue)}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{entry.notes ?? "—"}</td>
                            {trip.status === "Open" && (
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => setDeleteRoundEntryId(entry.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-semibold">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right text-gray-700">Total Revenue</td>
                          <td className="px-4 py-3 text-right text-teal-800">{formatPKR(Number(roundEntriesQuery.data.summary.totalRevenue ?? 0))}</td>
                          <td colSpan={trip.status === "Open" ? 2 : 1}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {deleteRoundEntryId !== null && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Round Entry</h3>
                    <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this round entry?</p>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setDeleteRoundEntryId(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                      <button
                        onClick={() => deleteRoundEntryMutation.mutate({ id: tripId, entryId: deleteRoundEntryId })}
                        disabled={deleteRoundEntryMutation.isPending}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {deleteRoundEntryMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {trip.movementType === "customer_trip" && loadsData?.summary && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-4">Income Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <div className="text-xs text-blue-600 font-medium mb-1">Total Freight</div>
                  <div className="text-lg font-bold text-gray-900">{formatPKR(loadsData.summary.totalFreight)}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 font-medium mb-1">Loading Charges</div>
                  <div className="text-lg font-bold text-gray-900">{formatPKR(loadsData.summary.totalLoadingCharges)}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 font-medium mb-1">Unloading Charges</div>
                  <div className="text-lg font-bold text-gray-900">{formatPKR(loadsData.summary.totalUnloadingCharges)}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 font-medium mb-1">Broker Commission</div>
                  <div className="text-lg font-bold text-red-600">{formatPKR(loadsData.summary.totalBrokerCommission)}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 font-medium mb-1">Trip Income</div>
                  <div className="text-xl font-bold text-green-700">{formatPKR(loadsData.summary.tripIncome)}</div>
                </div>
              </div>
            </div>
          )}

          {trip.movementType === "customer_trip" && trip.status === "Open" && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Load
              </h3>
              <form onSubmit={handleAddLoad}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bilty Number *</label>
                    <input type="text" value={loadForm.biltyNumber} onChange={(e) => setLoadForm((f) => ({ ...f, biltyNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                    <select value={loadForm.customerId} onChange={(e) => setLoadForm((f) => ({ ...f, customerId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                      <option value="">Select Customer</option>
                      {customersQuery.data?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Item Description</label>
                    <input type="text" value={loadForm.itemDescription} onChange={(e) => setLoadForm((f) => ({ ...f, itemDescription: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Weight</label>
                    <input type="number" step="0.01" min="0" value={loadForm.weight} onChange={(e) => setLoadForm((f) => ({ ...f, weight: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Freight</label>
                    <input type="number" step="0.01" min="0" value={loadForm.freight} onChange={(e) => setLoadForm((f) => ({ ...f, freight: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Loading Charges</label>
                    <input type="number" step="0.01" min="0" value={loadForm.loadingCharges} onChange={(e) => setLoadForm((f) => ({ ...f, loadingCharges: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unloading Charges</label>
                    <input type="number" step="0.01" min="0" value={loadForm.unloadingCharges} onChange={(e) => setLoadForm((f) => ({ ...f, unloadingCharges: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Broker Commission</label>
                    <input type="number" step="0.01" min="0" value={loadForm.brokerCommission} onChange={(e) => setLoadForm((f) => ({ ...f, brokerCommission: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
                <button type="submit" disabled={addLoadMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                  {addLoadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" /> Add Load
                </button>
              </form>
            </div>
          )}

          {trip.movementType === "customer_trip" && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-6 py-4 border-b border-gray-200">
              Loads ({loadsData?.loads.length ?? 0})
            </h3>
            {loadsQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading loads...</div>
            ) : !loadsData?.loads.length ? (
              <div className="p-8 text-center text-gray-500">No loads added yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Bilty #</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Freight</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Loading</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Unloading</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Commission</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Net Income</th>
                      {trip.status === "Open" && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loadsData.loads.map((load) => (
                      <tr key={load.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{load.biltyNumber}</td>
                        <td className="px-4 py-3 text-gray-700">{load.customerName}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatPKR(Number(load.freight))}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatPKR(Number(load.loadingCharges))}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatPKR(Number(load.unloadingCharges))}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatPKR(Number(load.brokerCommission))}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">{formatPKR(load.netLoadIncome)}</td>
                        {trip.status === "Open" && (
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setDeleteConfirmId(load.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Delete Load">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {trip.status === "Open" && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Expense
              </h3>
              <form onSubmit={handleAddExpense}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expense Type *</label>
                    <select value={expenseForm.expenseTypeId} onChange={(e) => setExpenseForm((f) => ({ ...f, expenseTypeId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                      <option value="">Select Type</option>
                      {expenseTypesQuery.data?.map((et) => (<option key={et.id} value={et.id}>{et.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expense For *</label>
                    <select value={expenseForm.expenseCategory} onChange={(e) => setExpenseForm((f) => ({ ...f, expenseCategory: e.target.value, customerId: "" }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                      <option value="">Select</option>
                      <option value="driver">Driver</option>
                      <option value="truck">Truck</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                  {expenseForm.expenseCategory === "customer" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                      <select value={expenseForm.customerId} onChange={(e) => setExpenseForm((f) => ({ ...f, customerId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                        <option value="">Select Customer</option>
                        {customersQuery.data?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
                    <input type="number" step="0.01" min="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                    <input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm((f) => ({ ...f, expenseDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <input type="text" value={expenseForm.notes} onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
                <button type="submit" disabled={addExpenseMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium disabled:opacity-50">
                  {addExpenseMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" /> Add Expense
                </button>
              </form>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Expenses ({expensesData?.expenses.length ?? 0})
              </h3>
              {expensesData && (
                <div className="text-sm font-semibold text-orange-700">
                  Total: {formatPKR(expensesData.totalExpense)}
                </div>
              )}
            </div>
            {expensesQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading expenses...</div>
            ) : !expensesData?.expenses.length ? (
              <div className="p-8 text-center text-gray-500">No expenses added yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Expense Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Expense For</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                      {trip.status === "Open" && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {expensesData.expenses.map((exp) => {
                      const catColors: Record<string, string> = {
                        driver: "bg-purple-100 text-purple-700",
                        truck: "bg-blue-100 text-blue-700",
                        customer: "bg-green-100 text-green-700",
                      };
                      const catLabel = exp.expenseCategory
                        ? exp.expenseCategory.charAt(0).toUpperCase() + exp.expenseCategory.slice(1)
                        : "Truck";
                      return (
                        <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700">
                            {new Date(exp.expenseDate + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-medium">{exp.expenseTypeName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${catColors[exp.expenseCategory ?? "truck"] ?? catColors.truck}`}>
                              {catLabel}{exp.expenseCategory === "customer" && exp.customerName ? `: ${exp.customerName}` : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-orange-700 font-semibold">{formatPKR(Number(exp.amount))}</td>
                          <td className="px-4 py-3 text-gray-500">{exp.notes || "—"}</td>
                          {trip.status === "Open" && (
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => setDeleteExpenseConfirmId(exp.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Delete Expense">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {trip.movementType !== "in_house_shifting" && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Customer Payments ({paymentsData?.payments.length ?? 0})
              {paymentsData && (
                <span className="ml-2 text-teal-700">— Total Received: {formatPKR(paymentsData.totalReceived)}</span>
              )}
            </h3>

            {trip.status === "Open" && (
              <form onSubmit={handleAddPayment} className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                    {hasSingleLoadCustomer ? (
                      <>
                        <input type="text" value={loadCustomers[0].name} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-700 cursor-not-allowed" />
                        <input type="hidden" name="customerId" value={autoCustomerId} />
                        <p className="text-xs text-gray-500 mt-0.5">Auto-selected from load</p>
                      </>
                    ) : loadCustomers.length > 1 ? (
                      <>
                        <select value={paymentForm.customerId} onChange={(e) => setPaymentForm((f) => ({ ...f, customerId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required>
                          <option value="">Select Customer</option>
                          {loadCustomers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                        <p className="text-xs text-gray-500 mt-0.5">Filtered to load customers</p>
                      </>
                    ) : (
                      <select value={paymentForm.customerId} onChange={(e) => setPaymentForm((f) => ({ ...f, customerId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required>
                        <option value="">Select Customer</option>
                        {customersQuery.data?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
                    <input type="number" step="0.01" min="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                    <input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
                    <select value={paymentForm.paymentMode} onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMode: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                      <option value="">Select</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <input type="text" value={paymentForm.notes} onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                  </div>
                </div>
                <button type="submit" disabled={addPaymentMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium disabled:opacity-50">
                  {addPaymentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" /> Record Payment
                </button>
              </form>
            )}
            {trip.status === "Closed" && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                Trip is closed. Any remaining amounts are managed through Customer Dues.
              </div>
            )}

            {paymentsQuery.isLoading ? (
              <div className="p-4 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : !paymentsData?.payments.length ? (
              <div className="p-4 text-center text-gray-500 text-sm">No payments recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Mode</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsData.payments.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">
                          {new Date(p.paymentDate + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-right text-teal-700 font-semibold">{formatPKR(Number(p.amount))}</td>
                        <td className="px-4 py-3 text-gray-700">{p.paymentMode || "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{p.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {trip.movementType === "customer_trip" && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Driver Advances ({advancesData?.advances.length ?? 0})
              {advancesData && (
                <span className="ml-2 text-purple-700">— Total: {formatPKR(advancesData.totalAdvances)}</span>
              )}
            </h3>

            {trip.status === "Open" && (
              <form onSubmit={handleAddAdvance} className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
                    <input type="number" step="0.01" min="0.01" value={advanceForm.amount} onChange={(e) => setAdvanceForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                    <input type="date" value={advanceForm.advanceDate} onChange={(e) => setAdvanceForm((f) => ({ ...f, advanceDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <input type="text" value={advanceForm.notes} onChange={(e) => setAdvanceForm((f) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                  </div>
                </div>
                <button type="submit" disabled={addAdvanceMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50">
                  {addAdvanceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" /> Record Advance
                </button>
              </form>
            )}

            {advancesQuery.isLoading ? (
              <div className="p-4 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : !advancesData?.advances.length ? (
              <div className="p-4 text-center text-gray-500 text-sm">No advances recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advancesData.advances.map((a) => (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">
                          {new Date(a.advanceDate + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-right text-purple-700 font-semibold">{formatPKR(Number(a.amount))}</td>
                        <td className="px-4 py-3 text-gray-500">{a.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {trip.movementType !== "in_house_shifting" && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Customer Dues ({customerDuesData?.dues.length ?? 0})
              {customerDuesData && customerDuesData.dues.length > 0 && (
                <span className="ml-2 text-orange-700">— Outstanding: {formatPKR(customerDuesData.totalBalance)}</span>
              )}
            </h3>

            {customerDuesQuery.isLoading ? (
              <div className="p-4 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : !customerDuesData?.dues.length ? (
              <div className="p-4 text-center text-gray-500 text-sm">No customer dues linked to this trip.</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                    <div className="text-xs text-orange-600 font-medium mb-1">Total Due</div>
                    <div className="text-lg font-bold text-orange-800">{formatPKR(customerDuesData.totalDue)}</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="text-xs text-green-600 font-medium mb-1">Paid</div>
                    <div className="text-lg font-bold text-green-800">{formatPKR(customerDuesData.totalPaid)}</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <div className="text-xs text-red-600 font-medium mb-1">Balance</div>
                    <div className="text-lg font-bold text-red-800">{formatPKR(customerDuesData.totalBalance)}</div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Bilty #</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Due Amount</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerDuesData.dues.map((d) => (
                        <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{d.customerName}</td>
                          <td className="px-4 py-3 text-gray-600">{d.biltyNumber ?? "—"}</td>
                          <td className="px-4 py-3 text-right text-orange-700 font-semibold">{formatPKR(Number(d.dueAmount))}</td>
                          <td className="px-4 py-3 text-right text-green-700">{formatPKR(Number(d.paidAmount))}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-700">{formatPKR(d.balance ?? 0)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              d.status === "Cleared" ? "bg-green-100 text-green-800" :
                              d.status === "Partial" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{d.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          )}
        </>
      )}
    </div>
  );
}
