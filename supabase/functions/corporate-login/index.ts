// Corporate login edge function - validates against corporate_admins table (not Supabase Auth)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up corporate_admins by email and password
    const { data: adminRecord, error: lookupError } = await adminClient
      .from("corporate_admins")
      .select("id, corporate_id, email, password")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError || !adminRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password (plaintext comparison as stored)
    if (adminRecord.password !== password) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the corporate record
    const { data: corporate, error: corpError } = await adminClient
      .from("corporates")
      .select("id, name, coupon_code, max_members, expires_at, is_active")
      .eq("id", adminRecord.corporate_id)
      .single();

    if (corpError || !corporate) {
      return new Response(
        JSON.stringify({ error: "Corporate account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!corporate.is_active) {
      return new Response(
        JSON.stringify({ error: "This corporate account has been deactivated" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return corporate data and admin ID as a session token
    return new Response(
      JSON.stringify({
        corporate,
        admin_id: adminRecord.id,
        email: adminRecord.email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
