import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { upsertProfile } from "@/lib/db/profiles";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Musíte být přihlášeni" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const displayName = formData.get("display_name") as string | null;
    const avatarFile = formData.get("avatar") as File | null;

    // Prepare updates object
    const updates: { display_name?: string; avatar_url?: string } = {};

    // Handle display name
    if (displayName !== null && displayName.trim() !== "") {
      updates.display_name = displayName.trim();
    }

    // Handle avatar upload
    if (avatarFile && avatarFile.size > 0) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(avatarFile.type)) {
        return NextResponse.json(
          { error: "Nepodporovaný formát obrázku. Použijte JPG, PNG nebo WebP." },
          { status: 400 }
        );
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (avatarFile.size > maxSize) {
        return NextResponse.json(
          { error: "Obrázek je příliš velký. Maximum je 5MB." },
          { status: 400 }
        );
      }

      // Get file extension
      const fileExt = avatarFile.name.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const filePath = `${user.id}/${timestamp}.${fileExt}`;

      // Convert File to ArrayBuffer
      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, buffer, {
          contentType: avatarFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        return NextResponse.json(
          { error: `Chyba při nahrávání avatara: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      updates.avatar_url = publicUrl;
    }

    // Update profile
    const updatedProfile = await upsertProfile(user.id, updates);

    if (!updatedProfile) {
      return NextResponse.json(
        { error: "Nepodařilo se aktualizovat profil" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Došlo k neočekávané chybě" },
      { status: 500 }
    );
  }
}
