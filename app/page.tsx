import Container from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import Link from "next/link";
import { MapPin, Compass, Trophy } from "lucide-react";

export default async function Home() {
  // Check if user is logged in
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Container>
      {/* Hero Section - Login Aware */}
      <div className="text-center mb-16 py-12">
        {user ? (
          <>
            {/* Logged In Hero */}
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Kam vyrazíš dnes?
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Objevuj nová místa, sbírej XP a sdílej své zážitky s komunitou
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg">
                <Link href="/places">
                  <Compass className="w-5 h-5 mr-2" />
                  Prozkoumat místa
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/create-place">
                  <MapPin className="w-5 h-5 mr-2" />
                  Přidat místo
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Logged Out Hero */}
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Objevuj. Sdílej. Zanech stopu.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Weelio je platforma pro objevování a sdílení unikátních míst v České republice
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg">
                <Link href="/places">
                  <Compass className="w-5 h-5 mr-2" />
                  Prozkoumat místa
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/?login=1">
                  Přidat se
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <Card className="border-2">
          <CardContent className="pt-6 pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Compass className="w-7 h-7 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-center">
              Objevuj
            </h3>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Najdi skrytá místa, která ještě neznáš. Od skal po jezera, od jeskyní po vyhlídky.
            </p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6 pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-center">
              Sdílej
            </h3>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Podeľ se o své zážitky, fotky a tipy s ostatními dobrodruhy.
            </p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6 pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-center">
              Zanech stopu
            </h3>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Sbírej XP, získávaj odznaky a staň se legendárním průzkumníkem.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <Card className="border-2 bg-accent/50">
        <CardContent className="text-center py-16 px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Připraven vyrazit?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
            Začni objevovat Česko jinak.
          </p>
          <Button asChild size="lg">
            <Link href="/places">Začít objevovat</Link>
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
