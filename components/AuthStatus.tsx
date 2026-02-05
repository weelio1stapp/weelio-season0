"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Button } from "./ui/button";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { copy } from "@/lib/copy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { User, LogOut } from "lucide-react";

export default function AuthStatus() {
  const { user, loading } = useAuth();
  const supabase = getSupabaseBrowserClient();

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
      <div className="text-sm text-muted-foreground">Načítání...</div>
    );
  }

  if (user) {
    // Truncate email if too long
    const displayEmail =
      user.email && user.email.length > 20
        ? `${user.email.substring(0, 20)}...`
        : user.email;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden md:inline">{displayEmail}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/me" className="cursor-pointer">
              Můj profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/journal" className="cursor-pointer">
              Deník
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/me/xp" className="cursor-pointer">
              XP & odznaky
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/me/edit" className="cursor-pointer">
              Upravit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 dark:text-red-400">
            <LogOut className="w-4 h-4 mr-2" />
            Odhlásit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={handleSignIn} size="sm">
      {copy.common.login}
    </Button>
  );
}
