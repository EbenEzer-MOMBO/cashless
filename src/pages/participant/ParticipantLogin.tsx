import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, QrCode, Ticket, ArrowLeft } from 'lucide-react';
import { useParticipantAuth } from '@/contexts/ParticipantAuthContext';
import QRCodeScanner from '@/components/shared/QRCodeScanner';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/shared/Footer';

const ParticipantLogin = () => {
  const [ticketCode, setTicketCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useParticipantAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (code: string) => {
    if (!code.trim()) {
      setError('Veuillez saisir un code de ticket valide');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login with ticket code:', code.trim());
      const success = await login(code.trim());
      
      if (success) {
        console.log('✅ Login successful');
        toast({
          title: "Connexion réussie",
          description: "Bienvenue dans votre portefeuille numérique !",
        });
        navigate('/participant/dashboard');
      } else {
        console.error('❌ Login failed');
        // L'erreur sera affichée via le toast et le message d'erreur
        setError('Code de ticket invalide, expiré ou non trouvé. Vérifiez votre code et réessayez.');
        toast({
          variant: "destructive",
          title: "Erreur de connexion",
          description: "Code de ticket invalide, expiré ou non trouvé. Vérifiez votre code et réessayez.",
        });
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur de connexion. Veuillez réessayer.';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(ticketCode);
  };

  const handleQRScan = (data: string) => {
    console.log('QR scanned:', data);
    setTicketCode(data);
    handleLogin(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-foreground hover:bg-foreground/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Portefeuille Numérique</h1>
          <p className="text-muted-foreground">
            Connectez-vous avec votre code de ticket pour accéder à votre portefeuille
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Connexion Participant
            </CardTitle>
            <CardDescription>
              Scannez votre QR code ou saisissez votre code de ticket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">
                  Saisie manuelle
                </TabsTrigger>
                <TabsTrigger value="scan" className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  Scanner QR
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-4">
                <QRCodeScanner
                  onScan={handleQRScan}
                  isScanning={true}
                />

                {ticketCode && (
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Code détecté:</p>
                    <p className="font-mono text-sm bg-background p-2 rounded border">
                      {ticketCode}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="mb-4 p-3 bg-secondary/30 rounded-lg border">
                  <p className="text-sm text-muted-foreground text-center">
                    Copiez-collez le code de votre ticket reçu par email ou SMS
                  </p>
                </div>
                
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-code">Code de ticket</Label>
                    <Input
                      id="ticket-code"
                      type="text"
                      placeholder="ticket_gIcCfbezy8"
                      value={ticketCode}
                      onChange={(e) => setTicketCode(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading || !ticketCode.trim()}>
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Se connecter
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Besoin d'aide ? Contactez l'équipe de l'événement</p>
        </div>
        
        <Footer />
      </div>
    </div>
  );
};

export default ParticipantLogin;