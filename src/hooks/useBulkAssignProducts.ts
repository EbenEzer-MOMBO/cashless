import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBulkAssignProducts = () => {
  const [loading, setLoading] = useState(false);

  const bulkAssignProducts = async (eventId?: number) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('bulk_assign_unassigned_products', {
        p_event_id: eventId || null
      });

      if (error) throw error;

      const assignedCount = data?.[0]?.assigned_count || 0;
      
      if (assignedCount > 0) {
        toast.success(`${assignedCount} assignations de produits créées avec succès`);
      } else {
        toast.info('Aucune nouvelle assignation nécessaire');
      }

      return assignedCount;
    } catch (err) {
      console.error('Error bulk assigning products:', err);
      toast.error('Erreur lors de l\'assignation en masse des produits');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    bulkAssignProducts,
    loading
  };
};