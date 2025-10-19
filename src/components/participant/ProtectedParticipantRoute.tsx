import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParticipantAuth } from '@/contexts/ParticipantAuthContext';

interface ProtectedParticipantRouteProps {
  children: React.ReactNode;
}

const ProtectedParticipantRoute: React.FC<ProtectedParticipantRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useParticipantAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/participant/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedParticipantRoute;