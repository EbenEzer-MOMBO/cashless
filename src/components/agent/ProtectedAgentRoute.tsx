import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAgentAuth } from '@/contexts/AgentAuthContext';

interface ProtectedAgentRouteProps {
  children: ReactNode;
  requiredRole?: 'recharge' | 'vente';
}

const ProtectedAgentRoute: React.FC<ProtectedAgentRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isAuthenticated, isLoading } = useAgentAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isChangePasswordRoute = location.pathname === '/agent/change-password';

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/agent/login');
        return;
      }

      // Vérifier si l'agent doit changer son mot de passe
      if (user && !user.passwordChanged && !isChangePasswordRoute) {
        navigate('/agent/change-password');
        return;
      }

      // Vérifier le rôle si spécifié
      if (requiredRole && user && user.role !== requiredRole) {
        // Rediriger vers le dashboard approprié selon le rôle
        const dashboardPath = user.role === 'recharge' 
          ? '/agent/recharge/dashboard' 
          : '/agent/vente/dashboard';
        navigate(dashboardPath);
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, navigate, requiredRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!user.passwordChanged && !isChangePasswordRoute) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedAgentRoute;