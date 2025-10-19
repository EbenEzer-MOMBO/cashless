import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AgentAuthProvider } from "@/contexts/AgentAuthContext";
import { ParticipantAuthProvider } from "@/contexts/ParticipantAuthContext";
import ProtectedAdminRoute from "@/components/admin/ProtectedAdminRoute";
import ProtectedAgentRoute from "@/components/agent/ProtectedAgentRoute";
import ProtectedParticipantRoute from "@/components/participant/ProtectedParticipantRoute";
import Login from "./pages/Login";
import AgentLogin from "./pages/agent/AgentLogin";
import ChangePassword from "./pages/agent/ChangePassword";
import RechargeDashboard from "./pages/agent/recharge/RechargeDashboard";
import Recharger from "./pages/agent/recharge/Recharger";
import Rembourser from "./pages/agent/recharge/Rembourser";
import HistoriqueRecharge from "./pages/agent/recharge/HistoriqueRecharge";
import VenteDashboard from "./pages/agent/vente/VenteDashboard";
import VendreProduits from "./pages/agent/vente/VendreProduits";
import HistoriqueVente from "./pages/agent/vente/HistoriqueVente";
import QRScanner from "./pages/agent/shared/QRScanner";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ParticipantLogin from "./pages/participant/ParticipantLogin";
import ParticipantDashboard from "./pages/participant/ParticipantDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="cashless-ui-theme">
      <TooltipProvider>
        <AdminAuthProvider>
          <AgentAuthProvider>
            <ParticipantAuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            
            {/* Agent Routes */}
            <Route path="/agent/login" element={<AgentLogin />} />
            <Route path="/agent/change-password" element={
              <ProtectedAgentRoute>
                <ChangePassword />
              </ProtectedAgentRoute>
            } />
            
            {/* Agent Recharge Routes */}
            <Route path="/agent/recharge/dashboard" element={
              <ProtectedAgentRoute requiredRole="recharge">
                <RechargeDashboard />
              </ProtectedAgentRoute>
            } />
            <Route path="/agent/recharge/scanner" element={
              <ProtectedAgentRoute requiredRole="recharge">
                <QRScanner />
              </ProtectedAgentRoute>
            } />
            <Route path="/agent/recharge/recharger" element={
              <ProtectedAgentRoute requiredRole="recharge">
                <Recharger />
              </ProtectedAgentRoute>
            } />
            <Route path="/agent/recharge/rembourser" element={
              <ProtectedAgentRoute requiredRole="recharge">
                <Rembourser />
              </ProtectedAgentRoute>
            } />
            <Route path="/agent/recharge/historique" element={
              <ProtectedAgentRoute requiredRole="recharge">
                <HistoriqueRecharge />
              </ProtectedAgentRoute>
            } />
            
            {/* Agent Vente Routes */}
            <Route path="/agent/vente/dashboard" element={
              <ProtectedAgentRoute requiredRole="vente">
                <VenteDashboard />
              </ProtectedAgentRoute>
            } />
            <Route path="/agent/vente/scanner" element={
              <ProtectedAgentRoute requiredRole="vente">
                <QRScanner />
              </ProtectedAgentRoute>
            } />
            <Route path="/agent/vente/vendre" element={
              <ProtectedAgentRoute requiredRole="vente">
                <VendreProduits />
              </ProtectedAgentRoute>
            } />
            <Route path="/agent/vente/produits" element={
              <ProtectedAgentRoute requiredRole="vente">
                <VendreProduits />
              </ProtectedAgentRoute>
            } />
            <Route path="/agent/vente/historique" element={
              <ProtectedAgentRoute requiredRole="vente">
                <HistoriqueVente />
              </ProtectedAgentRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            } />
            
            {/* Participant Routes */}
            <Route path="/participant/login" element={<ParticipantLogin />} />
            <Route path="/participant/dashboard" element={
              <ProtectedParticipantRoute>
                <ParticipantDashboard />
              </ProtectedParticipantRoute>
            } />
            
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ParticipantAuthProvider>
          </AgentAuthProvider>
        </AdminAuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
