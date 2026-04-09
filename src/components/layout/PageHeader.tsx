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
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {desc && (
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        )}
      </div>
      {acts && <div className="flex items-center gap-2 mt-2 sm:mt-0">{acts}</div>}
    </div>
  );
}
