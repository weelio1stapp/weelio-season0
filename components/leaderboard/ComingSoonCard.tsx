interface ComingSoonCardProps {
  title: string;
  description: string;
  icon?: string;
}

export default function ComingSoonCard({
  title,
  description,
  icon,
}: ComingSoonCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-[var(--shadow-md)] overflow-hidden opacity-60">
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

        <div className="py-8 text-center">
          <div className="inline-block px-4 py-2 bg-gray-100 rounded-full">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              🚧 Připravujeme
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
