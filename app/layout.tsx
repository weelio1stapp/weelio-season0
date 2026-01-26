import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Container from "@/components/Container";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Weelio – Season 0",
  description: "Objevuj, sdílej a zanech stopu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          {/* Header */}
          <header className="bg-white shadow-[var(--shadow-sm)] sticky top-0 z-50">
            <Container>
              <div className="flex items-center justify-between h-16">
                <Link href="/" className="text-2xl font-bold text-[var(--accent-primary)]">
                  WEELIO
                </Link>
                <Nav />
              </div>
            </Container>
          </header>

          {/* Main Content */}
          <main className="flex-1 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-[var(--bg-dark)] text-[var(--text-inverse)] py-8 mt-12">
            <Container>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                  <p className="text-sm text-gray-400">Weelio – Season 0</p>
                </div>
                <nav className="flex gap-6">
                  <Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">
                    O projektu
                  </Link>
                  <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Kontakt
                  </Link>
                  <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Soukromí
                  </Link>
                </nav>
              </div>
            </Container>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
