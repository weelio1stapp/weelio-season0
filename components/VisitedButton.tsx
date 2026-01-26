"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface VisitedButtonProps {
  placeId: string;
  alreadyVisited: boolean;
}

export default function VisitedButton({
  placeId,
  alreadyVisited: initialVisited,
}: VisitedButtonProps) {
  const router = useRouter();
  const [visited, setVisited] = useState(initialVisited);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (visited || pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeId,
          source: "button",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se uložit návštěvu");
      }

      // Success - update state and refresh
      setVisited(true);
      router.refresh();
    } catch (err) {
      console.error("Failed to mark visited:", err);
      setError(err instanceof Error ? err.message : "Nastala chyba");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={visited || pending}
        className={`
          inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold
          transition-all duration-200
          ${
            visited
              ? "bg-green-100 text-green-800 cursor-not-allowed"
              : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 active:scale-95"
          }
          ${pending ? "opacity-50 cursor-wait" : ""}
        `}
      >
        {pending && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {visited ? "✓ Byl jsem tady" : "Byl jsem tady"}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {visited && !error && (
        <p className="mt-2 text-sm text-green-700">
          Návštěva zaznamenána!
        </p>
      )}
    </div>
  );
}
