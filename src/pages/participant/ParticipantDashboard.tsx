import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, 
  History, 
  QrCode, 
  User, 
  LogOut, 
  RefreshCw,
  Euro,
  Calendar,
  Mail,
  Smartphone,
  RotateCcw
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useParticipantAuth } from '@/contexts/ParticipantAuthContext';
import { db } from '@/integrations/firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { MobilePaymentDialog } from '@/components/participant/MobilePaymentDialog';
import Footer from '@/components/shared/Footer';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  status: string;
  product_id?: string;
  agent_id?: string;
  productName?: string;
  agentName?: string;
}

const ParticipantDashboard = () => {
  const { participant, logout, refreshParticipant } = useParticipantAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showMobilePayment, setShowMobilePayment] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (participant && participant.id) {
      loadTransactions();
      generateQRCode();
      // Rafraîchir le solde du participant pour s'assurer qu'il est à jour
      refreshParticipant().catch(err => {
        console.error('Error refreshing participant:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant?.id]);
  
  // Rafraîchir automatiquement le solde toutes les 5 secondes
  useEffect(() => {
    if (!participant || !participant.id) return;
    
    const interval = setInterval(() => {
      refreshParticipant().catch(err => {
        console.error('Error auto-refreshing participant:', err);
      });
    }, 5000); // Rafraîchir toutes les 5 secondes
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant?.id]);

  const loadTransactions = async () => {
    if (!participant || !participant.id) {
      setIsLoading(false);
      return;
    }

    try {
      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
      // Retirer orderBy pour éviter l'erreur d'index composite
      // On triera côté client
      const q = query(
        transactionsRef,
        where('participant_id', '==', participant.id)
      );
      
      const querySnapshot = await getDocs(q);

      // Collect product IDs
      const productIds = new Set<string>();
      querySnapshot.docs.forEach(docSnapshot => {
        const t = docSnapshot.data();
        if (t.product_id) productIds.add(t.product_id);
      });

      // Fetch product names
      const productsMap: Record<string, string> = {};
      await Promise.all(
        Array.from(productIds).map(async (id) => {
          const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
          if (productDoc.exists()) {
            productsMap[id] = productDoc.data().name;
          }
        })
      );

      const formattedTransactions: Transaction[] = querySnapshot.docs.map(docSnapshot => {
        const t = docSnapshot.data();
        return {
          id: docSnapshot.id,
          type: t.type,
          amount: Number(t.amount),
          created_at: t.created_at?.toDate?.()?.toISOString() || t.created_at,
          status: t.status,
          product_id: t.product_id,
          agent_id: t.agent_id,
          productName: t.product_id ? productsMap[t.product_id] : undefined,
          agentName: 'Agent'
        };
      });
      
      // Trier côté client par date décroissante et limiter à 20
      formattedTransactions.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Décroissant
      });
      
      // Limiter à 20 transactions
      const limitedTransactions = formattedTransactions.slice(0, 20);
      
      setTransactions(limitedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger l'historique des transactions",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!participant || !participant.qr_code) return;

    try {
      const qrData = participant.qr_code;
      const url = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await refreshParticipant();
    await loadTransactions();
    setIsLoading(false);
    toast({
      title: "Actualisation réussie",
      description: "Vos données ont été mises à jour",
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/participant/login');
  };

  const handleMobilePaymentSuccess = () => {
    refreshParticipant();
    loadTransactions();
    toast({
      title: "Recharge réussie",
      description: "Votre portefeuille a été rechargé avec succès",
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'recharge':
        return 'text-green-600';
      case 'vente':
      case 'purchase':
        return 'text-red-600';
      case 'refund':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return '+';
      case 'vente':
      case 'purchase':
        return '-';
      case 'refund':
        return '+';
      default:
        return '';
    }
  };

  if (!participant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de votre portefeuille...</p>
        </div>
      </div>
    );
  }

  // Valeurs par défaut pour éviter les erreurs
  const participantBalance = participant?.balance ?? 0;
  const participantName = participant?.name ?? 'Participant';
  const participantEmail = participant?.email ?? '';
  const participantEventId = participant?.event_id ?? '';
  const participantQrCode = participant?.qr_code ?? '';

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Fixed Header */}
      <header className="shrink-0 bg-background border-b border-border py-4 px-4 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Bonjour, {participantName.split(' ')[0]} !
            </h1>
            <p className="text-muted-foreground">Gérez votre portefeuille numérique</p>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">

      {/* Balance Card with Mobile Payment Button */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wallet className="w-5 h-5" />
            Solde disponible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {formatAmount(participantBalance)}
          </div>
          <p className="text-primary-foreground/80 text-sm mt-1 mb-4">
            Portefeuille numérique
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMobilePayment(true)}
            className="bg-white/20 text-white hover:bg-white/30 border-white/20"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Recharger (Airtel/Moov)
          </Button>
        </CardContent>
      </Card>

      {/* Profile and QR Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{participantName}</span>
              </div>
              {participantEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{participantEmail}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Événement #{participantEventId}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Votre QR Code
            </CardTitle>
            <CardDescription>
              Présentez ce code aux agents pour vos transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="QR Code personnel" 
                className="w-40 h-40 border rounded-lg"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des transactions
          </CardTitle>
          <CardDescription>
            Vos dernières transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune transaction pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={transaction.id}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-secondary flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                        <Euro className="w-4 h-4" />
                      </div>
                      <div>
                        <div>
                          <p className="font-medium capitalize">
                            {transaction.type === 'recharge' && 'Rechargement'}
                            {(transaction.type === 'vente' || transaction.type === 'purchase') && 'Achat'}
                            {transaction.type === 'refund' && 'Remboursement'}
                          </p>
                          {transaction.productName && (
                            <p className="text-xs text-muted-foreground">
                              {transaction.productName}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold flex items-center gap-1 justify-end ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'refund' ? (
                          <RotateCcw className="w-4 h-4" />
                        ) : (
                          getTransactionIcon(transaction.type)
                        )}
                        {formatAmount(Math.abs(transaction.amount))}
                      </p>
                      <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                        {transaction.status === 'completed' ? 'Terminé' : transaction.status}
                      </Badge>
                    </div>
                  </div>
                  {index < transactions.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        {/* Mobile Payment Dialog */}
        <MobilePaymentDialog
          open={showMobilePayment}
          onOpenChange={setShowMobilePayment}
          onSuccess={handleMobilePaymentSuccess}
        />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ParticipantDashboard;
