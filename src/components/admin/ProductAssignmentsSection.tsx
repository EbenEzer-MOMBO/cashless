
import { useState, useEffect } from "react";
import { Users, Package, Calendar, Wifi, Clock, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useEvents } from "@/hooks/useEvents";
import { useAgents } from "@/hooks/useAgents";
import { useAdminProducts } from "@/hooks/useAdminProducts";
import { useProductAssignments } from "@/hooks/useProductAssignments";
import { useBulkAssignProducts } from "@/hooks/useBulkAssignProducts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const ProductAssignmentsSection = () => {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [activeAgentsCount, setActiveAgentsCount] = useState(0);
  const { events } = useEvents();
  const { agents } = useAgents();
  const { products } = useAdminProducts();
  const { assignments, assignProduct, unassignProduct, getAssignedProducts } = useProductAssignments(
    selectedEventId ? parseInt(selectedEventId) : undefined
  );
  const { bulkAssignProducts, loading: bulkAssignLoading } = useBulkAssignProducts();
  const { toast } = useToast();

  const selectedEvent = events.find(e => e.id.toString() === selectedEventId);
  
  // Filter agents and products by selected event
  const eventAgents = agents.filter(agent => 
    agent.eventId.toString() === selectedEventId && 
    agent.role === 'vente' && 
    agent.active
  );
  
  const eventProducts = products.filter(product => 
    product.eventId.toString() === selectedEventId
  );

  // Update sync time and simulate active agents tracking
  useEffect(() => {
    setLastSync(new Date());
    // Simulate active agents count (in real app, this would come from real-time presence)
    setActiveAgentsCount(Math.floor(eventAgents.length * 0.7)); // 70% active simulation
  }, [assignments, eventAgents.length]);

  const handleAssignmentChange = async (productId: number, agentId: number, assigned: boolean) => {
    try {
      if (assigned) {
        await assignProduct(productId, agentId);
        toast({
          title: "Produit assigné",
          description: `Produit assigné avec succès à l'agent`,
        });
      } else {
        await unassignProduct(productId, agentId);
        toast({
          title: "Assignation supprimée",
          description: `Produit retiré de l'agent`,
        });
      }
      setLastSync(new Date());
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'assignation",
        variant: "destructive",
      });
    }
  };

  const handleBulkAssign = async () => {
    try {
      await bulkAssignProducts(selectedEventId ? parseInt(selectedEventId) : undefined);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error in bulk assign:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Affectation des produits</h2>
          <p className="text-muted-foreground">
            Assignez des produits aux agents de vente par événement
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-green-600" />
            <span>{activeAgentsCount} agents actifs</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            Dernière sync: {lastSync.toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
          {selectedEventId && (
            <Button 
              onClick={handleBulkAssign}
              disabled={bulkAssignLoading}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              {bulkAssignLoading ? 'Synchronisation...' : 'Synchroniser tous les produits'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sélection de l'événement
          </CardTitle>
          <CardDescription>
            Choisissez un événement pour gérer les affectations de produits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Sélectionner un événement" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEventId && (
        <>
          {/* Résumé */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{eventAgents.length}</p>
                      <p className="text-sm text-muted-foreground">Agents de vente</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wifi className="h-4 w-4 text-green-600" />
                    <Badge variant="secondary" className="text-xs">
                      {activeAgentsCount} en ligne
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{eventProducts.length}</p>
                    <p className="text-sm text-muted-foreground">Produits disponibles</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{assignments.length}</p>
                    <p className="text-sm text-muted-foreground">Affectations totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Matrice d'affectation */}
          {eventAgents.length > 0 && eventProducts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Matrice d'affectation</CardTitle>
                <CardDescription>
                  Cochez les cases pour assigner des produits aux agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-4 border-b">Agent</th>
                        {eventProducts.map(product => (
                          <th key={product.id} className="text-center p-4 border-b min-w-[120px]">
                            <div className="text-sm font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {product.price.toLocaleString()} XAF
                            </div>
                          </th>
                        ))}
                        <th className="text-center p-4 border-b">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventAgents.map(agent => {
                        const assignedProductIds = getAssignedProducts(agent.id);
                        
                        return (
                          <tr key={agent.id} className="border-b">
                            <td className="p-4">
                              <div>
                                <div className="font-medium">{agent.name}</div>
                                <div className="text-sm text-muted-foreground">{agent.email}</div>
                              </div>
                            </td>
                            {eventProducts.map(product => {
                              const isAssigned = assignedProductIds.includes(product.id);
                              
                              return (
                                <td key={product.id} className="text-center p-4">
                                  <Checkbox
                                    checked={isAssigned}
                                    onCheckedChange={(checked) => 
                                      handleAssignmentChange(product.id, agent.id, checked as boolean)
                                    }
                                  />
                                </td>
                              );
                            })}
                            <td className="text-center p-4">
                              <Badge variant="secondary">
                                {assignedProductIds.length}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {eventAgents.length === 0 && eventProducts.length === 0
                    ? "Aucun agent de vente ni produit trouvé pour cet événement"
                    : eventAgents.length === 0
                    ? "Aucun agent de vente trouvé pour cet événement"
                    : "Aucun produit trouvé pour cet événement"}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ProductAssignmentsSection;
