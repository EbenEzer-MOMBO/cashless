import { useState } from "react";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useAdminProducts, AdminProductFormData, AdminProduct } from "@/hooks/useAdminProducts";
import { useEvents } from "@/hooks/useEvents";

const ProductsSection = () => {
  const { products, loading, createProduct, updateProduct, deleteProduct } = useAdminProducts();
  const { events } = useEvents();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  const form = useForm<AdminProductFormData>({
    defaultValues: {
      name: "",
      price: "",
      stock: "",
      eventId: "",
    },
  });

  const onSubmit = async (data: AdminProductFormData) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await createProduct(data);
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = (product: AdminProduct) => {
    setEditingProduct(product);
    form.setValue("name", product.name);
    form.setValue("price", product.price.toString());
    form.setValue("stock", product.stock.toString());
    form.setValue("eventId", product.eventId.toString());
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: number) => {
    try {
      await deleteProduct(productId);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    form.reset();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8 mobile-text">Chargement des produits...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col mobile-padding">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="mobile-title font-bold">Gestion des produits</h2>
          <p className="text-muted-foreground mobile-text">Gérez le catalogue de produits</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="flex items-center gap-2 btn-touch text-xs sm:text-sm">
              <Plus className="h-4 w-4" />
              Ajouter un produit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="mobile-text">
                {editingProduct ? "Modifier le produit" : "Ajouter un produit"}
              </DialogTitle>
              <DialogDescription className="mobile-text">
                {editingProduct 
                  ? "Modifiez les informations du produit" 
                  : "Ajoutez un nouveau produit au catalogue"
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mobile-text">Nom du produit</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nom du produit"
                          {...field}
                          className="btn-touch"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mobile-text">Prix (XAF)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Prix en XAF"
                          {...field}
                          className="btn-touch"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mobile-text">Stock initial</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Quantité en stock"
                          {...field}
                          className="btn-touch"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mobile-text">Événement</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="btn-touch">
                            <SelectValue placeholder="Sélectionnez un événement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {events.map((event) => (
                            <SelectItem key={event.id} value={event.id.toString()}>
                              {event.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="btn-touch">
                    Annuler
                  </Button>
                  <Button type="submit" className="btn-touch">
                    {editingProduct ? "Modifier" : "Ajouter"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <Card className="flex-1 min-h-0">
        <CardHeader className="mobile-card">
          <CardTitle className="mobile-text">Produits ({products.length})</CardTitle>
          <CardDescription className="mobile-text">
            Catalogue des produits disponibles
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 h-full">
          <div className="overflow-auto h-full">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[60px] text-xs sm:text-sm">ID</TableHead>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">Nom</TableHead>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">Événement</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm">Prix</TableHead>
                    <TableHead className="min-w-[80px] text-xs sm:text-sm">Stock</TableHead>
                    <TableHead className="min-w-[100px] text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-xs sm:text-sm">#{product.id}</TableCell>
                      <TableCell className="text-xs sm:text-sm max-w-[120px] truncate" title={product.name}>
                        {product.name}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm max-w-[120px] truncate" title={product.eventName}>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{product.eventName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium">
                        {product.price.toLocaleString()} XAF
                      </TableCell>
                      <TableCell>
                        <span className={`px-1 sm:px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 20 
                            ? "bg-primary/10 text-primary"
                            : product.stock > 5
                            ? "bg-muted text-muted-foreground"
                            : "bg-destructive/10 text-destructive"
                        }`}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            className="btn-touch p-1 sm:p-2"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            className="text-destructive hover:text-destructive btn-touch p-1 sm:p-2"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsSection;