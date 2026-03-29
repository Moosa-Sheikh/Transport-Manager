import { useState } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Lock, Loader2, ChevronRight } from "lucide-react";
import {
  useGetTrip,
  useCloseTrip,
  getGetTripQueryKey,
  getGetTripQueryOptions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
export default function TripDetailPage() {
  const [, params] = useRoute("/trips/:id");
  const tripId = Number(params?.id);
  const queryClient = useQueryClient();
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const defaultOpts = getGetTripQueryOptions(tripId);
  const tripQuery = useGetTrip(tripId, {
    query: {
      ...defaultOpts,
      enabled: Number.isFinite(tripId) && tripId > 0,
    },
  });

  const closeMutation = useCloseTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTripQueryKey(tripId) });
        setCloseConfirm(false);
        setSuccessMsg("Trip closed successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
      },
    },
  });

  const trip = tripQuery.data;

  return (
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/trips"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">
            Trip #{tripId}
          </h2>
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
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
            {successMsg}
          </div>
        )}

        {closeConfirm && (
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
                  onClick={() => setCloseConfirm(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => closeMutation.mutate({ id: tripId })}
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

        {tripQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading trip details...
          </div>
        ) : !trip ? (
          <div className="p-8 text-center text-gray-500">Trip not found.</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Date
                </div>
                <div className="text-sm text-gray-900">
                  {new Date(trip.tripDate + "T00:00:00").toLocaleDateString(
                    "en-PK",
                    {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Status
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    trip.status === "Open"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {trip.status}
                </span>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Truck
                </div>
                <div className="text-sm text-gray-900">{trip.truckNumber}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Driver
                </div>
                <div className="text-sm text-gray-900">{trip.driverName}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Route
                </div>
                <div className="text-sm text-gray-900 flex items-center gap-2">
                  <span className="font-medium">{trip.fromCityName}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{trip.toCityName}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
