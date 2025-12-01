import { useState } from "react";
import { Minus, Plus, ShoppingCart, Scan, User, CreditCard, Package, ArrowLeft, CheckCircle, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAgentProducts, AgentProduct } from "@/hooks/useAgentProducts";
import { useTransactionHandler } from "@/hooks/useTransactionHandler";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import QRCodeScanner from "@/components/shared/QRCodeScanner";
import { db } from "@/integrations/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/integrations/firebase/types";

interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  maxStock: number;
}

interface Participant {
  id: string;
  name: string;
  email?: string;
  balance: number;
  qr_code?: string;
}

const VendreProduits = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Récupérer le panier depuis le state de navigation ou sessionStorage
    const pendingCart = location.state?.pendingCart;
    if (pendingCart) {
      sessionStorage.removeItem('pendingCart'); // Nettoyer après utilisation
      return pendingCart;
    }
    return [];
  });
  const [participant, setParticipant] = useState<Participant | null>(() => {
    // Récupérer le participant depuis le state de navigation
    return location.state?.participant || null;
  });
  const [qrCode, setQrCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { products, loading: productsLoading } = useAgentProducts();
  const { processTransaction, getParticipantByQR, loading: handlerLoading } = useTransactionHandler();

  const addToCart = (product: AgentProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity < existing.maxStock) {
          return prev.map(item =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          toast.error(`Stock insuffisant pour ${product.name}`);
          return prev;
        }
      } else {
        if (product.stock > 0) {
          return [...prev, {
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock
          }];
        } else {
          toast.error(`${product.name} est en rupture de stock`);
          return prev;
        }
      }
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => 
      prev.map(item => {
        if (item.productId === productId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) {
            return null;
          }
          if (newQuantity > item.maxStock) {
            toast.error(`Stock insuffisant pour ${item.productName}`);
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleQRScan = async (qrData: string) => {
    try {
      const result = await getParticipantByQR(qrData);
      if (result) {
        setParticipant(result);
        setQrCode(qrData);
        setScannerOpen(false);
        toast.success(`Participant trouvé: ${result.name}`);
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
    }
  };

  const searchParticipant = async () => {
    if (!qrCode.trim()) {
      toast.error("Veuillez entrer un code QR");
      return;
    }

    try {
      const result = await getParticipantByQR(qrCode.trim());
      if (result) {
        setParticipant(result);
        toast.success(`Participant trouvé: ${result.name}`);
      } else {
        toast.error("Participant non trouvé");
        setParticipant(null);
      }
    } catch (error) {
      console.error('Error searching participant:', error);
      toast.error("Erreur lors de la recherche du participant");
      setParticipant(null);
    }
  };

  const processCheckout = async () => {
    if (!participant) {
      toast.error("Veuillez d'abord scanner un participant");
      return;
    }

    if (cart.length === 0) {
      toast.error("Le panier est vide");
      return;
    }

    // Calculer le montant total
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Vérifier que le participant a suffisamment de solde
    if (participant.balance < totalAmount) {
      toast.error(`Solde insuffisant. Solde disponible: ${participant.balance.toLocaleString()} XAF, Total requis: ${totalAmount.toLocaleString()} XAF`);
      return;
    }

    setProcessing(true);

    try {
      console.log('🛒 Starting checkout process:', {
        participantId: participant.id,
        participantName: participant.name,
        currentBalance: participant.balance,
        totalAmount: totalAmount,
        itemsCount: cart.length,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        }))
      });

      // Process each item in cart as a separate transaction
      const processedTransactions = [];
      for (const item of cart) {
        const itemTotal = item.price * item.quantity;
        
        console.log(`📦 Processing item: ${item.productName}`, {
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: itemTotal
        });

        const transactionRequest = {
          type: 'vente' as const,
          participantId: participant.id,
          productId: item.productId,
          amount: itemTotal,
          quantity: item.quantity
        };

        const result = await processTransaction(transactionRequest);
        
        if (!result) {
          throw new Error(`Erreur lors de la vente de ${item.productName}`);
        }
        
        processedTransactions.push({
          productName: item.productName,
          quantity: item.quantity,
          amount: itemTotal,
          transactionId: result.id
        });
        
        console.log(`✅ Item processed: ${item.productName}`, {
          transactionId: result.id,
          newBalance: result.newBalance
        });
      }

      console.log('✅ All items processed successfully:', {
        totalTransactions: processedTransactions.length,
        totalAmount: totalAmount,
        transactions: processedTransactions
      });

      // Recharger les données du participant depuis Firestore pour obtenir le nouveau solde
      try {
        const participantRef = doc(db, COLLECTIONS.PARTICIPANTS, participant.id);
        const participantDoc = await getDoc(participantRef);
        
        if (participantDoc.exists()) {
          const updatedData = participantDoc.data();
          setParticipant({
            ...participant,
            balance: updatedData.balance || participant.balance
          });
          console.log('✅ Participant data refreshed with new balance:', {
            oldBalance: participant.balance,
            newBalance: updatedData.balance
          });
        }
      } catch (error) {
        console.warn('⚠️ Could not refresh participant data:', error);
      }

      // Success - clear cart but keep participant for potential new sale
      setCart([]);
      setQrCode("");
      
      toast.success(`Vente effectuée avec succès ! ${totalAmount.toLocaleString()} XAF débités.`);
      
      // Optionnel: rediriger vers le dashboard après un court délai
      setTimeout(() => {
        navigate('/agent/vente/dashboard');
      }, 2000);

    } catch (error) {
      console.error('❌ Checkout error:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la vente");
    } finally {
      setProcessing(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center mobile-padding">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-6"></div>
          <p className="text-lg font-medium text-muted-foreground">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle mobile-padding safe-area-top safe-area-bottom">
      <div className="max-w-7xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="flex items-center gap-4 py-6 mb-6 animate-fade-in">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/agent/vente/dashboard')}
            className="btn-touch glass-effect hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="mobile-title font-bold text-foreground">Vendre des Produits</h1>
            <p className="mobile-text text-muted-foreground mt-1">
              Scannez un participant et ajoutez des produits au panier
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Section principale */}
          <div className="xl:col-span-2 space-y-6 animate-slide-up">
            {/* Participant Section */}
            <div className="card-banking animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Participant</h2>
                  <p className="mobile-text text-muted-foreground">Rechercher par code QR</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Input
                  placeholder="Code QR du participant"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="input-banking flex-1"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setScannerOpen(true)} 
                    variant="outline"
                    className="btn-touch glass-effect hover:bg-primary/10"
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Scanner
                  </Button>
                  <Button 
                    onClick={searchParticipant} 
                    disabled={handlerLoading}
                    className="btn-primary btn-touch"
                  >
                    {handlerLoading ? "..." : "Rechercher"}
                  </Button>
                </div>
              </div>
              
              {participant && (
                <div className="p-6 bg-gradient-primary rounded-xl text-primary-foreground animate-fade-in success-glow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6" />
                      <div>
                        <p className="text-lg font-semibold">{participant.name}</p>
                        <p className="text-sm opacity-90">{participant.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <Wallet className="h-5 w-5" />
                        <p className="text-xl font-bold">
                          {participant.balance?.toLocaleString()} XAF
                        </p>
                      </div>
                      <p className="text-xs opacity-75">Solde disponible</p>
                    </div>
                  </div>
                </div>
                )}
                
                {/* Scanner QR Modal */}
                {scannerOpen && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Scanner QR Code</h3>
                      <QRCodeScanner 
                        onScan={handleQRScan}
                        isScanning={true}
                        className="w-full mb-4"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => setScannerOpen(false)}
                        className="w-full"
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            {/* Products Section */}
            <div className="card-banking animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-secondary/20 rounded-xl">
                  <Package className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Produits disponibles</h2>
                  <p className="mobile-text text-muted-foreground">
                    {products.length} produit{products.length > 1 ? 's' : ''} disponible{products.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                    <Package className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-2">Aucun produit assigné</p>
                  <p className="mobile-text text-muted-foreground">
                    Contactez l'administrateur pour obtenir des produits à vendre
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product, index) => (
                    <div 
                      key={product.id} 
                      className="group relative card-banking hover:shadow-elegant-lg transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          <Badge 
                            variant={product.stock > 10 ? "secondary" : product.stock > 0 ? "default" : "destructive"}
                            className="shrink-0"
                          >
                            Stock: {product.stock}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="text-2xl font-bold text-primary">
                              {product.price.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground ml-1">XAF</span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => addToCart(product)}
                            disabled={product.stock === 0}
                            className="btn-primary btn-touch group-hover:animate-pulse-glow"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panier Section */}
          <div className="xl:col-span-1 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="sticky top-6">
              <div className="card-banking">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Panier</h2>
                    <p className="mobile-text text-muted-foreground">
                      {cart.length} article{cart.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="mobile-text text-muted-foreground">Le panier est vide</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cart.map((item, index) => (
                        <div 
                          key={item.productId} 
                          className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl animate-fade-in"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{item.productName}</p>
                            <p className="mobile-text text-muted-foreground">
                              {item.price.toLocaleString()} XAF × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.productId, 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromCart(item.productId)}
                              className="h-8 w-8 p-0 ml-2"
                            >
                              ×
                            </Button>
                          </div>
                          <div className="text-right min-w-0">
                            <p className="font-bold text-primary">
                              {(item.price * item.quantity).toLocaleString()} XAF
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-border pt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-foreground">Total:</span>
                        <span className="text-2xl font-bold text-primary">
                          {totalAmount.toLocaleString()} XAF
                        </span>
                      </div>
                      
                      <Button 
                        className="w-full btn-primary btn-touch text-lg py-6"
                        onClick={processCheckout}
                        disabled={!participant || cart.length === 0 || processing}
                      >
                        <CreditCard className="h-5 w-5 mr-3" />
                        {processing ? "Traitement en cours..." : "Finaliser la vente"}
                      </Button>
                      
                      {participant && totalAmount > participant?.balance && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="mobile-text text-destructive font-medium text-center">
                            Solde insuffisant
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendreProduits;
