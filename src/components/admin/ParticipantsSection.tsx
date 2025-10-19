import { useState } from "react";
import { Users, Wallet, Calendar, Filter, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParticipants, Participant } from "@/hooks/useParticipants";
import { ParticipantDetailDialog } from "./ParticipantDetailDialog";

const ParticipantsSection = () => {
  const { participants, loading, getFilteredParticipants, getStats, getEvents, refetch } = useParticipants();
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleViewDetails = (participant: Participant) => {
    setSelectedParticipant(participant);
    setDetailDialogOpen(true);
  };

  const filteredParticipants = getFilteredParticipants(eventFilter, statusFilter);
  const stats = getStats();
  const events = getEvents();

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} XAF`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col mobile-padding">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="mobile-title font-bold">Gestion des participants</h2>
          <p className="text-muted-foreground mobile-text">Gérez les participants de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch} className="btn-touch text-xs sm:text-sm">
            Synchroniser
          </Button>
          <Button variant="outline" className="btn-touch text-xs sm:text-sm">
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Responsive Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 shrink-0">
        <Card className="card-banking">
          <CardContent className="mobile-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total participants</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-banking">
          <CardContent className="mobile-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/20 shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Participants actifs</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.activeParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-banking">
          <CardContent className="mobile-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent shrink-0">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Balance totale</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{formatCurrency(stats.totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-banking">
          <CardContent className="mobile-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Événements</p>
                <p className="text-xl sm:text-2xl font-bold">{events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Responsive Filters */}
      <Card className="shrink-0">
        <CardHeader className="mobile-card">
          <CardTitle className="flex items-center gap-2 mobile-text">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent className="mobile-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Événement</label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="btn-touch">
                  <SelectValue placeholder="Tous les événements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les événements</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Statut</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="btn-touch">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants Table */}
      <Card className="flex-1 min-h-0">
        <CardHeader className="mobile-card">
          <CardTitle className="mobile-text">Participants ({filteredParticipants.length})</CardTitle>
          <CardDescription className="mobile-text">
            Liste des participants de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 h-full">
          <div className="overflow-auto h-full">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px] text-xs sm:text-sm">Participant</TableHead>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">Événement</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm">Balance</TableHead>
                    <TableHead className="min-w-[80px] text-xs sm:text-sm">Statut</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm hidden sm:table-cell">Ticket</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm hidden sm:table-cell">Date création</TableHead>
                    <TableHead className="min-w-[80px] text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 mobile-text">
                        Chargement des participants...
                      </TableCell>
                    </TableRow>
                  ) : filteredParticipants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground mobile-text">
                        Aucun participant trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredParticipants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell className="min-w-0">
                          <div className="space-y-1">
                            <div className="font-medium text-xs sm:text-sm truncate" title={participant.name}>
                              {participant.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate" title={participant.email}>
                              {participant.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm max-w-[120px] truncate" title={participant.eventName}>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{participant.eventName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm font-medium">
                          {formatCurrency(participant.balance)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={participant.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {participant.status === "active" ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                          {participant.ticketNumber || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                          {formatDate(participant.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="btn-touch text-xs px-2 py-1"
                            onClick={() => handleViewDetails(participant)}
                          >
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <ParticipantDetailDialog
        participant={selectedParticipant}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
};

export default ParticipantsSection;