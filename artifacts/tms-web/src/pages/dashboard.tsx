import { Users, UserCog, Truck, MapPin, Receipt, Route, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Wallet, Banknote, Loader2, HandCoins, CircleDollarSign, UserRound, Building } from "lucide-react";
import { Link } from "wouter";
import {
  useListCustomers,
  useListDrivers,
  useListTrucks,
  useListCities,
  useListExpenseTypes,
  useGetDashboardSummary,
} from "@workspace/api-client-react";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function DashboardPage() {
  const customers = useListCustomers({});
  const drivers = useListDrivers({});
  const trucks = useListTrucks({});
  const cities = useListCities({});
  const expenseTypes = useListExpenseTypes({});
  const summaryQuery = useGetDashboardSummary();
  const summary = summaryQuery.data;

  const stats = [
    {
      label: "Open Trips",
      count: summary?.openTrips ?? 0,
      icon: Route,
      color: "bg-indigo-50 text-indigo-600",
      href: "/trips",
    },
    {
      label: "Total Trips",
      count: summary?.totalTrips ?? 0,
      icon: Route,
      color: "bg-gray-50 text-gray-600",
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
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>

      {summaryQuery.isLoading ? (
        <div className="p-8 text-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading financial data...
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Income</span>
            </div>
            <div className="text-xl font-bold text-blue-700">{formatPKR(summary.totalIncome)}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-orange-600">
                <TrendingDown className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Expenses</span>
            </div>
            <div className="text-xl font-bold text-orange-700">{formatPKR(summary.totalExpenses)}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Advances</span>
            </div>
            <div className="text-xl font-bold text-purple-700">{formatPKR(summary.totalAdvances)}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                <Banknote className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Salary Paid</span>
            </div>
            <div className="text-xl font-bold text-indigo-700">{formatPKR(summary.totalSalaryPaid)}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
                <ArrowDownCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Cash IN</span>
            </div>
            <div className="text-xl font-bold text-green-700">{formatPKR(summary.totalCashIn)}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Cash OUT</span>
            </div>
            <div className="text-xl font-bold text-red-700">{formatPKR(summary.totalCashOut)}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 sm:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                summary.currentCashBalance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              }`}>
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Current Cash Balance</span>
            </div>
            <div className={`text-2xl font-bold ${summary.currentCashBalance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatPKR(summary.currentCashBalance)}
            </div>
          </div>
        </div>
      ) : null}

      {summary && (
        <>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-8">Outstanding Dues & Loans</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dues/customers" className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-50 text-yellow-600">
                  <HandCoins className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-500">Customer Dues</span>
              </div>
              <div className="text-xl font-bold text-yellow-700">{formatPKR(summary.outstandingCustomerDues ?? 0)}</div>
            </Link>

            <Link href="/dues/driver-loans" className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-50 text-cyan-600">
                  <UserRound className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-500">Driver Loans</span>
              </div>
              <div className="text-xl font-bold text-cyan-700">{formatPKR(summary.outstandingDriverLoans ?? 0)}</div>
            </Link>

            <Link href="/dues/other-loans" className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pink-50 text-pink-600">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-500">Other Loans</span>
              </div>
              <div className="text-xl font-bold text-pink-700">{formatPKR(summary.outstandingOtherLoans ?? 0)}</div>
            </Link>

            <Link href="/dues/owner-loans" className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                  <Building className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-500">Owner Loans</span>
              </div>
              <div className="text-xl font-bold text-amber-700">{formatPKR(summary.outstandingOwnerLoans ?? 0)}</div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
