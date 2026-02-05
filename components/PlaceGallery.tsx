"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

type PlaceMedia = {
  id: string;
  place_id: string;
  author_user_id: string;
  media_type: string;
  storage_path: string;
  public_url: string | null;
  created_at: string;
  source?: "place_media" | "place_photos";
  user_id?: string;
  visit_id?: string;
};

type Props = {
  placeId: string;
  currentUserId: string | null;
  placeAuthorId: string;
  currentCoverPath: string | null;
};

const MAX_PHOTOS = 6;

export default function PlaceGallery({
  placeId,
  currentUserId,
  placeAuthorId,
  currentCoverPath,
}: Props) {
  const [photos, setPhotos] = useState<PlaceMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const supabase = getSupabaseBrowserClient();
  const isPlaceAuthor = currentUserId === placeAuthorId;

  // Fetch photos for this place
  useEffect(() => {
    fetchPhotos();
  }, [placeId]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, activeIndex, photos.length]);

  function openLightbox(index: number) {
    setActiveIndex(index);
    setIsLightboxOpen(true);
  }

  function closeLightbox() {
    setIsLightboxOpen(false);
  }

  function goToPrevious() {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }

  function goToNext() {
    setActiveIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }

  async function fetchPhotos() {
    try {
      setLoading(true);

      // Fetch from place_media (author uploads)
      const { data: placeMediaData, error: mediaError } = await supabase
        .from("place_media")
        .select("*")
        .eq("place_id", placeId)
        .eq("media_type", "photo")
        .order("created_at", { ascending: true });

      if (mediaError) throw mediaError;

      // Fetch from place_photos (visit uploads)
      const { data: placePhotosData, error: photosError } = await supabase
        .from("place_photos")
        .select("*")
        .eq("place_id", placeId)
        .order("created_at", { ascending: false });

      if (photosError) throw photosError;

      // Combine both sources
      const allPhotos = [
        ...(placeMediaData || []).map((p) => ({
          ...p,
          source: "place_media" as const,
        })),
        ...(placePhotosData || []).map((p) => ({
          ...p,
          source: "place_photos" as const,
          author_user_id: p.user_id,
          media_type: "photo",
        })),
      ];

      // Sort by created_at descending (newest first)
      allPhotos.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Get public URLs for each photo
      const photosWithUrls = await Promise.all(
        allPhotos.map(async (photo) => {
          const { data: urlData } = supabase.storage
            .from("place-media")
            .getPublicUrl(photo.storage_path);

          return {
            ...photo,
            public_url: urlData.publicUrl,
          };
        })
      );

      setPhotos(photosWithUrls);
    } catch (err: any) {
      console.error("Error fetching photos:", err);
      setError("Nepodařilo se načíst fotky");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetCover(photo: PlaceMedia) {
    if (!isPlaceAuthor) {
      setError("Pouze autor místa může nastavit titulku");
      return;
    }

    try {
      setError(null);

      // Get public URL for the photo
      const { data: urlData } = supabase.storage
        .from("place-media")
        .getPublicUrl(photo.storage_path);

      // Update place cover
      const { error: updateError } = await supabase
        .from("places")
        .update({
          cover_storage_path: photo.storage_path,
          cover_public_url: urlData.publicUrl,
        })
        .eq("id", placeId);

      if (updateError) throw updateError;

      // Refresh photos to update UI
      await fetchPhotos();
    } catch (err: any) {
      console.error("Set cover error:", err);
      setError("Nepodařilo se nastavit titulku");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Nahraj pouze obrázky (JPG, PNG, atd.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Obrázek je příliš velký (max 5 MB)");
      return;
    }

    // Check photo limit
    if (photos.length >= MAX_PHOTOS) {
      setError(`Maximální počet fotek je ${MAX_PHOTOS}`);
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `places/${placeId}/photos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("place-media")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Insert metadata into place_media table (include both path and storage_path for consistency)
      const { error: insertError } = await supabase.from("place_media").insert({
        place_id: placeId,
        author_user_id: currentUserId,
        media_type: "photo",
        path: storagePath, // Include path for DB consistency
        storage_path: storagePath,
      });

      if (insertError) {
        // If DB insert fails, try to clean up the uploaded file
        await supabase.storage.from("place-media").remove([storagePath]);
        throw insertError;
      }

      // Auto-set as cover if this is the first photo and place has no cover yet
      if (photos.length === 0 && !currentCoverPath && isPlaceAuthor) {
        const { data: urlData } = supabase.storage
          .from("place-media")
          .getPublicUrl(storagePath);

        await supabase
          .from("places")
          .update({
            cover_storage_path: storagePath,
            cover_public_url: urlData.publicUrl,
          })
          .eq("id", placeId);
      }

      // Refresh photos list
      await fetchPhotos();

      // Reset file input
      e.target.value = "";
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Nepodařilo se nahrát fotku");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo: PlaceMedia, photoIndex: number) {
    if (!currentUserId || photo.author_user_id !== currentUserId) {
      setError("Nemůžeš smazat cizí fotku");
      return;
    }

    if (!confirm("Opravdu chceš smazat tuto fotku?")) {
      return;
    }

    try {
      setError(null);

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from("place-media")
        .remove([photo.storage_path]);

      if (storageError) {
        console.warn("Storage delete warning:", storageError);
        // Continue even if storage delete fails
      }

      // Delete from database (from correct table)
      const tableName =
        photo.source === "place_photos" ? "place_photos" : "place_media";
      const { error: dbError } = await supabase
        .from(tableName)
        .delete()
        .eq("id", photo.id);

      if (dbError) throw dbError;

      // If lightbox is open and this was the active photo
      if (isLightboxOpen && activeIndex === photoIndex) {
        if (photos.length === 1) {
          // Last photo - close lightbox
          setIsLightboxOpen(false);
        } else if (activeIndex === photos.length - 1) {
          // Last photo in array - go to previous
          setActiveIndex(activeIndex - 1);
        }
        // Otherwise stay at same index (which will now show next photo)
      } else if (isLightboxOpen && activeIndex > photoIndex) {
        // Adjust active index if we deleted a photo before it
        setActiveIndex(activeIndex - 1);
      }

      // Refresh photos list
      await fetchPhotos();
    } catch (err: any) {
      console.error("Delete error:", err);
      setError("Nepodařilo se smazat fotku");
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-6">
        <h3 className="text-base font-semibold">Galerie</h3>
        <p className="mt-2 text-sm opacity-80">Načítám fotky...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Galerie</h3>
        {photos.length > 0 && (
          <span className="text-sm opacity-60">
            {photos.length} / {MAX_PHOTOS}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {photos.map((photo, index) => {
            const isCover = photo.storage_path === currentCoverPath;
            return (
              <div key={photo.id} className="relative group aspect-square">
                <img
                  src={photo.public_url || ""}
                  alt="Fotka místa"
                  className="w-full h-full object-cover rounded-lg cursor-pointer"
                  onClick={() => openLightbox(index)}
                />

                {/* Cover badge */}
                {isCover && (
                  <div className="absolute top-2 left-2 bg-[var(--accent-primary)] text-white text-xs px-2 py-1 rounded-full font-medium">
                    Titulka
                  </div>
                )}

                {/* Delete button - only for uploader */}
                {currentUserId && photo.author_user_id === currentUserId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo, index);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Smazat fotku"
                  >
                    ×
                  </button>
                )}

                {/* Set as cover button - only for place author and not already cover */}
                {isPlaceAuthor && !isCover && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetCover(photo);
                    }}
                    className="absolute bottom-2 left-2 right-2 bg-white/90 text-gray-800 text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white font-medium"
                    title="Nastavit jako titulku"
                  >
                    Nastavit jako titulku
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm opacity-80 mb-4">Zatím tu nejsou žádné fotky.</p>
      )}

      {/* Upload control - only for authenticated users */}
      {currentUserId && (
        <div>
          {photos.length >= MAX_PHOTOS ? (
            <p className="text-sm opacity-60">
              Dosažen maximální počet fotek ({MAX_PHOTOS})
            </p>
          ) : (
            <div>
              <label
                htmlFor="photo-upload"
                className={`inline-block px-4 py-2 text-sm border-2 border-gray-200 rounded-lg cursor-pointer transition-colors ${
                  uploading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-[var(--accent-primary)]"
                }`}
              >
                {uploading ? "Nahrávám..." : "📸 Přidat fotku"}
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      {!currentUserId && photos.length === 0 && (
        <p className="text-sm opacity-60">
          Přihlaš se, abys mohl přidat fotky.
        </p>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full h-full flex flex-col items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white text-3xl hover:opacity-70 transition-opacity z-10"
              title="Zavřít (ESC)"
            >
              ×
            </button>

            {/* Main image */}
            <div className="flex-1 flex items-center justify-center max-h-[70vh] w-full">
              <img
                src={photos[activeIndex]?.public_url || ""}
                alt="Fotka místa"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:opacity-70 transition-opacity bg-black/50 rounded-full w-12 h-12 flex items-center justify-center"
                  title="Předchozí (←)"
                >
                  ◀
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:opacity-70 transition-opacity bg-black/50 rounded-full w-12 h-12 flex items-center justify-center"
                  title="Další (→)"
                >
                  ▶
                </button>
              </>
            )}

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto max-w-full pb-2">
                {photos.slice(0, 6).map((photo, index) => (
                  <img
                    key={photo.id}
                    src={photo.public_url || ""}
                    alt={`Miniatura ${index + 1}`}
                    className={`w-16 h-16 object-cover rounded cursor-pointer transition-opacity ${
                      index === activeIndex
                        ? "ring-2 ring-white opacity-100"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
