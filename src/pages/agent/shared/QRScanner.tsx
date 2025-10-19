import { useState } from "react";
import { ArrowLeft, QrCode, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTransactionHandler } from "@/hooks/useTransactionHandler";
import QRCodeScanner from "@/components/shared/QRCodeScanner";

const QRScanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { getParticipantByQR } = useTransactionHandler();
  const [manualCode, setManualCode] = useState("");
  const [participantData, setParticipantData] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);

  // Déterminer le rôle et l'opération basé sur l'URL et state
  const isRechargeAgent = location.pathname.includes('/recharge/');
  const agentType = isRechargeAgent ? 'recharge' : 'vente';
  const operation = location.state?.operation || (isRechargeAgent ? 'recharge' : 'vente');

  const handleBack = () => {
    navigate(`/agent/${agentType}/dashboard`);
  };

  const handleQRScan = async (qrData: string) => {
    console.log('QR Code scanné:', qrData);
    try {
      const participant = await getParticipantByQR(qrData);
      if (participant) {
        setParticipantData(participant);
        setIsCameraActive(false); // Désactiver la caméra après scan réussi
        toast({
          title: "QR Code scanné",
          description: `Participant: ${participant.name}`,
        });
      }
    } catch (error) {
      console.error('QR scan failed:', error);
      toast({
        title: "Erreur",
        description: "Impossible de scanner ce QR code",
        variant: "destructive"
      });
    }
  };

  const handleManualEntry = async () => {
    if (manualCode.trim()) {
      try {
        const participant = await getParticipantByQR(manualCode);
        if (participant) {
          setParticipantData(participant);
          setIsCameraActive(false); // Désactiver la caméra après saisie réussie
          toast({
            title: "Code saisi manuellement",
            description: `Participant: ${participant.name}`,
          });
        }
      } catch (error) {
        console.error('Manual code entry failed:', error);
      }
    }
  };

  const handleProceed = () => {
    if (operation === 'refund') {
      navigate('/agent/recharge/rembourser', { state: { participant: participantData } });
    } else if (operation === 'recharge') {
      navigate('/agent/recharge/recharger', { state: { participant: participantData } });
    } else {
      // Récupérer le panier sauvegardé s'il existe
      const pendingCart = sessionStorage.getItem('pendingCart');
      navigate('/agent/vente/produits', { 
        state: { 
          participant: participantData,
          pendingCart: pendingCart ? JSON.parse(pendingCart) : null
        } 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full bg-primary text-primary-foreground py-4">
        <div className="container mx-auto px-6 flex items-center">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="text-primary-foreground hover:bg-primary-foreground/10 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-xl font-bold">
            Scanner QR Code - {operation === 'refund' ? 'Remboursement' : operation === 'recharge' ? 'Recharge' : 'Vente'}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Scanner QR */}
          <Card className="card-banking">
            <CardHeader className="text-center">
              <QrCode className="w-16 h-16 mx-auto mb-4 text-primary" />
              <CardTitle>Scanner le QR Code du participant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <QRCodeScanner 
                onScan={handleQRScan}
                isScanning={isCameraActive}
                className="w-full"
              />
              {!isCameraActive && participantData && (
                <div className="text-center text-sm text-muted-foreground mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-green-700 font-medium">📷 Caméra désactivée - Participant identifié</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saisie manuelle - Cachée quand participant identifié */}
          {!participantData && (
            <Card className="card-banking">
              <CardHeader>
                <CardTitle>Ou saisir manuellement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-code">Code participant</Label>
                  <Input
                    id="manual-code"
                    placeholder="Entrez le code du participant"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="input-banking"
                  />
                </div>
                <Button 
                  onClick={handleManualEntry}
                  disabled={!manualCode.trim()}
                  variant="outline"
                  className="w-full"
                >
                  Valider le code
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Résultat */}
          {participantData && (
            <Card className="card-banking border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-green-800">Participant identifié</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-green-700">Nom</p>
                    <p className="text-green-800">{participantData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">ID</p>
                    <p className="text-green-800">{participantData.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Solde actuel</p>
                    <p className="text-green-800 font-bold">{participantData.balance.toLocaleString()} XAF</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Statut</p>
                    <p className="text-green-800 capitalize">{participantData.status}</p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleProceed}
                  className="w-full btn-primary"
                >
                  {operation === 'refund' ? "Procéder au remboursement" : operation === 'recharge' ? "Procéder au rechargement" : "Procéder à la vente"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default QRScanner;