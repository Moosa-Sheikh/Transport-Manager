import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import {
  useCreateTrip,
  useListTrucks,
  useListDrivers,
  useListCities,
} from "@workspace/api-client-react";
export default function CreateTripPage() {
  const [, navigate] = useLocation();
  const [tripDate, setTripDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [truckId, setTruckId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [fromCityId, setFromCityId] = useState("");
  const [toCityId, setToCityId] = useState("");
  const [error, setError] = useState("");

  const trucksQuery = useListTrucks({});
  const driversQuery = useListDrivers({});
  const citiesQuery = useListCities({});

  const createMutation = useCreateTrip({
    mutation: {
      onSuccess: () => {
        navigate("/trips");
      },
      onError: (err: unknown) => {
        const msg = (err as { error?: string })?.error ?? "Failed to create trip";
        setError(msg);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!tripDate || !truckId || !driverId || !fromCityId || !toCityId) {
      setError("All fields are required");
      return;
    }

    if (fromCityId === toCityId) {
      setError("From City and To City cannot be the same");
      return;
    }

    createMutation.mutate({
      data: {
        tripDate,
        truckId: Number(truckId),
        driverId: Number(driverId),
        fromCityId: Number(fromCityId),
        toCityId: Number(toCityId),
      },
    });
  };

  return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/trips"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Create Trip</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-lg p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trip Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Truck <span className="text-red-500">*</span>
            </label>
            <select
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a truck</option>
              {trucksQuery.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.truckNumber} {t.model ? `(${t.model})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver <span className="text-red-500">*</span>
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a driver</option>
              {driversQuery.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From City <span className="text-red-500">*</span>
              </label>
              <select
                value={fromCityId}
                onChange={(e) => setFromCityId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select origin city</option>
                {citiesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To City <span className="text-red-500">*</span>
              </label>
              <select
                value={toCityId}
                onChange={(e) => setToCityId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select destination city</option>
                {citiesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/trips"
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {createMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Create Trip
            </button>
          </div>
        </form>
      </div>
  );
}
