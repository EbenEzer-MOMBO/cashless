import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvents } from '@/hooks/useEvents';
import { db, auth } from '@/integrations/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

interface AddAgentDialogProps {
  onAgentAdded: () => void;
}

interface AgentFormData {
  name: string;
  email: string;
  password: string;
  role: 'recharge' | 'vente' | '';
  eventId: string;
  firstName: string;
  lastName: string;
}

export const AddAgentDialog: React.FC<AddAgentDialogProps> = ({ onAgentAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    email: '',
    password: '',
    role: '',
    eventId: '',
    firstName: '',
    lastName: ''
  });

  const { events, loading: eventsLoading } = useEvents();
  const { toast } = useToast();

  const handleInputChange = (field: keyof AgentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill name when first/last name changes
    if (field === 'firstName' || field === 'lastName') {
      const firstName = field === 'firstName' ? value : formData.firstName;
      const lastName = field === 'lastName' ? value : formData.lastName;
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        name: `${firstName} ${lastName}`.trim()
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le nom est requis' });
      return false;
    }
    if (!formData.email.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'L\'email est requis' });
      return false;
    }
    if (!formData.password.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le mot de passe est requis' });
      return false;
    }
    if (formData.password.length < 6) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le mot de passe doit contenir au moins 6 caractères' });
      return false;
    }
    if (!formData.role) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le rôle est requis' });
      return false;
    }
    if (!formData.eventId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'L\'événement est requis' });
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Format d\'email invalide' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      console.log('🔐 Creating Firebase Auth user...', { email: formData.email });
      
      let userId: string;
      
      try {
        // Try to create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        userId = userCredential.user.uid;
        console.log('✅ Firebase Auth user created:', userId);
      } catch (authError: any) {
        console.error('❌ Firebase Auth error:', authError);
        
        // If Firebase Auth is not configured, generate a temporary user ID
        if (authError.code === 'auth/configuration-not-found' || 
            authError.code === 'auth/operation-not-allowed') {
          
          // Generate a unique ID for the agent (we'll use a hash of email + timestamp)
          const timestamp = Date.now();
          const emailHash = btoa(formData.email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
          userId = `agent_${emailHash}_${timestamp}`;
          
          console.warn('⚠️ Firebase Auth not configured, using temporary user ID:', userId);
          console.warn('⚠️ Please enable Email/Password authentication in Firebase Console');
          
          toast({
            variant: 'default',
            title: 'Attention - Firebase Auth non configuré',
            description: 'Activez Email/Password dans Firebase Console > Authentication > Sign-in method. L\'agent est créé avec un ID temporaire.',
          });
        } else {
          throw authError; // Re-throw other auth errors
        }
      }

      console.log('📝 Creating agent document in Firestore...', {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        event_id: formData.eventId,
        user_id: userId
      });

      // Create agent document in Firestore
      let agentDocRef;
      try {
        agentDocRef = await addDoc(collection(db, COLLECTIONS.AGENTS), {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          event_id: formData.eventId,
          user_id: userId,
          active: true,
          password_changed: false,
          temporary_password: formData.password,
          total_sales: 0,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        });

        console.log('✅ Agent document created:', agentDocRef.id);
      } catch (firestoreError: any) {
        // Handle offline errors
        if (firestoreError.code === 'unavailable' || 
            firestoreError.message?.includes('offline') ||
            firestoreError.message?.includes('network')) {
          console.warn('⚠️ Firestore is offline. Document will be created when connection is restored.');
          
          // With offline persistence enabled, the document will be created when online
          // But we should still show a warning to the user
          toast({
            variant: 'default',
            title: 'Mode hors ligne',
            description: 'L\'agent sera créé lorsque la connexion sera rétablie. Vérifiez votre connexion internet.',
          });
          
          // Still reset form and close dialog as the operation will complete when online
          setFormData({
            name: '',
            email: '',
            password: '',
            role: '',
            eventId: '',
            firstName: '',
            lastName: ''
          });
          
          setOpen(false);
          onAgentAdded();
          return;
        }
        throw firestoreError; // Re-throw other errors
      }

      toast({
        title: 'Succès',
        description: 'Agent créé avec succès.',
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        eventId: '',
        firstName: '',
        lastName: ''
      });

      setOpen(false);
      
      // Call onAgentAdded immediately and also after a delay to ensure Firestore has processed the write
      // The real-time listener will also pick up the change, but this ensures immediate refresh
      onAgentAdded();
      setTimeout(() => {
        onAgentAdded();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error creating agent:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = 'Erreur lors de la création de l\'agent';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Cet email est déjà utilisé';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe est trop faible (minimum 6 caractères)';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format d\'email invalide';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Permission refusée. Vérifiez les règles de sécurité Firestore.';
      } else if (error.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Authentication n\'est pas configuré. Activez Email/Password dans Firebase Console.';
      } else if (error.code === 'unavailable' || error.message?.includes('offline')) {
        errorMessage = 'Connexion internet requise. Vérifiez votre connexion et réessayez.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un nouvel agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Jean"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Dupont"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="jean.dupont@example.com"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe temporaire *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Min. 6 caractères"
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rôle *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleInputChange('role', value)}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recharge">Agent de recharge</SelectItem>
                  <SelectItem value="vente">Agent de vente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event">Événement *</Label>
              <Select 
                value={formData.eventId} 
                onValueChange={(value) => handleInputChange('eventId', value)}
                disabled={loading || eventsLoading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={eventsLoading ? "Chargement..." : "Sélectionner un événement"} />
                </SelectTrigger>
                <SelectContent>
                  {events.length === 0 && !eventsLoading ? (
                    <SelectItem value="" disabled>Aucun événement disponible</SelectItem>
                  ) : (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || eventsLoading} className="w-full sm:w-auto">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer l'agent
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
