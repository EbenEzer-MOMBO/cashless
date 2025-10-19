import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="mobile-title font-bold">{title}</h1>
        <p className="text-muted-foreground mobile-text mt-1">{description}</p>
      </div>
      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}