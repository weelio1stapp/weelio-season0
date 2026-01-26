import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieNames = allCookies.map(c => c.name);

  const hasSbCookies = cookieNames.some(name =>
    name.startsWith('sb-') && name.includes('-auth-token')
  );

  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    cookieNames,
    hasSbCookies,
    userId: user?.id || null,
    userEmail: user?.email || null,
    error: error?.message || null,
  });
}
