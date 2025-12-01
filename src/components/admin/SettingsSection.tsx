import { useState, useEffect } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const SettingsSection = () => {
  const { user, firebaseUser } = useAdminAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h2 className="text-2xl font-bold">Paramètres</h2>
        <p className="text-muted-foreground">Contacter les admins pour modifier les paramètres de la plateforme</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Contact administrateur
          </CardTitle>
          <CardDescription>
            Pour toute modification des paramètres système, veuillez contacter l'équipe d'administration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <SettingsIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Paramètres système</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              L'accès aux paramètres système est restreint. Pour toute demande de modification ou de configuration, 
              veuillez contacter l'équipe d'administration de la plateforme.
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg text-left">
                <h4 className="font-medium text-sm mb-1">Support technique</h4>
                <p className="text-sm text-muted-foreground">support@cashless.com</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-left">
                <h4 className="font-medium text-sm mb-1">Administration</h4>
                <p className="text-sm text-muted-foreground">admin@cashless.com</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsSection;
