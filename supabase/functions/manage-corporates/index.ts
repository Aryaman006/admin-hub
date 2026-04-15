// Edge function to manage corporates with service role (bypasses RLS)
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

    // Verify caller is a super admin
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: adminData } = await adminClient
      .from("admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!adminData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, corporate_id, is_active } = body;

    if (action === "list") {
      // Fetch all corporates
      const { data: corporates, error } = await adminClient
        .from("corporates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch member counts
      const ids = (corporates || []).map((c: any) => c.id);
      let memberCounts: Record<string, number> = {};

      if (ids.length > 0) {
        const { data: memberData } = await adminClient
          .from("corporate_members")
          .select("corporate_id")
          .in("corporate_id", ids);

        (memberData || []).forEach((m: any) => {
          memberCounts[m.corporate_id] = (memberCounts[m.corporate_id] || 0) + 1;
        });
      }

      const result = (corporates || []).map((c: any) => ({
        ...c,
        member_count: memberCounts[c.id] || 0,
        admin_email: c.admin_email || "—",
      }));

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete" && corporate_id) {
      // Delete in correct order to respect FK constraints
      await adminClient.from("subscriptions").delete().eq("corporate_id", corporate_id);
      await adminClient.from("corporate_members").delete().eq("corporate_id", corporate_id);
      await adminClient.from("corporate_admins").delete().eq("corporate_id", corporate_id);
      const { error } = await adminClient.from("corporates").delete().eq("id", corporate_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_active" && corporate_id) {
      const { error } = await adminClient
        .from("corporates")
        .update({ is_active: is_active ?? true })
        .eq("id", corporate_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_members" && corporate_id) {
      const { data, error } = await adminClient
        .from("corporate_members")
        .select("*")
        .eq("corporate_id", corporate_id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
