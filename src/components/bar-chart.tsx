/**
 * Single-series column chart: thin bars with a 4px rounded top on the baseline,
 * per-bar tooltip on hover/focus, optional dashed reference line (e.g. a goal),
 * and a table view. One series, so no legend: the card title names it.
 */
export function BarChart({
  data,
  ariaLabel,
  reference,
  valueHeader = "Valor",
}: {
  data: { label: string; value: number; display: string }[];
  ariaLabel: string;
  reference?: { value: number; label: string };
  valueHeader?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), reference?.value ?? 0, 1);
  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex h-40 items-end gap-2 border-b border-border" role="img" aria-label={ariaLabel}>
          {data.map((d) => (
            <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0}>
              <div
                className="w-full max-w-9 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                style={{ height: d.value ? `${Math.max(2, (d.value / max) * 100)}%` : "0" }}
              />
              <div className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap group-hover:block group-focus:block">
                {d.label}: <span className="font-medium tabular-nums">{d.display}</span>
              </div>
            </div>
          ))}
        </div>
        {reference && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/40" style={{ bottom: `${(reference.value / max) * 100}%` }}>
            <span className="absolute -top-5 right-0 rounded bg-card px-1 text-[11px] text-muted-foreground">{reference.label}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2 text-center text-xs text-muted-foreground">
        {data.map((d) => <div key={d.label} className="flex-1">{d.label}</div>)}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Ver como tabela</summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-xs text-dim"><th className="py-1 text-left font-medium">Período</th><th className="py-1 text-right font-medium">{valueHeader}</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-border last:border-0">
                <td className="py-1 text-muted-foreground">{d.label}</td>
                <td className="py-1 text-right tabular-nums">{d.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
