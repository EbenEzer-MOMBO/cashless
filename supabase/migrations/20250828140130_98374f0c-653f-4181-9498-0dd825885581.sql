-- Add phone column to profiles table
ALTER TABLE public.profiles ADD COLUMN phone text;

-- Create system_settings table for admin settings
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_mode boolean NOT NULL DEFAULT false,
  auto_logout_minutes integer NOT NULL DEFAULT 30,
  email_notifications boolean NOT NULL DEFAULT true,
  sms_notifications boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system_settings (admin only)
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create trigger for updating updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings if none exist
INSERT INTO public.system_settings (maintenance_mode, auto_logout_minutes, email_notifications, sms_notifications)
SELECT false, 30, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);