import { useState, useEffect } from "react";
import { User, Lock, Settings as SettingsIcon, Shield, Monitor } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ProfileFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type SystemSettings = {
  maintenanceMode: boolean;
  autoLogoutMinutes: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

const SettingsSection = () => {
  const { user, supabaseUser, checkAuth } = useAdminAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isSignOutLoading, setIsSignOutLoading] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    autoLogoutMinutes: 30,
    emailNotifications: true,
    smsNotifications: false,
  });

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Load profile data when component mounts
  useEffect(() => {
    loadProfileData();
    loadSystemSettings();
  }, [user, supabaseUser]);

  const loadProfileData = async () => {
    if (!user || !supabaseUser) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      profileForm.reset({
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        email: supabaseUser.email || "",
        phone: profile?.phone || "",
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading system settings:', error);
        return;
      }

      if (settings) {
        setSystemSettings({
          maintenanceMode: settings.maintenance_mode,
          autoLogoutMinutes: settings.auto_logout_minutes,
          emailNotifications: settings.email_notifications,
          smsNotifications: settings.sms_notifications,
        });
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!supabaseUser) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: supabaseUser.id,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
        });

      if (error) throw error;

      // Update local admin user data
      const adminUser = localStorage.getItem('admin_user');
      if (adminUser) {
        const parsed = JSON.parse(adminUser);
        parsed.firstname = data.firstName;
        parsed.lastname = data.lastName;
        localStorage.setItem('admin_user', JSON.stringify(parsed));
      }

      // Refresh auth context
      await checkAuth();

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      passwordForm.setError("confirmPassword", {
        type: "manual",
        message: "Les mots de passe ne correspondent pas"
      });
      return;
    }
    
    setIsPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;

      passwordForm.reset();
      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été mis à jour avec succès.",
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le mot de passe.",
        variant: "destructive",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const updateSystemSetting = async (key: keyof SystemSettings, value: boolean | number) => {
    try {
      const updatedSettings = {
        ...systemSettings,
        [key]: value
      };
      
      setSystemSettings(updatedSettings);

      // Map to database column names
      const dbData = {
        maintenance_mode: updatedSettings.maintenanceMode,
        auto_logout_minutes: updatedSettings.autoLogoutMinutes,
        email_notifications: updatedSettings.emailNotifications,
        sms_notifications: updatedSettings.smsNotifications,
      };

      const { error } = await supabase
        .from('system_settings')
        .upsert(dbData);

      if (error) throw error;

      toast({
        title: "Paramètre mis à jour",
        description: "La configuration système a été sauvegardée.",
      });
    } catch (error) {
      console.error('Error updating system setting:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le paramètre.",
        variant: "destructive",
      });
      // Revert local state
      loadSystemSettings();
    }
  };

  const handleSignOutEverywhere = async () => {
    setIsSignOutLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-signout-everywhere');
      
      if (error) throw error;

      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté de toutes vos sessions.",
      });
    } catch (error) {
      console.error('Error signing out everywhere:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déconnecter toutes les sessions.",
        variant: "destructive",
      });
    } finally {
      setIsSignOutLoading(false);
    }
  };

  // Get current session info
  const currentSession = {
    device: `${navigator.platform} - ${navigator.userAgent.includes('Chrome') ? 'Chrome' : 
             navigator.userAgent.includes('Firefox') ? 'Firefox' : 
             navigator.userAgent.includes('Safari') ? 'Safari' : 'Navigateur'}`,
    email: supabaseUser?.email || 'N/A',
    lastActive: "Maintenant"
  };

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