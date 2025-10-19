import { useState } from "react";
import { Plus, UserCheck, UserX, Filter, Calendar, Users, Activity } from "lucide-react";
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

const AgentsSection = () => {
  const { agents, loading, toggleAgentStatus, getFilteredAgents, getStats, refetch } = useAgents();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleToggleStatus = async (agentId: number) => {
    await toggleAgentStatus(agentId);
  };

  const filteredAgents = getFilteredAgents(roleFilter, statusFilter);
  const stats = getStats();

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      {/* Action Button */}
      <div className="flex justify-end shrink-0">
        <AddAgentDialog onAgentAdded={refetch} />
      </div>

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
        emptyMessage="Aucun agent trouvé. Connectez votre base de données pour voir les agents."
      >
        {filteredAgents.map((agent) => (
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
        ))}
      </ResponsiveTable>
    </div>
  );
};

export default AgentsSection;