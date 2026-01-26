interface BadgeProps {
  children: string;
  variant?: "default" | "accent";
  className?: string;
}

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantStyles = {
    default: "bg-gray-100 text-gray-700",
    accent: "bg-[var(--accent-primary)] bg-opacity-10 text-[var(--accent-primary)]",
  };

  return (
    <span
      className={`
        inline-block px-3 py-1 rounded-full text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
