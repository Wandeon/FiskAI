import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base styles
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-body-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-interactive text-inverse",
        secondary:
          "bg-surface-1 text-secondary border border-border",
        success:
          "bg-success-bg text-success-text border border-success-border",
        warning:
          "bg-warning-bg text-warning-text border border-warning-border",
        danger:
          "bg-danger-bg text-danger-text border border-danger-border",
        // Backward compatibility alias for danger
        destructive:
          "bg-danger-bg text-danger-text border border-danger-border",
        info:
          "bg-info-bg text-info-text border border-info-border",
        outline:
          "border border-border text-foreground bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
