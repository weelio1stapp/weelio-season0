import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getProfileById } from "@/lib/db/profiles";
import ProfileEditForm from "@/components/profile/ProfileEditForm";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  // Check authentication
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/leaderboard");
  }

  // Fetch profile
  const profile = await getProfileById(user.id);

  return (
    <Container>
      <div className="mb-6">
        <Link
          href="/me"
          className="text-sm text-[var(--accent-primary)] hover:underline"
        >
          ← Zpět na profil
        </Link>
      </div>

      <PageHeader
        title="Upravit profil"
        description="Změňte své zobrazované jméno a profilový obrázek"
      />

      <div className="max-w-2xl mx-auto">
        <ProfileEditForm profile={profile} userEmail={user.email || ""} />
      </div>
    </Container>
  );
}
