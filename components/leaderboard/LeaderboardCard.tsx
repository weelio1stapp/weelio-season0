import { ReactNode } from "react";
import Link from "next/link";

interface LeaderboardCardProps {
  title: string;
  description: string;
  href: string;
  icon?: string;
  children?: ReactNode;
}

export default function LeaderboardCard({
  title,
  description,
  href,
  icon,
  children,
}: LeaderboardCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-[var(--shadow-md)] overflow-hidden hover:shadow-[var(--shadow-lg)] transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              {icon && <span className="text-2xl">{icon}</span>}
              {title}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {description}
            </p>
          </div>
        </div>

        {children}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            href={href}
            className="text-sm font-semibold text-[var(--accent-primary)] hover:underline"
          >
            Zobrazit vše →
          </Link>
        </div>
      </div>
    </div>
  );
}
