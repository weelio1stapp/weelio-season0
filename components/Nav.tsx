import Link from "next/link";
import AuthStatus from "./AuthStatus";
import ThemeToggle from "./theme/ThemeToggle";

export default function Nav() {
  const navItems = [
    { href: "/", label: "Domů" },
    { href: "/places", label: "Místa" },
    { href: "/leaderboard", label: "Žebříček" },
    { href: "/create-place", label: "Přidat místo" },
  ];

  return (
    <nav className="flex gap-6 items-center">
      <div className="flex gap-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-medium hover:text-[var(--accent-primary)] transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <AuthStatus />
      </div>
    </nav>
  );
}
