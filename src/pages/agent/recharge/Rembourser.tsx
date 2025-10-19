import { useState } from "react";
import { ArrowLeft, Minus, CreditCard, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTransactionHandler } from "@/hooks/useTransactionHandler";

const Rembourser = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);

  const participantData = location.state?.participant;
  const { processTransaction, loading } = useTransactionHandler();

  const handleBack = () => {
    navigate("/agent/recharge/dashboard");
  };

  const predefinedAmounts = [5000, 10000, 15000, 25000];

  const handleAmountClick = (value: number) => {
    setAmount(value.toString());
  };

  const handleRefund = async () => {
    const refundAmount = parseFloat(amount);
    
    if (!amount || refundAmount <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant valide",
        variant: "destructive"
      });
      return;
    }

    if (!participantData) {
      toast({
        title: "Erreur",
        description: "Aucun participant sélectionné",
        variant: "destructive"
      });
      return;
    }

    if (refundAmount > participantData.balance) {
      toast({
        title: "Erreur",
        description: "Le montant du remboursement ne peut pas dépasser le solde disponible",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await processTransaction({
        type: 'refund',
        amount: refundAmount,
        participantId: participantData.id
      });

      if (result) {
        setTransactionResult(result);
        // Mettre à jour le solde du participant avec le nouveau solde
        if (participantData) {
          const updatedParticipant = { ...participantData, balance: result.newBalance };
          location.state = { ...location.state, participant: updatedParticipant };
        }
        setSuccess(true);
        toast({
          title: "Remboursement effectué",
          description: `${amount} XAF remboursés à ${participantData.name}`,
        });
      }
    } catch (error) {
      console.error('Refund error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du remboursement",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewRefund = () => {
    setAmount("");
    setSuccess(false);
    navigate("/agent/recharge/scanner", { state: { operation: 'refund' } });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <header className="w-full bg-destructive text-destructive-foreground py-3 sm:py-4 safe-area-top">
          <div className="container mx-auto mobile-padding flex items-center">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="text-destructive-foreground hover:bg-destructive-foreground/10 p-2 sm:px-3 sm:py-2 mr-2 sm:mr-4 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <h1 className="text-lg sm:text-xl font-bold truncate">Remboursement effectué</h1>
          </div>
        </header>

        <main className="container mx-auto mobile-padding py-4 sm:py-8 safe-area-bottom">
          <div className="max-w-md mx-auto">
            <Card className="card-banking border-red-200 bg-red-50">
              <CardHeader className="text-center mobile-card">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-destructive" />
                <CardTitle className="text-destructive mobile-title">Remboursement réussi !</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 mobile-card">
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-semibold text-destructive">
                    -{amount} XAF remboursés
                  </p>
                  {participantData && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white rounded-lg">
                      <p className="font-medium mobile-text">{participantData.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">ID: {participantData.id}</p>
                      <p className="text-base sm:text-lg font-bold text-destructive mt-2">
                        Nouveau solde: {transactionResult?.newBalance?.toLocaleString() || '0'} XAF
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={handleNewRefund}
                    className="w-full btn-touch"
                    style={{ 
                      background: 'hsl(var(--destructive))',
                      color: 'hsl(var(--destructive-foreground))'
                    }}
                  >
                    Nouveau remboursement
                  </Button>
                  <Button 
                    onClick={handleBack}
                    variant="outline"
                    className="w-full btn-touch"
                  >
                    Retour au dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full bg-destructive text-destructive-foreground py-3 sm:py-4 safe-area-top">
        <div className="container mx-auto mobile-padding flex items-center">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="text-destructive-foreground hover:bg-destructive-foreground/10 p-2 sm:px-3 sm:py-2 mr-2 sm:mr-4 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Retour</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold truncate">Rembourser un compte</h1>
        </div>
      </header>

      <main className="container mx-auto mobile-padding py-4 sm:py-8 safe-area-bottom">
        <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
          
          {/* Info participant */}
          {participantData && (
            <Card className="card-banking">
              <CardHeader className="mobile-card">
                <CardTitle className="mobile-title">Participant sélectionné</CardTitle>
              </CardHeader>
              <CardContent className="mobile-card">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground mobile-text">Nom:</span>
                    <span className="font-medium mobile-text truncate ml-2">{participantData.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground mobile-text">ID:</span>
                    <span className="font-medium font-mono text-xs sm:text-sm truncate ml-2">{participantData.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground mobile-text">Solde actuel:</span>
                    <span className="font-bold text-green-600 mobile-text ml-2">{participantData.balance.toLocaleString()} XAF</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Montants prédéfinis */}
          <Card className="card-banking">
            <CardHeader className="mobile-card">
              <CardTitle className="mobile-title">Montants rapides</CardTitle>
            </CardHeader>
            <CardContent className="mobile-card">
              <div className="grid grid-cols-2 gap-3">
                {predefinedAmounts.map((value) => (
                  <Button
                    key={value}
                    variant={amount === value.toString() ? "default" : "outline"}
                    onClick={() => handleAmountClick(value)}
                    className="h-10 sm:h-12 text-sm sm:text-base btn-touch"
                    style={amount === value.toString() ? { 
                      background: 'hsl(var(--destructive))',
                      color: 'hsl(var(--destructive-foreground))'
                    } : {}}
                  >
                    {value} XAF
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Montant personnalisé */}
          <Card className="card-banking">
            <CardHeader className="mobile-card">
              <CardTitle className="mobile-title">Montant personnalisé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 mobile-card">
              <div className="space-y-2">
                <Label htmlFor="amount" className="mobile-text">Montant à rembourser (XAF)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-banking text-base sm:text-lg h-12"
                  min="0"
                  max={participantData?.balance || undefined}
                  step="0.01"
                />
              </div>
              
              {amount && parseFloat(amount) > 0 && participantData && (
                <div className="space-y-2">
                  {parseFloat(amount) > participantData.balance && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-destructive">
                        Le montant ne peut pas dépasser le solde disponible
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground">Nouveau solde:</p>
                      <p className="text-base sm:text-lg font-bold text-destructive">
                        {Math.max(0, participantData.balance - parseFloat(amount)).toLocaleString()} XAF
                      </p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleRefund}
                disabled={!amount || parseFloat(amount) <= 0 || isProcessing || loading || (participantData && parseFloat(amount) > participantData.balance)}
                className="w-full btn-touch"
                style={{ 
                  background: 'hsl(var(--destructive))',
                  color: 'hsl(var(--destructive-foreground))'
                }}
              >
                <Minus className="w-4 h-4 mr-2" />
                {isProcessing || loading ? "Traitement..." : `Rembourser ${amount || '0'} XAF`}
              </Button>
            </CardContent>
          </Card>

          {/* Besoin de scanner un QR ? */}
          {!participantData && (
            <Card className="card-banking border-blue-200 bg-blue-50">
              <CardContent className="pt-4 sm:pt-6 mobile-card">
                <div className="text-center">
                  <p className="text-blue-800 mb-3 sm:mb-4 mobile-text">
                    Vous devez d'abord identifier un participant
                  </p>
                  <Button 
                    onClick={() => navigate("/agent/recharge/scanner", { state: { operation: 'refund' } })}
                    className="btn-primary btn-touch"
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    Scanner QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Rembourser;