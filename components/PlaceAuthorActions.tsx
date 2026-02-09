"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

type Props = {
  placeId: string;
  placeName: string;
  isAuthor: boolean;
};

export default function PlaceAuthorActions({
  placeId,
  placeName,
  isAuthor,
}: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  if (!isAuthor) {
    return null;
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      setError(null);

      // Delete the place (RLS will enforce author_user_id check)
      const { error: deleteError } = await supabase
        .from("places")
        .delete()
        .eq("id", placeId);

      if (deleteError) throw deleteError;

      // Redirect to places list
      router.push("/places");
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Nepodařilo se smazat trasu");
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <Link
          href={`/p/${placeId}/edit`}
          className="px-4 py-2 text-sm border-2 border-gray-200 rounded-lg hover:border-[var(--accent-primary)] transition-colors"
        >
          ✏️ Upravit
        </Link>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-sm border-2 border-red-200 text-red-600 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors"
        >
          🗑️ Smazat
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Smazat trasu?</h3>
            <p className="text-sm opacity-80 mb-4">
              Opravdu chceš smazat trasu{" "}
              <span className="font-semibold">"{placeName}"</span>? Tato akce
              je nevratná.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                Zrušit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Mažu..." : "Smazat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
