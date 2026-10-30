import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, options, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <select
          className={cn(
            "flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 pr-10 text-sm text-notari-dark focus:border-notari-primary focus:outline-none focus:ring-2 focus:ring-notari-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            className
          )}
          ref={ref}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4 text-slate-400" />
      </div>
    );
  }
);
Select.displayName = "Select";
