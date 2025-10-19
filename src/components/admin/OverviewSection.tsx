import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Calendar, TrendingUp, Activity, Target } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { useAgents } from "@/hooks/useAgents";
import { useAdminProducts } from "@/hooks/useAdminProducts";
import { useStats } from "@/hooks/useStats";
import { StatCard } from "./shared/StatCard";

const OverviewSection = () => {
  const { events } = useEvents();
  const { agents } = useAgents();
  const { products } = useAdminProducts();
  const { stats } = useStats();

  const activeEvents = events.filter(event => event.status === 'active').length;
  const activeAgents = agents.filter(agent => agent.active).length;
  const activeProducts = products.filter(product => product.active).length;
  const totalSales = stats.totalSales || 0;

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 shrink-0">
        <StatCard
          title="Événements actifs"
          value={activeEvents}
          icon={Calendar}
          iconColor="text-primary"
          subtitle="En cours"
        />
        <StatCard
          title="Agents actifs"
          value={activeAgents}
          icon={Users}
          iconColor="text-blue-500"
          subtitle="Disponibles"
        />
        <StatCard
          title="Produits"
          value={activeProducts}
          icon={Package}
          iconColor="text-orange-500"
          subtitle="Disponibles"
        />
        <StatCard
          title="Ventes totales"
          value={`${totalSales.toLocaleString()} XAF`}
          icon={TrendingUp}
          iconColor="text-green-500"
          subtitle="Chiffre d'affaires"
        />
      </div>

      {/* Welcome Card with better design */}
      <Card className="card-banking flex-1">
        <CardHeader className="mobile-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="mobile-text">Bienvenue sur le dashboard administrateur</CardTitle>
              <CardDescription className="mobile-text mt-1">
                Gérez vos événements, agents, produits et suivez les performances
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="mobile-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Actions rapides
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span><strong>Événements :</strong> Créer et gérer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  <span><strong>Agents :</strong> Ajouter et configurer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  <span><strong>Produits :</strong> Gérer le catalogue</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Suivi & Analytics
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
                  <span><strong>Affectations :</strong> Produits aux agents</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                  <span><strong>Transactions :</strong> Historique complet</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-purple-500 rounded-full"></div>
                  <span><strong>Paramètres :</strong> Configuration système</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewSection;