import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const smtpEmail = Deno.env.get("SMTP_EMAIL");
    const smtpPassword = Deno.env.get("SMTP_APP_PASSWORD");

    if (!smtpEmail || !smtpPassword) {
      throw new Error("SMTP credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session } = await req.json();

    if (!session || !session.title || !session.scheduled_at) {
      return new Response(JSON.stringify({ error: "Session data required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all users from auth.users (emails are NOT in profiles table)
    const { data: authUsersData, error: authUsersError } = await supabase.auth.admin.listUsers();

    if (authUsersError) {
      throw new Error(`Failed to fetch users: ${authUsersError.message}`);
    }

    const emails = (authUsersData?.users || [])
      .map((u: any) => u.email)
      .filter((e: string | null | undefined) => e && e.trim());

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scheduledDate = new Date(session.scheduled_at);
    const dateStr = scheduledDate.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = scheduledDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const subject = `🧘 New Live Class: ${session.title}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6B46C1;">New Live Yoga Session Scheduled!</h2>
        <div style="background: #F7FAFC; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px;">${session.title}</h3>
          ${session.description ? `<p style="color: #4A5568; margin: 0 0 12px;">${session.description}</p>` : ""}
          <p style="margin: 4px 0;"><strong>Instructor:</strong> ${session.instructor_name || "TBA"}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${timeStr}</p>
          ${session.is_premium ? '<p style="margin: 8px 0 0;"><span style="background: #6B46C1; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Premium</span></p>' : ""}
        </div>
        <p style="color: #718096; font-size: 14px;">Open the Playoga app to register and join the session.</p>
      </div>
    `;

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: smtpEmail,
          password: smtpPassword,
        },
      },
    });

    let sentCount = 0;
    const errors: string[] = [];

    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const promises = batch.map(async (email: string) => {
        try {
          await client.send({
            from: smtpEmail,
            to: email,
            subject,
            content: "New live yoga session scheduled! Open the app for details.",
            html: htmlBody,
          });
          sentCount++;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          errors.push(`Failed to send to ${email}: ${errMsg}`);
        }
      });
      await Promise.all(promises);
    }

    await client.close();

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: emails.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
