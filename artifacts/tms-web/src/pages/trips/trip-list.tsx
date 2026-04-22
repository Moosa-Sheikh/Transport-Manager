import { useState } from "react";
import { Link } from "wouter";
import {
  Plus,
  Filter,
  X,
  Lock,
  Trash2,
  Loader2,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  useListTrips,
  useCloseTrip,
  useDeleteTrip,
  useListTrucks,
  useListDrivers,
  useListCities,
  useListCustomers,
  getListTripsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
function getInitialFilters() {
  const params = new URLSearchParams(window.location.search);
  const f: {
    date_from?: string;
    date_to?: string;
    truck_id?: number;
    driver_id?: number;
    status?: "Open" | "Closed";
    profit?: "positive" | "negative";
    from_city_id?: number;
    to_city_id?: number;
    customer_id?: number;
  } = {};
  if (params.get("driver_id")) f.driver_id = Number(params.get("driver_id"));
  if (params.get("date_from")) f.date_from = params.get("date_from")!;
  if (params.get("date_to")) f.date_to = params.get("date_to")!;
  if (params.get("truck_id")) f.truck_id = Number(params.get("truck_id"));
  if (params.get("status")) f.status = params.get("status") as "Open" | "Closed";
  if (params.get("customer_id")) f.customer_id = Number(params.get("customer_id"));
  return f;
}

export default function TripListPage() {
  const queryClient = useQueryClient();
  const initialFilters = getInitialFilters();
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(Object.keys(initialFilters).length > 0);
  const [successMsg, setSuccessMsg] = useState("");
  const [closeConfirmId, setCloseConfirmId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const tripsQuery = useListTrips(filters);
  const trucksQuery = useListTrucks({});
  const driversQuery = useListDrivers({});
  const citiesQuery = useListCities({});
  const customersQuery = useListCustomers({});

  const closeMutation = useCloseTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey(filters) });
        setCloseConfirmId(null);
        showSuccess("Trip closed successfully");
      },
    },
  });

  const deleteMutation = useDeleteTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey(filters) });
        setDeleteConfirmId(null);
        showSuccess("Trip deleted successfully");
      },
    },
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Trips</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                activeFilterCount > 0
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <Link
              href="/trips/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Trip
            </Link>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
            {successMsg}
          </div>
        )}

        {filters.customer_id && (
          <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <span className="font-medium">
              Filtered for customer:{" "}
              <span className="text-blue-900 font-semibold">
                {customersQuery.data?.find((c) => c.id === filters.customer_id)?.name ?? `#${filters.customer_id}`}
              </span>
              {filters.status && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${filters.status === "Open" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                  {filters.status} trips only
                </span>
              )}
            </span>
            <a href="/reports/customers" className="ml-auto text-blue-600 hover:text-blue-800 underline text-xs">
              ← Back to Customer Report
            </a>
            <button
              onClick={() => setFilters((f) => { const { customer_id, status, ...rest } = f; return rest; })}
              className="text-blue-500 hover:text-blue-800"
              title="Clear customer filter"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showFilters && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Filter Trips</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.date_from ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      date_from: e.target.value || undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.date_to ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      date_to: e.target.value || undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Truck
                </label>
                <select
                  value={filters.truck_id ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      truck_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Trucks</option>
                  {trucksQuery.data?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.truckNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Driver
                </label>
                <select
                  value={filters.driver_id ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      driver_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Drivers</option>
                  {driversQuery.data?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={filters.status ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      status: (e.target.value || undefined) as "Open" | "Closed" | undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Profit
                </label>
                <select
                  value={filters.profit ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      profit: (e.target.value || undefined) as "positive" | "negative" | undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Trips</option>
                  <option value="positive">Profitable</option>
                  <option value="negative">Loss-Making</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  From City
                </label>
                <select
                  value={filters.from_city_id ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      from_city_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Cities</option>
                  {citiesQuery.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  To City
                </label>
                <select
                  value={filters.to_city_id ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      to_city_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Cities</option>
                  {citiesQuery.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {closeConfirmId !== null && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Close Trip
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to close this trip? This action cannot be
                undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCloseConfirmId(null)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => closeMutation.mutate({ id: closeConfirmId })}
                  disabled={closeMutation.isPending}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {closeMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Close Trip
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Delete Trip
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this trip? All related loads, expenses, payments, advances, and cash book entries will be permanently removed.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: deleteConfirmId })}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Delete Trip
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {tripsQuery.isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading trips...
            </div>
          ) : !tripsQuery.data?.length ? (
            <div className="p-8 text-center text-gray-500">
              No trips found.{" "}
              {activeFilterCount > 0
                ? "Try adjusting your filters."
                : "Create your first trip to get started."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      ID
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Truck
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Driver
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Route
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Income
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Expense
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Profit
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tripsQuery.data.map((trip) => (
                    <tr
                      key={trip.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        #{trip.id}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(trip.tripDate + "T00:00:00").toLocaleDateString("en-PK", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {trip.truckNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {trip.driverName}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="flex items-center gap-1">
                          {trip.fromCityName}
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                          {trip.toCityName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            trip.status === "Open"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {trip.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue-700">
                        {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(trip.income)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-orange-700">
                        {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(trip.expense)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${trip.profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(trip.profit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/trips/${trip.id}`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {trip.status === "Open" && (
                            <>
                              <button
                                onClick={() => setCloseConfirmId(trip.id)}
                                className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded"
                                title="Close Trip"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(trip.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete Trip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
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
