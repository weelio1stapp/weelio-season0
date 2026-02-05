import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CreateActivityForm from "./CreateActivityForm";

export default async function NewActivityPage() {
  // Check if user is authenticated
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect("/?login=1");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Vytvořit novou aktivitu</CardTitle>
          <CardDescription>
            Vytvoř pravidelnou aktivitu (běžecký klub, týdenní běh, atd.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateActivityForm />
        </CardContent>
      </Card>
    </main>
  );
}
