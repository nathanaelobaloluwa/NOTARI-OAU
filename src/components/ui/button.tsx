import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-notari-primary text-white hover:bg-notari-primary-hover shadow-sm active:scale-[0.98]",
        secondary:
          "bg-notari-secondary text-white hover:bg-notari-secondary-hover shadow-sm active:scale-[0.98]",
        outline:
          "border border-slate-200 bg-white hover:bg-slate-50 text-notari-dark hover:text-notari-primary",
        ghost:
          "hover:bg-slate-100 text-slate-700 hover:text-notari-dark",
        link: "text-notari-primary underline-offset-4 hover:underline",
        destructive:
          "bg-notari-error text-white hover:bg-red-600 shadow-sm active:scale-[0.98]",
        subtle:
          "bg-indigo-50 text-notari-primary hover:bg-indigo-100 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base font-semibold",
        icon: "h-10 w-10 p-0",
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

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
