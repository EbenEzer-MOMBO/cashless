import { useState } from "react";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Package, 
  ArrowLeftRight, 
  CreditCard, 
  Settings, 
  LogOut,
  User,
  UserCheck
} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "overview", title: "Aperçu", icon: LayoutDashboard },
  { id: "events", title: "Événements", icon: Calendar },
  { id: "agents", title: "Agents", icon: Users },
  { id: "participants", title: "Participants", icon: UserCheck },
  { id: "products", title: "Produits", icon: Package },
  { id: "assignments", title: "Affectations", icon: ArrowLeftRight },
  { id: "transactions", title: "Transactions", icon: CreditCard },
  { id: "settings", title: "Paramètres", icon: Settings },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const { user, logout } = useAdminAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();
  
  const isCollapsed = state === "collapsed";

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <Sidebar className={`${isCollapsed ? "w-14" : "w-64"} md:w-64 border-r-2 border-border/50`} collapsible="icon" variant="sidebar">
      {/* Header with modern design - Mobile optimized */}
      <SidebarHeader className="border-b bg-gradient-to-br from-background via-background to-muted/20 safe-area-top">
        <div className="p-3 sm:p-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-md"></div>
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-2xl flex items-center justify-center shadow-lg border border-primary/20">
                  <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-base sm:text-lg md:text-xl text-foreground leading-tight">Organisateur</h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">Tableau de bord</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="relative mx-auto">
              <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-md"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-2xl flex items-center justify-center shadow-lg border border-primary/20">
                <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Content - Mobile optimized */}
      <SidebarContent className="overflow-y-auto overscroll-contain">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 sm:px-4 text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5 sm:space-y-2 px-2 sm:px-3">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    isActive={activeSection === item.id}
                    className={`w-full justify-start rounded-2xl transition-all duration-200 min-h-[44px] ${
                      activeSection === item.id 
                        ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/30 border border-primary/20' 
                        : 'hover:bg-muted/60 active:scale-95 border border-transparent'
                    }`}
                    onClick={() => onSectionChange(item.id)}
                  >
                    <item.icon className={`h-5 w-5 sm:h-5 sm:w-5 shrink-0 ${activeSection === item.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    {!isCollapsed && (
                      <span className={`text-sm sm:text-base font-semibold ml-3 ${activeSection === item.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {item.title}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - Mobile optimized */}
      <SidebarFooter className="border-t bg-muted/20">
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {/* User info with modern design */}
          {!isCollapsed && user && (
            <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-card to-muted/30 border border-border/50 shadow-sm">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm"></div>
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold truncate text-foreground">
                  {user.firstname} {user.lastname}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          
          {isCollapsed && user && (
            <div className="relative mx-auto">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm"></div>
              <div className="relative w-9 h-9 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>
          )}

          <Separator className="opacity-50" />

          {/* Logout button - Mobile optimized */}
          <Button
            variant="ghost"
            className={`${isCollapsed ? 'w-9 h-9 p-0 mx-auto' : 'w-full justify-start'} text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all rounded-xl`}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            {!isCollapsed && <span className="ml-2 text-sm sm:text-base font-medium">Déconnexion</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}