import { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, subtitle, actions, children }: PageHeaderProps) {
  const desc = description || subtitle;
  const acts = actions || children;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5 md:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl md:text-3xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {title}
        </h1>
        {desc && (
          <p className="text-[13px] md:text-sm text-muted-foreground mt-1 line-clamp-2">{desc}</p>
        )}
      </div>
      {acts && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-2 sm:shrink-0">
          {acts}
        </div>
      )}
    </div>
  );
}
