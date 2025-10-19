import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Calendar, Wallet, CreditCard, Phone, Mail, Hash, QrCode, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Participant } from "@/hooks/useParticipants";

interface ParticipantDetailDialogProps {
  participant: Participant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParticipantTransaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  agent_name?: string;
  product_name?: string;
  status: string;
}

export const ParticipantDetailDialog = ({ participant, open, onOpenChange }: ParticipantDetailDialogProps) => {
  const [transactions, setTransactions] = useState<ParticipantTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalSpent: 0,
    totalRecharged: 0,
  });

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} XAF`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadParticipantTransactions = async (participantId: number) => {
    try {
      setLoadingTransactions(true);
      
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          created_at,
          status,
          agent_id,
          product_id
        `)
        .eq('participant_id', participantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (transactionsData && transactionsData.length > 0) {
        // Get agent and product names
        const agentIds = [...new Set(transactionsData.map(t => t.agent_id).filter(Boolean))];
        const productIds = [...new Set(transactionsData.map(t => t.product_id).filter(Boolean))];

        const [agentsRes, productsRes] = await Promise.all([
          agentIds.length > 0 ? supabase.from('agents').select('id, name').in('id', agentIds) : { data: [] },
          productIds.length > 0 ? supabase.from('products').select('id, name').in('id', productIds) : { data: [] }
        ]);

        const agentsMap = (agentsRes.data || []).reduce((acc, a) => { acc[a.id] = a.name; return acc; }, {} as Record<number, string>);
        const productsMap = (productsRes.data || []).reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {} as Record<number, string>);

        const formattedTransactions = transactionsData.map(t => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          created_at: t.created_at,
          agent_name: t.agent_id ? agentsMap[t.agent_id] : undefined,
          product_name: t.product_id ? productsMap[t.product_id] : undefined,
          status: t.status
        }));

        setTransactions(formattedTransactions);

        // Calculate stats
        const totalTransactions = formattedTransactions.length;
        const totalSpent = formattedTransactions
          .filter(t => t.type === 'vente')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalRecharged = formattedTransactions
          .filter(t => t.type === 'recharge')
          .reduce((sum, t) => sum + t.amount, 0);

        setStats({ totalTransactions, totalSpent, totalRecharged });
      } else {
        setTransactions([]);
        setStats({ totalTransactions: 0, totalSpent: 0, totalRecharged: 0 });
      }
    } catch (error) {
      console.error('Error loading participant transactions:', error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (participant && open) {
      loadParticipantTransactions(participant.id);
    }
  }, [participant, open]);

  if (!participant) return null;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vente': return 'Vente';
      case 'recharge': return 'Recharge';
      case 'refund': return 'Remboursement';
      default: return type;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'vente': return 'destructive';
      case 'recharge': return 'default';
      case 'refund': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Détails du participant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Nom complet</p>
                      <p className="text-sm text-muted-foreground">{participant.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{participant.email || 'Non renseigné'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Téléphone</p>
                      <p className="text-sm text-muted-foreground">{participant.phone || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Événement</p>
                      <p className="text-sm text-muted-foreground">{participant.eventName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Numéro de ticket</p>
                      <p className="text-sm text-muted-foreground">{participant.ticketNumber || 'Non renseigné'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Statut</p>
                      <Badge variant={participant.status === "active" ? "default" : "secondary"}>
                        {participant.status === "active" ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Informations financières
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(participant.balance)}</p>
                  <p className="text-sm text-muted-foreground">Balance actuelle</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalSpent)}</p>
                  <p className="text-sm text-muted-foreground">Total dépensé</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRecharged)}</p>
                  <p className="text-sm text-muted-foreground">Total rechargé</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Transactions récentes (10 dernières)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Chargement des transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Aucune transaction trouvée</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Agent/Produit</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Badge variant={getTypeVariant(transaction.type)}>
                              {getTypeLabel(transaction.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {transaction.agent_name && (
                              <div>Agent: {transaction.agent_name}</div>
                            )}
                            {transaction.product_name && (
                              <div>Produit: {transaction.product_name}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                              {transaction.status === 'completed' ? 'Terminée' : transaction.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Code QR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Code QR du participant</p>
                  <p className="text-sm text-muted-foreground font-mono">{participant.qrCode}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilisé pour l'identification lors des transactions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};