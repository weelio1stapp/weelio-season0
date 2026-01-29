"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Card from "@/components/Card";
import { Profile } from "@/lib/db/profiles";
import { copy } from "@/lib/copy";

type ProfileEditFormProps = {
  profile: Profile | null;
  userEmail: string;
};

export default function ProfileEditForm({
  profile,
  userEmail,
}: ProfileEditFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(
    profile?.display_name || ""
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatar_url || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Nepodporovaný formát obrázku. Použijte JPG, PNG nebo WebP.");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Obrázek je příliš velký. Maximum je 5MB.");
      return;
    }

    setAvatarFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      // Add display name if changed
      if (displayName.trim() !== (profile?.display_name || "")) {
        formData.append("display_name", displayName.trim());
      }

      // Add avatar if selected
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      // Check if there are any changes
      if (!formData.has("display_name") && !formData.has("avatar")) {
        setError("Nebyly provedeny žádné změny.");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/profile/update", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nepodařilo se aktualizovat profil");
      }

      // Success - redirect to profile page
      toast.success(copy.common.saved);
      router.push("/me");
      router.refresh();
    } catch (err: any) {
      console.error("Profile update error:", err);
      const errorMessage = err.message || "Uložení profilu se nepovedlo";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="display_name">Zobrazované jméno</Label>
          <Input
            type="text"
            id="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Zadejte vaše jméno"
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground">
            Toto jméno se zobrazí v žebříčcích a na vašich místech
          </p>
        </div>

        {/* Avatar Upload */}
        <div className="space-y-2">
          <Label>Profilový obrázek</Label>
          <div className="flex items-center gap-6">
            {/* Avatar Preview */}
            <div className="flex-shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-4xl ring-4 ring-gray-200">
                  👤
                </div>
              )}
            </div>

            {/* File Input */}
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Vybrat obrázek
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG nebo WebP. Maximum 5MB.
              </p>
              {error && error.includes("obrázek") && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            value={userEmail}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email nelze změnit
          </p>
        </div>

        {/* Error Message (general errors, not avatar-specific) */}
        {error && !error.includes("obrázek") && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Ukládám..." : "Uložit změny"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/me")}
            disabled={isSubmitting}
          >
            Zrušit
          </Button>
        </div>
      </form>
    </Card>
  );
}
