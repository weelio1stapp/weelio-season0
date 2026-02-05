"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useAuth } from "./AuthProvider";
import { calculateLevelProgress } from "@/lib/xp";
import { Zap } from "lucide-react";

export default function XPDisplay() {
  const { user } = useAuth();
  const [xp, setXp] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchProgress() {
      if (!user) return;

      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from("user_progress")
        .select("xp")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user progress:", error);
        setLoading(false);
        return;
      }

      setXp(data?.xp || 0);
      setLoading(false);
    }

    fetchProgress();
  }, [user]);

  if (!user || loading) {
    return null;
  }

  const { currentLevel, progressPercent } = calculateLevelProgress(xp);

  return (
    <Link
      href="/me/xp"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] bg-opacity-10 border border-[var(--accent-primary)] border-opacity-20 hover:bg-opacity-20 transition-colors"
    >
      <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--accent-primary)]">
            Level {currentLevel}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {xp} XP
          </span>
        </div>
        {/* Mini progress bar */}
        <div className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-primary)] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
