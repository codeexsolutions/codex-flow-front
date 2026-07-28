import { useRef } from "react";

function formatCurrencyFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

const CurrencyInput = ({
  value,
  onChange,
}: {
  value: number; // valor em centavos, ex: 1234 = R$ 12,34
  onChange: (val: number) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ""); // só números
    const cents = parseInt(raw || "0");
    onChange(cents); // atualiza em centavos
  };

  const handleFocus = () => {
    // força o cursor no fim
    const el = inputRef.current;
    if (el) {
      setTimeout(() => {
        el.setSelectionRange(el.value.length, el.value.length);
      }, 0);
    }
  };

  return (
    <input
      type="text"
      ref={inputRef}
      value={formatCurrencyFromCents(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      className="py-1 px-2 w-24 h-10 bg-transparent border-b"
      inputMode="numeric"
    />
  );
};

export default CurrencyInput;
