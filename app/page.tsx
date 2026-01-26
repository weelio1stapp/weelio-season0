import Container from "@/components/Container";
import Button from "@/components/Button";
import Card from "@/components/Card";
import LoginBanner from "@/components/LoginBanner";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <Container>
      {/* Login Banner */}
      <Suspense fallback={null}>
        <LoginBanner />
      </Suspense>

      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-[var(--text-primary)]">
          Objevuj. Sdílej. Zanech stopu.
        </h1>
        <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
          Weelio je platforma pro objevování a sdílení unikátních míst v České republice.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/places">
            <Button variant="primary">Prozkoumat místa</Button>
          </Link>
          <Link href="/create-place">
            <Button variant="outline">Přidat místo</Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <Card>
          <h3 className="text-xl font-semibold mb-2 text-[var(--accent-primary)]">
            Objevuj
          </h3>
          <p className="text-[var(--text-secondary)]">
            Najdi skrytá místa, která ještě neznáš. Od skal po jezera, od jeskyní po vyhlídky.
          </p>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold mb-2 text-[var(--accent-primary)]">
            Sdílej
          </h3>
          <p className="text-[var(--text-secondary)]">
            Podeľ se o své zážitky, fotky a tipy s ostatními dobrodruhy.
          </p>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold mb-2 text-[var(--accent-primary)]">
            Zanech stopu
          </h3>
          <p className="text-[var(--text-secondary)]">
            Sbírej body, získávej odznaky a staň se legendárním průzkumníkem.
          </p>
        </Card>
      </div>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--color-earth)] text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Připraven na dobrodružství?</h2>
        <p className="mb-6 text-white text-opacity-90">
          Začni objevovat úžasná místa v České republice ještě dnes.
        </p>
        <Link href="/places">
          <Button variant="secondary">Začít objevovat</Button>
        </Link>
      </Card>
    </Container>
  );
}
