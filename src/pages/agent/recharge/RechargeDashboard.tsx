import { LogOut, Battery, Plus, History, Minus, CalendarDays, User } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAgentAuth } from "@/contexts/AgentAuthContext";
import { useRechargeStats } from "@/hooks/useRechargeStats";
import { useTransactions } from "@/hooks/useTransactions";

const RechargeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAgentAuth();
  const { stats, loading: statsLoading } = useRechargeStats();
  const { transactions, loading: transactionsLoading } = useTransactions('current');
  // Use event name from user context (already loaded)
  const eventName = user?.eventName || "";

  const handleLogout = () => {
    logout();
  };

  const quickActions = [
    {
      title: "Recharger",
      description: "Effectuer une recharge de solde",
      icon: Plus,
      action: () => navigate("/agent/recharge/scanner", { state: { operation: 'recharge' } }),
      color: "bg-green-600"
    },
    {
      title: "Rembourser",
      description: "Effectuer un remboursement",
      icon: Minus,
      action: () => navigate("/agent/recharge/scanner", { state: { operation: 'refund' } }),
      color: "bg-destructive"
    },
    {
      title: "Historique",
      description: "Voir l'historique des transactions",
      icon: History,
      action: () => navigate("/agent/recharge/historique"),
      color: "bg-muted-foreground"
    },
    {
      title: "Mon Compte",
      description: "Gérer mon profil",
      icon: User,
      action: () => navigate("/agent/change-password"),
      color: "bg-secondary"
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Fixed Header */}
      <header className="shrink-0 w-full bg-primary text-primary-foreground py-3 sm:py-4 safe-area-top z-10">
        {/* Mobile Header */}
        <div className="sm:hidden px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">Recharge</h1>
              <p className="text-primary-foreground/90 text-sm truncate mt-0.5">
                {user?.name || "Agent"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                className="text-primary-foreground hover:bg-primary-foreground/20 h-9 w-9 rounded-full"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {eventName && (
            <div className="flex items-center gap-1.5 text-primary-foreground/80 text-xs bg-primary-foreground/10 px-2 py-1 rounded-full w-fit">
              <CalendarDays className="w-3 h-3" />
              <span className="truncate max-w-[200px]">{eventName}</span>
            </div>
          )}
        </div>
        {/* Desktop Header */}
        <div className="hidden sm:block container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold truncate">Dashboard Agent Recharge</h1>
              <p className="text-primary-foreground/80 text-xs sm:text-sm truncate">
                Bienvenue, {user?.name || "Agent"}
              </p>
              {eventName && (
                <div className="flex items-center gap-1 text-primary-foreground/60 text-xs">
                  <CalendarDays className="w-3 h-3" />
                  <span>Événement: {eventName}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="text-primary-foreground hover:bg-primary-foreground/10 p-2 sm:px-3 sm:py-2 flex-shrink-0"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto mobile-padding py-4 sm:py-8 safe-area-bottom">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Statistiques */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {/* Mobile: Gradient Cards */}
            <div className="sm:hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 shadow-lg shadow-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-50/90 text-xs font-medium">Total rechargé</p>
                <Plus className="h-4 w-4 text-green-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {statsLoading ? "..." : (stats.totalRecharged / 1000).toFixed(0) + "k"}
              </p>
              <p className="text-green-50/80 text-xs">
                {statsLoading ? "..." : stats.rechargeCount} recharges
              </p>
            </div>
            <div className="sm:hidden bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 shadow-lg shadow-red-500/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-50/90 text-xs font-medium">Total remboursé</p>
                <Minus className="h-4 w-4 text-red-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {statsLoading ? "..." : (stats.totalRefunded / 1000).toFixed(0) + "k"}
              </p>
              <p className="text-red-50/80 text-xs">
                {statsLoading ? "..." : stats.refundCount} remboursements
              </p>
            </div>
            <div className="sm:hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg shadow-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-50/90 text-xs font-medium">Aujourd'hui (+)</p>
                <Battery className="h-4 w-4 text-blue-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {statsLoading ? "..." : (stats.todayRecharged / 1000).toFixed(0) + "k"}
              </p>
              <p className="text-blue-50/80 text-xs">XAF rechargé</p>
            </div>
            <div className="sm:hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 shadow-lg shadow-orange-500/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-orange-50/90 text-xs font-medium">Aujourd'hui (-)</p>
                <Battery className="h-4 w-4 text-orange-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {statsLoading ? "..." : (stats.todayRefunded / 1000).toFixed(0) + "k"}
              </p>
              <p className="text-orange-50/80 text-xs">XAF remboursé</p>
            </div>

            {/* Desktop: Classic Cards */}
            <Card className="hidden sm:block card-banking">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mobile-card">
                <CardTitle className="text-xs sm:text-sm font-medium">Total rechargé</CardTitle>
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </CardHeader>
              <CardContent className="mobile-card pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                  {statsLoading ? "..." : stats.totalRecharged.toLocaleString()} XAF
                </div>
                <p className="text-xs text-muted-foreground">
                  {statsLoading ? "..." : stats.rechargeCount} recharges
                </p>
              </CardContent>
            </Card>

            <Card className="hidden sm:block card-banking">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mobile-card">
                <CardTitle className="text-xs sm:text-sm font-medium">Total remboursé</CardTitle>
                <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
              </CardHeader>
              <CardContent className="mobile-card pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                  {statsLoading ? "..." : stats.totalRefunded.toLocaleString()} XAF
                </div>
                <p className="text-xs text-muted-foreground">
                  {statsLoading ? "..." : stats.refundCount} remboursements
                </p>
              </CardContent>
            </Card>

            <Card className="hidden sm:block card-banking">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mobile-card">
                <CardTitle className="text-xs sm:text-sm font-medium">Aujourd'hui (+)</CardTitle>
                <Battery className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </CardHeader>
              <CardContent className="mobile-card pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                  {statsLoading ? "..." : stats.todayRecharged.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">XAF rechargé</p>
              </CardContent>
            </Card>

            <Card className="hidden sm:block card-banking">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mobile-card">
                <CardTitle className="text-xs sm:text-sm font-medium">Aujourd'hui (-)</CardTitle>
                <Battery className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
              </CardHeader>
              <CardContent className="mobile-card pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-destructive">
                  {statsLoading ? "..." : stats.todayRefunded.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">XAF remboursé</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions rapides */}
          <div>
            <h2 className="text-base sm:text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 lg:mb-6 text-foreground">Actions rapides</h2>
            {/* Mobile: Gradient Buttons */}
            <div className="grid grid-cols-2 sm:hidden gap-3">
              {quickActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`${action.color} rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 flex flex-col items-center justify-center min-h-[120px] text-white`}
                  >
                    <div className="bg-white/20 rounded-full p-3 mb-3">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm mb-1">{action.title}</p>
                    <p className="text-white/80 text-xs text-center">{action.description}</p>
                  </button>
                );
              })}
            </div>
            {/* Desktop: Classic Cards */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {quickActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <Card 
                    key={index} 
                    className="card-banking cursor-pointer hover:shadow-md transition-all duration-200 btn-touch active:scale-[0.97]"
                    onClick={action.action}
                  >
                    <CardHeader className="text-center mobile-card pb-2 sm:pb-3">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4`}>
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                      </div>
                      <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">{action.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="mobile-card pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4 leading-relaxed">
                        {action.description}
                      </p>
                      <Button className="w-full btn-primary btn-touch text-xs sm:text-sm">
                        Accéder
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Dernières transactions */}
          <Card className="card-banking">
            <CardHeader className="mobile-card pb-2 sm:pb-3">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">Dernières transactions</CardTitle>
            </CardHeader>
            <CardContent className="mobile-card pt-0">
              <div className="space-y-2 sm:space-y-3">
                {transactionsLoading ? (
                  <div className="text-center text-muted-foreground">Chargement...</div>
                ) : transactions.length === 0 ? (
                  <div className="text-center text-muted-foreground">Aucune transaction récente</div>
                ) : (
                  transactions
                    .filter(t => t.type === 'recharge' || t.type === 'refund')
                    .slice(0, 4)
                    .map((transaction, index) => {
                      const createdAt = new Date(transaction.createdAt);
                      const time = createdAt.toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                      return (
                        <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-muted rounded-lg">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              transaction.type === 'recharge' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              {transaction.type === 'recharge' ? (
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-green-600" />
                              ) : (
                                <Minus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-destructive" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-xs sm:text-sm lg:text-base truncate">
                                {transaction.participantName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {time} • {transaction.type === 'recharge' ? 'Recharge' : 'Remboursement'}
                              </p>
                            </div>
                          </div>
                          <span className={`font-bold text-xs sm:text-sm lg:text-base flex-shrink-0 ml-2 ${
                            transaction.type === 'recharge' ? 'text-green-600' : 'text-destructive'
                          }`}>
                            {transaction.type === 'recharge' ? '+' : '-'}{transaction.amount.toLocaleString()} XAF
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RechargeDashboard;
