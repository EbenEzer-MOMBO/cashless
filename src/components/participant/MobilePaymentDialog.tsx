
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Smartphone, CheckCircle } from 'lucide-react';
import { useMobilePayment } from '@/hooks/useMobilePayment';
import { useParticipantAuth } from '@/contexts/ParticipantAuthContext';

interface MobilePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const MobilePaymentDialog = ({ open, onOpenChange, onSuccess }: MobilePaymentDialogProps) => {
  const { participant } = useParticipantAuth();
  const { initiatePayment, checkPaymentStatus, loading, checkingPayment, error, paymentResult: hookPaymentResult } = useMobilePayment();
  
  const [formData, setFormData] = useState({
    msisdn: '',
    amount: '',
    firstname: participant?.name?.split(' ')[0] || '',
    lastname: participant?.name?.split(' ').slice(1).join(' ') || '',
    email: participant?.email || '',
    payment_system: '' as 'airtelmoney' | 'moovmoney4' | ''
  });

  const [paymentResult, setPaymentResult] = useState<{
    bill_id: string;
    reference: string;
    amount: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.payment_system) {
      return;
    }

    const result = await initiatePayment({
      ...formData,
      amount: parseFloat(formData.amount),
      payment_system: formData.payment_system
    });

    // Utiliser la vérification robuste du succès
    const isSuccess = result?.success === true || result?.success === 'true';
    if (isSuccess && result.data) {
      setPaymentResult({
        bill_id: result.data.bill_id,
        reference: result.data.reference,
        amount: result.data.amount
      });
    }
  };

  const handleCheckPayment = async () => {
    if (!paymentResult) return;

    const result = await checkPaymentStatus(paymentResult.bill_id);
    const isSuccess = result?.success === true || result?.success === 'true';
    if (isSuccess) {
      onSuccess();
      onOpenChange(false);
      setPaymentResult(null);
      setFormData({
        msisdn: '',
        amount: '',
        firstname: participant?.name?.split(' ')[0] || '',
        lastname: participant?.name?.split(' ').slice(1).join(' ') || '',
        email: participant?.email || '',
        payment_system: ''
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPaymentResult(null);
    setFormData({
      msisdn: '',
      amount: '',
      firstname: participant?.name?.split(' ')[0] || '',
      lastname: participant?.name?.split(' ').slice(1).join(' ') || '',
      email: participant?.email || '',
      payment_system: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Recharge par Mobile Money
          </DialogTitle>
          <DialogDescription>
            Rechargez votre portefeuille via Airtel Money ou Moov Money
          </DialogDescription>
        </DialogHeader>

        {!paymentResult ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="payment_system">Système de paiement</Label>
              <Select
                value={formData.payment_system}
                onValueChange={(value: 'airtelmoney' | 'moovmoney4') => 
                  setFormData(prev => ({ ...prev, payment_system: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisissez votre opérateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="airtelmoney">Airtel Money</SelectItem>
                  <SelectItem value="moovmoney4">Moov Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="msisdn">Numéro de téléphone</Label>
              <Input
                id="msisdn"
                placeholder="06XXXXXXXX ou 07XXXXXXXX"
                value={formData.msisdn}
                onChange={(e) => setFormData(prev => ({ ...prev, msisdn: e.target.value }))}
                pattern="^(06|07)\d{7}$"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant (FCFA)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Minimum 100 FCFA"
                min="100"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstname">Prénom</Label>
                <Input
                  id="firstname"
                  value={formData.firstname}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstname: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Nom</Label>
                <Input
                  id="lastname"
                  value={formData.lastname}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastname: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initiation en cours...
                </>
              ) : (
                'Initier le paiement'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <Smartphone className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <h3 className="font-medium mb-2">Paiement initié</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Un message USSD a été envoyé à votre téléphone. 
                Suivez les instructions pour confirmer le paiement de{' '}
                <span className="font-bold">{paymentResult.amount.toLocaleString()} FCFA</span>.
              </p>
              <p className="text-xs text-muted-foreground">
                Référence: {paymentResult.reference}
              </p>
            </div>

            <Button 
              onClick={handleCheckPayment} 
              className="w-full"
              disabled={checkingPayment}
            >
              {checkingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Vérifier le paiement
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleClose} className="w-full">
              Annuler
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
