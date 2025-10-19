import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
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
      const selectedEventName = events.find((e) => e.id.toString() === formData.eventId)?.name;
      const { data, error } = await supabase.functions.invoke('create-agent', {
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          eventId: parseInt(formData.eventId),
          firstName: formData.firstName,
          lastName: formData.lastName,
          eventName: selectedEventName
        }
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la création de l\'agent');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la création de l\'agent');
      }

      toast({
        title: 'Succès',
        description: 'Agent créé avec succès. Un email avec les informations de connexion a été envoyé.',
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
      onAgentAdded();
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Erreur lors de la création de l\'agent',
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