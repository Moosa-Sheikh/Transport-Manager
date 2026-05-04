import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, Route, Warehouse } from "lucide-react";
import { Link } from "wouter";
import {
  useCreateTrip,
  useListTrucks,
  useListDrivers,
  useListCities,
  useListItems,
  useListWarehouses,
} from "@workspace/api-client-react";

type TripCategory = "trip" | "shifting";

export default function CreateTripPage() {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<TripCategory>("trip");
  const [tripDate, setTripDate] = useState(new Date().toISOString().split("T")[0]);
  const [truckId, setTruckId] = useState("");
  const [driverId, setDriverId] = useState("");

  const [fromCityId, setFromCityId] = useState("");
  const [toCityId, setToCityId] = useState("");
  const [driverCommission, setDriverCommission] = useState("");

  const [shiftFromWarehouseId, setShiftFromWarehouseId] = useState("");
  const [shiftToWarehouseId, setShiftToWarehouseId] = useState("");
  const [shiftItemId, setShiftItemId] = useState("");
  const [shiftRounds, setShiftRounds] = useState("1");
  const [shiftRatePerRound, setShiftRatePerRound] = useState("");
  const [shiftCommissionPerRound, setShiftCommissionPerRound] = useState("");

  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const trucksQuery = useListTrucks({});
  const driversQuery = useListDrivers({});
  const citiesQuery = useListCities({});
  const itemsQuery = useListItems({});
  const warehousesQuery = useListWarehouses({});

  const isShifting = category === "shifting";

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

  const handleShiftItemChange = (val: string) => {
    setShiftItemId(val);
    const item = itemsQuery.data?.find((i) => String(i.id) === val);
    if (item?.defaultRatePerRound && Number(item.defaultRatePerRound) > 0) {
      setShiftRatePerRound(String(item.defaultRatePerRound));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!tripDate || !truckId || !driverId) {
      setError("Trip date, truck, and driver are required");
      return;
    }

    const payload: Record<string, unknown> = {
      tripDate,
      truckId: Number(truckId),
      driverId: Number(driverId),
      notes: notes.trim() || undefined,
    };

    if (!isShifting) {
      if (!fromCityId || !toCityId) {
        setError("From City and To City are required for customer trips");
        return;
      }
      if (fromCityId === toCityId) {
        setError("From City and To City cannot be the same");
        return;
      }
      payload.movementType = "customer_trip";
      payload.fromCityId = Number(fromCityId);
      payload.toCityId = Number(toCityId);
      payload.driverCommission = driverCommission || "0";
    } else {
      if (!shiftFromWarehouseId || !shiftToWarehouseId) {
        setError("From and To warehouses are required for shifting");
        return;
      }
      if (!shiftItemId) { setError("Item is required for shifting"); return; }
      if (!shiftRounds || Number(shiftRounds) <= 0) { setError("Rounds must be a positive number"); return; }
      if (!shiftRatePerRound || Number(shiftRatePerRound) < 0) { setError("Rate per round must be non-negative"); return; }
      payload.movementType = "in_house_shifting";
      payload.fromWarehouseId = Number(shiftFromWarehouseId);
      payload.toWarehouseId = Number(shiftToWarehouseId);
      payload.itemId = Number(shiftItemId);
      payload.rounds = Number(shiftRounds);
      payload.ratePerRound = shiftRatePerRound;
      payload.commissionPerRound = shiftCommissionPerRound || "0";
    }

    createMutation.mutate({ data: payload as Parameters<typeof createMutation.mutate>[0]["data"] });
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/trips" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Create Trip</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCategory("trip")}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                !isShifting ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Route className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Trip</div>
                <div className="text-xs font-normal text-gray-500">Freight bilty (city → city)</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCategory("shifting")}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                isShifting ? "border-orange-500 bg-orange-50 text-orange-800" : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Warehouse className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Shifting</div>
                <div className="text-xs font-normal text-gray-500">In-house warehouse shift</div>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip Date <span className="text-red-500">*</span></label>
          <input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Truck <span className="text-red-500">*</span></label>
          <select value={truckId} onChange={(e) => setTruckId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
            <option value="">Select a truck</option>
            {trucksQuery.data?.map((t) => (<option key={t.id} value={t.id}>{t.truckNumber} {t.model ? `(${t.model})` : ""}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Driver <span className="text-red-500">*</span></label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
            <option value="">Select a driver</option>
            {driversQuery.data?.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>

        {!isShifting && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From City <span className="text-red-500">*</span></label>
                <select value={fromCityId} onChange={(e) => setFromCityId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                  <option value="">Select origin</option>
                  {citiesQuery.data?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To City <span className="text-red-500">*</span></label>
                <select value={toCityId} onChange={(e) => setToCityId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                  <option value="">Select destination</option>
                  {citiesQuery.data?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Commission (PKR)</label>
              <input type="number" step="0.01" min="0" value={driverCommission} onChange={(e) => setDriverCommission(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </>
        )}

        {isShifting && (
          <div className="space-y-4 p-4 border border-orange-200 rounded-lg bg-orange-50/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Warehouse <span className="text-red-500">*</span></label>
                <select
                  value={shiftFromWarehouseId}
                  onChange={(e) => setShiftFromWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select origin warehouse</option>
                  {warehousesQuery.data?.map((w) => (<option key={w.id} value={w.id}>{w.name} ({w.cityName})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Warehouse <span className="text-red-500">*</span></label>
                <select
                  value={shiftToWarehouseId}
                  onChange={(e) => setShiftToWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select destination warehouse</option>
                  {warehousesQuery.data?.map((w) => (<option key={w.id} value={w.id}>{w.name} ({w.cityName})</option>))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item <span className="text-red-500">*</span></label>
                <select
                  value={shiftItemId}
                  onChange={(e) => handleShiftItemChange(e.target.value)}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select item</option>
                  {itemsQuery.data?.map((i) => (<option key={i.id} value={i.id}>{i.name} ({i.unit})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rounds <span className="text-red-500">*</span></label>
                <input
                  type="number" min="1" step="1"
                  value={shiftRounds}
                  onChange={(e) => setShiftRounds(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate / Round (PKR)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={shiftRatePerRound}
                  onChange={(e) => setShiftRatePerRound(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission / Round (PKR)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={shiftCommissionPerRound}
                  onChange={(e) => setShiftCommissionPerRound(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {shiftRounds && shiftRatePerRound && Number(shiftRounds) > 0 && Number(shiftRatePerRound) > 0 && (
              <div className="text-sm rounded p-2 border text-orange-700 bg-orange-50 border-orange-200">
                Internal cost: <strong>{new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(Number(shiftRounds) * Number(shiftRatePerRound))}</strong>
                {shiftCommissionPerRound && Number(shiftCommissionPerRound) > 0 && (
                  <span className="ml-3">· Driver commission: <strong>{new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(Number(shiftRounds) * Number(shiftCommissionPerRound))}</strong></span>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${isShifting ? "border-orange-300 focus:ring-orange-500" : "border-gray-300 focus:ring-blue-500"}`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/trips" className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className={`px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50 flex items-center gap-2 font-medium ${
              isShifting ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isShifting ? "Create Shifting" : "Create Trip"}
          </button>
        </div>
      </form>
    </div>
  );
}
