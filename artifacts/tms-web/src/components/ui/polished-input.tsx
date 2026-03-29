import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const PolishedInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        <label className="block text-sm font-semibold text-foreground/80 ml-1">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full rounded-xl border-2 border-border/80 bg-background/50 px-4 py-3.5 text-base transition-all duration-200",
              "placeholder:text-muted-foreground/60",
              "focus:bg-white focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10",
              "hover:border-border hover:bg-background/80",
              icon && "pl-11",
              error && "border-destructive/50 focus:border-destructive focus:ring-destructive/10 bg-destructive/5",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive font-medium ml-1 animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);
PolishedInput.displayName = "PolishedInput";
