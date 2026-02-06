"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Eye, EyeOff, Trash2, XCircle } from "lucide-react";

type Report = {
  id: string;
  reporter_user_id: string;
  reporter_display_name: string | null;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  action_taken: string | null;
};

type Props = {
  openReports: Report[];
  resolvedReports: Report[];
};

export default function ModerationQueueList({
  openReports: initialOpen,
  resolvedReports: initialResolved,
}: Props) {
  const router = useRouter();
  const [openReports, setOpenReports] = useState<Report[]>(initialOpen);
  const [resolvedReports, setResolvedReports] = useState<Report[]>(initialResolved);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"open" | "resolved">("open");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    reportId: string;
    action: "hide" | "delete" | "dismiss";
  } | null>(null);

  // Filter reports by search query
  const filteredOpen = useMemo(() => {
    if (!searchQuery.trim()) return openReports;
    const query = searchQuery.toLowerCase();
    return openReports.filter(
      (r) =>
        r.target_type.toLowerCase().includes(query) ||
        r.reporter_user_id.toLowerCase().startsWith(query) ||
        r.reason.toLowerCase().includes(query)
    );
  }, [openReports, searchQuery]);

  const filteredResolved = useMemo(() => {
    if (!searchQuery.trim()) return resolvedReports;
    const query = searchQuery.toLowerCase();
    return resolvedReports.filter(
      (r) =>
        r.target_type.toLowerCase().includes(query) ||
        r.reporter_user_id.toLowerCase().startsWith(query) ||
        r.reason.toLowerCase().includes(query)
    );
  }, [resolvedReports, searchQuery]);

  // Handle moderation action
  const handleAction = async (reportId: string, action: "hide" | "delete" | "dismiss") => {
    setProcessingId(reportId);

    try {
      const response = await fetch("/api/admin/moderation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, action }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se provést akci");
      }

      // Move report from open to resolved
      const movedReport = openReports.find((r) => r.id === reportId);
      if (movedReport) {
        setOpenReports((prev) => prev.filter((r) => r.id !== reportId));
        setResolvedReports((prev) => [
          {
            ...movedReport,
            status: action === "dismiss" ? "dismissed" : "resolved",
            action_taken: action,
            resolved_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      toast.success(
        action === "hide"
          ? "Obsah skryt"
          : action === "delete"
          ? "Obsah smazán"
          : "Report zamítnut"
      );

      // Refresh page to update stats
      router.refresh();
    } catch (error: any) {
      console.error("Moderation action error:", error);
      toast.error(error.message || "Nepodařilo se provést akci");
    } finally {
      setProcessingId(null);
      setPendingAction(null);
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get target type label
  const getTargetTypeLabel = (type: string): string => {
    switch (type) {
      case "place_photo":
        return "Fotka (návštěva)";
      case "place_media":
        return "Fotka (autor)";
      case "journal_entry":
        return "Deníkový zápis";
      case "riddle":
        return "Keška";
      default:
        return type;
    }
  };

  // Get action badge
  const getActionBadge = (action: string | null) => {
    if (!action) return null;
    switch (action) {
      case "hide":
        return <Badge variant="secondary">Skryto</Badge>;
      case "delete":
        return <Badge variant="destructive">Smazáno</Badge>;
      case "dismiss":
        return <Badge variant="outline">Zamítnuto</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fronta moderace</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Hledat podle typu, reportera, důvodu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "open" | "resolved")}>
          <TabsList className="w-full">
            <TabsTrigger value="open" className="flex-1">
              Otevřené ({filteredOpen.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex-1">
              Vyřešené ({filteredResolved.length})
            </TabsTrigger>
          </TabsList>

          {/* Open Reports Tab */}
          <TabsContent value="open" className="mt-4">
            {filteredOpen.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Žádné reporty nenalezeny" : "Žádné otevřené reporty"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOpen.map((report) => {
                  const isProcessing = processingId === report.id;
                  return (
                    <div
                      key={report.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">
                              {getTargetTypeLabel(report.target_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(report.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Reporter: {report.reporter_display_name || "Anonym"} (
                            <code className="text-xs">{report.reporter_user_id.slice(0, 8)}</code>)
                          </p>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Důvod:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {report.reason}
                        </p>
                      </div>

                      {/* Target ID */}
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground">
                          Target ID: <code>{report.target_id}</code>
                        </p>
                      </div>

                      <Separator className="my-3" />

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPendingAction({ reportId: report.id, action: "hide" })}
                          disabled={isProcessing}
                        >
                          <EyeOff className="w-4 h-4 mr-2" />
                          Skrýt
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setPendingAction({ reportId: report.id, action: "delete" })}
                          disabled={isProcessing}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Smazat
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingAction({ reportId: report.id, action: "dismiss" })}
                          disabled={isProcessing}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Zamítnout
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Resolved Reports Tab */}
          <TabsContent value="resolved" className="mt-4">
            {filteredResolved.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Žádné reporty nenalezeny" : "Žádné vyřešené reporty"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResolved.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg border bg-muted/40"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {getTargetTypeLabel(report.target_type)}
                          </Badge>
                          {getActionBadge(report.action_taken)}
                          <span className="text-xs text-muted-foreground">
                            {report.resolved_at && formatDate(report.resolved_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Reporter: {report.reporter_display_name || "Anonym"}
                        </p>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {report.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "hide"
                ? "Skrýt obsah?"
                : pendingAction?.action === "delete"
                ? "Smazat obsah?"
                : "Zamítnout report?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === "hide"
                ? "Obsah bude skryt před uživateli, ale zůstane v databázi."
                : pendingAction?.action === "delete"
                ? "Obsah bude trvale smazán. Tahle akce je nevratná."
                : "Report bude zamítnut bez akce na obsah."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingAction &&
                handleAction(pendingAction.reportId, pendingAction.action)
              }
              className={
                pendingAction?.action === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              Potvrdit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
