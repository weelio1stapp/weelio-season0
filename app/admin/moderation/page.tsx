import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { isAdmin } from "@/lib/auth/admin";
import Container from "@/components/Container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Flag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ModerationQueueList from "@/components/admin/ModerationQueueList";

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

/**
 * Admin Moderation Page
 */
export default async function AdminModerationPage() {
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

  // Fetch all reports using RPC
  const { data: reports, error } = await supabase.rpc("get_moderation_reports", {
    p_status_filter: "all",
  });

  if (error) {
    console.error("Error fetching moderation reports:", error);
  }

  type ModerationReport = {
    id: string;
    reporter_user_id: string;
    reporter_display_name: string | null;
    target_type: string;
    target_id: string;
    reason: string;
    status: string;
    created_at: string;
    resolved_by: string | null;
    resolved_at: string | null;
    action_taken: string | null;
  };

  const allReports = (reports || []) as ModerationReport[];
  const openReports = allReports.filter((r) => r.status === "open");
  const resolvedReports = allReports.filter((r) => r.status === "resolved" || r.status === "dismissed");

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Flag className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Moderace</h1>
        </div>
        <p className="text-muted-foreground">
          Správa nahlášeného obsahu
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Otevřené reporty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openReports.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vyřešené reporty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedReports.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Queue */}
      <ModerationQueueList
        openReports={openReports}
        resolvedReports={resolvedReports}
      />
    </Container>
  );
}
