import { useState } from "react";
import { ArrowLeft, Battery, Calendar, Filter, Search, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";

const HistoriqueRecharge = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { transactions, loading, getFilteredTransactions } = useTransactions('current');

  const handleBack = () => {
    navigate("/agent/recharge/dashboard");
  };

  // Filter transactions to show only recharges and refunds
  const rechargeTransactions = transactions.filter(t => t.type === 'recharge' || t.type === 'refund');

  const filteredHistory = rechargeTransactions.filter(record => {
    const matchesSearch = 
      record.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const recordDate = new Date(record.createdAt);
    
    const matchesDate = dateFilter === "all" || 
      (dateFilter === "today" && recordDate.toDateString() === today.toDateString()) ||
      (dateFilter === "yesterday" && recordDate.toDateString() === yesterday.toDateString());
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Terminée</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Échec</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const totalAmount = filteredHistory
    .filter(r => r.status === "completed")
    .reduce((sum, r) => {
      if (r.type === 'recharge') return sum + r.amount;
      if (r.type === 'refund') return sum - r.amount; // Subtract refunds
      return sum;
    }, 0);

  const handleExport = () => {
    // Export functionality
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Date,Heure,Type,Montant,Statut\n"
      + filteredHistory.map(r => 
          `${r.id},${new Date(r.createdAt).toLocaleDateString()},${new Date(r.createdAt).toLocaleTimeString()},${r.type},${r.amount},${r.status}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historique_recharges.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full bg-primary text-primary-foreground py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="text-primary-foreground hover:bg-primary-foreground/10 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-xl font-bold">Historique des Recharges</h1>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleExport}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-banking">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total période</CardTitle>
                <Battery className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAmount.toLocaleString()} XAF</div>
                <p className="text-xs text-muted-foreground">Recharges nettes</p>
              </CardContent>
            </Card>

            <Card className="card-banking">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredHistory.length}</div>
                <p className="text-xs text-muted-foreground">Dans la période</p>
              </CardContent>
            </Card>

            <Card className="card-banking">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux de réussite</CardTitle>
                <Filter className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredHistory.length > 0 
                    ? Math.round((filteredHistory.filter(r => r.status === "completed").length / filteredHistory.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Transactions réussies</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtres */}
          <Card className="card-banking">
            <CardHeader>
              <CardTitle>Filtres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recherche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ID transaction..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Statut</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
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
                  <label className="text-sm font-medium">Période</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
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
                    className="w-full"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des recharges */}
          <Card className="card-banking">
            <CardHeader>
              <CardTitle>Historique ({filteredHistory.length} transaction(s))</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Chargement des transactions...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Battery className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucune recharge trouvée</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          record.status === "completed" ? "bg-green-100" :
                          record.status === "pending" ? "bg-yellow-100" : "bg-red-100"
                        }`}>
                          <Battery className={`w-6 h-6 ${
                            record.status === "completed" ? "text-green-600" :
                            record.status === "pending" ? "text-yellow-600" : "text-red-600"
                          }`} />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium">{record.type === 'refund' ? 'Remboursement' : 'Recharge'}</p>
                            {getStatusBadge(record.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ID: {record.id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.createdAt).toLocaleDateString()} à {new Date(record.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-bold text-lg ${
                          record.type === 'refund' ? "text-red-600" : "text-green-600"
                        }`}>
                          {record.type === 'refund' ? "-" : "+"}{record.amount.toLocaleString()} XAF
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HistoriqueRecharge;