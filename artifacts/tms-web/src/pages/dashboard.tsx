import { Users, UserCog, Truck, MapPin, Receipt, Route } from "lucide-react";
import { Link } from "wouter";
import {
  useListCustomers,
  useListDrivers,
  useListTrucks,
  useListCities,
  useListExpenseTypes,
  useListTrips,
} from "@workspace/api-client-react";

export default function DashboardPage() {
  const customers = useListCustomers({});
  const drivers = useListDrivers({});
  const trucks = useListTrucks({});
  const cities = useListCities({});
  const expenseTypes = useListExpenseTypes({});
  const trips = useListTrips({});

  const openTrips = trips.data?.filter((t) => t.status === "Open").length ?? 0;

  const stats = [
    {
      label: "Open Trips",
      count: openTrips,
      icon: Route,
      color: "bg-indigo-50 text-indigo-600",
      href: "/trips",
    },
    {
      label: "Customers",
      count: customers.data?.length ?? 0,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      href: "/masters/customers",
    },
    {
      label: "Drivers",
      count: drivers.data?.length ?? 0,
      icon: UserCog,
      color: "bg-green-50 text-green-600",
      href: "/masters/drivers",
    },
    {
      label: "Trucks",
      count: trucks.data?.length ?? 0,
      icon: Truck,
      color: "bg-orange-50 text-orange-600",
      href: "/masters/trucks",
    },
    {
      label: "Cities",
      count: cities.data?.length ?? 0,
      icon: MapPin,
      color: "bg-purple-50 text-purple-600",
      href: "/masters/cities",
    },
    {
      label: "Expense Types",
      count: expenseTypes.data?.length ?? 0,
      icon: Receipt,
      color: "bg-red-50 text-red-600",
      href: "/masters/expense-types",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
