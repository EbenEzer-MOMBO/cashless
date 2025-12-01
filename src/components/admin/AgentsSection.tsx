import { useState } from "react";
import { Plus, UserCheck, UserX, Filter, Calendar, Users, Activity, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useAgents } from "@/hooks/useAgents";
import { AddAgentDialog } from "./AddAgentDialog";
import { StatCard } from "./shared/StatCard";
import { ResponsiveTable } from "./shared/ResponsiveTable";
import { useToast } from "@/hooks/use-toast";

const AgentsSection = () => {
  const { agents, loading, error, toggleAgentStatus, getFilteredAgents, getStats, refetch } = useAgents();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const handleToggleStatus = async (agentId: string) => {
    await toggleAgentStatus(agentId);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast({
        title: 'Actualisé',
        description: 'Liste des agents mise à jour.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de rafraîchir la liste des agents.',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const filteredAgents = getFilteredAgents(roleFilter, statusFilter);
  const stats = getStats();

  // Debug logging
  if (import.meta.env.DEV) {
    console.log('🔍 AgentsSection Debug:', {
      totalAgents: agents.length,
      filteredAgents: filteredAgents.length,
      roleFilter,
      statusFilter,
      loading,
      error,
      agents: agents.map(a => ({ id: a.id, name: a.name, role: a.role, active: a.active })),
      filtered: filteredAgents.map(a => ({ id: a.id, name: a.name, role: a.role, active: a.active }))
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      {/* Action Buttons */}
      <div className="flex justify-between items-center shrink-0 gap-2">
        <div className="flex items-center gap-2">
          {error && (
            <div className="text-sm text-destructive">
              Erreur: {error}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="btn-touch"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
        <AddAgentDialog onAgentAdded={async () => {
          // Force refresh after a short delay
          setTimeout(async () => {
            await refetch();
            toast({
              title: 'Agent créé',
              description: 'L\'agent a été ajouté à la liste.',
            });
          }, 1000);
        }} />
      </div>

      {/* Debug Info (only in development) */}
      {import.meta.env.DEV && (
        <Card className="bg-muted/50 border-dashed shrink-0">
          <CardContent className="p-3 text-xs">
            <div className="space-y-1">
              <div><strong>Agents chargés:</strong> {agents.length}</div>
              <div><strong>Agents filtrés:</strong> {filteredAgents.length}</div>
              <div><strong>Filtre rôle:</strong> {roleFilter}</div>
              <div><strong>Filtre statut:</strong> {statusFilter}</div>
              <div><strong>Chargement:</strong> {loading ? 'Oui' : 'Non'}</div>
              {error && <div className="text-destructive"><strong>Erreur:</strong> {error}</div>}
              {agents.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <strong>Détails des agents:</strong>
                  {agents.map((a, i) => (
                    <div key={i} className="text-[10px]">
                      {i + 1}. {a.name} - {a.role} - {a.active ? 'Actif' : 'Inactif'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 shrink-0">
        <StatCard
          title="Agents actifs"
          value={stats.activeAgents}
          icon={UserCheck}
          iconColor="text-primary"
        />
        <StatCard
          title="Agents recharge"
          value={stats.rechargeAgents}
          icon={Activity}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Agents vente"
          value={stats.venteAgents}
          icon={Users}
          iconColor="text-orange-500"
        />
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
              <label className="text-xs sm:text-sm font-medium">Rôle</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="btn-touch">
                  <SelectValue placeholder="Tous les rôles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="recharge">Recharge</SelectItem>
                  <SelectItem value="vente">Vente</SelectItem>
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

      {/* Enhanced Agents Table */}
      <ResponsiveTable
        title="Agents"
        description="Liste des agents de la plateforme"
        count={filteredAgents.length}
        headers={["Agent", "Événement", "Rôle", "Statut", "Activité", "Ventes", "Actions"]}
        loading={loading}
        emptyMessage={
          loading 
            ? "Chargement des agents..." 
            : error
            ? `Erreur: ${error}. Cliquez sur 'Actualiser' pour réessayer.`
            : filteredAgents.length === 0 && agents.length > 0
            ? `Aucun agent ne correspond aux filtres (${agents.length} agent(s) au total). Modifiez les filtres pour voir les agents.`
            : "Aucun agent trouvé. Créez votre premier agent en cliquant sur 'Ajouter un agent'."
        }
      >
        {filteredAgents.length > 0 ? filteredAgents.map((agent) => (
          <TableRow key={agent.id} className="hover:bg-muted/30 transition-colors">
            <TableCell className="min-w-0">
              <div className="space-y-1">
                <div className="font-medium text-xs sm:text-sm truncate" title={agent.name}>
                  {agent.name}
                </div>
                <div className="text-xs text-muted-foreground truncate" title={agent.email}>
                  {agent.email}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-xs sm:text-sm max-w-[120px] truncate" title={agent.eventName}>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{agent.eventName}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge 
                variant={agent.role === "recharge" ? "default" : "secondary"}
                className="text-xs"
              >
                {agent.role === "recharge" ? "Recharge" : "Vente"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {agent.active ? (
                  <UserCheck className="h-3 w-3 text-primary" />
                ) : (
                  <UserX className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={`text-xs ${agent.active ? "text-primary" : "text-muted-foreground"} hidden sm:inline`}>
                  {agent.active ? "Actif" : "Inactif"}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
              {agent.lastActivity}
            </TableCell>
            <TableCell className="text-xs sm:text-sm font-medium">
              {agent.totalSales.toLocaleString()} XAF
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Switch
                  checked={agent.active}
                  onCheckedChange={() => handleToggleStatus(agent.id)}
                  className="scale-75 sm:scale-100"
                />
                <Button variant="outline" size="sm" className="text-xs px-2 py-1 btn-touch hover-scale">
                  Modifier
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )) : null}
      </ResponsiveTable>
    </div>
  );
};

export default AgentsSection;