"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { RoutePointEditDialog } from "./RoutePointEditDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  MapPin,
} from "lucide-react";
import type { RoutePoint, RoutePointKind } from "@/lib/db/route-points";

interface RoutePointsManagerProps {
  routeId: string;
}

const KIND_LABELS: Record<RoutePointKind, string> = {
  START: "Start",
  END: "Cíl",
  CHECKPOINT: "Checkpoint",
  POI: "Bod zájmu",
  TREASURE: "Poklad",
};

const KIND_COLORS: Record<
  RoutePointKind,
  "default" | "secondary" | "destructive" | "outline"
> = {
  START: "default",
  END: "default",
  CHECKPOINT: "secondary",
  POI: "outline",
  TREASURE: "destructive",
};

export function RoutePointsManager({ routeId }: RoutePointsManagerProps) {
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<RoutePoint | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pointToDelete, setPointToDelete] = useState<RoutePoint | null>(null);

  // Načti body trasy
  const fetchPoints = async () => {
    try {
      const response = await fetch(`/api/route-points?routeId=${routeId}`);
      const data = await response.json();

      if (data.ok) {
        setPoints(data.points);
      } else {
        toast.error("Nepodařilo se načíst body trasy");
      }
    } catch (error) {
      console.error("Error fetching points:", error);
      toast.error("Chyba při načítání bodů");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, [routeId]);

  // Přidat nový bod
  const handleAddPoint = () => {
    setEditingPoint(null);
    setDialogOpen(true);
  };

  // Upravit bod
  const handleEditPoint = (point: RoutePoint) => {
    setEditingPoint(point);
    setDialogOpen(true);
  };

  // Uložit bod (přidat nebo upravit)
  const handleSavePoint = async (data: {
    kind: RoutePointKind;
    lat: number;
    lng: number;
    title: string;
    note: string;
  }) => {
    try {
      if (editingPoint) {
        // Upravit existující bod
        const response = await fetch(`/api/route-points/${editingPoint.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.ok) {
          toast.success("Bod byl úspěšně upraven");
          await fetchPoints();
        } else {
          toast.error(result.error || "Nepodařilo se upravit bod");
        }
      } else {
        // Přidat nový bod
        const response = await fetch("/api/route-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeId, ...data }),
        });

        const result = await response.json();

        if (result.ok) {
          toast.success("Bod byl úspěšně přidán");
          await fetchPoints();
        } else {
          toast.error(result.error || "Nepodařilo se přidat bod");
        }
      }
    } catch (error) {
      console.error("Error saving point:", error);
      toast.error("Chyba při ukládání bodu");
    }
  };

  // Smazat bod
  const handleDeleteClick = (point: RoutePoint) => {
    setPointToDelete(point);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pointToDelete) return;

    try {
      const response = await fetch(`/api/route-points/${pointToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.ok) {
        toast.success("Bod byl úspěšně smazán");
        await fetchPoints();
      } else {
        toast.error(result.error || "Nepodařilo se smazat bod");
      }
    } catch (error) {
      console.error("Error deleting point:", error);
      toast.error("Chyba při mazání bodu");
    } finally {
      setDeleteDialogOpen(false);
      setPointToDelete(null);
    }
  };

  // Posunout bod nahoru/dolů
  const handleMovePoint = async (index: number, direction: "up" | "down") => {
    const newPoints = [...points];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newPoints.length) return;

    // Prohoď body
    [newPoints[index], newPoints[targetIndex]] = [
      newPoints[targetIndex],
      newPoints[index],
    ];

    // Optimistically update UI
    setPoints(newPoints);

    try {
      const orderedIds = newPoints.map((p) => p.id);
      const response = await fetch("/api/route-points/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, orderedPointIds: orderedIds }),
      });

      const result = await response.json();

      if (!result.ok) {
        toast.error("Nepodařilo se změnit pořadí");
        // Revert on error
        await fetchPoints();
      }
    } catch (error) {
      console.error("Error reordering points:", error);
      toast.error("Chyba při změně pořadí");
      await fetchPoints();
    }
  };

  const canMoveUp = (index: number) => {
    return index > 0;
  };

  const canMoveDown = (index: number) => {
    return index < points.length - 1;
  };

  const canDelete = (point: RoutePoint) => {
    return point.kind !== "START" && point.kind !== "END";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Body na trase</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Načítám...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Body na trase</CardTitle>
              <CardDescription>
                Spravujte checkpointy a další body na vaší trase
              </CardDescription>
            </div>
            <Button onClick={handleAddPoint} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Přidat bod
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {points.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="mx-auto h-12 w-12 mb-2 opacity-20" />
              <p>Zatím nemáte žádné body na trase</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Typ</TableHead>
                    <TableHead>Název</TableHead>
                    <TableHead>Souřadnice</TableHead>
                    <TableHead>Poznámka</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {points.map((point, index) => (
                    <TableRow key={point.id}>
                      <TableCell>
                        <Badge variant={KIND_COLORS[point.kind]}>
                          {KIND_LABELS[point.kind]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {point.title || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {point.note || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Posunout nahoru */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMovePoint(index, "up")}
                            disabled={!canMoveUp(index)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>

                          {/* Posunout dolů */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMovePoint(index, "down")}
                            disabled={!canMoveDown(index)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>

                          {/* Upravit */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPoint(point)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {/* Smazat */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(point)}
                            disabled={!canDelete(point)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog pro přidání/editaci */}
      <RoutePointEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        point={editingPoint}
        routeId={routeId}
        onSave={handleSavePoint}
      />

      {/* Potvrzení smazání */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu smazat?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Bod &quot;{pointToDelete?.title || "Bez názvu"}&quot; bude
              trvale odstraněn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Ano, smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
