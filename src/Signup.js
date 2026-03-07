import { useState } from "react";
import { supabase } from "./supabaseClient";

const iStyle = {
  width: "100%", background: "#0f172a", border: "1px solid #334155",
  borderRadius: 6, padding: "10px 12px", color: "#f1f5f9", fontSize: 14,
  boxSizing: "border-box", outline: "none",
};
const lStyle = {
  display: "block", color: "#94a3b8", fontSize: 11,
  marginBottom: 6, fontWeight: 700, textTransform: "uppercase",
};

export default function Signup({ onSwitchToLogin }) {
  const [form, setForm] = useState({
    shopName: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSignup = async () => {
    if (!form.shopName.trim()) { setError("Shop name is required."); return; }
    if (!form.email.trim())    { setError("Email is required."); return; }
    if (!form.password)        { setError("Password is required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }

    setError(""); setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      });
      if (authErr) { setError(authErr.message); return; }

      const userId = authData.user?.id;
      if (!userId) { setError("Signup failed. Please try again."); return; }

      // 2. Create shop profile — get back the shop ID for FK references
      const { data: spData, error: spErr } = await supabase.from("shop_profiles").insert({
        owner_id:   userId,
        shop_name:  form.shopName.trim(),
        shop_email: form.email.trim(),
        phone:      form.phone.trim(),
      }).select("id").single();
      if (spErr) { setError("Could not create shop profile: " + spErr.message); return; }

      const shopId = spData.id;

      // 3. Create shop settings — shop_id is NOT NULL in DB, must include it
      const { error: ssErr } = await supabase.from("shop_settings").insert({
        owner_id:  userId,
        shop_id:   shopId,
        shop_name: form.shopName.trim(),
        phone:     form.phone.trim(),
        email:     form.email.trim(),
      });
      if (ssErr) console.warn("shop_settings insert:", ssErr.message);

      // 4. Create trial subscription — shop_id is NOT NULL in DB, must include it
      const { error: subErr } = await supabase.from("subscriptions").insert({
        owner_id:    userId,
        shop_id:     shopId,
        plan:        "trial",
        status:      "active",
        trial_start: new Date().toISOString(),
      });
      if (subErr) console.warn("subscriptions insert:", subErr.message);

      setSuccess("✅ Account created! Please check your email to confirm, then sign in.");
    } catch (e) {
      setError("Unexpected error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#060d1a",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#1e293b", borderRadius: 16, padding: 40,
        maxWidth: 440, width: "100%", border: "1px solid #334155",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💊</div>
          <h1 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>Create Account</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>30-day free trial • No credit card needed</p>
        </div>

        {error && (
          <div style={{
            background: "#3b0f0f", color: "#f87171", padding: "10px 14px",
            borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
          }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{
            background: "#064e3b", color: "#4ade80", padding: "10px 14px",
            borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
          }}>
            {success}
            <div style={{ marginTop: 12 }}>
              <button onClick={onSwitchToLogin}
                style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 700, cursor: "pointer" }}>
                Go to Login →
              </button>
            </div>
          </div>
        )}

        {!success && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lStyle}>Shop / Pharmacy Name *</label>
                <input style={iStyle} value={form.shopName} placeholder="e.g. City Medical Store"
                  onChange={e => update("shopName", e.target.value)} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lStyle}>Email Address *</label>
                <input style={iStyle} type="email" value={form.email} placeholder="you@example.com"
                  onChange={e => update("email", e.target.value)} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lStyle}>Phone Number</label>
                <input style={iStyle} value={form.phone} placeholder="+91 98765 43210"
                  onChange={e => update("phone", e.target.value)} />
              </div>
              <div>
                <label style={lStyle}>Password *</label>
                <input style={iStyle} type="password" value={form.password} placeholder="Min 6 chars"
                  onChange={e => update("password", e.target.value)} />
              </div>
              <div>
                <label style={lStyle}>Confirm Password *</label>
                <input style={iStyle} type="password" value={form.confirmPassword} placeholder="Repeat password"
                  onChange={e => update("confirmPassword", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSignup()} />
              </div>
            </div>

            {/* Trial benefits */}
            <div style={{ background: "#0f172a", borderRadius: 8, padding: "12px 16px", marginBottom: 20, border: "1px solid #1e3a5f" }}>
              <div style={{ color: "#38bdf8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>✨ Free Trial Includes</div>
              {["Full inventory management", "POS billing & invoices", "Analytics & reports", "Expiry & reorder alerts"].map(f => (
                <div key={f} style={{ color: "#94a3b8", fontSize: 12, padding: "2px 0" }}>✅ {f}</div>
              ))}
            </div>

            <button
              onClick={handleSignup} disabled={loading}
              style={{
                width: "100%", padding: "12px", background: loading ? "#1e3a5f" : "#059669",
                color: "#fff", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "⟳ Creating account..." : "🚀 Start Free Trial"}
            </button>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: 20, color: "#64748b", fontSize: 13 }}>
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
