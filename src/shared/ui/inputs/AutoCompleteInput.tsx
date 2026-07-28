import React, { useState } from "react";

interface AutoCompleteInputProps<T> {
  items: T[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
  placeholder?: string;
  displayKey: keyof T;
  onFocus?: () => void;
}

function AutoCompleteInput<T extends { id: number | string }>({ items, value, onChange, onSelect, placeholder, displayKey, onFocus }: AutoCompleteInputProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
    }

    if (e.key === "Enter" && selectedIndex >= 0) {
      onSelect(items[selectedIndex]);
      setSelectedIndex(-1);
    }

    if (e.key === "Escape") {
      setSelectedIndex(-1);
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="glass-subtle flex items-center gap-2 rounded-xl px-4 py-2 transition-all focus-within:border-accent/50">
        <svg className="h-5 w-5 text-faint" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 21l-4.3-4.3M10 18a8 8 0 100-16 8 8 0 000 16z" />
        </svg>

        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Buscar produtos..."}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
        />
      </div>

      {value && items.length > 0 && (
        <ul className="glass-strong elev-3 absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl animate-scale-in">
          {items.map((item, index) => (
            <li
              key={String(item.id)}
              onClick={() => {
                onSelect(item);
                setSelectedIndex(-1);
              }}
              className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${index === selectedIndex ? "bg-accent/15 text-accent-soft" : "text-mist hover:bg-fg/[0.05] hover:text-ink"}`}
            >
              <span className="text-sm">{String(item[displayKey])}</span>

              {index === selectedIndex && <span className="text-xs text-accent">Enter ↵</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AutoCompleteInput;
