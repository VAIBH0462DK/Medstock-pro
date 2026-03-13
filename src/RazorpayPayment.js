// src/RazorpayPayment.js
// ─────────────────────────────────────────────────────────────
// SETUP STEPS (do this once):
//  1. Go to https://dashboard.razorpay.com → Sign up (free)
//  2. Settings → API Keys → Generate Test Key
//  3. Copy your "Key ID" (starts with rzp_test_...)
//  4. Paste it below where it says RAZORPAY_KEY_ID
//  5. For live payments: switch to rzp_live_... key
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";

// ──────────────────────────────────────────
// 🔑 PASTE YOUR RAZORPAY KEY ID HERE
// Get it from: https://dashboard.razorpay.com → Settings → API Keys
// ──────────────────────────────────────────
const RAZORPAY_KEY_ID = "rzp_live_SPrQssFt3DT7KD";
// ──────────────────────────────────────────
// 💰 YOUR PRICING
// ──────────────────────────────────────────
const MONTHLY_PRICE_PAISE = 14900;        // ₹149 in paise
const MONTHLY_PRICE_INR   = 149;
const ANNUAL_PRICE_PAISE  = 99900;        // ₹999 in paise
const ANNUAL_PRICE_INR    = 999;
const MONTHLY_FULL_YEAR   = 149 * 12;     // ₹1788 — to show "you save ₹789"

