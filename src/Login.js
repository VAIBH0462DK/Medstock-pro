import { useState } from "react";
import { supabase } from "./supabaseClient";

const iStyle = {
  width: "100%", background: "#0f172a", border: "1px solid #334155",
  borderRadius: 6, padding: "10px 12px", color: "#f1f5f9", fontSize: 14,
  boxSizing: "border-box", outline: "none",
};

export default function Login({ onSwitchToSignup }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setError(""); setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    } catch (e) {
      setError("Login failed. Please try again.");
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
        maxWidth: 400, width: "100%", border: "1px solid #334155",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💊</div>
          <h1 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>MedStock Pro</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>Pharmacy Inventory Management</p>
        </div>

        {error && (
          <div style={{
            background: "#3b0f0f", color: "#f87171", padding: "10px 14px",
            borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 11, marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>
            Email Address
          </label>
          <input
            style={iStyle} type="email" value={email} autoComplete="email"
            placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 11, marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>
            Password
          </label>
          <input
            style={iStyle} type="password" value={password} autoComplete="current-password"
            placeholder="••••••••"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
        </div>

        <button
          onClick={handleLogin} disabled={loading}
          style={{
            width: "100%", padding: "12px", background: loading ? "#1e3a5f" : "#0284c7",
            color: "#fff", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1, transition: "background 0.2s",
          }}
        >
          {loading ? "⟳ Signing in..." : "Sign In →"}
        </button>

        <p style={{ textAlign: "center", marginTop: 20, color: "#64748b", fontSize: 13 }}>
          Don't have an account?{" "}
          <button
            onClick={onSwitchToSignup}
            style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
          >
            Sign up free
          </button>
        </p>

        <div style={{
          marginTop: 24, padding: "12px 16px", background: "#0f172a",
          borderRadius: 8, border: "1px solid #1e293b",
        }}>
          <p style={{ color: "#475569", fontSize: 11, margin: 0, textAlign: "center", lineHeight: 1.6 }}>
            🔒 Secure login powered by Supabase Auth<br />
            Your data is encrypted and safe
          </p>
        </div>
      </div>
    </div>
  );
}
