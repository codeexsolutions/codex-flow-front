import { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";

interface DateSelectorProps {
  dates: string[];
  value: string;
  onSelect: (date: string) => void;
}

const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");

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
      <div
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2 cursor-pointer transition hover:border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500"
      >
        <Calendar className="w-4 h-4 text-slate-400" />

        <span className="text-sm text-slate-700">{value ? formatDate(value) : "Selecionar data"}</span>
      </div>

      {/* DROPDOWN */}
      {open && (
        <ul className="absolute mt-2 w-full bg-white border border-slate-200 rounded shadow-lg max-h-72 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
          {dates.map((d, index) => (
            <li
              key={d}
              onClick={() => {
                onSelect(d);
                setOpen(false);
                setSelectedIndex(-1);
              }}
              className={`px-4 py-3 cursor-pointer flex items-center justify-between transition ${
                index === selectedIndex ? "bg-indigo-50 text-indigo-600" : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span className="text-sm ">{formatDate(d)}</span>

              {index === selectedIndex && <span className="text-xs text-indigo-500">Enter ↵</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DateSelector;
