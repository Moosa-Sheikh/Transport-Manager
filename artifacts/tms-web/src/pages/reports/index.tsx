import { BarChart3, Route, UserCog, Truck, ArrowDownUp, TrendingUp } from "lucide-react";
import { Link } from "wouter";

const reportCards = [
  { href: "/reports/trips", label: "Trip Report", description: "Income, expenses, profit per trip", icon: Route, color: "bg-blue-50 text-blue-600 border-blue-200" },
  { href: "/reports/drivers", label: "Driver Report", description: "Trips, income, advances, salary per driver", icon: UserCog, color: "bg-green-50 text-green-600 border-green-200" },
  { href: "/reports/trucks", label: "Truck Report", description: "Trips, income, expenses, profit per truck", icon: Truck, color: "bg-orange-50 text-orange-600 border-orange-200" },
  { href: "/reports/cashflow", label: "Cash Flow Report", description: "Daily cash in/out with running balance", icon: ArrowDownUp, color: "bg-purple-50 text-purple-600 border-purple-200" },
  { href: "/reports/profit", label: "Profit Report", description: "Overall profit summary for date range", icon: TrendingUp, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
];

export default function ReportsIndexPage() {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`border rounded-lg p-6 hover:shadow-md transition-shadow ${card.color}`}
          >
            <card.icon className="w-8 h-8 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">{card.label}</h3>
            <p className="text-sm text-gray-600 mt-1">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
