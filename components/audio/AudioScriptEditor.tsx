"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/Button";
import type { AudioSegmentRow } from "@/lib/db/audio-segments";
import type { RoutePoint } from "@/lib/db/route-points";
import { upsertIntroSegment, upsertPointSegment } from "@/app/p/[id]/edit/actions";

type Props = {
  placeId: string;
  routePoints: RoutePoint[];
  introSegment: AudioSegmentRow | null;
  pointSegments: Map<string, AudioSegmentRow>; // keyed by route_point_id
};

const POINT_TYPE_LABELS = {
  START: "Začátek",
  END: "Cíl",
  CHECKPOINT: "Zastávka",
  POI: "Zajímavost",
  TREASURE: "Poklad",
} as const;

export default function AudioScriptEditor({
  placeId,
  routePoints,
  introSegment,
  pointSegments,
}: Props) {
  // Intro segment state
  const [introTitle, setIntroTitle] = useState(introSegment?.title || "");
  const [introScript, setIntroScript] = useState(introSegment?.script_text || "");
  const [introEstimatedSec, setIntroEstimatedSec] = useState(
    introSegment?.estimated_sec?.toString() || ""
  );
  const [isSavingIntro, setIsSavingIntro] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);
  const [introSuccess, setIntroSuccess] = useState(false);

  // Point segments state - map of route_point_id to {script, estimated_sec}
  const [pointScripts, setPointScripts] = useState<Map<string, string>>(
    new Map(
      Array.from(pointSegments.entries()).map(([id, seg]) => [
        id,
        seg.script_text || "",
      ])
    )
  );
  const [pointEstimatedSecs, setPointEstimatedSecs] = useState<Map<string, string>>(
    new Map(
      Array.from(pointSegments.entries()).map(([id, seg]) => [
        id,
        seg.estimated_sec?.toString() || "",
      ])
    )
  );
  const [savingPoints, setSavingPoints] = useState<Set<string>>(new Set());
  const [pointErrors, setPointErrors] = useState<Map<string, string>>(new Map());
  const [pointSuccesses, setPointSuccesses] = useState<Set<string>>(new Set());

  const handleSaveIntro = async () => {
    setIsSavingIntro(true);
    setIntroError(null);
    setIntroSuccess(false);

    try {
      const result = await upsertIntroSegment(placeId, {
        title: introTitle.trim() || null,
        script_text: introScript.trim() || null,
        estimated_sec: introEstimatedSec ? parseInt(introEstimatedSec, 10) : null,
      });

      if (!result.success) {
        setIntroError(result.error || "Chyba při ukládání");
      } else {
        setIntroSuccess(true);
        setTimeout(() => setIntroSuccess(false), 3000);
      }
    } catch (error) {
      setIntroError("Neočekávaná chyba");
    } finally {
      setIsSavingIntro(false);
    }
  };

  const handleSavePoint = async (routePointId: string) => {
    setSavingPoints((prev) => new Set(prev).add(routePointId));
    setPointErrors((prev) => {
      const next = new Map(prev);
      next.delete(routePointId);
      return next;
    });
    setPointSuccesses((prev) => {
      const next = new Set(prev);
      next.delete(routePointId);
      return next;
    });

    try {
      const script = pointScripts.get(routePointId) || "";
      const estimatedSec = pointEstimatedSecs.get(routePointId) || "";

      const result = await upsertPointSegment(placeId, routePointId, {
        script_text: script.trim() || null,
        estimated_sec: estimatedSec ? parseInt(estimatedSec, 10) : null,
      });

      if (!result.success) {
        setPointErrors((prev) => new Map(prev).set(routePointId, result.error || "Chyba"));
      } else {
        setPointSuccesses((prev) => new Set(prev).add(routePointId));
        setTimeout(() => {
          setPointSuccesses((prev) => {
            const next = new Set(prev);
            next.delete(routePointId);
            return next;
          });
        }, 3000);
      }
    } catch (error) {
      setPointErrors((prev) => new Map(prev).set(routePointId, "Neočekávaná chyba"));
    } finally {
      setSavingPoints((prev) => {
        const next = new Set(prev);
        next.delete(routePointId);
        return next;
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio scénář trasy</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Co bude posluchač slyšet během cesty
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* A) Intro Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Úvod trasy</h3>
            <Badge variant="secondary">Intro</Badge>
          </div>

          <div>
            <label
              htmlFor="intro-title"
              className="block text-sm font-medium mb-2"
            >
              Název úvodního segmentu
            </label>
            <input
              type="text"
              id="intro-title"
              value={introTitle}
              onChange={(e) => setIntroTitle(e.target.value)}
              disabled={isSavingIntro}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50"
              placeholder="např. Vítejte na trase"
            />
          </div>

          <div>
            <label
              htmlFor="intro-script"
              className="block text-sm font-medium mb-2"
            >
              Co říct na začátku trasy
            </label>
            <textarea
              id="intro-script"
              value={introScript}
              onChange={(e) => setIntroScript(e.target.value)}
              disabled={isSavingIntro}
              rows={6}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors resize-none disabled:opacity-50"
              placeholder="Zde napiš úvodní text, který uslyší posluchač na začátku..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Audio zatím není přehrávatelné – připravujeme text pro budoucí generování.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="intro-duration"
                className="block text-sm font-medium mb-2"
              >
                Odhadovaná délka (sekundy)
              </label>
              <input
                type="number"
                id="intro-duration"
                value={introEstimatedSec}
                onChange={(e) => setIntroEstimatedSec(e.target.value)}
                disabled={isSavingIntro}
                min="1"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50"
                placeholder="např. 30"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleSaveIntro}
                disabled={isSavingIntro}
                variant="primary"
                className="w-full"
              >
                {isSavingIntro ? "Ukládám..." : "Uložit úvod"}
              </Button>
            </div>
          </div>

          {introError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {introError}
            </div>
          )}

          {introSuccess && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              Úvod byl úspěšně uložen!
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <h3 className="text-base font-semibold mb-4">Body trasy</h3>

          {routePoints.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Zatím nemáš žádné body trasy. Přidej je v sekci &quot;Mapa a
                zastávky&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {routePoints.map((point) => {
                const script = pointScripts.get(point.id) || "";
                const estimatedSec = pointEstimatedSecs.get(point.id) || "";
                const isSaving = savingPoints.has(point.id);
                const error = pointErrors.get(point.id);
                const success = pointSuccesses.has(point.id);
                const isEmpty = !script && !estimatedSec;

                return (
                  <div
                    key={point.id}
                    className="rounded-lg border-2 border-gray-200 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium">{point.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {POINT_TYPE_LABELS[point.kind]}
                          </Badge>
                          {isEmpty && (
                            <span className="text-xs text-muted-foreground">
                              Zatím nevyplněno
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`point-script-${point.id}`}
                        className="block text-sm font-medium mb-2"
                      >
                        Co říct u tohoto bodu
                      </label>
                      <textarea
                        id={`point-script-${point.id}`}
                        value={script}
                        onChange={(e) =>
                          setPointScripts(
                            (prev) => new Map(prev).set(point.id, e.target.value)
                          )
                        }
                        disabled={isSaving}
                        rows={4}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors resize-none disabled:opacity-50"
                        placeholder="Zde napiš, co uslyší posluchač u tohoto bodu..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor={`point-duration-${point.id}`}
                          className="block text-sm font-medium mb-2"
                        >
                          Odhadovaná délka (sekundy)
                        </label>
                        <input
                          type="number"
                          id={`point-duration-${point.id}`}
                          value={estimatedSec}
                          onChange={(e) =>
                            setPointEstimatedSecs(
                              (prev) => new Map(prev).set(point.id, e.target.value)
                            )
                          }
                          disabled={isSaving}
                          min="1"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50"
                          placeholder="např. 20"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          onClick={() => handleSavePoint(point.id)}
                          disabled={isSaving}
                          variant="primary"
                          className="w-full"
                        >
                          {isSaving ? "Ukládám..." : "Uložit"}
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                        Uloženo!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
