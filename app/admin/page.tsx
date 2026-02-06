import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { isAdmin } from "@/lib/auth/admin";
import Container from "@/components/Container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, Users, Flag, Activity } from "lucide-react";
import Link from "next/link";
import AdminUsersList from "@/components/admin/AdminUsersList";

export const dynamic = "force-dynamic";

/**
 * 403 Forbidden Component
 */
function ForbiddenPage() {
  return (
    <Container>
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <Shield className="w-6 h-6" />
              <CardTitle>Nemáš oprávnění</CardTitle>
            </div>
            <CardDescription>
              Tato stránka je dostupná pouze pro administrátory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Zpět na hlavní stránku</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to leaderboard if not authenticated
  if (!user) {
    redirect("/leaderboard");
  }

  // Check if user is admin
  if (!isAdmin(user.id)) {
    return <ForbiddenPage />;
  }

  // Fetch basic system stats
  const { count: placesCount } = await supabase
    .from("places")
    .select("*", { count: "exact", head: true });

  const { count: visitsCount } = await supabase
    .from("place_visits")
    .select("*", { count: "exact", head: true });

  const { count: usersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Správa uživatelů a moderace obsahu
        </p>
      </div>

      {/* System Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkem uživatelů
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkem míst
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{placesCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkem návštěv
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitsCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Users Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" />
          <h2 className="text-2xl font-bold">Uživatelé</h2>
        </div>
        <AdminUsersList />
      </div>

      <Separator className="my-8" />

      {/* Moderation Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Flag className="w-5 h-5" />
          <h2 className="text-2xl font-bold">Moderace</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Fronta moderace</CardTitle>
            <CardDescription>
              Správa reportovaného obsahu a nevhodných příspěvků
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/moderation">Otevřít frontu moderace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* System Status Placeholder */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5" />
          <h2 className="text-2xl font-bold">Stav systému</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Monitorování systému</CardTitle>
            <CardDescription>
              Sledování výkonu a zdraví aplikace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Database
                </span>
                <Badge variant="default" className="bg-green-600">
                  ✓ Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Storage
                </span>
                <Badge variant="default" className="bg-green-600">
                  ✓ Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Authentication
                </span>
                <Badge variant="default" className="bg-green-600">
                  ✓ Online
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
