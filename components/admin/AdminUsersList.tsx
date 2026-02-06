"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import Link from "next/link";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function AdminUsersList() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter((user) => {
        const displayName = user.display_name?.toLowerCase() || "";
        const userId = user.id.toLowerCase();
        return displayName.includes(query) || userId.startsWith(query);
      });
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseBrowserClient();
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Nepodařilo se načíst uživatele");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  }

  function getInitials(displayName: string | null): string {
    if (!displayName) return "?";
    const words = displayName.trim().split(" ");
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seznam uživatelů</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Hledat podle jména nebo ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Žádní uživatelé nenalezeni" : "Žádní uživatelé"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <Link
                key={user.id}
                href={`/u/${user.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                {/* Avatar */}
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(user.display_name)}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-sm">
                    {user.display_name || "Anonym"}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.id}
                  </p>
                </div>

                {/* Created Date */}
                <Badge variant="secondary" className="text-xs">
                  {formatDate(user.created_at)}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Results count */}
        {!loading && !error && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Zobrazeno {filteredUsers.length} z {users.length} uživatelů
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
