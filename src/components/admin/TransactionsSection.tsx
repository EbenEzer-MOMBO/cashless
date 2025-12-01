import { useState } from "react";
import { CalendarDays, TrendingUp, TrendingDown, Search, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminTransactions } from "@/hooks/useAdminTransactions";

const TransactionsSection = () => {
  const { transactions, loading, getFilteredTransactions, getStats } = useAdminTransactions();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTransactions = getFilteredTransactions(searchTerm, typeFilter, statusFilter);
  const stats = getStats();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Complétée</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-orange-200 text-orange-700">En attente</Badge>;
      case "failed":
        return <Badge variant="destructive">Échouée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "vente":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
            <TrendingDown className="h-3 w-3 mr-1" />
            Vente
          </Badge>
        );
      case "recharge":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <TrendingUp className="h-3 w-3 mr-1" />
            Recharge
          </Badge>
        );
      case "refund":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <TrendingDown className="h-3 w-3 mr-1" />
            Remboursement
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">{/* Removed duplicate header */}

      {/* Statistiques du jour */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mobile-padding">
        <Card>
          <CardContent className="mobile-card">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">Transactions aujourd'hui</p>
            <p className="text-xl sm:text-2xl font-bold">{stats.todayTransactions}</p>
          </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="mobile-card">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">Ventes du jour</p>
            <p className="text-xl sm:text-2xl font-bold truncate">{stats.todayRevenue.toLocaleString()} XAF</p>
          </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="mobile-card">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">Recharges du jour</p>
            <p className="text-xl sm:text-2xl font-bold truncate">{stats.todayRecharges.toLocaleString()} XAF</p>
          </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="mobile-card">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">Remboursements du jour</p>
            <p className="text-xl sm:text-2xl font-bold truncate">{stats.todayRefunds?.toLocaleString() || '0'} XAF</p>
          </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <div className="mobile-padding">
        <Card>
          <CardHeader className="mobile-card">
            <CardTitle className="flex items-center gap-2 mobile-text">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Filtres et recherche
            </CardTitle>
          </CardHeader>
          <CardContent className="mobile-card">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par ID, agent, participant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="vente">Ventes</SelectItem>
                     <SelectItem value="recharge">Recharges</SelectItem>
                     <SelectItem value="refund">Remboursements</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="completed">Complétées</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="failed">Échouées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des transactions */}
      <div className="mobile-padding">
        <Card>
          <CardHeader className="mobile-card">
            <CardTitle className="mobile-text">Historique des transactions ({filteredTransactions.length})</CardTitle>
            <CardDescription className="mobile-text">
              Dernières transactions de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">ID</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm">Type</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm">Montant</TableHead>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">Agent</TableHead>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">Participant</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm">Produit</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 mobile-text">
                        Chargement des transactions...
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground mobile-text">
                        Aucune transaction trouvée. Connectez votre base de données pour voir les transactions.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate" title={transaction.id}>
                          {transaction.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          {getTypeBadge(transaction.type)}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {transaction.amount.toLocaleString()} XAF
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm max-w-[120px] truncate" title={transaction.agentName}>
                          {transaction.agentName}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm max-w-[120px] truncate" title={transaction.participantName}>
                          {transaction.participantName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate" title={transaction.productName || "-"}>
                          {transaction.productName || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString('fr-FR', { 
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionsSection;