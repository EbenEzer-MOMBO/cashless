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
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      {/* Header */}
      <SidebarHeader className="border-b">
        <div className="p-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Admin</h2>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
              <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    isActive={activeSection === item.id}
                    className="w-full justify-start"
                    onClick={() => onSectionChange(item.id)}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t">
        <div className="p-4 space-y-3">
          {/* User info */}
          {!isCollapsed && user && (
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstname} {user.lastname}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          
          {isCollapsed && user && (
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}

          <Separator />

          {/* Logout button */}
          <Button
            variant="ghost"
            className={`${isCollapsed ? 'w-8 h-8 p-0' : 'w-full justify-start'} text-destructive hover:text-destructive hover:bg-destructive/10`}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Déconnexion</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}