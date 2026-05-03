import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, Truck, Route, Users2, Warehouse } from "lucide-react";
import { Link } from "wouter";
import {
  useCreateTrip,
  useListTrucks,
  useListDrivers,
  useListCities,
  useListCustomers,
  useListItems,
  useListWarehouses,
} from "@workspace/api-client-react";

type TripCategory = "trip" | "shifting";
type ShiftingKind = "customer_shifting" | "in_house_shifting";

export default function CreateTripPage() {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<TripCategory>("trip");
  const [shiftingKind, setShiftingKind] = useState<ShiftingKind>("customer_shifting");
  const [tripDate, setTripDate] = useState(new Date().toISOString().split("T")[0]);
  const [truckId, setTruckId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [fromCityId, setFromCityId] = useState("");
  const [toCityId, setToCityId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [driverCommission, setDriverCommission] = useState("");
  const [notes, setNotes] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [itemId, setItemId] = useState("");
  const [rounds, setRounds] = useState("1");
  const [ratePerRound, setRatePerRound] = useState("");
  const [commissionPerRound, setCommissionPerRound] = useState("");
  const [error, setError] = useState("");

  const trucksQuery = useListTrucks({});
  const driversQuery = useListDrivers({});
  const citiesQuery = useListCities({});
  const customersQuery = useListCustomers({});
  const itemsQuery = useListItems({});
  const warehousesQuery = useListWarehouses({});

  useEffect(() => {
    if (!itemId) return;
    const it = itemsQuery.data?.find((i) => i.id === Number(itemId));
    if (it && it.defaultRatePerRound && !ratePerRound) {
      setRatePerRound(String(Number(it.defaultRatePerRound)));
    }
  }, [itemId, itemsQuery.data, ratePerRound]);

  const isShifting = category === "shifting";
  const isCustomerShifting = isShifting && shiftingKind === "customer_shifting";
  const isInHouseShifting = isShifting && shiftingKind === "in_house_shifting";
  const movementType = !isShifting ? "customer_trip" : shiftingKind;

  const createMutation = useCreateTrip({
    mutation: {
      onSuccess: (data) => {
        if (data.movementType === "in_house_shifting" || data.movementType === "customer_shifting") {
          navigate(`/trips/${data.id}`);
        } else {
          navigate("/trips");
        }
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

    if (!tripDate || !truckId || !driverId) {
      setError("Trip date, truck, and driver are required");
      return;
    }

    if (!isShifting) {
      if (!fromCityId || !toCityId) {
        setError("From City and To City are required for customer trips");
        return;
      }
      if (fromCityId === toCityId) {
        setError("From City and To City cannot be the same for customer trips");
        return;
      }
    } else {
      if (!fromWarehouseId || !toWarehouseId) {
        setError("From Warehouse and To Warehouse are required for shifting trips");
        return;
      }
    }

    if (isInHouseShifting && !notes.trim()) {
      setError("Notes / purpose is required for in-house shifting");
      return;
    }

    if (isCustomerShifting) {
      if (!customerId) { setError("Customer is required for customer shifting"); return; }
      if (!itemId) { setError("Item is required for customer shifting"); return; }
      const rate = Number(ratePerRound);
      if (!Number.isFinite(rate) || rate < 0) { setError("Rate per round must be a non-negative number"); return; }
    }

    if (isShifting) {
      const r = Number(rounds || "1");
      if (!Number.isInteger(r) || r <= 0) { setError("Rounds must be a positive integer"); return; }
      const comm = Number(commissionPerRound || "0");
      if (!Number.isFinite(comm) || comm < 0) { setError("Commission per round must be non-negative"); return; }
    }

    const payload: Record<string, unknown> = {
      tripDate,
      truckId: Number(truckId),
      driverId: Number(driverId),
      movementType,
      notes: notes.trim() || undefined,
    };

    if (!isShifting) {
      payload.fromCityId = Number(fromCityId);
      payload.toCityId = Number(toCityId);
      payload.driverCommission = driverCommission || "0";
    } else {
      payload.fromWarehouseId = Number(fromWarehouseId);
      payload.toWarehouseId = Number(toWarehouseId);
      payload.driverCommission = "0";
      payload.rounds = Number(rounds || "1");
      payload.commissionPerRound = String(Number(commissionPerRound || "0"));
      if (isCustomerShifting) {
        payload.customerId = Number(customerId);
        payload.itemId = Number(itemId);
        payload.ratePerRound = String(Number(ratePerRound || "0"));
      }
    }

    createMutation.mutate({ data: payload as never });
  };

  const accent = isCustomerShifting ? "teal" : isInHouseShifting ? "orange" : "blue";

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
            Trip Type <span className="text-red-500">*</span>
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
                isShifting ? `border-${accent}-500 bg-${accent}-50 text-${accent}-800` : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Warehouse className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Shifting</div>
                <div className="text-xs font-normal text-gray-500">Warehouse → warehouse, by rounds</div>
              </div>
            </button>
          </div>

          {isShifting && (
            <div className="mt-3">
              <div className="text-xs font-medium text-gray-600 mb-2">Shifting Kind <span className="text-red-500">*</span></div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShiftingKind("customer_shifting")}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                    isCustomerShifting ? "border-teal-500 bg-teal-50 text-teal-800" : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Users2 className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">For Customer</div>
                    <div className="text-xs font-normal text-gray-500">Rounds × rate billing</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setShiftingKind("in_house_shifting")}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                    isInHouseShifting ? "border-orange-500 bg-orange-50 text-orange-800" : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Truck className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">In-House</div>
                    <div className="text-xs font-normal text-gray-500">Internal — cost only</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {isCustomerShifting && (
            <p className="mt-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">
              Revenue = Rounds × Rate per round. Commission paid to driver per round.
            </p>
          )}
          {isInHouseShifting && (
            <p className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
              Internal movement — no customer billing. Driver paid per round.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip Date <span className="text-red-500">*</span></label>
          <input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Truck <span className="text-red-500">*</span></label>
          <select value={truckId} onChange={(e) => setTruckId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
            <option value="">Select a truck</option>
            {trucksQuery.data?.map((t) => (
              <option key={t.id} value={t.id}>{t.truckNumber} {t.model ? `(${t.model})` : ""}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Driver <span className="text-red-500">*</span></label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
            <option value="">Select a driver</option>
            {driversQuery.data?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {!isShifting && (
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
        )}

        {isShifting && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Warehouse <span className="text-red-500">*</span></label>
              <select value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                <option value="">Select origin warehouse</option>
                {warehousesQuery.data?.map((w) => (<option key={w.id} value={w.id}>{w.name}{w.cityName ? ` — ${w.cityName}` : ""}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Warehouse <span className="text-red-500">*</span> <span className="ml-1 text-xs text-gray-500 font-normal">(same allowed)</span></label>
              <select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                <option value="">Select destination warehouse</option>
                {warehousesQuery.data?.map((w) => (<option key={w.id} value={w.id}>{w.name}{w.cityName ? ` — ${w.cityName}` : ""}</option>))}
              </select>
            </div>
            {!warehousesQuery.data?.length && (
              <div className="sm:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                No warehouses defined yet. <Link href="/masters/warehouses" className="underline font-medium">Add warehouses first</Link>.
              </div>
            )}
          </div>
        )}

        {isCustomerShifting && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-teal-50/40 border border-teal-200 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required>
                <option value="">Select customer</option>
                {customersQuery.data?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item <span className="text-red-500">*</span></label>
              <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required>
                <option value="">Select item</option>
                {itemsQuery.data?.map((it) => (<option key={it.id} value={it.id}>{it.name} ({it.unit})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Round (PKR) <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={ratePerRound} onChange={(e) => setRatePerRound(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
            </div>
          </div>
        )}

        {isShifting && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rounds <span className="text-red-500">*</span></label>
              <input type="number" min="1" step="1" value={rounds} onChange={(e) => setRounds(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${isCustomerShifting ? "border-teal-300 focus:ring-teal-500 focus:border-teal-500" : "border-orange-300 focus:ring-orange-500 focus:border-orange-500"}`} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Commission per Round (PKR)</label>
              <input type="number" min="0" step="0.01" value={commissionPerRound} onChange={(e) => setCommissionPerRound(e.target.value)} placeholder="0" className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${isCustomerShifting ? "border-teal-300 focus:ring-teal-500 focus:border-teal-500" : "border-orange-300 focus:ring-orange-500 focus:border-orange-500"}`} />
            </div>
          </div>
        )}

        {!isShifting && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Driver Commission (PKR)</label>
            <input type="number" step="0.01" min="0" value={driverCommission} onChange={(e) => setDriverCommission(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        )}

        {isInHouseShifting && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Notes <span className="text-red-500">*</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Reason for this internal movement..." className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
          </div>
        )}

        {isCustomerShifting && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/trips" className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className={`px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50 flex items-center gap-2 font-medium ${
              accent === "teal" ? "bg-teal-600 hover:bg-teal-700" :
              accent === "orange" ? "bg-orange-600 hover:bg-orange-700" :
              "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isCustomerShifting ? "Create Customer Shift" : isInHouseShifting ? "Create In-House Shift" : "Create Trip"}
          </button>
        </div>
      </form>
    </div>
  );
}
