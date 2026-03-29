import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ShieldCheck, User, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PolishedInput } from "@/components/ui/polished-input";
import { PolishedButton } from "@/components/ui/polished-button";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, login, isLoggingIn, loginError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login({ data });
      setLocation("/dashboard");
    } catch (err) {
      // Error is handled by the hook and displayed via loginError
      console.error("Login failed:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
          <ShieldCheck className="h-12 w-12 text-primary" />
          <p className="font-medium text-lg">Connecting to secure server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Abstract Background" 
          className="w-full h-full object-cover opacity-60 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background/95 via-background/60 to-background/30 backdrop-blur-[2px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10 p-4"
      >
        <div className="glass-panel rounded-3xl p-8 sm:p-10 relative overflow-hidden group">
          {/* Subtle gradient light sweep effect on hover */}
          <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%] pointer-events-none" />

          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6 relative">
              <img 
                src={`${import.meta.env.BASE_URL}images/logo.png`} 
                alt="TMS Logo" 
                className="w-10 h-10 object-contain invert brightness-0 drop-shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Transport <span className="text-primary">Management System</span>
            </h1>
            <p className="text-muted-foreground mt-3 text-base">
              Sign in to access your management dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-5">
              <PolishedInput
                label="Username"
                placeholder="Enter your username"
                icon={<User className="h-5 w-5" />}
                error={errors.username?.message}
                {...register("username")}
              />
              
              <PolishedInput
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="h-5 w-5" />}
                error={errors.password?.message}
                {...register("password")}
              />
            </div>

            {/* Server Error Message */}
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }}
                className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive-foreground font-medium leading-relaxed">
                  {loginError}
                </p>
              </motion.div>
            )}

            <div className="pt-2">
              <PolishedButton 
                type="submit" 
                className="w-full text-lg h-14 rounded-xl"
                isLoading={isLoggingIn}
              >
                {isLoggingIn ? "Authenticating..." : "Sign In"}
              </PolishedButton>
            </div>
          </form>

          {/* Footer Notes */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground font-medium">
              Secure Platform Connection
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
