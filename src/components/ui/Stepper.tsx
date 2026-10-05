export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5 last:flex-none">
            <div className="flex flex-col gap-1.5">
              <div
                className={`h-1.5 w-10 rounded-full transition-colors sm:w-14 ${
                  done || active ? "bg-brand-500" : "bg-ink-700"
                }`}
              />
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${
                  active ? "text-brand-300" : done ? "text-stone-400" : "text-stone-600"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className="hidden" />}
          </li>
        );
      })}
    </ol>
  );
}
