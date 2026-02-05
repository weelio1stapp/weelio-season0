"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import Button from "./Button";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { copy } from "@/lib/copy";

export default function AuthStatus() {
  const { user, loading } = useAuth();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log('[client-session-mount]', data.session?.user?.email ?? null);
    });
  }, [supabase]);

  const handleDebugSession = async () => {
    const { data } = await supabase.auth.getSession();
    console.log('[client-session]', data.session?.user?.email ?? null);
  };

  const handleSignIn = async () => {
    const { origin } = window.location;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="text-sm text-[var(--text-secondary)]">Načítání...</div>
    );
  }

  if (user) {
    // Truncate email if too long
    const displayEmail =
      user.email && user.email.length > 18
        ? `${user.email.substring(0, 18)}...`
        : user.email;

    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--text-secondary)] hidden md:inline">
          {displayEmail}
        </span>
        <Link
          href="/me"
          className="text-sm hover:text-[var(--accent-primary)] transition-colors"
        >
          Můj profil
        </Link>
        <Link
          href="/me/edit"
          className="text-sm hover:text-[var(--accent-primary)] transition-colors"
        >
          Upravit
        </Link>
        <Link
          href="/journal"
          className="text-sm hover:text-[var(--accent-primary)] transition-colors"
        >
          Deník
        </Link>
        <Link
          href="/me/xp"
          className="text-sm hover:text-[var(--accent-primary)] transition-colors"
        >
          XP
        </Link>
        <Button onClick={handleSignOut} variant="outline" className="text-sm py-1 px-3">
          Odhlásit
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleSignIn} variant="primary" className="text-sm py-1 px-3">
        {copy.common.login}
      </Button>
      <button
        onClick={handleDebugSession}
        className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
      >
        DEBUG SESSION
      </button>
    </div>
  );
}
