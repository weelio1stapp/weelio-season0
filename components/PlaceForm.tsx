"use client";

import { useActionState, useState } from "react";
import Button from "@/components/Button";
import type { PlaceRow } from "@/lib/db/places";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { updatePlaceAudioMetadata } from "@/app/p/[id]/edit/actions";
import { PLACE_TYPES, PLACE_TYPE_LABELS } from "@/lib/constants/placeTypes";

// Helper to remove emoji prefix from labels (for dropdown display)
const stripEmojiPrefix = (label: string) => label.replace(/^[^\p{L}\p{N}]+\s+/u, "");

// Generate select options from centralized constants (without emoji)
const PLACE_TYPE_OPTIONS = PLACE_TYPES.map((value) => ({
  value,
  label: stripEmojiPrefix(PLACE_TYPE_LABELS[value]),
}));

type ActionResult = {
  success: boolean;
  errors?: Record<string, string>;
  message?: string;
};

type Props = {
  initialData?: PlaceRow;
  action: (
    prevState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  submitLabel: string;
};

const initialState: ActionResult = { success: false };

export default function PlaceForm({
  initialData,
  action,
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Audio upload state (only used in edit mode)
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const errors = state?.errors || {};
  const generalError = state?.message;

  // Helper to format coordinates for display
  const formatCoords = (lat?: number, lng?: number) => {
    if (lat === undefined || lng === undefined) return "";
    return `${lat}, ${lng}`;
  };

  // Handler for audio file upload
  const handleAudioUpload = async () => {
    if (!selectedAudioFile || !initialData?.id) return;

    setIsUploadingAudio(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // 1. Extract audio duration
      const duration = await getAudioDuration(selectedAudioFile);

      // 2. Upload to Supabase Storage
      const supabase = getSupabaseBrowserClient();
      const fileExt = selectedAudioFile.name.split(".").pop() || "mp3";
      const filePath = `${initialData.id}/route-audio.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("route-audio")
        .upload(filePath, selectedAudioFile, {
          cacheControl: "3600",
          upsert: true, // Overwrite if exists
        });

      if (uploadError) {
        throw new Error(`Chyba při nahrávání: ${uploadError.message}`);
      }

      // 3. Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("route-audio").getPublicUrl(filePath);

      // 4. Update place metadata via server action
      const result = await updatePlaceAudioMetadata(initialData.id, {
        audio_storage_path: filePath,
        audio_public_url: publicUrl,
        audio_duration_sec: Math.round(duration),
      });

      if (!result.success) {
        throw new Error(result.error || "Chyba při ukládání metadat");
      }

      setUploadSuccess(true);
      setSelectedAudioFile(null);

      // Reload page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Audio upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Neočekávaná chyba"
      );
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Helper to extract audio duration
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = document.createElement("audio");
      const objectUrl = URL.createObjectURL(file);

      audio.addEventListener("loadedmetadata", () => {
        URL.revokeObjectURL(objectUrl);
        resolve(audio.duration);
      });

      audio.addEventListener("error", () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Nepodařilo se načíst audio soubor"));
      });

      audio.src = objectUrl;
    });
  };

  return (
    <form action={formAction} className="space-y-8">
      {/* General error message */}
      {generalError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {generalError}
        </div>
      )}

      {/* SEKCE: DESTINACE */}
      <div className="space-y-6">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Destinace
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Cílové místo, kam trasa vede
          </p>
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Destinace *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={isPending}
            defaultValue={initialData?.name}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="např. Sněžka, Pustevny"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Cílové místo, kam trasa vede (např. Pramen Labe).
          </p>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

      {/* Type */}
      <div>
        <label
          htmlFor="type"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Typ destinace *
        </label>
        <select
          id="type"
          name="type"
          required
          disabled={isPending}
          defaultValue={initialData?.type || "other"}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {PLACE_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type}</p>
        )}
      </div>

      {/* Area */}
      <div>
        <label
          htmlFor="area"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Oblast / Region *
        </label>
        <input
          type="text"
          id="area"
          name="area"
          required
          disabled={isPending}
          defaultValue={initialData?.area}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="např. Krkonoše, Morava"
        />
        {errors.area && (
          <p className="mt-1 text-sm text-red-600">{errors.area}</p>
        )}
      </div>

      {/* Why */}
      <div>
        <label
          htmlFor="why"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Proč jít touto trasou? *
        </label>
        <textarea
          id="why"
          name="why"
          required
          disabled={isPending}
          rows={4}
          defaultValue={initialData?.why}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Popiš, proč se vyplatí jít touto trasou..."
        />
        {errors.why && (
          <p className="mt-1 text-sm text-red-600">{errors.why}</p>
        )}
      </div>

      {/* Time & Difficulty - side by side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time */}
        <div>
          <label
            htmlFor="time_min"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Čas (minuty) *
          </label>
          <input
            type="number"
            id="time_min"
            name="time_min"
            required
            min="1"
            disabled={isPending}
            defaultValue={initialData?.time_min}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="např. 60"
          />
          {errors.time_min && (
            <p className="mt-1 text-sm text-red-600">{errors.time_min}</p>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <label
            htmlFor="difficulty"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Náročnost (1-5) *
          </label>
          <input
            type="number"
            id="difficulty"
            name="difficulty"
            required
            min="1"
            max="5"
            disabled={isPending}
            defaultValue={initialData?.difficulty}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="1-5"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            1 = pohodička, 5 = budeš si pamatovat nohy
          </p>
          {errors.difficulty && (
            <p className="mt-1 text-sm text-red-600">{errors.difficulty}</p>
          )}
        </div>
      </div>

      {/* Sport Type & Surface Type - side by side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sport Type */}
        <div>
          <label
            htmlFor="sport_type"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Sportovní režim
          </label>
          <select
            id="sport_type"
            name="sport_type"
            disabled={isPending}
            defaultValue={initialData?.sport_type || ""}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Nesportovní / obecná trasa</option>
            <option value="run">🏃 Běh</option>
            <option value="run_inline">🛼 Běh + Inline</option>
          </select>
          {errors.sport_type && (
            <p className="mt-1 text-sm text-red-600">{errors.sport_type}</p>
          )}
        </div>

        {/* Surface Type */}
        <div>
          <label
            htmlFor="surface_type"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Povrch
          </label>
          <select
            id="surface_type"
            name="surface_type"
            disabled={isPending}
            defaultValue={initialData?.surface_type || ""}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Neurčeno</option>
            <option value="asphalt">Asfalt</option>
            <option value="gravel">Štěrk</option>
            <option value="trail">Lesní stezka</option>
            <option value="mixed">Smíšený</option>
          </select>
          {errors.surface_type && (
            <p className="mt-1 text-sm text-red-600">{errors.surface_type}</p>
          )}
        </div>
      </div>

      {/* Start Coords */}
      <div>
        <label
          htmlFor="start_coords"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Začátek trasy (start) *
        </label>
        <input
          type="text"
          id="start_coords"
          name="start_coords"
          required
          disabled={isPending}
          defaultValue={formatCoords(
            initialData?.start_lat,
            initialData?.start_lng
          )}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
          placeholder="49.83412, 18.28234"
        />
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Z Mapy.cz zkopíruj souřadnice. Příklad: 49.83412, 18.28234
        </p>
        {errors.start_coords && (
          <p className="mt-1 text-sm text-red-600">{errors.start_coords}</p>
        )}
      </div>

      {/* End Coords */}
        <div>
          <label
            htmlFor="end_coords"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Cíl trasy (konec) *
          </label>
          <input
            type="text"
            id="end_coords"
            name="end_coords"
            required
            disabled={isPending}
            defaultValue={formatCoords(
              initialData?.end_lat,
              initialData?.end_lng
            )}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
            placeholder="49.83412, 18.28234"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Z Mapy.cz zkopíruj souřadnice. Příklad: 49.83412, 18.28234
          </p>
          {errors.end_coords && (
            <p className="mt-1 text-sm text-red-600">{errors.end_coords}</p>
          )}
        </div>
      </div>

      {/* SEKCE: TRASA */}
      <div className="space-y-6">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Autorská trasa
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Tvoje konkrétní cesta – dej jí vlastní jméno a popis
          </p>
        </div>

        {/* Route Name */}
        <div>
          <label
            htmlFor="route_name"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Název trasy (autorský)
          </label>
          <input
            type="text"
            id="route_name"
            name="route_name"
            disabled={isPending}
            defaultValue={initialData?.route_name || ""}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="např. Na Pramen Labe od potoka za chalupou"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Volitelné. Popiš svoji konkrétní cestu – klidně neoficiálně.
          </p>
          {errors.route_name && (
            <p className="mt-1 text-sm text-red-600">{errors.route_name}</p>
          )}
        </div>

        {/* Route Title */}
        <div>
          <label
            htmlFor="route_title"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Titulek trasy
          </label>
          <input
            type="text"
            id="route_title"
            name="route_title"
            disabled={isPending}
            defaultValue={initialData?.route_title || ""}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="např. Zážitek na celý den"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Volitelné
          </p>
          {errors.route_title && (
            <p className="mt-1 text-sm text-red-600">{errors.route_title}</p>
          )}
        </div>

        {/* Route Description */}
        <div>
          <label
            htmlFor="route_description"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Popis trasy
          </label>
          <textarea
            id="route_description"
            name="route_description"
            disabled={isPending}
            rows={3}
            defaultValue={initialData?.route_description || ""}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Popiš svou trasu..."
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Volitelné
          </p>
          {errors.route_description && (
            <p className="mt-1 text-sm text-red-600">{errors.route_description}</p>
          )}
        </div>
      </div>

      {/* SEKCE: AUDIO TRASY */}
      <div id="audio" className="space-y-6">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Audio trasy
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Příprava – přehrávání doplníme později.
          </p>
        </div>

        {/* Audio Upload - only show in edit mode */}
        {initialData && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 space-y-4">
            <div>
              <label
                htmlFor="audio_file"
                className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
              >
                Nahrát audio trasy
              </label>
              <input
                type="file"
                id="audio_file"
                accept="audio/mpeg,audio/mp4,audio/wav"
                disabled={isUploadingAudio || isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setSelectedAudioFile(file || null);
                  setUploadError(null);
                  setUploadSuccess(false);
                }}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Audio průvodce k trase (mp3, m4a, wav)
              </p>
            </div>

            {selectedAudioFile && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)]">
                  Vybraný soubor: {selectedAudioFile.name}
                </span>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAudioUpload}
                  disabled={isUploadingAudio || isPending}
                  className="ml-auto"
                >
                  {isUploadingAudio ? "Nahrávám..." : "Nahrát audio"}
                </Button>
              </div>
            )}

            {uploadError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                Audio bylo úspěšně nahráno! Stránka se za chvíli obnoví...
              </div>
            )}
          </div>
        )}

        {/* Audio Status */}
        <div>
          <label
            htmlFor="audio_status"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Status
          </label>
          <select
            id="audio_status"
            name="audio_status"
            disabled={isPending}
            defaultValue={initialData?.audio_status || "missing"}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="missing">Chybí</option>
            <option value="draft">Rozpracované</option>
            <option value="ready">Připraveno</option>
          </select>
          {errors.audio_status && (
            <p className="mt-1 text-sm text-red-600">{errors.audio_status}</p>
          )}
        </div>

        {/* Audio Public URL */}
        <div>
          <label
            htmlFor="audio_public_url"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Odkaz na audio (URL)
          </label>
          <input
            type="text"
            id="audio_public_url"
            name="audio_public_url"
            disabled={isPending}
            defaultValue={initialData?.audio_public_url || ""}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="např. https://..."
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Zatím jen uložíme odkaz. Přehrávač doplníme později.
          </p>
          {errors.audio_public_url && (
            <p className="mt-1 text-sm text-red-600">{errors.audio_public_url}</p>
          )}
        </div>

        {/* Audio Duration */}
        <div>
          <label
            htmlFor="audio_duration_sec"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Délka (sekundy)
          </label>
          <input
            type="number"
            id="audio_duration_sec"
            name="audio_duration_sec"
            disabled={isPending}
            min="1"
            defaultValue={initialData?.audio_duration_sec || ""}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="např. 420"
          />
          {errors.audio_duration_sec && (
            <p className="mt-1 text-sm text-red-600">{errors.audio_duration_sec}</p>
          )}
        </div>

        {/* Audio Note */}
        <div>
          <label
            htmlFor="audio_note"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Poznámka pro posluchače
          </label>
          <textarea
            id="audio_note"
            name="audio_note"
            disabled={isPending}
            rows={2}
            defaultValue={initialData?.audio_note || ""}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="např. Pusť si před startem, je tam orientace."
          />
          {errors.audio_note && (
            <p className="mt-1 text-sm text-red-600">{errors.audio_note}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Ukládám..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
