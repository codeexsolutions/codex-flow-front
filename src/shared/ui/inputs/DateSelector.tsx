import { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";

interface DateSelectorProps {
  dates: string[];
  value: string;
  onSelect: (date: string) => void;
}

import { formatDate } from "@/shared/utils/date";

const DateSelector = ({ dates, value, onSelect }: DateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const ref = useRef<HTMLDivElement>(null);

  // fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % dates.length);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? dates.length - 1 : prev - 1));
    }

    if (e.key === "Enter" && selectedIndex >= 0) {
      onSelect(dates[selectedIndex]);
      setOpen(false);
      setSelectedIndex(-1);
    }

    if (e.key === "Escape") {
      setOpen(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div ref={ref} tabIndex={0} onKeyDown={handleKeyDown} className="relative">
      {/* INPUT STYLE */}
      <div onClick={() => setOpen((prev) => !prev)} className="glass-subtle flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 transition-all hover:border-fg/[0.16] focus-within:border-accent/50">
        <Calendar className="h-4 w-4 text-faint" />

        <span className="text-sm text-ink">{value ? formatDate(value) : "Selecionar data"}</span>
      </div>

      {/* DROPDOWN */}
      {open && (
        <ul className="glass-strong elev-3 absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl animate-scale-in">
          {dates.map((d, index) => (
            <li
              key={d}
              onClick={() => {
                onSelect(d);
                setOpen(false);
                setSelectedIndex(-1);
              }}
              className={`flex cursor-pointer items-center justify-between px-4 py-3 transition-colors ${index === selectedIndex ? "bg-accent/15 text-accent-soft" : "text-mist hover:bg-fg/[0.05] hover:text-ink"}`}
            >
              <span className="text-sm">{formatDate(d)}</span>

              {index === selectedIndex && <span className="text-xs text-accent">Enter ↵</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DateSelector;
