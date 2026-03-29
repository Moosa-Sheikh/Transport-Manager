import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import AuthGuard from "@/components/auth-guard";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import CustomersPage from "@/pages/masters/customers";
import DriversPage from "@/pages/masters/drivers";
import TrucksPage from "@/pages/masters/trucks";
import CitiesPage from "@/pages/masters/cities";
import ExpenseTypesPage from "@/pages/masters/expense-types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AuthGuard>
      <Component />
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/masters/customers">
        <ProtectedRoute component={CustomersPage} />
      </Route>
      <Route path="/masters/drivers">
        <ProtectedRoute component={DriversPage} />
      </Route>
      <Route path="/masters/trucks">
        <ProtectedRoute component={TrucksPage} />
      </Route>
      <Route path="/masters/cities">
        <ProtectedRoute component={CitiesPage} />
      </Route>
      <Route path="/masters/expense-types">
        <ProtectedRoute component={ExpenseTypesPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
