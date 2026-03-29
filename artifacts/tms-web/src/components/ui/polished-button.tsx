import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
}

export const PolishedButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, isLoading, variant = "primary", disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
      destructive: "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:shadow-xl hover:-translate-y-0.5"
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 text-base font-semibold transition-all duration-200 ease-out",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        <span className={cn("inline-flex items-center gap-2", isLoading && "opacity-80")}>
          {children}
        </span>
      </button>
    );
  }
);
PolishedButton.displayName = "PolishedButton";
