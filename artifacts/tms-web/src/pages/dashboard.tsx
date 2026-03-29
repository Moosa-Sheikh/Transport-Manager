import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { LayoutDashboard, LogOut, Package, Truck, Users, Activity, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PolishedButton } from "@/components/ui/polished-button";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isError, logout, isLoggingOut } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      setLocation("/");
    }
  }, [user, isLoading, isError, setLocation]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <img 
                src={`${import.meta.env.BASE_URL}images/logo.png`} 
                alt="Logo" 
                className="w-7 h-7 object-contain invert brightness-0"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">
                Transport Management System
              </h1>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Phase 1 Core
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-full border border-secondary">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-secondary-foreground">
                Logged in as: <span className="font-bold">{user.username}</span>
              </span>
            </div>
            
            <PolishedButton 
              variant="ghost" 
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive px-4 py-2 h-10 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </PolishedButton>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight">
            Welcome to Transport Management System
          </h2>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            You have successfully authenticated. This dashboard will serve as the central command center for all logistics and fleet operations.
          </p>
        </motion.div>

        {/* Placeholder Widget Cards to make dashboard look premium and realistic */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { label: "Active Trips", icon: Truck, value: "—", desc: "Module pending" },
            { label: "Fleet Status", icon: Activity, value: "—", desc: "Module pending" },
            { label: "Total Drivers", icon: Users, value: "—", desc: "Module pending" },
            { label: "Pending Shipments", icon: Package, value: "—", desc: "Module pending" },
          ].map((stat, i) => (
            <div 
              key={i} 
              className="glass-panel p-6 rounded-2xl hover:shadow-xl hover:border-primary/20 transition-all duration-300 group cursor-default"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-secondary rounded-xl group-hover:bg-primary/10 transition-colors">
                  <stat.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div>
                <h3 className="text-muted-foreground font-medium text-sm mb-1">{stat.label}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-2 font-medium">{stat.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
        
        {/* Large empty state graphic area for future content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 glass-panel rounded-3xl p-12 flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 text-center"
        >
          <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
            <LayoutDashboard className="h-10 w-10 text-primary/40" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Workspace Ready</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            The authentication and session layer is fully operational. Additional TMS modules will appear here as they are developed.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
