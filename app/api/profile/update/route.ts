import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export const runtime = "nodejs"; // jistota kvůli práci se soubory

function jsonError(message: string, extra?: any, status = 400) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();

  // 1) Auth
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) return jsonError("auth.getUser failed", { userErr }, 401);

  const user = userData?.user;
  if (!user) return jsonError("Not authenticated", undefined, 401);

  // 2) Parse form-data
  let form: FormData;
  try {
    form = await req.formData();
  } catch (e: any) {
    return jsonError("Invalid form data", { details: String(e?.message ?? e) }, 400);
  }

  const displayNameRaw = form.get("display_name");
  const avatar = form.get("avatar"); // File | null

  const display_name =
    typeof displayNameRaw === "string" ? displayNameRaw.trim().slice(0, 50) : "";

  if (!display_name) {
    console.error("Profile update: display_name is required but was missing or empty", {
      userId: user.id,
      hasAvatar: avatar instanceof File,
    });
    return jsonError("display_name is required");
  }

  // 3) Optional upload avatar
  let avatar_url: string | null = null;

  if (avatar && avatar instanceof File && avatar.size > 0) {
    // basic checks
    const maxBytes = 5 * 1024 * 1024;
    if (avatar.size > maxBytes) {
      return jsonError("Avatar too large (max 5MB)", { size: avatar.size }, 413);
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(avatar.type)) {
      return jsonError("Unsupported avatar type", { type: avatar.type }, 415);
    }

    const ext =
      avatar.type === "image/png"
        ? "png"
        : avatar.type === "image/webp"
          ? "webp"
          : "jpg";

    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatar, {
      upsert: true,
      contentType: avatar.type,
      cacheControl: "3600",
    });

    if (upErr) {
      return jsonError(
        "Avatar upload failed",
        {
          storage: {
            message: upErr.message,
            name: (upErr as any).name,
            statusCode: (upErr as any).statusCode,
          },
          hint:
            "Zkontroluj: bucket 'avatars' existuje + je Public (nebo děláš signed URL) + Storage policies pro authenticated (INSERT/UPDATE).",
          path,
        },
        403
      );
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    avatar_url = pub?.publicUrl ?? null;

    if (!avatar_url) {
      return jsonError("Failed to get public URL", { path }, 500);
    }
  }

  // 4) Upsert profile
  // Tvoje tabulka profiles má sloupce: id (uuid PK), display_name, avatar_url...
  // Takže používáme id = user.id (NE user_id).
  const payload: any = {
    id: user.id,
    display_name,
  };
  if (avatar_url) payload.avatar_url = avatar_url;

  const { error: upsertErr } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (upsertErr) {
    return jsonError(
      "Profile upsert failed",
      {
        db: {
          code: (upsertErr as any).code,
          message: upsertErr.message,
          details: (upsertErr as any).details,
          hint: (upsertErr as any).hint,
        },
        payload,
      },
      403
    );
  }

  return NextResponse.json({ ok: true, display_name, avatar_url });
}