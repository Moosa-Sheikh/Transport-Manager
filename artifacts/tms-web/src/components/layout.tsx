import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  Truck,
  MapPin,
  Receipt,
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Route,
  Plus,
  List,
  BookOpen,
  Wallet,
  Banknote,
  BarChart3,
  HandCoins,
  CircleDollarSign,
  UserRound,
  Building,
  MoveHorizontal,
  FileBarChart2,
  Package,
  Users2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const mastersLinks = [
  { href: "/masters/customers", label: "Customers", icon: Users },
  { href: "/masters/drivers", label: "Drivers", icon: UserCog },
  { href: "/masters/trucks", label: "Trucks", icon: Truck },
  { href: "/masters/cities", label: "Cities", icon: MapPin },
  { href: "/masters/expense-types", label: "Expense Types", icon: Receipt },
  { href: "/masters/items", label: "Items", icon: Package },
];

const tripsLinks = [
  { href: "/trips", label: "Trip List", icon: List },
  { href: "/trips/create", label: "Create Trip", icon: Plus },
  { href: "/trips?movement_type=customer_shifting", label: "Customer Shifts", icon: Users2 },
  { href: "/trips?movement_type=in_house_shifting", label: "In-House Shifts", icon: MoveHorizontal },
];

const financeLinks = [
  { href: "/cash-book", label: "Cash Book", icon: BookOpen },
  { href: "/payments/driver-salaries", label: "Driver Salaries", icon: Banknote },
];

const duesLinks = [
  { href: "/dues/customers", label: "Customer Dues", icon: HandCoins },
  { href: "/dues/drivers", label: "Driver Loans", icon: UserRound },
  { href: "/dues/others", label: "Other Loans", icon: CircleDollarSign },
  { href: "/dues/owner", label: "Owner Loans", icon: Building },
];

const reportsLinks = [
  { href: "/reports", label: "All Reports", icon: BarChart3 },
  { href: "/reports/trips", label: "Trip Report", icon: Route },
  { href: "/reports/drivers", label: "Driver Report", icon: UserCog },
  { href: "/reports/trucks", label: "Truck Report", icon: Truck },
  { href: "/reports/customers", label: "Customer Report", icon: Users },
  { href: "/reports/shifting", label: "Shifting Report", icon: FileBarChart2 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoggingOut } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mastersOpen, setMastersOpen] = useState(location.startsWith("/masters"));
  const [tripsOpen, setTripsOpen] = useState(location.startsWith("/trips"));
  const [financeOpen, setFinanceOpen] = useState(location.startsWith("/cash-book") || location.startsWith("/payments"));
  const [duesOpen, setDuesOpen] = useState(location.startsWith("/dues"));
  const [reportsOpen, setReportsOpen] = useState(location.startsWith("/reports"));

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = import.meta.env.BASE_URL;
    } catch {
      // ignore
    }
  };

  const isActive = (href: string) => location === href;

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">TMS</span>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive("/dashboard")
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>

          <div className="mt-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setMastersOpen(!mastersOpen)}
            >
              <Receipt className="w-5 h-5" />
              Masters
              {mastersOpen ? (
                <ChevronDown className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>

            {mastersOpen && (
              <div className="ml-4 mt-1 space-y-0.5">
                {mastersLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive(link.href)
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setTripsOpen(!tripsOpen)}
            >
              <Route className="w-5 h-5" />
              Trips
              {tripsOpen ? (
                <ChevronDown className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>

            {tripsOpen && (
              <div className="ml-4 mt-1 space-y-0.5">
                {tripsLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive(link.href)
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setFinanceOpen(!financeOpen)}
            >
              <Wallet className="w-5 h-5" />
              Finance
              {financeOpen ? (
                <ChevronDown className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>

            {financeOpen && (
              <div className="ml-4 mt-1 space-y-0.5">
                {financeLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive(link.href)
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setDuesOpen(!duesOpen)}
            >
              <HandCoins className="w-5 h-5" />
              Due Amounts
              {duesOpen ? (
                <ChevronDown className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>

            {duesOpen && (
              <div className="ml-4 mt-1 space-y-0.5">
                {duesLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive(link.href)
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setReportsOpen(!reportsOpen)}
            >
              <BarChart3 className="w-5 h-5" />
              Reports
              {reportsOpen ? (
                <ChevronDown className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>

            {reportsOpen && (
              <div className="ml-4 mt-1 space-y-0.5">
                {reportsLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive(link.href)
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">
              {user?.username}
            </span>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6">
          <button
            className="lg:hidden mr-3 text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            Transport Management System
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
