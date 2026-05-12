import { Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Pick a theme. Your selection is saved on this device.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {themes.map((t) => {
          const active = t.key === theme;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTheme(t.key)}
              className={cn(
                "group relative text-left rounded-xl border p-4 transition-all hover:shadow-md",
                active
                  ? "border-primary ring-2 ring-primary/40 bg-accent/40"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">{t.label}</span>
                {active && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 mb-2">
                {t.swatch.map((c, i) => (
                  <div
                    key={i}
                    className="h-8 flex-1 rounded-md border border-border/50"
                    style={{ background: `hsl(${c})` }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}