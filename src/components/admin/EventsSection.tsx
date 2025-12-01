import { useEffect, useState } from "react";
import { Calendar, Plus, MapPin, Users, Package, Clock, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { useEvents, Event } from "@/hooks/useEvents";
import { StatCard } from "./shared/StatCard";
import { ResponsiveTable } from "./shared/ResponsiveTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/integrations/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { COLLECTIONS } from "@/integrations/firebase/types";

const EventsSection = () => {
  const { events, loading, error } = useEvents();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-primary/10 text-primary border-primary/20">En cours</Badge>;
      case "planned":
        return <Badge variant="outline" className="border-blue-200 text-blue-700">Planifié</Badge>;
      case "completed":
        return <Badge variant="secondary">Terminé</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Annulé</Badge>;
      case "Incompleted":
        return <Badge variant="outline" className="border-yellow-200 text-yellow-700">Incomplet</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Lazy counts per event (avoid heavy queries)
  const [counts, setCounts] = useState<Record<string, { participants: number; agents: number; products: number }>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);

  const fetchCountsForEvent = async (eventId: string) => {
    if (counts[eventId]) return counts[eventId];
    
    try {
      const [participantsSnapshot, agentsSnapshot, productsSnapshot] = await Promise.all([
        getDocs(query(collection(db, COLLECTIONS.PARTICIPANTS), where('event_id', '==', eventId))),
        getDocs(query(collection(db, COLLECTIONS.AGENTS), where('event_id', '==', eventId))),
        getDocs(query(collection(db, COLLECTIONS.PRODUCTS), where('event_id', '==', eventId)))
      ]);
      
      const newEntry = {
        participants: participantsSnapshot.size,
        agents: agentsSnapshot.size,
        products: productsSnapshot.size,
      };
      setCounts((prev) => ({ ...prev, [eventId]: newEntry }));
      return newEntry;
    } catch (error) {
      console.error('Error fetching counts:', error);
      return { participants: 0, agents: 0, products: 0 };
    }
  };

  // Prefetch counts for listed events (best-effort)
  useEffect(() => {
    const ids = events.map((e) => e.id).filter((id) => !counts[id]);
    if (!ids.length) return;
    ids.forEach((id) => { fetchCountsForEvent(id).catch(() => {}); });
  }, [events]);

  const totalParticipants = events.reduce((sum, e) => sum + (counts[e.id]?.participants ?? 0), 0);

  const openDetails = (ev: Event) => {
    setSelected(ev);
    setDetailsOpen(true);
    fetchCountsForEvent(ev.id).catch(() => {});
  };

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      {/* Action Button */}
      <div className="flex justify-end shrink-0">
        <Button 
          onClick={() => window.open('https://eventime.ga/', '_blank')} 
          className="flex items-center gap-2 hover-scale"
        >
          <Plus className="h-4 w-4" />
          Créer un événement
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5 shrink-0">
          <CardContent className="mobile-card">
            <div className="flex items-center gap-2 text-destructive">
              <span className="font-medium">Erreur:</span>
              <span className="mobile-text">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 shrink-0">
        <StatCard
          title="Événements actifs"
          value={events.filter(e => e.status === "active").length}
          icon={Clock}
          iconColor="text-primary"
        />
        <StatCard
          title="Événements planifiés"
          value={events.filter(e => e.status === "planned").length}
          icon={Calendar}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Total participants"
          value={totalParticipants.toLocaleString()}
          icon={Users}
          iconColor="text-orange-500"
        />
      </div>

      {/* Enhanced Events Table */}
      <ResponsiveTable
        title="Événements"
        description="Liste des événements de la plateforme"
        count={events.length}
        headers={["Événement", "Lieu", "Dates", "Statut", "Participants", "Agents", "Produits", "Actions"]}
        loading={loading}
        emptyMessage="Aucun événement trouvé. Connectez votre base de données pour voir les événements."
      >
        {events.map((event) => (
          <TableRow key={event.id} className="hover:bg-muted/30 transition-colors">
            <TableCell className="min-w-0">
              <div className="font-medium truncate max-w-xs mobile-text" title={event.name}>
                {event.name}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm truncate">{event.location}</span>
              </div>
            </TableCell>
            <TableCell className="text-xs sm:text-sm">
              <div>{formatDate(event.startDate)}</div>
              <div className="text-muted-foreground">{formatDate(event.endDate)}</div>
            </TableCell>
            <TableCell>
              {getStatusBadge(event.status)}
            </TableCell>
            <TableCell className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs sm:text-sm">{counts[event.id]?.participants ?? "—"}</span>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Users className="h-3 w-3 text-blue-500" />
                <span className="text-xs sm:text-sm">{counts[event.id]?.agents ?? "—"}</span>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Package className="h-3 w-3 text-orange-500" />
                <span className="text-xs sm:text-sm">{counts[event.id]?.products ?? "—"}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                className="btn-touch"
                onClick={() => openDetails(event)}
              >
                <Eye className="h-3 w-3" />
                <span className="ml-2 hidden sm:inline">Détails</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </ResponsiveTable>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de l'événement</DialogTitle>
            {selected && (
              <DialogDescription>
                <div className="space-y-2">
                  <div className="font-medium">{selected.name}</div>
                  <div className="text-sm text-muted-foreground">{selected.location}</div>
                  <div className="text-sm text-muted-foreground">{formatDate(selected.startDate)} → {formatDate(selected.endDate)}</div>
                </div>
              </DialogDescription>
            )}
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Card className="card-banking">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Participants</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold">{counts[selected.id]?.participants ?? '—'}</div>
                </CardContent>
              </Card>
              <Card className="card-banking">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Agents</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold">{counts[selected.id]?.agents ?? '—'}</div>
                </CardContent>
              </Card>
              <Card className="card-banking">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Produits</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold">{counts[selected.id]?.products ?? '—'}</div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsSection;
