import { useState } from "react";
import { ArrowLeft, Package, Calendar, Filter, Search, Download, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { format, parseISO, startOfDay, endOfDay, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

interface SaleRecord {
  id: string;
  date: string;
  time: string;
  participantName: string;
  participantId: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: "completed" | "pending" | "failed";
  balanceAfter: number;
}

const HistoriqueVente = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Utiliser les vraies données de la base
  const { transactions, loading, error, getStats } = useTransactions('current');

  const handleBack = () => {
    navigate("/agent/vente/dashboard");
  };

  // Filtrer les transactions de vente uniquement
  const salesTransactions = transactions.filter(t => t.type === 'vente');

  const filteredHistory = salesTransactions.filter(transaction => {
    const matchesSearch = 
      transaction.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.productName && transaction.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    
    const transactionDate = parseISO(transaction.createdAt);
    let matchesDate = dateFilter === "all";
    if (dateFilter === "today") {
      matchesDate = isToday(transactionDate);
    } else if (dateFilter === "yesterday") {
      matchesDate = isYesterday(transactionDate);
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Terminée</Badge>;
      case "pending":
        return <Badge variant="secondary">En attente</Badge>;
      case "failed":
        return <Badge variant="destructive">Échec</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const stats = getStats();

  const handleExport = () => {
    if (filteredHistory.length === 0) {
      return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Date,Heure,Participant,Produit,Montant,Statut\n"
      + filteredHistory.map(t => {
          const date = format(parseISO(t.createdAt), 'dd/MM/yyyy', { locale: fr });
          const time = format(parseISO(t.createdAt), 'HH:mm', { locale: fr });
          return `${t.id},${date},${time},${t.participantName},${t.productName || 'N/A'},${t.amount},${t.status}`;
        }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historique_ventes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center mobile-padding">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-6"></div>
          <p className="text-lg font-medium text-muted-foreground">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center mobile-padding">
        <div className="text-center animate-fade-in">
          <Package className="h-16 w-16 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium text-destructive mb-2">Erreur de chargement</p>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle mobile-padding safe-area-top safe-area-bottom">
      <div className="max-w-7xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="flex items-center gap-4 py-6 mb-6 animate-fade-in">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleBack}
            className="btn-touch glass-effect hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="mobile-title font-bold text-foreground">Historique des Ventes</h1>
            <p className="mobile-text text-muted-foreground mt-1">
              Suivez toutes vos transactions de vente
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={filteredHistory.length === 0}
            className="glass-effect hover:bg-primary/10 hidden sm:flex"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>

        <div className="space-y-6 animate-slide-up">
          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="card-banking animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Total ventes</p>
                  <p className="text-xl font-bold text-foreground truncate">
                    {stats.todayRevenue.toLocaleString()} XAF
                  </p>
                </div>
              </div>
            </div>

            <div className="card-banking animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/20 rounded-xl">
                  <Package className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Nb transactions</p>
                  <p className="text-xl font-bold text-foreground">
                    {stats.ventesCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-banking animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/30 rounded-xl">
                  <Calendar className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Aujourd'hui</p>
                  <p className="text-xl font-bold text-foreground">
                    {stats.todayTransactions}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-banking animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Taux réussite</p>
                  <p className="text-xl font-bold text-foreground">
                    {filteredHistory.length > 0 
                      ? Math.round((filteredHistory.filter(r => r.status === "completed").length / filteredHistory.length) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="card-banking animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Filtres</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom, produit, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-banking pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Statut</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="input-banking">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="completed">Terminées</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="failed">Échecs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Période</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="input-banking">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="yesterday">Hier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setDateFilter("all");
                  }}
                  className="w-full glass-effect hover:bg-primary/10"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>

          {/* Liste des ventes */}
          <div className="card-banking animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Transactions</h2>
                  <p className="mobile-text text-muted-foreground">
                    {filteredHistory.length} transaction{filteredHistory.length > 1 ? 's' : ''} trouvée{filteredHistory.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleExport}
                disabled={filteredHistory.length === 0}
                className="glass-effect hover:bg-primary/10 sm:hidden"
                size="sm"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
            
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                  <Package className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium text-muted-foreground mb-2">Aucune vente trouvée</p>
                <p className="mobile-text text-muted-foreground">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((transaction, index) => (
                  <div 
                    key={transaction.id} 
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        transaction.status === "completed" ? "bg-primary/10" :
                        transaction.status === "pending" ? "bg-secondary/20" : "bg-destructive/10"
                      }`}>
                        <Package className={`w-6 h-6 ${
                          transaction.status === "completed" ? "text-primary" :
                          transaction.status === "pending" ? "text-secondary-foreground" : "text-destructive"
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground truncate">
                            {transaction.participantName}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="mobile-text text-muted-foreground truncate mb-1">
                          {transaction.productName || 'Produit non spécifié'}
                          {transaction.quantity && transaction.quantity > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (×{transaction.quantity})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(transaction.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })} • ID: {transaction.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right sm:min-w-0">
                      <p className={`font-bold text-xl ${
                        transaction.status === "completed" ? "text-primary" :
                        transaction.status === "pending" ? "text-secondary-foreground" : "text-destructive"
                      }`}>
                        {transaction.amount.toLocaleString()} XAF
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoriqueVente;