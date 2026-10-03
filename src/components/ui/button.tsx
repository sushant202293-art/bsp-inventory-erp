import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-sm text-xs font-medium transition-colors duration-100 focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-danger text-white hover:bg-danger/90",
        outline:
          "border border-border bg-card text-foreground hover:bg-sidebar hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/85",
        ghost:
          "text-foreground hover:bg-sidebar hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-white hover:bg-success/90",
        warning:
          "bg-warning text-white hover:bg-warning/90",
      },
      size: {
        sm: "h-6 rounded-sm px-2 text-[11px] gap-0.5",
        default: "h-7 px-2.5",
        lg: "h-8 px-4 text-[13px]",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
