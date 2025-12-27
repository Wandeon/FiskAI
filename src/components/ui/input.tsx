import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md border px-3 py-2 text-body-base",
          "bg-surface text-foreground placeholder:text-muted",
          "transition-colors file:border-0 file:bg-transparent file:text-body-sm file:font-medium",
          // Focus styles
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Default border
          !error && "border-border",
          // Error state
          error && "border-danger focus-visible:ring-danger",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
