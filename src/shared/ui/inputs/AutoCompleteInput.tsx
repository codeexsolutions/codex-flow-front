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

function AutoCompleteInput<T extends { id: number | string }>({
  items,
  value,
  onChange,
  onSelect,
  placeholder,
  displayKey,
  onFocus,
}: AutoCompleteInputProps<T>) {
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
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
          className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
        />
      </div>

      {value && items.length > 0 && (
        <ul className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
          {items.map((item, index) => (
            <li
              key={String(item.id)}
              onClick={() => {
                onSelect(item);
                setSelectedIndex(-1);
              }}
              className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                index === selectedIndex ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span className="text-sm font-medium">{String(item[displayKey])}</span>

              {index === selectedIndex && <span className="text-xs text-blue-500">Enter ↵</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AutoCompleteInput;
