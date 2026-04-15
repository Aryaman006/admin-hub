import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendEnrollmentEmail(
  userEmail: string,
  courseTitle: string,
  amount: number,
  currency: string
) {
  const smtpEmail = Deno.env.get("SMTP_EMAIL");
  const smtpPassword = Deno.env.get("SMTP_APP_PASSWORD");

  if (!smtpEmail || !smtpPassword) {
    console.error("SMTP credentials not configured, skipping email");
    return;
  }

  const currencySymbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = currencySymbols[currency] || currency;

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

  try {
    await client.send({
      from: smtpEmail,
      to: userEmail,
      subject: `🎉 Enrollment Confirmed: ${courseTitle}`,
      content: "text",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 You're Enrolled!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Congratulations! Your payment of <strong>${symbol}${amount}</strong> has been successfully processed.
            </p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 18px;">Course Details</h2>
              <p style="color: #4b5563; margin: 0; font-size: 15px;"><strong>Course:</strong> ${courseTitle}</p>
              <p style="color: #4b5563; margin: 8px 0 0 0; font-size: 15px;"><strong>Amount Paid:</strong> ${symbol}${amount}</p>
              <p style="color: #4b5563; margin: 8px 0 0 0; font-size: 15px;"><strong>Status:</strong> ✅ Active</p>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              You now have full access to the course. Start learning right away!
            </p>
            <p style="color: #9ca3af; font-size: 13px; margin-top: 30px; text-align: center;">
              If you have any questions, feel free to reach out to our support team.
            </p>
          </div>
        </div>
      `,
    });
    console.log("Enrollment email sent to:", userEmail);
  } catch (emailError) {
    console.error("Failed to send enrollment email:", emailError);
  } finally {
    await client.close();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay secret not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing payment verification fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature using HMAC SHA256
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      // Mark as failed
      if (userId && courseId) {
        await supabase
          .from("course_purchases")
          .update({ status: "failed" })
          .eq("razorpay_order_id", razorpay_order_id)
          .eq("user_id", userId);
      }

      return new Response(
        JSON.stringify({ error: "Invalid payment signature", verified: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Signature valid — update purchase to "paid"
    let purchaseAmount = 0;
    let purchaseCurrency = "INR";

    if (userId) {
      // Update course_purchases status
      const { data: purchaseData } = await supabase
        .from("course_purchases")
        .update({
          razorpay_payment_id,
          status: "paid",
        })
        .eq("razorpay_order_id", razorpay_order_id)
        .eq("user_id", userId)
        .select("amount, currency")
        .single();

      if (purchaseData) {
        purchaseAmount = purchaseData.amount;
        purchaseCurrency = purchaseData.currency;
      }

      // Auto-enroll: Create/update subscription for the user
      const now = new Date().toISOString();
      const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("subscriptions").insert({
        user_id: userId,
        plan_name: "Course Purchase",
        status: "active",
        starts_at: now,
        ends_at: oneYearLater,
        amount_paid: purchaseAmount,
        payment_id: razorpay_payment_id,
      });

      // Update user's subscription status to active
      await supabase
        .from("users")
        .update({ subscription_status: "active" })
        .eq("id", userId);

      // Fetch course title and user email for confirmation email
      let courseTitle = "Your Course";
      let userEmail = "";

      if (courseId) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("title")
          .eq("id", courseId)
          .single();
        if (courseData) courseTitle = courseData.title;
      }

      // Get user email
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.email) {
        userEmail = authUser.email;
      }

      // Send confirmation email (non-blocking)
      if (userEmail) {
        sendEnrollmentEmail(userEmail, courseTitle, purchaseAmount, purchaseCurrency)
          .catch((err) => console.error("Email send error:", err));
      }
    }

    return new Response(
      JSON.stringify({
        verified: true,
        message: "Payment verified and course enrolled successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("course-verify-payment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
