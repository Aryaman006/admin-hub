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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is a super_admin
    const { data: callerStaff } = await adminClient
      .from("staff_members")
      .select("role")
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .maybeSingle();

    // If no staff record, check admins table (backward compat)
    if (!callerStaff) {
      const { data: adminData } = await adminClient
        .from("admins")
        .select("id")
        .eq("user_id", caller.id)
        .maybeSingle();

      if (!adminData) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Admin without staff record is treated as super_admin — allow
    } else if (callerStaff.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Only super admins can manage staff" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, name, role, permissions } = body;

      if (!email || !password || !name) {
        return new Response(JSON.stringify({ error: "Email, password and name are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists across all auth user pages
      const normalizedEmail = String(email).trim().toLowerCase();
      let existingUser: { id: string } | null = null;
      let page = 1;
      const perPage = 1000;

      while (!existingUser) {
        const { data: usersPage, error: listUsersError } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

        if (listUsersError) {
          return new Response(JSON.stringify({ error: listUsersError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const users = usersPage?.users ?? [];
        existingUser =
          users.find((u: any) => String(u.email ?? "").trim().toLowerCase() === normalizedEmail) ?? null;

        if (users.length < perPage) break;
        page += 1;
      }

      let userId: string;
      let createdNewUser = false;

      if (existingUser) {
        userId = existingUser.id;

        const { data: existingStaff } = await adminClient
          .from("staff_members")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingStaff) {
          return new Response(JSON.stringify({ error: "This user is already a staff member" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        userId = newUser.user.id;
        createdNewUser = true;
      }

      // Add to admins table (ignore if already exists)
      await adminClient.from("admins").upsert({ user_id: userId }, { onConflict: "user_id" });

      // Add to staff_members table
      const { error: staffError } = await adminClient.from("staff_members").insert({
        user_id: userId,
        email: normalizedEmail,
        name,
        role: role || "staff",
        permissions: permissions || {},
        is_active: true,
      });

      if (staffError) {
        if (createdNewUser) {
          await adminClient.auth.admin.deleteUser(userId);
        }
        return new Response(JSON.stringify({ error: staffError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { staffId, name, role, permissions } = body;

      if (!staffId) {
        return new Response(JSON.stringify({ error: "staffId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await adminClient
        .from("staff_members")
        .update({
          name,
          role: role || "staff",
          permissions: permissions || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", staffId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { staffId, userId } = body;

      if (!staffId || !userId) {
        return new Response(JSON.stringify({ error: "staffId and userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete from staff_members
      await adminClient.from("staff_members").delete().eq("id", staffId);

      // Delete from admins
      await adminClient.from("admins").delete().eq("user_id", userId);

      // Delete auth user
      await adminClient.auth.admin.deleteUser(userId);

      return new Response(JSON.stringify({ success: true }), {
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
