
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email et mot de passe requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Attempting admin login for:', email);

    // Forward the request to the actual API
    const response = await fetch('https://eventime.ga/api/cashless/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log('API response:', data);

    if (data?.status === true && data?.user) {
      // Create or get Supabase user for this admin
      const adminEmail = data.user.email;
      const adminId = data.user.id;
      
      try {
        // Check if Supabase user already exists
        let { data: existingUsers } = await supabase.auth.admin.listUsers();
        let existingUser = existingUsers?.users?.find(u => u.email === adminEmail);
        
        let supabaseUser;
        let tempPassword = `admin_${adminId}_${Date.now()}`;
        
        if (!existingUser) {
          // Create new Supabase user
          console.log('Creating new Supabase user for admin:', adminEmail);
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              admin_id: adminId,
              firstname: data.user.firstname,
              lastname: data.user.lastname,
              role: 'admin'
            }
          });
          
          if (createError) {
            console.error('Error creating Supabase user:', createError);
            return new Response(JSON.stringify(data), {
              status: response.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          supabaseUser = newUser.user;
        } else {
          supabaseUser = existingUser;
          // Update password for existing user
          await supabase.auth.admin.updateUserById(existingUser.id, {
            password: tempPassword
          });
        }
        
        // Ensure admin profile exists
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: supabaseUser.id,
            first_name: data.user.firstname,
            last_name: data.user.lastname,
            role: 'admin'
          });
        
        if (profileError) {
          console.error('Error creating/updating profile:', profileError);
        }
        
        // Return both API data and Supabase credentials
        return new Response(JSON.stringify({
          ...data,
          supabase_auth: {
            email: adminEmail,
            password: tempPassword,
            user_id: supabaseUser.id
          }
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
        // Return original API response even if Supabase fails
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in admin-login function:', error);
    return new Response(
      JSON.stringify({ 
        status: false,
        error: 'Erreur de connexion. Vérifiez votre connexion internet.' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
