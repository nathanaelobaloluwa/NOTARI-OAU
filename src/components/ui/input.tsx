import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative flex items-center w-full">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
            {icon}
          </div>
          <input
            type={type}
            className={cn(
              "flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-notari-dark placeholder:text-slate-400 focus:border-notari-primary focus:outline-none focus:ring-2 focus:ring-notari-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-notari-dark placeholder:text-slate-400 focus:border-notari-primary focus:outline-none focus:ring-2 focus:ring-notari-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
