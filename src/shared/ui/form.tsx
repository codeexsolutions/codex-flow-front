import type { ReactNode, SelectHTMLAttributes } from "react";
import { Search, X } from "lucide-react";

export function SelectField({
  label,
  icon,
  options,
  placeholder = "Selecionar…",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  icon?: ReactNode;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-mist">{label}</label>}
      <div className="relative">
        <select {...props} className={`w-full cursor-pointer appearance-none rounded-lg border bg-fg/[0.05] py-2.5 pr-9 text-sm text-ink outline-none transition-colors focus:border-accent [&>option]:bg-surface ${icon ? "pl-9" : "pl-3"}`}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 z-10 flex -translate-y-1/2 text-faint">{icon}</span>}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-faint">▼</span>
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border bg-fg/[0.04] px-3.5 transition-colors focus-within:border-accent/60 ${className}`}>
      <Search size={15} className="flex-shrink-0 text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-faint" />
      {value && (
        <button onClick={() => onChange("")} className="flex text-faint transition-colors hover:text-accent-soft">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
