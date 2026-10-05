import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className = "", ...rest }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[13px] font-medium text-stone-400"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`h-12 w-full rounded-xl border bg-ink-850 px-4 text-[15px] text-stone-100 placeholder:text-stone-600 outline-none transition-colors focus:border-brand-500 ${
          error ? "border-red-500" : "border-ink-600"
        }`}
        {...rest}
      />
      {error ? (
        <p className="mt-1.5 text-[13px] text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}
