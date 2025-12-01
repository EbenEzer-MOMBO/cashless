import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import OverviewSection from "@/components/admin/OverviewSection";
import EventsSection from "@/components/admin/EventsSection";
import AgentsSection from "@/components/admin/AgentsSection";
import ParticipantsSection from "@/components/admin/ParticipantsSection";
import ProductsSection from "@/components/admin/ProductsSection";
import TransactionsSection from "@/components/admin/TransactionsSection";
import SettingsSection from "@/components/admin/SettingsSection";
import ProductAssignmentsSection from "@/components/admin/ProductAssignmentsSection";
import { 
  Activity, 
  Calendar, 
  Users, 
  User, 
  Package, 
  Target, 
  CreditCard, 
  Settings as SettingsIcon 
} from "lucide-react";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("overview");

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "events":
        return <EventsSection />;
      case "agents":
        return <AgentsSection />;
      case "participants":
        return <ParticipantsSection />;
      case "products":
        return <ProductsSection />;
      case "assignments":
        return <ProductAssignmentsSection />;
      case "transactions":
        return <TransactionsSection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <OverviewSection />;
    }
  };

  const getSectionTitle = () => {
    const titles = {
      overview: "Aperçu général",
      events: "Gestion des événements",
      agents: "Gestion des agents",
      participants: "Gestion des participants",
      products: "Gestion des produits",
      assignments: "Affectations produits",
      transactions: "Historique des transactions",
      settings: "Paramètres système",
    };
    return titles[activeSection as keyof typeof titles] || "Dashboard";
  };

  const getSectionIcon = () => {
    const iconProps = "h-5 w-5 shrink-0";
    const icons = {
      overview: <Activity className={`${iconProps} text-primary`} />,
      events: <Calendar className={`${iconProps} text-blue-500`} />,
      agents: <Users className={`${iconProps} text-orange-500`} />,
      participants: <User className={`${iconProps} text-purple-500`} />,
      products: <Package className={`${iconProps} text-green-500`} />,
      assignments: <Target className={`${iconProps} text-red-500`} />,
      transactions: <CreditCard className={`${iconProps} text-yellow-600`} />,
      settings: <SettingsIcon className={`${iconProps} text-gray-500`} />,
    };
    return icons[activeSection as keyof typeof icons] || icons.overview;
  };

  const getSectionDescription = () => {
    const descriptions = {
      overview: "Vue d'ensemble de votre plateforme de gestion d'événements",
      events: "Créer et gérer vos événements",
      agents: "Ajouter et configurer vos agents de vente et recharge",
      participants: "Gérer les participants et leurs portefeuilles",
      products: "Gérer votre catalogue de produits",
      assignments: "Assigner des produits spécifiques aux agents",
      transactions: "Suivre toutes les transactions effectuées",
      settings: "Configuration générale du système",
    };
    return descriptions[activeSection as keyof typeof descriptions] || "";
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
        {/* Mobile: Sidebar hidden by default, desktop: visible */}
        <div className="hidden md:block">
          <AdminSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile-First Header */}
          <header className="h-14 sm:h-16 md:h-20 border-b bg-background/80 backdrop-blur-lg shrink-0 z-50 relative overflow-hidden sticky top-0 safe-area-top">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5"></div>
            
            <div className="relative flex h-full items-center px-3 sm:px-4 md:px-6 gap-2 sm:gap-3 md:gap-6">
              {/* Mobile: Menu button, Desktop: Sidebar trigger */}
              <div className="md:hidden">
                <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl hover:bg-muted/60 active:scale-95 transition-all duration-200 border border-border/50" />
              </div>
              <div className="hidden md:block">
                <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl hover:bg-muted/60 hover:scale-105 transition-all duration-200 border border-border/50" />
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                {/* Icon with modern design */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl blur-md"></div>
                  <div className="relative bg-gradient-to-br from-card via-card to-accent/20 p-2 sm:p-2.5 md:p-3 rounded-2xl border border-border/60 shadow-lg shadow-primary/5">
                    {getSectionIcon()}
                  </div>
                </div>
                
                {/* Typography optimized for mobile */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold tracking-tight leading-tight">
                    <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                      {getSectionTitle()}
                    </span>
                  </h1>
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate mt-0.5 sm:mt-1 font-medium">
                    {getSectionDescription()}
                  </p>
                </div>
              </div>
              
              {/* Theme Toggle - Mobile optimized */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <ThemeToggle />
              </div>
            </div>
            
            {/* Decorative bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
          </header>

          {/* Scrollable Main content - Mobile optimized */}
          <main className="flex-1 overflow-y-auto overscroll-behavior-contain">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
              <div className="animate-fade-in">
                {renderContent()}
              </div>
            </div>
          </main>
        </div>

        {/* Mobile Sidebar Overlay */}
        <div className="md:hidden">
          <AdminSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;