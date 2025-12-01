import { useState, useEffect } from "react";
import { ArrowLeft, Settings, Mail, Lock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import Footer from "@/components/shared/Footer";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      console.log('📝 Form submission:', { email });
      const result = await login(email, password);
      console.log('📥 Login result in form:', result);
      
      if (result.success) {
        console.log('✅ Login successful, redirecting...');
        navigate("/admin/dashboard");
      } else {
        const errorMsg = result.error || "Erreur de connexion";
        console.error('❌ Login failed in form:', errorMsg);
        setError(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Unexpected error in form:', error);
      setError(error?.message || "Erreur de connexion inattendue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col">
      {/* Modern Mobile-First Header */}
      <header className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-3 sm:py-4 safe-area-top">
        <div className="container mx-auto px-4 sm:px-6 flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/login")}
            className="text-primary-foreground hover:bg-primary-foreground/10 active:scale-95 transition-all shrink-0 h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex-1">Connexion Organisateur</h1>
        </div>
      </header>

      {/* Main Content - Mobile optimized */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
        <div className="max-w-md mx-auto">
          <Card className="border-2 shadow-2xl shadow-primary/5 bg-card/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4 pb-6">
              {/* Modern Icon Design */}
              <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-3xl blur-xl"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-lg border border-primary/20">
                  <Settings className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Organisateur
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-muted-foreground">
                  Accès sécurisé au tableau de bord de gestion
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-5 sm:space-y-6">
              {error && (
                <Alert variant="destructive" className="border-2 animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="organisateur@eventime.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 sm:pl-12 h-11 sm:h-12 rounded-xl border-2 focus:border-primary transition-all text-base"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 sm:pl-12 h-11 sm:h-12 rounded-xl border-2 focus:border-primary transition-all text-base"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all active:scale-95"
                  disabled={isLoading || !email || !password}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Connexion en cours...
                    </span>
                  ) : (
                    "Accéder au tableau de bord"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminLogin;