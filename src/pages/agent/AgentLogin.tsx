import { useState, useEffect } from "react";
import { ArrowLeft, Users, Mail, Lock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useAgentAuth } from "@/contexts/AgentAuthContext";
import Footer from "@/components/shared/Footer";

const AgentLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, isLoading: authLoading } = useAgentAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated && user) {
      if (!user.passwordChanged) {
        navigate("/agent/change-password");
      } else {
        const dashboardPath = user.role === 'recharge' 
          ? '/agent/recharge/dashboard' 
          : '/agent/vente/dashboard';
        navigate(dashboardPath);
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const result = await login(email, password);
    
    if (result.success) {
      if (result.requiresPasswordChange) {
        navigate("/agent/change-password");
      } else {
        // La redirection sera gérée par l'useEffect ci-dessus
      }
    } else {
      setError(result.error || "Erreur de connexion");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full bg-primary text-primary-foreground py-4">
        <div className="container mx-auto px-6 flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/login")}
            className="text-primary-foreground hover:bg-primary-foreground/10 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-xl font-bold">Connexion Agent</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-md mx-auto">
          <Card className="card-banking">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-muted-foreground rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle>Connexion Agent</CardTitle>
              <CardDescription>
                Accédez à votre espace de travail avec vos identifiants
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-banking pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-banking pl-10"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-primary"
                  disabled={isLoading || authLoading || !email || !password}
                >
                  {isLoading || authLoading ? "Connexion en cours..." : "Se connecter"}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Première connexion :</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Utilisez l'email et le mot de passe temporaire reçus lors de la création de votre compte</p>
                  <p>• Vous devrez changer votre mot de passe lors de la première connexion</p>
                  <p>• En cas de problème, contactez votre administrateur</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AgentLogin;