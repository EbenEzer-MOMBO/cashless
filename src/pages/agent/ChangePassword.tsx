import { useState } from "react";
import { Lock, Eye, EyeOff, ArrowLeft, User, Briefcase, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useAgentAuth } from "@/contexts/AgentAuthContext";
import { toast } from "@/hooks/use-toast";

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, changePassword } = useAgentAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await changePassword(newPassword);
      
      if (result.success) {
        toast({
          title: "Mot de passe modifié",
          description: "Votre mot de passe a été changé avec succès",
        });
        
        // Rediriger vers le dashboard approprié
        const dashboardPath = user?.role === 'recharge' 
          ? '/agent/recharge/dashboard' 
          : '/agent/vente/dashboard';
        navigate(dashboardPath);
      } else {
        setError(result.error || "Erreur lors du changement de mot de passe");
      }
    } catch (error) {
      console.error('Password change error:', error);
      setError("Erreur lors du changement de mot de passe. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const dashboardPath = user?.role === 'recharge' 
      ? '/agent/recharge/dashboard' 
      : '/agent/vente/dashboard';
    navigate(dashboardPath);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle mobile-padding safe-area-top safe-area-bottom">
      <div className="max-w-md mx-auto">
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
            <h1 className="mobile-title font-bold text-foreground">Mon Compte</h1>
            <p className="mobile-text text-muted-foreground mt-1">
              Changement de mot de passe obligatoire
            </p>
          </div>
        </div>

        <div className="card-banking animate-slide-up">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 success-glow">
              <Lock className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Nouveau mot de passe requis
            </h2>
            <p className="mobile-text text-muted-foreground">
              Pour votre sécurité, vous devez changer votre mot de passe temporaire
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6 animate-fade-in">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Informations utilisateur */}
          <div className="grid grid-cols-1 gap-4 mb-6 p-4 bg-gradient-subtle rounded-xl border border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{user?.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Briefcase className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {user?.role === 'recharge' ? 'Agent Recharge' : 'Agent Vente'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/30 rounded-lg">
                <Calendar className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{user?.eventName}</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-semibold text-foreground">
                Nouveau mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-banking pl-10 pr-12"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
                Confirmer le mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-banking pl-10 pr-12"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full btn-primary btn-touch text-lg py-6"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? "Changement en cours..." : "Changer le mot de passe"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-border/50">
            <p className="text-sm font-semibold text-foreground mb-3">Exigences du mot de passe :</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                Au moins 8 caractères
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                Mélange de lettres et chiffres recommandé
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                Évitez les mots de passe trop simples
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;