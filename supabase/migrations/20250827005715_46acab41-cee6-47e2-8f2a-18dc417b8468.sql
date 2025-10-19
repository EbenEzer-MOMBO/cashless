-- Supprimer les anciennes politiques pour les produits
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
DROP POLICY IF EXISTS "Agents can view products for their event" ON public.products;

-- Créer des nouvelles politiques plus permissives pour les produits
-- Politique pour permettre à tous les utilisateurs authentifiés de voir les produits
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

-- Politique pour permettre à tous les utilisateurs authentifiés de créer des produits
CREATE POLICY "Anyone can create products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

-- Politique pour permettre à tous les utilisateurs authentifiés de modifier les produits
CREATE POLICY "Anyone can update products" 
ON public.products 
FOR UPDATE 
USING (true);

-- Politique pour permettre à tous les utilisateurs authentifiés de supprimer les produits
CREATE POLICY "Anyone can delete products" 
ON public.products 
FOR DELETE 
USING (true);