// ─────────────────────────────────────────────────────────────
// Load Razorpay script dynamically (no npm install needed)
// ─────────────────────────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─────────────────────────────────────────────────────────────
// PRICING PAGE — shown automatically when trial expires
// ─────────────────────────────────────────────────────────────
export function PricingPage() {
  const { user, shopProfile, subscription, refreshUserData, signOut } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [paying,  setPaying]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const daysUsed = subscription?.trial_start
    ? Math.floor((new Date() - new Date(subscription.trial_start)) / 86400000)
    : 30;

  // ── Open Razorpay checkout ────────────────────────────────
  const handlePayment = async () => {
    setError(""); setPaying(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Failed to load payment gateway. Check your internet connection.");
      setPaying(false);
      return;
    }

    const isAnnual  = selectedPlan === "annual";
    const amountINR = isAnnual ? ANNUAL_PRICE_INR    : MONTHLY_PRICE_INR;
    const planLabel = isAnnual
      ? "MedStock Pro — Annual Plan (₹999/year)"
      : "MedStock Pro — Monthly Plan (₹149/month)";

    const options = {
      key:         RAZORPAY_KEY_ID,
      amount:      isAnnual ? ANNUAL_PRICE_PAISE : MONTHLY_PRICE_PAISE,
      currency:    "INR",
      name:        "MedStock Pro",
      description: planLabel,

      prefill: {
        name:    shopProfile?.shop_name || "Shop Owner",
        email:   user?.email || "",
        contact: shopProfile?.phone || "",
      },

      notes: {
        shop_id:  shopProfile?.id || "",
        owner_id: user?.id || "",
        plan:     selectedPlan,
      },

      theme: { color: "#0284c7" },

      handler: async (response) => {
        await activateSubscription(
          response.razorpay_payment_id,
          selectedPlan,
          amountINR
        );
      },

      modal: {
        ondismiss: () => {
          setError("Payment cancelled. You can try again anytime.");
          setPaying(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response) => {
      setError("Payment failed: " + (response.error?.description || "Please try again."));
      setPaying(false);
    });
    rzp.open();
  };

  // ── Save to Supabase after successful payment ─────────────
  const activateSubscription = async (paymentId, plan, amountINR) => {
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan === "annual") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan:                 "paid",
          status:               "active",
          razorpay_payment_id:  paymentId,
          current_period_start: now.toISOString(),
          current_period_end:   periodEnd.toISOString(),
          updated_at:           now.toISOString(),
        })
        .eq("owner_id", user.id);

      if (updateError) {
        setError(
          "Payment received ✅ but activation failed. " +
          "Contact support with Payment ID: " + paymentId
        );
        setPaying(false);
        return;
      }

      // Log payment (non-fatal)
      await supabase.from("payment_logs").insert({
        owner_id:   user.id,
        shop_id:    shopProfile?.id,
        payment_id: paymentId,
        amount:     amountINR,
        plan:       plan,
        status:     "success",
      }).then(() => {}).catch(() => {});

      setSuccess(true);
      setPaying(false);
      refreshUserData(); // re-checks subscription → redirects to Dashboard
    } catch (e) {
      setError("Activation error: " + e.message);
      setPaying(false);
    }
  };

  // ── SUCCESS SCREEN ────────────────────────────────────────
  if (success) {
    return (
      <div style={S.page}>
        <div style={{...S.card, textAlign:"center", border:"2px solid #059669"}}>
          <div style={{fontSize:60, marginBottom:16}}>🎉</div>
          <h2 style={{color:"#4ade80", margin:"0 0 10px"}}>Payment Successful!</h2>
          <p style={{color:"#94a3b8", fontSize:14, margin:"0 0 6px"}}>
            Your MedStock Pro subscription is now active.
          </p>
          <p style={{color:"#64748b", fontSize:12}}>Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // ── MAIN PRICING PAGE ─────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Header */}
        <div style={{textAlign:"center", marginBottom:24}}>
          <div style={{fontSize:38, marginBottom:6}}>💊</div>
          <h2 style={{color:"#f1f5f9", margin:"0 0 6px", fontSize:22, fontWeight:800}}>
            MedStock Pro
          </h2>
          <p style={{color:"#f87171", fontSize:12, margin:0, fontWeight:600}}>
            ⏰ Your 30-day free trial has ended ({daysUsed} days used)
          </p>
          <p style={{color:"#94a3b8", fontSize:12, margin:"4px 0 0"}}>
            Choose a plan to continue using MedStock Pro
          </p>
        </div>

        {/* ── PLAN CARDS ── */}
        <div style={{display:"flex", gap:10, marginBottom:20}}>

          {/* Monthly */}
          <div
            onClick={() => setSelectedPlan("monthly")}
            style={{
              flex:1, padding:"16px 14px", borderRadius:12, cursor:"pointer",
              background:"#0f172a",
              border: selectedPlan==="monthly"
                ? "2px solid #0284c7"
                : "2px solid #334155",
            }}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:10}}>
              <span style={{color:"#94a3b8", fontSize:11, fontWeight:700, textTransform:"uppercase"}}>
                Monthly
              </span>
              <span style={{
                width:16, height:16, borderRadius:"50%",
                border: `2px solid ${selectedPlan==="monthly" ? "#0284c7" : "#475569"}`,
                background: selectedPlan==="monthly" ? "#0284c7" : "transparent",
                display:"inline-block", flexShrink:0,
              }}/>
            </div>
            <div style={{color:"#f1f5f9", fontSize:28, fontWeight:800, lineHeight:1}}>
              ₹149
            </div>
            <div style={{color:"#64748b", fontSize:11, marginTop:5}}>per month</div>
          </div>

          {/* Annual */}
          <div
            onClick={() => setSelectedPlan("annual")}
            style={{
              flex:1, padding:"16px 14px", borderRadius:12, cursor:"pointer",
              background:"#0f172a", position:"relative",
              border: selectedPlan==="annual"
                ? "2px solid #059669"
                : "2px solid #334155",
            }}>
            {/* SAVE badge */}
            <div style={{
              position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)",
              background:"#059669", color:"#fff",
              padding:"2px 10px", borderRadius:20,
              fontSize:10, fontWeight:800, whiteSpace:"nowrap",
            }}>
              🔥 SAVE ₹{MONTHLY_FULL_YEAR - ANNUAL_PRICE_INR}
            </div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:10}}>
              <span style={{color:"#94a3b8", fontSize:11, fontWeight:700, textTransform:"uppercase"}}>
                Annual
              </span>
              <span style={{
                width:16, height:16, borderRadius:"50%",
                border: `2px solid ${selectedPlan==="annual" ? "#059669" : "#475569"}`,
                background: selectedPlan==="annual" ? "#059669" : "transparent",
                display:"inline-block", flexShrink:0,
              }}/>
            </div>
            <div style={{color:"#f1f5f9", fontSize:28, fontWeight:800, lineHeight:1}}>
              ₹999
            </div>
            <div style={{display:"flex", alignItems:"center", gap:6, marginTop:5}}>
              <span style={{color:"#64748b", fontSize:11, textDecoration:"line-through"}}>
                ₹{MONTHLY_FULL_YEAR}
              </span>
              <span style={{color:"#4ade80", fontSize:11, fontWeight:700}}>
                ~₹83/mo
              </span>
            </div>
          </div>

        </div>

        {/* Features */}
        <div style={{background:"#0f172a", borderRadius:10, padding:"14px 16px", marginBottom:18}}>
          <div style={{color:"#94a3b8", fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:10}}>
            Everything included in both plans:
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px 8px"}}>
            {[
              "✅ Unlimited medicines",
              "✅ GST billing & invoices",
              "✅ Purchases & stock-in",
              "✅ Expiry date tracking",
              "✅ Reorder alerts",
              "✅ Analytics & reports",
              "✅ Staff management",
              "✅ Priority support",
            ].map(f => (
              <div key={f} style={{color:"#e2e8f0", fontSize:12}}>{f}</div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background:"#3b0f0f", color:"#f87171",
            padding:"10px 14px", borderRadius:8,
            marginBottom:14, fontSize:12, lineHeight:1.6,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handlePayment}
          disabled={paying}
          style={{
            width:"100%", padding:"14px",
            fontSize:15, fontWeight:800, letterSpacing:0.3,
            background: paying
              ? "#1e3a5f"
              : selectedPlan==="annual" ? "#059669" : "#0284c7",
            color:"#fff", border:"none", borderRadius:10,
            cursor: paying ? "not-allowed" : "pointer",
            opacity: paying ? 0.7 : 1,
            marginBottom:12,
          }}>
          {paying
            ? "⟳ Opening Payment..."
            : selectedPlan === "annual"
              ? "💳 Pay ₹999 — Activate Annual Plan"
              : "💳 Pay ₹149 — Activate Monthly Plan"
          }
        </button>

        {/* Trust badges */}
        <div style={{display:"flex", justifyContent:"center", gap:12, marginBottom:14, flexWrap:"wrap"}}>
          {["🔒 Secure", "🇮🇳 Razorpay", "⚡ Instant Access", "↩️ Cancel Anytime"].map(t => (
            <span key={t} style={{color:"#475569", fontSize:10, fontWeight:600}}>{t}</span>
          ))}
        </div>

        {/* Payment methods */}
        <div style={{textAlign:"center", marginBottom:16}}>
          <div style={{color:"#475569", fontSize:11, marginBottom:6}}>
            Accepts all payment methods:
          </div>
          <div style={{display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap"}}>
            {["UPI", "GPay", "PhonePe", "Credit Card", "Debit Card", "Net Banking", "Wallets"].map(m => (
              <span key={m} style={{
                background:"#1e293b", color:"#64748b",
                padding:"3px 8px", borderRadius:4,
                fontSize:10, fontWeight:600,
              }}>
                {m}
              </span>
            ))}
          </div>
        </div>

        <div style={{textAlign:"center"}}>
          <button onClick={signOut} style={{
            background:"none", border:"none",
            color:"#475569", fontSize:12,
            cursor:"pointer", textDecoration:"underline",
          }}>
            Sign out
          </button>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// UPGRADE BUTTON — use inside trial banner or settings page
// ─────────────────────────────────────────────────────────────
export function UpgradeButton({ label = "⬆️ Upgrade to Pro", style: s }) {
  const { user, shopProfile, subscription, refreshUserData } = useAuth();
  const [paying, setPaying] = useState(false);
  const [msg,    setMsg]    = useState("");

  const handlePayment = async () => {
    setMsg(""); setPaying(true);
    const loaded = await loadRazorpayScript();
    if (!loaded) { setMsg("Payment gateway unavailable."); setPaying(false); return; }

    const options = {
      key:         RAZORPAY_KEY_ID,
      amount:      MONTHLY_PRICE_PAISE,
      currency:    "INR",
      name:        "MedStock Pro",
      description: "MedStock Pro — Monthly Plan (₹149/month)",
      prefill:     { email: user?.email || "", name: shopProfile?.shop_name || "" },
      theme:       { color: "#0284c7" },
      handler: async (response) => {
        const now = new Date();
        const end = new Date(now); end.setMonth(end.getMonth() + 1);
        await supabase.from("subscriptions").update({
          plan: "paid", status: "active",
          razorpay_payment_id:  response.razorpay_payment_id,
          current_period_start: now.toISOString(),
          current_period_end:   end.toISOString(),
        }).eq("owner_id", user.id);
        setMsg("✅ Upgraded!");
        refreshUserData();
        setPaying(false);
        setTimeout(() => setMsg(""), 3000);
      },
      modal: { ondismiss: () => setPaying(false) },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", () => { setMsg("❌ Payment failed."); setPaying(false); });
    rzp.open();
  };

  const isPaid = subscription?.plan === "paid";

  return (
    <div style={{display:"inline-flex", alignItems:"center", gap:8}}>
      <button
        onClick={handlePayment}
        disabled={paying || isPaid}
        style={{
          padding:"6px 16px",
          background: isPaid ? "#064e3b" : "#0284c7",
          color:"#fff", border:"none", borderRadius:8,
          fontWeight:700, fontSize:12,
          cursor: paying || isPaid ? "not-allowed" : "pointer",
          ...s,
        }}>
        {isPaid ? "✅ Pro Active" : paying ? "⟳ Processing..." : label}
      </button>
      {msg && (
        <span style={{fontSize:11, color: msg.startsWith("✅") ? "#4ade80" : "#f87171"}}>
          {msg}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight:"100vh", background:"#060d1a",
    display:"flex", alignItems:"center", justifyContent:"center", padding:20,
  },
  card: {
    background:"#1e293b", borderRadius:20, padding:28,
    maxWidth:460, width:"100%", border:"1px solid #334155",
    boxShadow:"0 24px 64px rgba(0,0,0,0.6)",
  },
};