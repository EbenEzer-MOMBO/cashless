import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Agent {
  id: number;
  name: string;
  email: string;
  role: 'recharge' | 'vente';
  active: boolean;
  lastActivity: string;
  totalSales: number;
  eventId: number;
  eventName: string;
  createdAt?: string;
  updatedAt?: string;
}

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour charger les agents depuis la base de données
  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('list-agents');
      
      if (error) throw error;
      
      const agentsData: Agent[] = (data?.agents || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        active: a.active,
        lastActivity: a.last_activity,
        totalSales: a.total_sales || 0,
        eventId: a.event_id,
        eventName: a.event_name || a.event?.name || '',
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));
      
      setAgents(agentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour activer/désactiver un agent
  const toggleAgentStatus = async (agentId: number): Promise<boolean> => {
    try {
      setError(null);
      
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return false;

      const { error } = await supabase
        .from('agents')
        .update({ 
          active: !agent.active
        })
        .eq('id', agentId);
      
      if (error) throw error;
      
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, active: !agent.active }
          : agent
      ));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut de l\'agent');
      return false;
    }
  };

  // Fonction pour filtrer les agents
  const getFilteredAgents = (roleFilter: string, statusFilter: string) => {
    return agents.filter(agent => {
      const roleMatch = roleFilter === "all" || agent.role === roleFilter;
      const statusMatch = statusFilter === "all" || 
        (statusFilter === "active" && agent.active) ||
        (statusFilter === "inactive" && !agent.active);
      return roleMatch && statusMatch;
    });
  };

  // Statistiques calculées
  const getStats = () => {
    const activeAgents = agents.filter(agent => agent.active).length;
    const rechargeAgents = agents.filter(agent => agent.role === "recharge").length;
    const venteAgents = agents.filter(agent => agent.role === "vente").length;
    
    return {
      activeAgents,
      rechargeAgents,
      venteAgents
    };
  };

  useEffect(() => {
    loadAgents();
  }, []);

  return {
    agents,
    loading,
    error,
    toggleAgentStatus,
    getFilteredAgents,
    getStats,
    refetch: loadAgents
  };
};