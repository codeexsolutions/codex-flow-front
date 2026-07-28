import React from "react";

type FieldProps = {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, icon, error, className, ...props }, ref) => {
    const message = error ?? hint ?? "";

    return (
      <div className="flex flex-col">
        <label className="block text-[10px] uppercase tracking-[0.7px] text-[#6b6790] mb-1">{label}</label>

        <div
          className={`flex min-w-0 items-center gap-2 rounded-lg border bg-white/[0.035] px-3 transition-all duration-200 ${
            error
              ? "border-[#f05050]/60 focus-within:border-[#f05050] focus-within:ring-2 focus-within:ring-[#f05050]/15"
              : "border-white/[0.08] hover:border-white/[0.14] focus-within:border-[#7c6ef5] focus-within:bg-white/[0.05] focus-within:ring-2 focus-within:ring-[#7c6ef5]/15"
          }`}
        >
          {icon && <span className="shrink-0 text-[#5e5a82]">{icon}</span>}

          <input
            ref={ref}
            {...props}
            className={`w-full flex-1 min-w-0 bg-transparent outline-none py-2.5 text-[13px] sm:text-sm text-[#e8e4ff] placeholder:text-[#6f6a93] ${
              className ?? ""
            }`}
          />
        </div>

        {}
        <p
          role={error ? "alert" : undefined}
          className={`mt-0.5 min-h-[13px] text-[10px] leading-[13px] ${error ? "text-[#f09595]" : "text-[#6b6790]"}`}
        >
          {message}
        </p>
      </div>
    );
  },
);

Field.displayName = "Field";

export default Field;
