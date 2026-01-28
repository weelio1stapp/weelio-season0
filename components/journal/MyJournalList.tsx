"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/Card";

type Entry = {
  id: string;
  place_id: string | null;
  content: string;
  visibility: string;
  created_at: string; // ISO string
};

type Props = {
  entries: Entry[];
  placeNames: Record<string, string>;
};

export default function MyJournalList({ entries: initialEntries, placeNames }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [activeFilter, setActiveFilter] = useState<"all" | "private" | "public">("all");
  const [query, setQuery] = useState("");
  const [onlyWithPlace, setOnlyWithPlace] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Opravdu smazat tento zápis?")) {
      return;
    }

    setDeletingId(id);
    setDeleteError(null);

    try {
      const response = await fetch("/api/journal/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se smazat záznam");
      }

      // Optimistically remove from state
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err: any) {
      console.error("Delete error:", err);
      setDeleteError(err.message || "Došlo k chybě při mazání");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter entries based on current state
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Filter by visibility
      if (activeFilter === "private" && entry.visibility !== "private") {
        return false;
      }
      if (activeFilter === "public" && entry.visibility !== "public") {
        return false;
      }

      // Filter by search query (case-insensitive, trimmed)
      const trimmedQuery = query.trim();
      if (trimmedQuery && !entry.content.toLowerCase().includes(trimmedQuery.toLowerCase())) {
        return false;
      }

      // Filter by "only with place"
      if (onlyWithPlace && !entry.place_id) {
        return false;
      }

      return true;
    });
  }, [entries, activeFilter, query, onlyWithPlace]);

  // If no entries at all, show empty state (server handles this, but just in case)
  if (entries.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-[var(--text-secondary)] mb-4">
            Zatím nemáš žádný záznam v deníku.
          </p>
          <Link
            href="/journal/new"
            className="inline-block px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Napsat první záznam
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card>
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === "all"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-gray-100 text-[var(--text-primary)] hover:bg-gray-200"
              }`}
            >
              Vše
            </button>
            <button
              onClick={() => setActiveFilter("private")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === "private"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-gray-100 text-[var(--text-primary)] hover:bg-gray-200"
              }`}
            >
              Soukromé
            </button>
            <button
              onClick={() => setActiveFilter("public")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === "public"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-gray-100 text-[var(--text-primary)] hover:bg-gray-200"
              }`}
            >
              Veřejné
            </button>
          </div>

          {/* Search Input */}
          <div>
            <input
              type="text"
              placeholder="Hledat v obsahu..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm"
            />
          </div>

          {/* Checkbox: Only with place */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyWithPlace}
              onChange={(e) => setOnlyWithPlace(e.target.checked)}
              className="w-4 h-4 text-[var(--accent-primary)] rounded focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <span className="text-sm text-[var(--text-primary)]">Jen z míst</span>
          </label>

          {/* Count */}
          <p className="text-xs text-[var(--text-secondary)]">
            Nalezeno {filteredEntries.length} z {entries.length}
          </p>
        </div>
      </Card>

      {/* Delete Error */}
      {deleteError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{deleteError}</p>
        </div>
      )}

      {/* Results */}
      {filteredEntries.length > 0 ? (
        <Card>
          <div className="space-y-4">
            {filteredEntries.map((entry) => {
              const placeName = entry.place_id ? placeNames[entry.place_id] : null;
              const entryDate = new Date(entry.created_at);
              const formattedDate = entryDate.toLocaleDateString("cs-CZ", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
              });

              // Truncate content to 240 chars
              const truncatedContent =
                entry.content.length > 240
                  ? entry.content.slice(0, 240) + "…"
                  : entry.content;

              const isDeleting = deletingId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="p-4 rounded-lg border border-gray-200 hover:border-[var(--accent-primary)]/30 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.visibility === "public"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {entry.visibility === "public" ? "Veřejný" : "Soukromý"}
                      </span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/journal/edit/${entry.id}`}
                        className="text-xs text-[var(--accent-primary)] hover:underline"
                      >
                        Upravit
                      </Link>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={isDeleting}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? "Mazání..." : "Smazat"}
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                    {truncatedContent}
                  </p>

                  {/* Place link */}
                  {entry.place_id && placeName && (
                    <div className="mt-3">
                      <Link
                        href={`/p/${entry.place_id}`}
                        className="text-sm text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                      >
                        📍 {placeName}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-8">
            <p className="text-[var(--text-secondary)] mb-2">Nic nenalezeno</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Zkus změnit filtry nebo vyhledávací dotaz
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
