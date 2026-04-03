import { Filter } from "lucide-react";
import { useListDrivers, useListTrucks, useListCustomers } from "@workspace/api-client-react";

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  driver_id?: number;
  truck_id?: number;
  customer_id?: number;
  status?: "Open" | "Closed";
}

interface Props {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  showDriver?: boolean;
  showTruck?: boolean;
  showStatus?: boolean;
  showCustomer?: boolean;
}

export default function ReportFilterBar({ filters, onChange, showDriver, showTruck, showStatus, showCustomer }: Props) {
  const driversQuery = useListDrivers({});
  const trucksQuery = useListTrucks({});
  const customersQuery = useListCustomers({});

  const hasFilters = filters.date_from || filters.date_to || filters.driver_id || filters.truck_id || filters.customer_id || filters.status;

  return (
    <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        {hasFilters && (
          <button onClick={() => onChange({})} className="text-xs text-blue-600 hover:underline">
            Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
          <input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
          <input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {showDriver && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
            <select
              value={filters.driver_id ?? ""}
              onChange={(e) => onChange({ ...filters, driver_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Drivers</option>
              {(driversQuery.data || []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
        {showTruck && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Truck</label>
            <select
              value={filters.truck_id ?? ""}
              onChange={(e) => onChange({ ...filters, truck_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Trucks</option>
              {(trucksQuery.data || []).map((t) => (
                <option key={t.id} value={t.id}>{t.truckNumber}</option>
              ))}
            </select>
          </div>
        )}
        {showCustomer && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
            <select
              value={filters.customer_id ?? ""}
              onChange={(e) => onChange({ ...filters, customer_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Customers</option>
              {(customersQuery.data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {showStatus && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filters.status ?? ""}
              onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as "Open" | "Closed" | undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
