"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { Profile } from "@/lib/db/profiles";

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
      router.push("/me");
      router.refresh();
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(err.message || "Došlo k neočekávané chybě");
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Display Name */}
        <div>
          <label
            htmlFor="display_name"
            className="block text-sm font-medium text-[var(--text-primary)] mb-2"
          >
            Zobrazované jméno
          </label>
          <input
            type="text"
            id="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Zadejte vaše jméno"
            maxLength={50}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Toto jméno se zobrazí v žebříčcích a na vašich místech
          </p>
        </div>

        {/* Avatar Upload */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Profilový obrázek
          </label>

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
            <div className="flex-1">
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
                className="mb-2"
              >
                Vybrat obrázek
              </Button>
              <p className="text-xs text-[var(--text-secondary)]">
                JPG, PNG nebo WebP. Maximum 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Email
          </label>
          <input
            type="email"
            value={userEmail}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-[var(--text-secondary)] cursor-not-allowed"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Email nelze změnit
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            variant="primary"
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
