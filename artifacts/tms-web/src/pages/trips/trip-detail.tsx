import { useState } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Lock, Loader2, ChevronRight, Trash2, Plus } from "lucide-react";
import {
  useGetTrip,
  useCloseTrip,
  useListTripLoads,
  useAddTripLoad,
  useDeleteTripLoad,
  useListCustomers,
  getGetTripQueryKey,
  getGetTripQueryOptions,
  getListTripLoadsQueryKey,
  getListTripLoadsQueryOptions,
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [loadForm, setLoadForm] = useState({
    biltyNumber: "",
    customerId: "",
    itemDescription: "",
    weight: "",
    freight: "",
    loadingCharges: "",
    unloadingCharges: "",
    brokerCommission: "",
  });

  const tripDefaults = getGetTripQueryOptions(tripId);
  const tripQuery = useGetTrip(tripId, {
    query: { ...tripDefaults, enabled: Number.isFinite(tripId) && tripId > 0 },
  });

  const loadsDefaults = getListTripLoadsQueryOptions(tripId);
  const loadsQuery = useListTripLoads(tripId, {
    query: { ...loadsDefaults, enabled: Number.isFinite(tripId) && tripId > 0 },
  });

  const customersQuery = useListCustomers({});

  const closeMutation = useCloseTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTripQueryKey(tripId) });
        setCloseConfirm(false);
        showSuccess("Trip closed successfully");
      },
    },
  });

  const addLoadMutation = useAddTripLoad({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTripLoadsQueryKey(tripId) });
        queryClient.invalidateQueries({ queryKey: getGetTripQueryKey(tripId) });
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
        queryClient.invalidateQueries({ queryKey: getListTripLoadsQueryKey(tripId) });
        queryClient.invalidateQueries({ queryKey: getGetTripQueryKey(tripId) });
        setDeleteConfirmId(null);
        showSuccess("Load deleted");
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

  const trip = tripQuery.data;
  const loadsData = loadsQuery.data;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/trips" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Trip #{tripId}</h2>
        {trip?.status === "Open" && (
          <button
            onClick={() => setCloseConfirm(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
          >
            <Lock className="w-4 h-4" />
            Close Trip
          </button>
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
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Trip Income</div>
                <div className="text-sm font-semibold text-green-700">{formatPKR(trip.income)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Truck</div>
                <div className="text-sm text-gray-900">{trip.truckNumber}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Driver</div>
                <div className="text-sm text-gray-900">{trip.driverName}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Route</div>
                <div className="text-sm text-gray-900 flex items-center gap-2">
                  <span className="font-medium">{trip.fromCityName}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{trip.toCityName}</span>
                </div>
              </div>
            </div>
          </div>

          {loadsData?.summary && (
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

          {trip.status === "Open" && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Load
              </h3>
              <form onSubmit={handleAddLoad}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bilty Number *</label>
                    <input
                      type="text"
                      value={loadForm.biltyNumber}
                      onChange={(e) => setLoadForm((f) => ({ ...f, biltyNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                    <select
                      value={loadForm.customerId}
                      onChange={(e) => setLoadForm((f) => ({ ...f, customerId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Customer</option>
                      {customersQuery.data?.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Item Description</label>
                    <input
                      type="text"
                      value={loadForm.itemDescription}
                      onChange={(e) => setLoadForm((f) => ({ ...f, itemDescription: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Weight</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={loadForm.weight}
                      onChange={(e) => setLoadForm((f) => ({ ...f, weight: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Freight</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={loadForm.freight}
                      onChange={(e) => setLoadForm((f) => ({ ...f, freight: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Loading Charges</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={loadForm.loadingCharges}
                      onChange={(e) => setLoadForm((f) => ({ ...f, loadingCharges: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unloading Charges</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={loadForm.unloadingCharges}
                      onChange={(e) => setLoadForm((f) => ({ ...f, unloadingCharges: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Broker Commission</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={loadForm.brokerCommission}
                      onChange={(e) => setLoadForm((f) => ({ ...f, brokerCommission: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={addLoadMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {addLoadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" />
                  Add Load
                </button>
              </form>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-6 py-4 border-b border-gray-200">
              Loads ({loadsData?.loads.length ?? 0})
            </h3>
            {loadsQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading loads...
              </div>
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
                      {trip.status === "Open" && (
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                      )}
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
                            <button
                              onClick={() => setDeleteConfirmId(load.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete Load"
                            >
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
        </>
      )}
    </div>
  );
}
