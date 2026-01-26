import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
        {title}
      </h1>
      {description && (
        <p className="text-lg text-[var(--text-secondary)] mb-4">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
