// ─────────────────────────────────────────────────────────────────────────────
// App.js  —  MedStock Pro  (Homepage + Routing + Razorpay edition)
//
// CHANGES vs previous version:
//  1. HOMEPAGE ADDED        — / route shows HomePage
//  2. REACT ROUTER ADDED    — BrowserRouter with /, /login, /signup, /dashboard
//  3. LOGIN/SIGNUP ROUTES   — separate URL routes
//  4. DASHBOARD PROTECTED   — redirects to /login if not logged in
//  5. RAZORPAY INTEGRATED   — PricingPage shown when trial expires (not TrialExpired)
//  6. vercel.json needed    — must be in project root for clean URLs
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import Login from "./Login";
import Signup from "./Signup";
import HomePage from "./HomePage";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const CATEGORIES = ["Tablet","Capsule","Syrup","Injection","Cream/Ointment","Drops","Other"];
const UNITS      = ["pcs","strips","bottles","vials","tubes","boxes"];
const GST_RATES  = [0, 5, 12, 18, 28];
const today      = () => new Date().toISOString().slice(0,10);
const fmt        = d  => d ? new Date(d).toLocaleDateString("en-IN") : "-";
const fmtMoney   = v  => `₹${parseFloat(v||0).toFixed(2)}`;
const genInvNo   = (count) => `INV-${String(count+1).padStart(4,"0")}`;

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const iStyle = {
  width:"100%", background:"#0f172a", border:"1px solid #334155",
  borderRadius:6, padding:"8px 10px", color:"#f1f5f9", fontSize:13, boxSizing:"border-box",
};
const lStyle = {
  display:"block", color:"#94a3b8", fontSize:11,
  marginBottom:3, fontWeight:600, textTransform:"uppercase",
};
const TH = {
  padding:"9px 12px", textAlign:"left", color:"#94a3b8",
  fontSize:11, fontWeight:700, textTransform:"uppercase",
  borderBottom:"1px solid #1e293b", whiteSpace:"nowrap",
};
const TD = { padding:"9px 12px", color:"#e2e8f0", fontSize:13, borderBottom:"1px solid #1e293b" };

const badge = (txt, bg, col) => (
  <span style={{background:bg, color:col, padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700}}>
    {txt}
  </span>
);

const Btn = ({ children, onClick, color="#0284c7", disabled, small, danger, style:s }) => (
  <button onClick={onClick} disabled={disabled}
    style={{
      padding: small ? "5px 12px" : "9px 20px",
      background: disabled ? "#1e3a5f" : danger ? "#dc2626" : color,
      color:"#fff", border:"none", borderRadius:7,
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight:700, fontSize: small ? 12 : 14,
      opacity: disabled ? 0.5 : 1, ...s,
    }}>
    {children}
  </button>
);

function SectionLoader() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      minHeight:200,gap:10,color:"#475569",fontSize:13}}>
      <div style={{width:24,height:24,border:"2px solid #1e293b",borderTopColor:"#0284c7",
        borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TRIAL BANNER — shows upgrade button in last 7 days
// ═══════════════════════════════════════════════════════════
function TrialBanner() {
  const { subscription, trialDaysLeft } = useAuth();

  // Only show for trial plan users
  if (!subscription || subscription.plan !== "trial") return null;

  const days = trialDaysLeft();

  // Don't show if plenty of time left
  if (days > 7) return null;

  // days 1-7: yellow warning banner
  const isUrgent = days <= 3;
  return (
    <div style={{
      background: isUrgent ? "#7c2d12" : "#92400e",
      color: isUrgent ? "#fca5a5" : "#fde68a",
      padding:"10px 20px", fontSize:13, fontWeight:700,
      textAlign:"center", display:"flex", alignItems:"center",
      justifyContent:"center", gap:14, flexWrap:"wrap",
    }}>
      {isUrgent ? "🚨" : "⏰"}
      {days <= 0
        ? "Your free trial has ended — please upgrade to continue."
        : <>Free trial expires in <strong>{days} day{days!==1?"s":""}</strong> — upgrade to keep access.</>
      }
      <UpgradeButton
        label="⬆️ Upgrade Now"
        style={{
          fontSize:12, padding:"5px 14px",
          background: isUrgent ? "#ef4444" : "#f59e0b",
          color: isUrgent ? "#fff" : "#000",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MEDICINE SEARCH DROPDOWN
// ═══════════════════════════════════════════════════════════
function MedSearchInput({ masters, value, onChange, getStock, showStock=true, placeholder="Search medicine..." }) {
  const [query, setQuery] = useState(value||"");
  const [open,  setOpen]  = useState(false);
  const ref = useRef();

  useEffect(() => { setQuery(value||""); }, [value]);
  useEffect(() => {
    const h = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = masters
    .filter(m => m.name.toLowerCase().includes((query||"").toLowerCase()))
    .slice(0, 8);

  return (
    <div ref={ref} style={{position:"relative"}}>
      <input
        style={iStyle} value={query} autoComplete="off"
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); setOpen(true); if(!e.target.value) onChange(""); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,
          background:"#1e293b",border:"1px solid #334155",borderRadius:6,
          zIndex:200,maxHeight:220,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
          {filtered.map(m => {
            const stock = getStock ? getStock(m.name) : null;
            return (
              <div key={m.id}
                onClick={() => { setQuery(m.name); setOpen(false); onChange(m.name); }}
                style={{padding:"8px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",
                  alignItems:"center",borderBottom:"1px solid #0f172a"}}
                onMouseEnter={e => e.currentTarget.style.background="#0f172a"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{color:"#f1f5f9",fontSize:13,fontWeight:600}}>{m.name}</div>
                  <div style={{color:"#64748b",fontSize:10}}>{m.category} · {m.unit}</div>
                </div>
                {showStock && stock !== null && (
                  <span style={{
                    background: stock<=0?"#7c2d12":stock<=(m.minStock||0)?"#92400e":"#064e3b",
                    color:       stock<=0?"#f87171":stock<=(m.minStock||0)?"#fbbf24":"#6ee7b7",
                    padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:700}}>
                    {stock<=0 ? "OUT" : stock}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INVOICE MODAL
// ═══════════════════════════════════════════════════════════
function InvoiceModal({ sale, shopInfo, onClose }) {
  const invRef = useRef();
  const printInvoice = () => {
    const win = window.open("","_blank","width=800,height=600");
    win.document.write(`<html><head><title>Invoice #${sale.invoiceNo}</title>
    <style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#111}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th{background:#111;color:#fff;padding:8px 10px;text-align:left;font-size:12px}
    td{padding:8px 10px;border-bottom:1px solid #ddd;font-size:12px}
    @media print{body{padding:0}}</style></head>
    <body>${invRef.current.innerHTML}</body></html>`);
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 400);
  };
  if (!sale) return null;
  const items = sale.items || [];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{background:"#1e293b",padding:"12px 16px",display:"flex",
          justifyContent:"space-between",alignItems:"center",borderRadius:"12px 12px 0 0"}}>
          <span style={{color:"#f1f5f9",fontWeight:700}}>🧾 Invoice Preview</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={printInvoice} style={{padding:"6px 14px",background:"#0284c7",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12}}>🖨️ Print</button>
            <button onClick={onClose}      style={{padding:"6px 12px",background:"#475569",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12}}>✕ Close</button>
          </div>
        </div>
        <div ref={invRef} style={{padding:28,fontFamily:"Arial,sans-serif",color:"#111"}}>
          <div style={{textAlign:"center",borderBottom:"2px solid #111",paddingBottom:12,marginBottom:16}}>
            <h1 style={{margin:0,fontSize:22}}>{shopInfo.name||"MedStock Pro"}</h1>
            <p style={{margin:"2px 0",fontSize:12,color:"#555"}}>{shopInfo.address}</p>
            <p style={{margin:"2px 0",fontSize:12,color:"#555"}}>📞 {shopInfo.phone} {shopInfo.gstin?`| GSTIN: ${shopInfo.gstin}`:""}</p>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>Invoice No: <span style={{color:"#0284c7"}}>#{sale.invoiceNo}</span></div>
              <div style={{fontSize:12,color:"#555",marginTop:2}}>Date: {fmt(sale.saleDate)}</div>
              {sale.isReturn && <div style={{fontSize:12,color:"#dc2626",fontWeight:700}}>⚠ RETURN/REFUND</div>}
            </div>
            <div style={{textAlign:"right"}}>
              {sale.customerName && <div style={{fontSize:13,fontWeight:700}}>Customer: {sale.customerName}</div>}
              <div style={{fontSize:12,color:"#555"}}>Served by: {sale.staffName||"Staff"}</div>
            </div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#111"}}>
                {["#","Medicine","Qty","Rate (₹)","GST%","Amount (₹)"].map(h=>(
                  <th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:12,color:"#fff"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item,i) => {
                const base = parseFloat(item.quantity||0)*parseFloat(item.saleRate||0);
                const gst  = base*(parseFloat(item.gstRate||0)/100);
                return (
                  <tr key={i} style={{background:i%2===0?"#f9f9f9":"#fff"}}>
                    <td style={{padding:"7px 10px",fontSize:12}}>{i+1}</td>
                    <td style={{padding:"7px 10px",fontSize:12,fontWeight:600}}>{item.medicineName}</td>
                    <td style={{padding:"7px 10px",fontSize:12}}>{item.quantity}</td>
                    <td style={{padding:"7px 10px",fontSize:12}}>₹{item.saleRate}</td>
                    <td style={{padding:"7px 10px",fontSize:12}}>{item.gstRate||0}%</td>
                    <td style={{padding:"7px 10px",fontSize:12,fontWeight:700}}>₹{(base+gst).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
            <div style={{width:220}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}><span>Subtotal:</span><span>₹{sale.subtotal}</span></div>
              {parseFloat(sale.gstTotal||0)>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,color:"#0284c7"}}><span>GST:</span><span>₹{parseFloat(sale.gstTotal).toFixed(2)}</span></div>}
              {parseFloat(sale.discount||0)>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,color:"#dc2626"}}><span>Discount:</span><span>-₹{sale.discount}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:15,fontWeight:700,borderTop:"2px solid #111",marginTop:4}}><span>Net Total:</span><span>₹{sale.netTotal}</span></div>
              {sale.paymentMode&&<div style={{fontSize:11,color:"#555",textAlign:"right",marginTop:4}}>Payment: {sale.paymentMode}</div>}
            </div>
          </div>
          <div style={{textAlign:"center",fontSize:11,color:"#aaa",marginTop:20,borderTop:"1px solid #ddd",paddingTop:10}}>
            Thank you for your purchase! • {shopInfo.name||"MedStock Pro"} • Powered by MedStock Pro
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
function SettingsModal({ onClose, shopInfo, setShopInfo }) {
  const { user, refreshUserData } = useAuth();
  const [shop,   setShop]   = useState({...shopInfo});
  const [msg,    setMsg]    = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { error: spErr } = await supabase.from("shop_profiles")
        .update({shop_name:shop.name,address:shop.address,phone:shop.phone,gst_number:shop.gstin})
        .eq("owner_id",user.id);
      const { error: ssErr } = await supabase.from("shop_settings")
        .update({shop_name:shop.name,address:shop.address,phone:shop.phone,gst_number:shop.gstin})
        .eq("owner_id",user.id);
      if(spErr||ssErr) { setMsg("Save error: "+(spErr?.message||ssErr?.message)); }
      else { setShopInfo(shop); refreshUserData(); setMsg("✅ Saved successfully!"); setTimeout(onClose,1200); }
    } catch(e) { setMsg("Error: "+e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#1e293b",borderRadius:16,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,color:"#f1f5f9"}}>⚙️ Settings</h3>
          <button onClick={onClose} style={{background:"#475569",color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer"}}>✕</button>
        </div>
        {msg&&<div style={{background:msg.startsWith("✅")?"#064e3b":"#3b0f0f",color:msg.startsWith("✅")?"#4ade80":"#f87171",padding:"8px 12px",borderRadius:6,marginBottom:12,fontSize:12}}>{msg}</div>}
        <h4 style={{color:"#94a3b8",fontSize:11,textTransform:"uppercase",marginBottom:10}}>Shop Info</h4>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {[["Shop Name","name"],["Address","address"],["Phone","phone"],["GSTIN","gstin"]].map(([label,key])=>(
            <div key={key}>
              <label style={lStyle}>{label}</label>
              <input style={iStyle} value={shop[key]||""} onChange={e=>setShop(s=>({...s,[key]:e.target.value}))}/>
            </div>
          ))}
        </div>
        <Btn onClick={save} disabled={saving} color="#059669">💾 {saving?"Saving...":"Save Settings"}</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS — memoized + lazy recharts
// ═══════════════════════════════════════════════════════════
const Analytics = memo(function Analytics({ sales, purchases }) {
  const [period, setPeriod] = useState("6m");
  const [RC,     setRC]     = useState(null);

  useEffect(() => {
    import("recharts").then(mod => setRC(mod));
  }, []);

  const validSales = sales.filter(s=>!s.isReturn);
  const returns    = sales.filter(s=> s.isReturn);
  const now        = new Date();
  const monthCount = period==="3m"?3:period==="6m"?6:12;
  const months=[];
  for(let i=monthCount-1;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"})});
  }
  const monthlyData=months.map(m=>{
    const mSales    =validSales.filter(s=>(s.saleDate||"").startsWith(m.key));
    const mPurchases=purchases.filter(p=>(p.purchaseDate||"").startsWith(m.key));
    const revenue   =mSales.reduce((s,r)=>s+parseFloat(r.netTotal||0),0);
    const cost      =mPurchases.reduce((s,p)=>s+parseFloat(p.totalAmount||0),0);
    const gst       =mSales.reduce((s,r)=>s+parseFloat(r.gstTotal||0),0);
    return{month:m.label,revenue:+revenue.toFixed(2),cost:+cost.toFixed(2),profit:+(revenue-cost).toFixed(2),gst:+gst.toFixed(2)};
  });

  const totalRevenue=validSales.reduce((s,r)=>s+parseFloat(r.netTotal||0),0);
  const totalCost   =purchases.reduce((s,p)=>s+parseFloat(p.totalAmount||0),0);
  const totalGST    =validSales.reduce((s,r)=>s+parseFloat(r.gstTotal||0),0);
  const totalReturns=returns.reduce((s,r)=>s+parseFloat(r.netTotal||0),0);

  const medSales={};
  validSales.forEach(s=>{(s.items||[]).forEach(i=>{if(!medSales[i.medicineName])medSales[i.medicineName]={qty:0,revenue:0};medSales[i.medicineName].qty+=parseFloat(i.quantity||0);medSales[i.medicineName].revenue+=parseFloat(i.amount||0);});});
  const topMeds=Object.entries(medSales).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,6);

  const payMap={};
  validSales.forEach(s=>{payMap[s.paymentMode||"Cash"]=(payMap[s.paymentMode||"Cash"]||0)+1;});
  const payData=Object.entries(payMap).map(([name,value])=>({name,value}));
  const PIE_COLORS=["#0284c7","#059669","#d97706","#7c3aed"];

  const StatCard=({label,val,color,icon})=>(
    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",border:`1px solid ${color}33`,borderLeft:`3px solid ${color}`}}>
      <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
      <div style={{color,fontSize:20,fontWeight:800}}>{val}</div>
      <div style={{color:"#94a3b8",fontSize:11,fontWeight:600,marginTop:4,textTransform:"uppercase"}}>{label}</div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,color:"#f1f5f9"}}>📈 Analytics</h2>
        <div style={{display:"flex",gap:6}}>
          {["3m","6m","12m"].map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              style={{padding:"5px 12px",borderRadius:6,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",
                background:period===p?"#0284c7":"#1e293b",color:period===p?"#fff":"#64748b"}}>{p}</button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        <StatCard icon="💰" label="Total Revenue"   val={fmtMoney(totalRevenue)}           color="#0284c7"/>
        <StatCard icon="📦" label="Total Purchases" val={fmtMoney(totalCost)}              color="#d97706"/>
        <StatCard icon="📊" label="Gross Profit"    val={fmtMoney(totalRevenue-totalCost)} color="#059669"/>
        <StatCard icon="🏛️" label="GST Collected"   val={fmtMoney(totalGST)}               color="#7c3aed"/>
        <StatCard icon="↩️" label="Returns Value"   val={fmtMoney(totalReturns)}           color="#dc2626"/>
      </div>
      {!RC ? <SectionLoader/> : (()=>{
        const{LineChart,Line,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,
              ResponsiveContainer,PieChart,Pie,Cell,Legend}=RC;
        return(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>
                <h4 style={{margin:"0 0 12px",color:"#94a3b8",fontSize:12,textTransform:"uppercase"}}>Revenue vs Cost</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="month" tick={{fill:"#64748b",fontSize:10}}/>
                    <YAxis tick={{fill:"#64748b",fontSize:10}}/>
                    <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8}}/>
                    <Bar dataKey="revenue" fill="#0284c7" radius={[4,4,0,0]}/>
                    <Bar dataKey="cost"    fill="#d97706" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>
                <h4 style={{margin:"0 0 12px",color:"#94a3b8",fontSize:12,textTransform:"uppercase"}}>Profit Trend</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="month" tick={{fill:"#64748b",fontSize:10}}/>
                    <YAxis tick={{fill:"#64748b",fontSize:10}}/>
                    <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8}}/>
                    <Line type="monotone" dataKey="profit" stroke="#4ade80" strokeWidth={2} dot={{fill:"#4ade80"}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>
                <h4 style={{margin:"0 0 12px",color:"#94a3b8",fontSize:12,textTransform:"uppercase"}}>Top Medicines by Revenue</h4>
                {topMeds.length===0?<p style={{color:"#475569",fontSize:13}}>No sales data.</p>:
                  topMeds.map(([name,data],i)=>(
                    <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #0f172a"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{color:"#475569",fontSize:11,fontWeight:700,width:16}}>#{i+1}</span>
                        <span style={{color:"#e2e8f0",fontSize:12}}>{name}</span>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:"#4ade80",fontSize:12,fontWeight:700}}>{fmtMoney(data.revenue)}</div>
                        <div style={{color:"#475569",fontSize:10}}>{data.qty} units</div>
                      </div>
                    </div>
                  ))}
              </div>
              <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>
                <h4 style={{margin:"0 0 12px",color:"#94a3b8",fontSize:12,textTransform:"uppercase"}}>Payment Methods</h4>
                {payData.length===0?<p style={{color:"#475569",fontSize:13}}>No sales data.</p>:(
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={payData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                        label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                        {payData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Legend/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// EXPIRY TRACKER — memoized
// ═══════════════════════════════════════════════════════════
const ExpiryTracker = memo(function ExpiryTracker({ purchases }) {
  const now = new Date();
  const rows = purchases
    .filter(p=>p.expiryDate)
    .map(p=>({...p,daysLeft:Math.floor((new Date(p.expiryDate)-now)/86400000)}))
    .sort((a,b)=>a.daysLeft-b.daysLeft);

  const expired=rows.filter(r=>r.daysLeft< 0);
  const soon   =rows.filter(r=>r.daysLeft>=0&&r.daysLeft<=30);
  const ok     =rows.filter(r=>r.daysLeft> 30);

  const Section=({title,items,color})=>items.length===0?null:(
    <div style={{marginBottom:20}}>
      <h4 style={{color,fontSize:12,textTransform:"uppercase",margin:"0 0 8px"}}>{title} ({items.length})</h4>
      <div style={{overflowX:"auto",background:"#1e293b",borderRadius:12,border:"1px solid #334155"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={TH}>Medicine</th><th style={TH}>Batch</th><th style={TH}>Expiry</th><th style={TH}>Days Left</th><th style={TH}>Qty</th></tr></thead>
          <tbody>
            {items.map(r=>(
              <tr key={r.id}>
                <td style={TD}><strong>{r.medicineName}</strong></td>
                <td style={TD}>{r.batchNo||"-"}</td>
                <td style={{...TD,color}}>{fmt(r.expiryDate)}</td>
                <td style={{...TD,color,fontWeight:700}}>{r.daysLeft<0?`${Math.abs(r.daysLeft)}d ago`:`${r.daysLeft}d`}</td>
                <td style={TD}>{r.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{margin:"0 0 20px",color:"#f1f5f9"}}>⏰ Expiry Tracker</h2>
      {rows.length===0
        ?<div style={{background:"#1e293b",borderRadius:12,padding:40,textAlign:"center",border:"1px solid #334155"}}><p style={{color:"#4ade80"}}>✅ No expiry data found.</p></div>
        :<><Section title="🔴 Expired" items={expired} color="#f87171"/><Section title="🟡 Expiring Soon" items={soon} color="#fbbf24"/><Section title="🟢 Good Stock" items={ok} color="#4ade80"/></>
      }
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// REORDER SUGGESTIONS — memoized
// ═══════════════════════════════════════════════════════════
const ReorderSuggestions = memo(function ReorderSuggestions({ inventory }) {
  const low=inventory.filter(m=>m.currentStock<=(m.minStock||10));
  return (
    <div>
      <h3 style={{margin:"0 0 20px",color:"#f1f5f9"}}>🔔 Reorder Suggestions</h3>
      {low.length===0
        ?<div style={{background:"#1e293b",borderRadius:12,padding:40,textAlign:"center",border:"1px solid #334155"}}><p style={{color:"#4ade80"}}>✅ All medicines are well stocked!</p></div>
        :(
          <div style={{overflowX:"auto",background:"#1e293b",borderRadius:12,border:"1px solid #334155"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={TH}>Medicine</th><th style={TH}>Category</th><th style={TH}>Current Stock</th><th style={TH}>Min Stock</th><th style={TH}>Status</th></tr></thead>
              <tbody>
                {low.map(m=>(
                  <tr key={m.id}>
                    <td style={TD}><strong>{m.name}</strong></td>
                    <td style={TD}>{badge(m.category,"#1e3a5f","#38bdf8")}</td>
                    <td style={{...TD,color:m.currentStock<=0?"#f87171":"#fbbf24",fontWeight:700}}>{m.currentStock}</td>
                    <td style={TD}>{m.minStock||10}</td>
                    <td style={TD}>{m.currentStock<=0?badge("OUT OF STOCK","#7c2d12","#f87171"):badge("LOW STOCK","#92400e","#fbbf24")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// AUTH GATE — now accepts mode prop (login or signup)
// ═══════════════════════════════════════════════════════════
function AuthGate({ mode = "login" }) {
  const navigate = useNavigate();
  if (mode === "signup")
    return <Signup onSwitchToLogin={() => navigate("/login")} />;
  return <Login onSwitchToSignup={() => navigate("/signup")} />;
}

// NOTE: TrialExpired removed — PricingPage from RazorpayPayment.js handles this now.
// When trial ends, user sees the Razorpay payment screen directly.

// ═══════════════════════════════════════════════════════════
// ██ MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════
function Dashboard({ onSignOut }) {
  const {user,shopProfile}=useAuth();

  const [sheet,        setSheet]        = useState("dashboard");
  const [masters,      setMasters]      = useState([]);
  const [sales,        setSales]        = useState([]);
  const [purchases,    setPurchases]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [dbError,      setDbError]      = useState("");
  const [invoiceSale,  setInvoiceSale]  = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [shopInfo,     setShopInfo]     = useState({name:"",address:"",phone:"",gstin:""});
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  const [visited, setVisited] = useState({dashboard:true});
  const visit = (tab) => { setSheet(tab); setVisited(v=>({...v,[tab]:true})); };

  const emptyMed  = {name:"",category:"Tablet",unit:"pcs",supplier:"",minStock:"",sellingRate:"",purchaseRate:"",gstRate:0};
  const emptyPur  = {purchaseDate:today(),medicineName:"",quantity:"",batchNo:"",expiryDate:"",supplierName:"",purchaseRate:"",notes:""};
  const emptyItem = {medicineName:"",quantity:"",saleRate:"",gstRate:0,amount:"",unit:"",category:""};

  const [mForm,   setMForm]   = useState(emptyMed);
  const [mEdit,   setMEdit]   = useState(null);
  const [mErr,    setMErr]    = useState("");
  const [pForm,   setPForm]   = useState(emptyPur);
  const [pErr,    setPErr]    = useState("");
  const [cart,    setCart]    = useState([{...emptyItem}]);
  const [sHeader, setSHeader] = useState({saleDate:today(),discount:"",paymentMode:"Cash",customerName:"",customerPhone:"",notes:"",staffName:""});
  const [sErr,    setSErr]    = useState("");
  const [retForm, setRetForm] = useState({invoiceNo:"",reason:""});
  const [retErr,  setRetErr]  = useState("");
  const [mSearch, setMSearch] = useState("");
  const [sSearch, setSSearch] = useState("");
  const [pSearch, setPSearch] = useState("");

  const load = async () => {
    setLoading(true); setDbError("");
    try {
      const [settingsRes, mastersRes] = await Promise.all([
        supabase.from("shop_settings").select("*").eq("owner_id",user.id).maybeSingle(),
        supabase.from("masters").select("*").eq("owner_id",user.id).order("name"),
      ]);
      if(settingsRes.data) {
        setShopInfo({name:settingsRes.data.shop_name||shopProfile?.shop_name||"",address:settingsRes.data.address||"",phone:settingsRes.data.phone||"",gstin:settingsRes.data.gst_number||""});
      } else if(shopProfile) {
        setShopInfo({name:shopProfile.shop_name||"",address:shopProfile.address||"",phone:shopProfile.phone||"",gstin:shopProfile.gst_number||""});
      }
      if(mastersRes.error) setDbError("Error loading medicines: "+mastersRes.error.message);
      else setMasters((mastersRes.data||[]).map(m=>({
        id:m.id,name:m.name,category:m.category||"Tablet",unit:m.unit||"pcs",
        supplier:m.supplier_name||"",minStock:m.min_stock??10,
        sellingRate:m.selling_price??0,purchaseRate:m.purchase_price??0,gstRate:m.gst_rate??0,
      })));
      setLoading(false);
      const [salesRes, purchasesRes] = await Promise.all([
        supabase.from("sales").select("*").eq("owner_id",user.id).order("created_at",{ascending:false}),
        supabase.from("purchases").select("*").eq("owner_id",user.id).order("created_at",{ascending:false}),
      ]);
      if(salesRes.error) setDbError(p=>p+" | Sales: "+salesRes.error.message);
      else setSales((salesRes.data||[]).map(s=>({
        id:s.id,invoiceNo:s.invoice_no,saleDate:s.sale_date,
        customerName:s.customer_name||"",customerPhone:s.customer_phone||"",
        staffName:s.staff_name||"",paymentMode:s.payment_mode||"Cash",
        subtotal:s.subtotal??0,gstTotal:s.gst_amount??0,discount:s.discount??0,
        netTotal:s.net_total??0,notes:s.notes||"",isReturn:s.is_return,
        originalInvoice:s.original_invoice||"",reason:s.reason||"",items:s.items||[],
      })));
      if(purchasesRes.error) setDbError(p=>p+" | Purchases: "+purchasesRes.error.message);
      else setPurchases((purchasesRes.data||[]).map(p=>({
        id:p.id,medicineName:p.medicine_name,batchNo:p.batch_no||"",
        expiryDate:p.expiry_date,supplierName:p.supplier_name||"",
        quantity:p.quantity,purchaseRate:p.purchase_rate,
        totalAmount:p.total_amount,notes:p.notes||"",purchaseDate:p.purchase_date,
      })));
    } catch(e) {
      setDbError("Connection error: "+e.message);
      setLoading(false);
    }
  };

  useEffect(()=>{load();},[user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // ✅ Reload data when subscription becomes paid (after Razorpay payment)
  const { subscription: currentSub } = useAuth();
  useEffect(()=>{ if(currentSub?.plan === "paid") load(); },[currentSub?.plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const inventory = useMemo(()=>masters.map(m=>{
    const totalIn  =purchases.filter(p=>p.medicineName===m.name).reduce((s,p)=>s+parseFloat(p.quantity||0),0);
    const totalSold=sales.filter(s=>!s.isReturn).reduce((acc,s)=>acc+(s.items||[]).filter(i=>i.medicineName===m.name).reduce((x,i)=>x+parseFloat(i.quantity||0),0),0);
    const totalRet =sales.filter(s=> s.isReturn).reduce((acc,s)=>acc+(s.items||[]).filter(i=>i.medicineName===m.name).reduce((x,i)=>x+parseFloat(i.quantity||0),0),0);
    return{...m,totalIn,totalSold,totalReturned:totalRet,currentStock:totalIn-totalSold+totalRet};
  }),[masters,purchases,sales]);

  const getStock=name=>{const inv=inventory.find(i=>i.name===name);return inv?inv.currentStock:0;};

  const updateCartItem=(idx,field,val)=>{
    setCart(c=>c.map((item,i)=>{
      if(i!==idx) return item;
      const u={...item,[field]:val};
      if(field==="medicineName"){const m=masters.find(x=>x.name===val);if(m){u.saleRate=m.sellingRate||"";u.unit=m.unit||"";u.category=m.category||"";u.gstRate=m.gstRate||0;}}
      if(field==="quantity"||field==="saleRate"||field==="gstRate"){
        const q=parseFloat(field==="quantity"?val:u.quantity)||0;
        const r=parseFloat(field==="saleRate" ?val:u.saleRate) ||0;
        const g=parseFloat(field==="gstRate"  ?val:u.gstRate)  ||0;
        u.amount=((q*r)*(1+g/100)).toFixed(2);
      }
      return u;
    }));
  };

  const saveMedicine=async()=>{
    if(!mForm.name.trim()){setMErr("Medicine name is required.");return;}
    setMErr("");setSaving(true);
    try{
      const row={owner_id:user.id,shop_id:shopProfile?.id,name:mForm.name.trim(),category:mForm.category,unit:mForm.unit,supplier_name:mForm.supplier,min_stock:parseInt(mForm.minStock)||10,selling_price:parseFloat(mForm.sellingRate)||0,purchase_price:parseFloat(mForm.purchaseRate)||0,gst_rate:parseFloat(mForm.gstRate)||0};
      let error,data;
      if(mEdit){({error,data}=await supabase.from("masters").update(row).eq("id",mEdit).eq("owner_id",user.id).select().single());}
      else{({error,data}=await supabase.from("masters").insert(row).select().single());}
      if(error){setMErr("Save error: "+error.message);}
      else{
        const mapped={id:data.id,name:data.name,category:data.category,unit:data.unit,supplier:data.supplier_name,minStock:data.min_stock,sellingRate:data.selling_price,purchaseRate:data.purchase_price,gstRate:data.gst_rate};
        if(mEdit) setMasters(prev=>prev.map(m=>m.id===mEdit?mapped:m));
        else      setMasters(prev=>[...prev,mapped]);
        setMForm(emptyMed);setMEdit(null);
      }
    }catch(e){setMErr("Error: "+e.message);}
    finally{setSaving(false);}
  };

  const deleteMedicine=async(id)=>{
    if(!window.confirm("Delete this medicine? This cannot be undone.")) return;
    const{error}=await supabase.from("masters").delete().eq("id",id).eq("owner_id",user.id);
    if(!error) setMasters(prev=>prev.filter(m=>m.id!==id));
  };

  const savePurchase=async()=>{
    if(!pForm.purchaseDate||!pForm.medicineName||!pForm.quantity||!pForm.batchNo||!pForm.expiryDate){setPErr("Fill all required fields (Date, Medicine, Qty, Batch, Expiry).");return;}
    setPErr("");setSaving(true);
    try{
      const row={owner_id:user.id,shop_id:shopProfile?.id,medicine_name:pForm.medicineName,batch_no:pForm.batchNo,expiry_date:pForm.expiryDate,supplier_name:pForm.supplierName,quantity:parseInt(pForm.quantity)||0,purchase_rate:parseFloat(pForm.purchaseRate)||0,total_amount:(parseInt(pForm.quantity)||0)*(parseFloat(pForm.purchaseRate)||0),notes:pForm.notes,purchase_date:pForm.purchaseDate};
      const{data,error}=await supabase.from("purchases").insert(row).select().single();
      if(error){setPErr("Save error: "+error.message);}
      else{setPurchases(prev=>[{id:data.id,medicineName:data.medicine_name,batchNo:data.batch_no,expiryDate:data.expiry_date,supplierName:data.supplier_name,quantity:data.quantity,purchaseRate:data.purchase_rate,totalAmount:data.total_amount,notes:data.notes,purchaseDate:data.purchase_date},...prev]);setPForm(emptyPur);}
    }catch(e){setPErr("Error: "+e.message);}
    finally{setSaving(false);}
  };

  const saveSale=async()=>{
    const validItems=cart.filter(i=>i.medicineName&&parseFloat(i.quantity||0)>0);
    if(validItems.length===0){setSErr("Add at least one medicine to the cart.");return;}
    for(const item of validItems){const stock=getStock(item.medicineName);if(parseFloat(item.quantity)>stock){setSErr(`Insufficient stock for ${item.medicineName}! Only ${stock} available.`);return;}}
    setSErr("");setSaving(true);
    try{
      const invCount=sales.filter(s=>!s.isReturn).length;
      const invNo=genInvNo(invCount);
      const subtotal=validItems.reduce((s,i)=>s+parseFloat(i.quantity||0)*parseFloat(i.saleRate||0),0);
      const gstTotal=validItems.reduce((s,i)=>{const b=parseFloat(i.quantity||0)*parseFloat(i.saleRate||0);return s+b*(parseFloat(i.gstRate||0)/100);},0);
      const discount=parseFloat(sHeader.discount||0);
      const netTotal=Math.max(0,subtotal+gstTotal-discount);
      const{data:savedSale,error:saleErr}=await supabase.from("sales").insert({owner_id:user.id,shop_id:shopProfile?.id,invoice_no:invNo,sale_date:sHeader.saleDate,customer_name:sHeader.customerName||"",customer_phone:sHeader.customerPhone||"",payment_mode:sHeader.paymentMode,subtotal:+subtotal.toFixed(2),gst_amount:+gstTotal.toFixed(2),discount:+discount.toFixed(2),net_total:+netTotal.toFixed(2),notes:sHeader.notes||"",is_return:false,items:validItems}).select().single();
      if(saleErr){setSErr("Error saving sale: "+saleErr.message);return;}
      const entry={id:savedSale.id,invoiceNo:invNo,saleDate:sHeader.saleDate,customerName:sHeader.customerName,customerPhone:sHeader.customerPhone,paymentMode:sHeader.paymentMode,subtotal:+subtotal.toFixed(2),gstTotal:+gstTotal.toFixed(2),discount:+discount.toFixed(2),netTotal:+netTotal.toFixed(2),notes:sHeader.notes,isReturn:false,items:validItems};
      setSales(prev=>[entry,...prev]);
      setCart([{...emptyItem}]);
      setSHeader({saleDate:today(),discount:"",paymentMode:"Cash",customerName:"",customerPhone:"",notes:"",staffName:""});
      setInvoiceSale(entry);
    }catch(e){setSErr("Unexpected error: "+e.message);}
    finally{setSaving(false);}
  };

  const processReturn=async()=>{
    const orig=sales.find(s=>s.invoiceNo===retForm.invoiceNo&&!s.isReturn);
    if(!orig){setRetErr("Invoice not found.");return;}
    if(sales.find(s=>s.originalInvoice===retForm.invoiceNo)){setRetErr("Already returned.");return;}
    setRetErr("");setSaving(true);
    try{
      const retInvNo=`RET-${retForm.invoiceNo}`;
      const{data:retSale,error}=await supabase.from("sales").insert({owner_id:user.id,shop_id:shopProfile?.id,invoice_no:retInvNo,sale_date:today(),customer_name:orig.customerName||"",net_total:orig.netTotal,subtotal:orig.subtotal,gst_amount:orig.gstTotal,is_return:true,original_invoice:retForm.invoiceNo,reason:retForm.reason,items:orig.items||[]}).select().single();
      if(error){setRetErr("Error: "+error.message);return;}
      setSales(prev=>[{id:retSale.id,invoiceNo:retInvNo,saleDate:today(),customerName:orig.customerName,netTotal:orig.netTotal,subtotal:orig.subtotal,gstTotal:orig.gstTotal,isReturn:true,originalInvoice:retForm.invoiceNo,reason:retForm.reason,items:orig.items||[]},...prev]);
      setRetForm({invoiceNo:"",reason:""});
    }catch(e){setRetErr("Error: "+e.message);}
    finally{setSaving(false);}
  };

  const navItems=[
    {id:"dashboard",label:"📊 Dashboard"},
    {id:"pos",      label:"🛒 POS / Sale"},
    {id:"medicines",label:"💊 Medicines"},
    {id:"inventory",label:"📦 Inventory"},
    {id:"purchases",label:"🛍️ Purchases"},
    {id:"sales",    label:"🧾 Sales"},
    {id:"returns",  label:"↩️ Returns"},
    {id:"expiry",   label:"⏰ Expiry"},
    {id:"reorder",  label:"🔔 Reorder"},
    {id:"analytics",label:"📈 Analytics"},
  ];

  const lowStockCount=inventory.filter(m=>m.currentStock<=(m.minStock||10)).length;
  const expiryCount  =purchases.filter(p=>{const d=p.expiryDate?Math.floor((new Date(p.expiryDate)-new Date())/86400000):999;return d<=30;}).length;
  const todaySales   =sales.filter(s=>!s.isReturn&&s.saleDate===today());
  const todayRevenue =todaySales.reduce((s,r)=>s+parseFloat(r.netTotal||0),0);
  const totalMeds    =masters.length;

  return (
    <div style={{minHeight:"100vh",background:"#0f172a",fontFamily:"sans-serif"}}>
      <style>{`
        .hamburger-btn { display: none; }
        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
          .sidebar { position: fixed !important; left: -200px !important; top: 0; height: 100vh; z-index: 200; transition: left 0.3s ease; padding-top: 60px !important; }
          .sidebar.open { left: 0 !important; }
          .main-content { padding: 12px !important; }
        }
      `}</style>

      <TrialBanner/>

      <div style={{background:"#1e293b",borderBottom:"1px solid #334155",padding:"10px 20px",
        display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="hamburger-btn" onClick={()=>setSidebarOpen(o=>!o)}
            style={{background:"none",border:"none",color:"#f1f5f9",fontSize:24,cursor:"pointer",padding:"0 4px",lineHeight:1}}>
            {sidebarOpen?"✕":"☰"}
          </button>
          <span style={{fontSize:24}}>💊</span>
          <span style={{color:"#f1f5f9",fontWeight:700,fontSize:16}}>MedStock Pro</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {dbError&&<span style={{color:"#f87171",fontSize:11,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>⚠ {dbError}</span>}
          {loading&&<span style={{color:"#38bdf8",fontSize:12}}>⟳</span>}
          {saving &&<span style={{color:"#fbbf24",fontSize:12}}>💾</span>}
          <span style={{background:"#1e3a5f",color:"#38bdf8",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>👑 Admin</span>
          <Btn small onClick={()=>setShowSettings(true)} color="#475569">⚙️</Btn>
          <Btn small onClick={onSignOut} color="#dc2626">Logout</Btn>
        </div>
      </div>

      <div style={{display:"flex",minHeight:"calc(100vh - 57px)",position:"relative"}}>
        {sidebarOpen&&(
          <div onClick={()=>setSidebarOpen(false)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:150}}/>
        )}
        <div className={`sidebar${sidebarOpen?" open":""}`}
          style={{width:180,background:"#1e293b",borderRight:"1px solid #334155",padding:"12px 0",flexShrink:0}}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>{visit(n.id);setSidebarOpen(false);}}
              style={{width:"100%",display:"block",padding:"10px 16px",border:"none",textAlign:"left",
                background:sheet===n.id?"#0f172a":"transparent",
                borderLeft:sheet===n.id?"3px solid #0284c7":"3px solid transparent",
                color:sheet===n.id?"#f1f5f9":"#64748b",
                fontSize:12,fontWeight:sheet===n.id?700:500,cursor:"pointer"}}>
              {n.label}
              {n.id==="reorder"&&lowStockCount>0&&<span style={{marginLeft:4,background:"#dc2626",color:"#fff",borderRadius:10,padding:"1px 5px",fontSize:10}}>{lowStockCount}</span>}
              {n.id==="expiry" &&expiryCount>0  &&<span style={{marginLeft:4,background:"#d97706",color:"#fff",borderRadius:10,padding:"1px 5px",fontSize:10}}>{expiryCount}</span>}
            </button>
          ))}
        </div>

        <div className="main-content" style={{flex:1,padding:24,overflowX:"hidden",overflowY:"auto"}}>
          {sheet==="dashboard"&&(
            <div>
              <h2 style={{margin:"0 0 20px",color:"#f1f5f9"}}>📊 Dashboard</h2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
                {[
                  {icon:"🛒",label:"Today's Sales",   val:todaySales.length,      color:"#0284c7"},
                  {icon:"💰",label:"Today's Revenue", val:fmtMoney(todayRevenue), color:"#059669"},
                  {icon:"💊",label:"Total Medicines", val:totalMeds,              color:"#7c3aed"},
                  {icon:"⚠️",label:"Low Stock",       val:lowStockCount,          color:"#dc2626"},
                  {icon:"⏰",label:"Expiring Soon",   val:expiryCount,            color:"#d97706"},
                ].map(c=>(
                  <div key={c.label} style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",border:`1px solid ${c.color}33`,borderLeft:`3px solid ${c.color}`}}>
                    <div style={{fontSize:20,marginBottom:4}}>{c.icon}</div>
                    <div style={{color:c.color,fontSize:22,fontWeight:800}}>{c.val}</div>
                    <div style={{color:"#94a3b8",fontSize:11,fontWeight:600,marginTop:4,textTransform:"uppercase"}}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"#1e293b",borderRadius:12,padding:20,border:"1px solid #334155"}}>
                <h4 style={{margin:"0 0 12px",color:"#94a3b8",fontSize:12,textTransform:"uppercase"}}>Recent Sales</h4>
                {sales.filter(s=>!s.isReturn).slice(0,5).length===0
                  ?<p style={{color:"#475569",fontSize:13}}>No sales yet. Start by adding a sale!</p>
                  :sales.filter(s=>!s.isReturn).slice(0,5).map(s=>(
                    <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #0f172a"}}>
                      <div>
                        <span style={{color:"#38bdf8",fontWeight:700,fontSize:13}}>{s.invoiceNo}</span>
                        <span style={{color:"#64748b",fontSize:11,marginLeft:8}}>{fmt(s.saleDate)}</span>
                        {s.customerName&&<span style={{color:"#94a3b8",fontSize:11,marginLeft:8}}>· {s.customerName}</span>}
                      </div>
                      <span style={{color:"#4ade80",fontWeight:700}}>{fmtMoney(s.netTotal)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {sheet==="pos"&&(
            <div>
              <h2 style={{margin:"0 0 20px",color:"#f1f5f9"}}>🛒 New Sale</h2>
              <div style={{background:"#1e293b",borderRadius:12,padding:20,marginBottom:20,border:"1px solid #334155"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:16}}>
                  <div><label style={lStyle}>Date *</label><input type="date" style={iStyle} value={sHeader.saleDate} onChange={e=>setSHeader(h=>({...h,saleDate:e.target.value}))}/></div>
                  <div><label style={lStyle}>Customer Name</label><input style={iStyle} value={sHeader.customerName} onChange={e=>setSHeader(h=>({...h,customerName:e.target.value}))} placeholder="Walk-in"/></div>
                  <div><label style={lStyle}>Phone</label><input style={iStyle} value={sHeader.customerPhone} onChange={e=>setSHeader(h=>({...h,customerPhone:e.target.value}))} placeholder="Optional"/></div>
                  <div><label style={lStyle}>Payment</label>
                    <select style={iStyle} value={sHeader.paymentMode} onChange={e=>setSHeader(h=>({...h,paymentMode:e.target.value}))}>
                      {["Cash","UPI","Card","Credit"].map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label style={lStyle}>Discount (₹)</label><input type="number" style={iStyle} value={sHeader.discount} onChange={e=>setSHeader(h=>({...h,discount:e.target.value}))} placeholder="0"/></div>
                </div>
                <h4 style={{color:"#94a3b8",fontSize:11,textTransform:"uppercase",margin:"0 0 10px"}}>Items</h4>
                {sErr&&<div style={{background:"#3b0f0f",color:"#f87171",padding:"8px 12px",borderRadius:6,marginBottom:12,fontSize:12}}>{sErr}</div>}
                {cart.map((item,idx)=>(
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto",gap:8,marginBottom:8,alignItems:"end"}}>
                    <div><label style={lStyle}>Medicine</label><MedSearchInput masters={masters} value={item.medicineName} onChange={v=>updateCartItem(idx,"medicineName",v)} getStock={getStock}/></div>
                    <div><label style={lStyle}>Qty *</label><input type="number" style={iStyle} value={item.quantity} onChange={e=>updateCartItem(idx,"quantity",e.target.value)} placeholder="0"/></div>
                    <div><label style={lStyle}>Rate (₹)</label><input type="number" style={iStyle} value={item.saleRate} onChange={e=>updateCartItem(idx,"saleRate",e.target.value)} placeholder="0"/></div>
                    <div><label style={lStyle}>GST %</label><select style={iStyle} value={item.gstRate} onChange={e=>updateCartItem(idx,"gstRate",e.target.value)}>{GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></div>
                    <div><label style={lStyle}>Amount</label><input style={{...iStyle,color:"#4ade80"}} value={item.amount?`₹${item.amount}`:""} readOnly/></div>
                    <button onClick={()=>setCart(c=>c.filter((_,i)=>i!==idx))} disabled={cart.length===1}
                      style={{background:"#7c2d12",color:"#fff",border:"none",borderRadius:6,padding:"8px 10px",cursor:"pointer",marginBottom:1}}>✕</button>
                  </div>
                ))}
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <Btn small onClick={()=>setCart(c=>[...c,{...emptyItem}])} color="#059669">+ Add Item</Btn>
                </div>
                <div style={{marginTop:16,padding:"12px 16px",background:"#0f172a",borderRadius:8}}>
                  {(()=>{
                    const sub=cart.reduce((s,i)=>s+parseFloat(i.quantity||0)*parseFloat(i.saleRate||0),0);
                    const gst=cart.reduce((s,i)=>{const b=parseFloat(i.quantity||0)*parseFloat(i.saleRate||0);return s+b*(parseFloat(i.gstRate||0)/100);},0);
                    const dis=parseFloat(sHeader.discount||0);
                    const net=Math.max(0,sub+gst-dis);
                    return<div style={{display:"flex",gap:24,fontSize:13}}>
                      <span style={{color:"#94a3b8"}}>Subtotal: <strong style={{color:"#e2e8f0"}}>{fmtMoney(sub)}</strong></span>
                      <span style={{color:"#94a3b8"}}>GST: <strong style={{color:"#38bdf8"}}>{fmtMoney(gst)}</strong></span>
                      {dis>0&&<span style={{color:"#94a3b8"}}>Discount: <strong style={{color:"#f87171"}}>-{fmtMoney(dis)}</strong></span>}
                      <span style={{color:"#94a3b8"}}>Net Total: <strong style={{color:"#4ade80",fontSize:15}}>{fmtMoney(net)}</strong></span>
                    </div>;
                  })()}
                </div>
                <div style={{marginTop:14}}>
                  <Btn onClick={saveSale} disabled={saving} color="#0284c7">🧾 {saving?"Saving...":"Save Sale & Print Invoice"}</Btn>
                </div>
              </div>
            </div>
          )}

          {sheet==="medicines"&&(
            <div>
              <h2 style={{margin:"0 0 20px",color:"#f1f5f9"}}>💊 Medicine Master</h2>
              <div style={{background:"#1e293b",borderRadius:12,padding:20,marginBottom:20,border:"1px solid #334155"}}>
                <h4 style={{margin:"0 0 12px",color:"#94a3b8",fontSize:12,textTransform:"uppercase"}}>{mEdit?"Edit Medicine":"Add New Medicine"}</h4>
                {mErr&&<div style={{background:"#3b0f0f",color:"#f87171",padding:"8px 12px",borderRadius:6,marginBottom:12,fontSize:12}}>{mErr}</div>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:12}}>
                  <div><label style={lStyle}>Name *</label><input style={iStyle} value={mForm.name} onChange={e=>setMForm(f=>({...f,name:e.target.value}))} placeholder="Medicine name"/></div>
                  <div><label style={lStyle}>Category</label><select style={iStyle} value={mForm.category} onChange={e=>setMForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                  <div><label style={lStyle}>Unit</label><select style={iStyle} value={mForm.unit} onChange={e=>setMForm(f=>({...f,unit:e.target.value}))}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
                  <div><label style={lStyle}>Min Stock</label><input type="number" style={iStyle} value={mForm.minStock} onChange={e=>setMForm(f=>({...f,minStock:e.target.value}))} placeholder="10"/></div>
                  <div><label style={lStyle}>Selling Rate (₹)</label><input type="number" style={iStyle} value={mForm.sellingRate} onChange={e=>setMForm(f=>({...f,sellingRate:e.target.value}))} placeholder="0"/></div>
                  <div><label style={lStyle}>Purchase Rate (₹)</label><input type="number" style={iStyle} value={mForm.purchaseRate} onChange={e=>setMForm(f=>({...f,purchaseRate:e.target.value}))} placeholder="0"/></div>
                  <div><label style={lStyle}>GST Rate %</label><select style={iStyle} value={mForm.gstRate} onChange={e=>setMForm(f=>({...f,gstRate:e.target.value}))}>{GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn onClick={saveMedicine} disabled={saving} color="#0284c7">💾 {saving?"Saving...":mEdit?"Update Medicine":"Add Medicine"}</Btn>
                  {mEdit&&<Btn onClick={()=>{setMForm(emptyMed);setMEdit(null);}} color="#475569">Cancel</Btn>}
                </div>
              </div>
              <input style={{...iStyle,maxWidth:300,marginBottom:12}} value={mSearch} onChange={e=>setMSearch(e.target.value)} placeholder="🔍 Search medicines..."/>
              <div style={{overflowX:"auto",background:"#1e293b",borderRadius:12,border:"1px solid #334155"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                  <thead><tr><th style={TH}>Name</th><th style={TH}>Category</th><th style={TH}>Unit</th><th style={TH}>Selling Rate</th><th style={TH}>Purchase Rate</th><th style={TH}>GST</th><th style={TH}>Min Stock</th><th style={TH}>Actions</th></tr></thead>
                  <tbody>
                    {masters.filter(m=>!mSearch||m.name.toLowerCase().includes(mSearch.toLowerCase())).length===0
                      ?<tr><td colSpan={8} style={{...TD,textAlign:"center",color:"#475569",padding:40}}>No medicines yet.</td></tr>
                      :masters.filter(m=>!mSearch||m.name.toLowerCase().includes(mSearch.toLowerCase())).map(m=>(
                        <tr key={m.id}>
                          <td style={TD}><strong>{m.name}</strong></td>
                          <td style={TD}>{badge(m.category,"#1e3a5f","#38bdf8")}</td>
                          <td style={TD}>{m.unit}</td>
                          <td style={{...TD,color:"#4ade80"}}>{fmtMoney(m.sellingRate)}</td>
                          <td style={{...TD,color:"#38bdf8"}}>{fmtMoney(m.purchaseRate)}</td>
                          <td style={TD}>{m.gstRate}%</td>
                          <td style={TD}>{m.minStock}</td>
                          <td style={TD}><div style={{display:"flex",gap:6}}>
                            <Btn small onClick={()=>{setMForm({name:m.name,category:m.category,unit:m.unit,supplier:m.supplier||"",minStock:m.minStock,sellingRate:m.sellingRate,purchaseRate:m.purchaseRate,gstRate:m.gstRate});setMEdit(m.id);visit("medicines");}} color="#0284c7">Edit</Btn>
                            <Btn small danger onClick={()=>deleteMedicine(m.id)}>Del</Btn>
                          </div></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sheet==="inventory"&&(
            <div>
              <h2 style={{margin:"0 0 20px",color:"#f1f5f9"}}>📦 Current Inventory</h2>
              <div style={{overflowX:"auto",background:"#1e293b",borderRadius:12,border:"1px solid #334155"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                  <thead><tr><th style={TH}>Medicine</th><th style={TH}>Category</th><th style={TH}>Stock In</th><th style={TH}>Sold</th><th style={TH}>Returned</th><th style={TH}>Current Stock</th><th style={TH}>Status</th></tr></thead>
                  <tbody>
                    {inventory.length===0
                      ?<tr><td colSpan={7} style={{...TD,textAlign:"center",color:"#475569",padding:40}}>No medicines in inventory.</td></tr>
                      :inventory.map(m=>(
                        <tr key={m.id}>
                          <td style={TD}><strong>{m.name}</strong></td>
                          <td style={TD}>{badge(m.category,"#1e3a5f","#38bdf8")}</td>
                          <td style={{...TD,color:"#4ade80",fontWeight:700}}>+{m.totalIn}</td>
                          <td style={{...TD,color:"#f87171",fontWeight:700}}>-{m.totalSold}</td>
                          <td style={{...TD,color:"#fbbf24"}}>+{m.totalReturned}</td>
                          <td style={{...TD,color:m.currentStock<=0?"#f87171":m.currentStock<=(m.minStock||10)?"#fbbf24":"#4ade80",fontSize:15,fontWeight:800}}>{m.currentStock}</td>
                          <td style={TD}>{m.currentStock<=0?badge("OUT","#7c2d12","#f87171"):m.currentStock<=(m.minStock||10)?badge("LOW","#92400e","#fbbf24"):badge("OK","#064e3b","#4ade80")}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sheet==="purchases"&&(
            <div>
              <h2 style={{margin:"0 0 20px",color:"#f1f5f9"}}>🛍️ Purchase Entry</h2>
              <div style={{background:"#1e293b",borderRadius:12,padding:20,marginBottom:20,border:"1px solid #334155"}}>
                {pErr&&<div style={{background:"#3b0f0f",color:"#f87171",padding:"8px 12px",borderRadius:6,marginBottom:12,fontSize:12}}>{pErr}</div>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:12}}>
                  <div><label style={lStyle}>Date *</label><input type="date" style={iStyle} value={pForm.purchaseDate} onChange={e=>setPForm(f=>({...f,purchaseDate:e.target.value}))}/></div>
                  <div><label style={lStyle}>Medicine *</label><MedSearchInput masters={masters} value={pForm.medicineName} onChange={v=>setPForm(f=>({...f,medicineName:v}))} showStock={false}/></div>
                  <div><label style={lStyle}>Qty *</label><input type="number" style={iStyle} value={pForm.quantity} onChange={e=>setPForm(f=>({...f,quantity:e.target.value}))} placeholder="Quantity"/></div>
                  <div><label style={lStyle}>Batch No *</label><input style={iStyle} value={pForm.batchNo} onChange={e=>setPForm(f=>({...f,batchNo:e.target.value}))} placeholder="BT001"/></div>
                  <div><label style={lStyle}>Expiry *</label><input type="date" style={iStyle} value={pForm.expiryDate} onChange={e=>setPForm(f=>({...f,expiryDate:e.target.value}))}/></div>
                  <div><label style={lStyle}>Supplier</label><input style={iStyle} value={pForm.supplierName} onChange={e=>setPForm(f=>({...f,supplierName:e.target.value}))} placeholder="Supplier name"/></div>
                  <div><label style={lStyle}>Purchase Rate (₹) *</label><input type="number" style={iStyle} value={pForm.purchaseRate} onChange={e=>setPForm(f=>({...f,purchaseRate:e.target.value}))} placeholder="Cost price"/></div>
                  <div><label style={lStyle}>Notes</label><input style={iStyle} value={pForm.notes} onChange={e=>setPForm(f=>({...f,notes:e.target.value}))} placeholder="Optional"/></div>
                </div>
                {pForm.quantity&&pForm.purchaseRate&&(
                  <div style={{marginTop:10,padding:"8px 12px",background:"#0f172a",borderRadius:6,fontSize:12,color:"#4ade80"}}>
                    Total Value: <strong>₹{(parseFloat(pForm.quantity)*parseFloat(pForm.purchaseRate)).toFixed(2)}</strong>
                  </div>
                )}
                <div style={{marginTop:14}}><Btn onClick={savePurchase} disabled={saving} color="#059669">✔ Add Purchase (Stock +)</Btn></div>
              </div>
              <input style={{...iStyle,maxWidth:300,marginBottom:12}} value={pSearch} onChange={e=>setPSearch(e.target.value)} placeholder="🔍 Search purchases..."/>
              <div style={{overflowX:"auto",background:"#1e293b",borderRadius:12,border:"1px solid #334155"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                  <thead><tr><th style={TH}>Date</th><th style={TH}>Medicine</th><th style={TH}>Qty</th><th style={TH}>Batch</th><th style={TH}>Expiry</th><th style={TH}>Supplier</th><th style={TH}>Rate</th><th style={TH}>Total</th></tr></thead>
                  <tbody>
                    {purchases.filter(p=>!pSearch||p.medicineName?.toLowerCase().includes(pSearch.toLowerCase())||p.supplierName?.toLowerCase().includes(pSearch.toLowerCase())).length===0
                      ?<tr><td colSpan={8} style={{...TD,textAlign:"center",color:"#475569",padding:40}}>No purchases yet.</td></tr>
                      :purchases.filter(p=>!pSearch||p.medicineName?.toLowerCase().includes(pSearch.toLowerCase())||p.supplierName?.toLowerCase().includes(pSearch.toLowerCase())).map(p=>(
                        <tr key={p.id}>
                          <td style={TD}>{fmt(p.purchaseDate)}</td>
                          <td style={TD}><strong>{p.medicineName}</strong></td>
                          <td style={{...TD,color:"#4ade80",fontWeight:700}}>+{p.quantity}</td>
                          <td style={TD}>{p.batchNo||"-"}</td>
                          <td style={{...TD,color:p.expiryDate&&new Date(p.expiryDate)<new Date()?"#f87171":"#e2e8f0"}}>{fmt(p.expiryDate)}</td>
                          <td style={TD}>{p.supplierName||"-"}</td>
                          <td style={{...TD,color:"#38bdf8"}}>{fmtMoney(p.purchaseRate)}</td>
                          <td style={{...TD,color:"#4ade80"}}>{fmtMoney(p.totalAmount)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sheet==="sales"&&(
            <div>
              <h2 style={{margin:"0 0 20px",color:"#f1f5f9"}}>🧾 Sales History</h2>
              <input style={{...iStyle,maxWidth:300,marginBottom:12}} value={sSearch} onChange={e=>setSSearch(e.target.value)} placeholder="🔍 Search invoice, customer..."/>
              <div style={{overflowX:"auto",background:"#1e293b",borderRadius:12,border:"1px solid #334155"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                  <thead><tr><th style={TH}>Invoice</th><th style={TH}>Date</th><th style={TH}>Customer</th><th style={TH}>Items</th><th style={TH}>Payment</th><th style={TH}>Net Total</th><th style={TH}>Action</th></tr></thead>
                  <tbody>
                    {sales.filter(s=>!s.isReturn&&(!sSearch||s.invoiceNo?.includes(sSearch)||s.customerName?.toLowerCase().includes(sSearch.toLowerCase()))).length===0
                      ?<tr><td colSpan={7} style={{...TD,textAlign:"center",color:"#475569",padding:40}}>No sales yet.</td></tr>
                      :sales.filter(s=>!s.isReturn&&(!sSearch||s.invoiceNo?.includes(sSearch)||s.customerName?.toLowerCase().includes(sSearch.toLowerCase()))).map(s=>(
                        <tr key={s.id}>
                          <td style={{...TD,color:"#38bdf8",fontWeight:700}}>{s.invoiceNo}</td>
                          <td style={TD}>{fmt(s.saleDate)}</td>
                          <td style={TD}>{s.customerName||"Walk-in"}</td>
                          <td style={TD}>{(s.items||[]).length} item{(s.items||[]).length!==1?"s":""}</td>
                          <td style={TD}>{s.paymentMode||"Cash"}</td>
                          <td style={{...TD,color:"#4ade80",fontWeight:700}}>{fmtMoney(s.netTotal)}</td>
                          <td style={TD}><Btn small onClick={()=>setInvoiceSale(s)}>🧾 View</Btn></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sheet==="returns"&&(
            <div>
              <h2 style={{margin:"0 0 20px",color:"#f1f5f9"}}>↩️ Returns & Refunds</h2>
              <div style={{background:"#1e293b",borderRadius:12,padding:20,marginBottom:20,border:"1px solid #334155"}}>
                {retErr&&<div style={{background:"#3b0f0f",color:"#f87171",padding:"8px 12px",borderRadius:6,marginBottom:12,fontSize:12}}>{retErr}</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={lStyle}>Invoice Number *</label>
                    <input style={iStyle} value={retForm.invoiceNo} onChange={e=>setRetForm(f=>({...f,invoiceNo:e.target.value.toUpperCase()}))} placeholder="e.g. INV-0001"/>
                    {retForm.invoiceNo&&(()=>{
                      const found=sales.find(s=>s.invoiceNo===retForm.invoiceNo&&!s.isReturn);
                      const alreadyReturned=sales.find(s=>s.originalInvoice===retForm.invoiceNo);
                      if(alreadyReturned) return<div style={{fontSize:11,color:"#f87171",marginTop:4}}>⚠ Already returned</div>;
                      if(found) return<div style={{fontSize:11,color:"#4ade80",marginTop:4}}>✅ Found: {fmtMoney(found.netTotal)} · {fmt(found.saleDate)}</div>;
                      return<div style={{fontSize:11,color:"#f87171",marginTop:4}}>Invoice not found</div>;
                    })()}
                  </div>
                  <div><label style={lStyle}>Reason</label><input style={iStyle} value={retForm.reason} onChange={e=>setRetForm(f=>({...f,reason:e.target.value}))} placeholder="e.g. Wrong medicine"/></div>
                </div>
                <Btn onClick={processReturn} disabled={saving} danger>↩️ Process Full Return</Btn>
              </div>
              <div style={{overflowX:"auto",background:"#1e293b",borderRadius:12,border:"1px solid #334155"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                  <thead><tr><th style={TH}>Ref</th><th style={TH}>Original Invoice</th><th style={TH}>Date</th><th style={TH}>Amount</th><th style={TH}>Reason</th></tr></thead>
                  <tbody>
                    {sales.filter(s=>s.isReturn).length===0
                      ?<tr><td colSpan={5} style={{...TD,textAlign:"center",color:"#475569",padding:40}}>No returns yet.</td></tr>
                      :sales.filter(s=>s.isReturn).map(r=>(
                        <tr key={r.id}>
                          <td style={{...TD,color:"#f87171",fontWeight:700}}>{r.invoiceNo}</td>
                          <td style={{...TD,color:"#38bdf8"}}>{r.originalInvoice}</td>
                          <td style={TD}>{fmt(r.saleDate)}</td>
                          <td style={{...TD,color:"#f87171",fontWeight:700}}>-{fmtMoney(r.netTotal)}</td>
                          <td style={{...TD,color:"#94a3b8"}}>{r.reason||"-"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{display:sheet==="expiry"   ?"block":"none"}}>
            {visited.expiry    && <ExpiryTracker purchases={purchases}/>}
          </div>
          <div style={{display:sheet==="reorder"  ?"block":"none"}}>
            {visited.reorder   && <ReorderSuggestions inventory={inventory}/>}
          </div>
          <div style={{display:sheet==="analytics"?"block":"none"}}>
            {visited.analytics && <Analytics sales={sales} purchases={purchases}/>}
          </div>
        </div>
      </div>

      {invoiceSale  && <InvoiceModal sale={invoiceSale} shopInfo={shopInfo} onClose={()=>setInvoiceSale(null)}/>}
      {showSettings && <SettingsModal shopInfo={shopInfo} setShopInfo={setShopInfo} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUPER ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════
function SuperAdminDashboard({ onSignOut }) {
  const[shops,      setShops]    =useState([]);
  const[loading,    setLoading]  =useState(true);
  const[activeTab,  setActiveTab]=useState("shops");
  const[msg,        setMsg]      =useState("");

  const loadData=async()=>{
    setLoading(true);
    try{const{data:shopData}=await supabase.from("shop_profiles").select("*, subscriptions(*)").order("created_at",{ascending:false});setShops(shopData||[]);}
    catch(e){console.error(e);}
    finally{setLoading(false);}
  };
  useEffect(()=>{loadData();},[]);// eslint-disable-line react-hooks/exhaustive-deps

  const toggleShop=async(shopId,ownerId,currentStatus)=>{
    const newStatus=currentStatus==="active"?"suspended":"active";
    const{error}=await supabase.from("subscriptions").update({status:newStatus}).eq("owner_id",ownerId);
    if(!error){setMsg(`Shop ${newStatus==="active"?"activated":"deactivated"} successfully!`);setTimeout(()=>setMsg(""),3000);loadData();}
  };

  const totalShops  =shops.length;
  const activeShops =shops.filter(s=>s.subscriptions?.status==="active").length;
  const trialShops  =shops.filter(s=>s.subscriptions?.plan==="trial").length;
  const expiredShops=shops.filter(s=>{const sub=s.subscriptions;if(!sub||sub.plan!=="trial")return false;return new Date(sub.trial_end)<new Date();}).length;
  const totalRevenue=shops.filter(s=>s.subscriptions?.plan==="paid").length*999;

  return(
    <div style={{minHeight:"100vh",background:"#060d1a",fontFamily:"sans-serif"}}>
      <div style={{background:"#1e293b",borderBottom:"1px solid #334155",padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:24}}>💊</span>
          <div><div style={{color:"#f1f5f9",fontWeight:800,fontSize:16}}>MedStock Pro</div><div style={{color:"#f59e0b",fontSize:11,fontWeight:700}}>⚡ Super Admin Panel</div></div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{background:"#451a03",color:"#f59e0b",padding:"3px 12px",borderRadius:20,fontSize:11,fontWeight:700}}>👑 Super Admin</span>
          <Btn small onClick={onSignOut} color="#dc2626">Logout</Btn>
        </div>
      </div>
      <div style={{padding:24,maxWidth:1200,margin:"0 auto"}}>
        {msg&&<div style={{background:"#064e3b",color:"#4ade80",padding:"10px 16px",borderRadius:8,marginBottom:16,fontSize:13,fontWeight:600}}>✅ {msg}</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:28}}>
          {[{icon:"🏪",label:"Total Shops",val:totalShops,color:"#0284c7"},{icon:"✅",label:"Active Shops",val:activeShops,color:"#059669"},{icon:"⏰",label:"On Trial",val:trialShops,color:"#d97706"},{icon:"❌",label:"Expired",val:expiredShops,color:"#dc2626"},{icon:"💰",label:"SaaS Revenue",val:`₹${totalRevenue}`,color:"#7c3aed"}].map(c=>(
            <div key={c.label} style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",border:`1px solid ${c.color}33`,borderLeft:`3px solid ${c.color}`}}>
              <div style={{fontSize:22,marginBottom:4}}>{c.icon}</div>
              <div style={{color:c.color,fontSize:22,fontWeight:800}}>{c.val}</div>
              <div style={{color:"#94a3b8",fontSize:11,textTransform:"uppercase",marginTop:4}}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:6,background:"#0f172a",borderRadius:8,padding:4,marginBottom:20,width:"fit-content"}}>
          {["shops","revenue"].map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"7px 20px",borderRadius:6,border:"none",background:activeTab===tab?"#0284c7":"transparent",color:activeTab===tab?"#fff":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",textTransform:"capitalize"}}>
              {tab==="shops"?"🏪 All Shops":"💰 Revenue"}
            </button>
          ))}
        </div>
        {activeTab==="shops"&&(
          <div style={{background:"#1e293b",borderRadius:12,border:"1px solid #334155",overflowX:"auto"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid #334155",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h3 style={{margin:0,color:"#f1f5f9",fontSize:15}}>🏪 Registered Shops</h3>
              <button onClick={loadData} style={{background:"#334155",color:"#94a3b8",border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>🔄 Refresh</button>
            </div>
            {loading?<div style={{padding:40,textAlign:"center",color:"#475569"}}>⟳ Loading...</div>
              :shops.length===0?<div style={{padding:40,textAlign:"center",color:"#475569"}}>No shops registered yet.</div>
              :(
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
                  <thead><tr><th style={TH}>Shop Name</th><th style={TH}>Email</th><th style={TH}>Plan</th><th style={TH}>Status</th><th style={TH}>Trial End</th><th style={TH}>Registered</th><th style={TH}>Action</th></tr></thead>
                  <tbody>
                    {shops.map(shop=>{
                      const sub=shop.subscriptions;
                      const isExpired=sub?.plan==="trial"&&new Date(sub?.trial_end)<new Date();
                      const isActive =sub?.status==="active"&&!isExpired;
                      return(
                        <tr key={shop.id}>
                          <td style={TD}><strong style={{color:"#f1f5f9"}}>{shop.shop_name}</strong></td>
                          <td style={{...TD,color:"#94a3b8"}}>{shop.shop_email||"-"}</td>
                          <td style={TD}>{sub?.plan==="trial"?badge("Trial","#92400e","#fbbf24"):sub?.plan==="paid"?badge("Paid","#064e3b","#4ade80"):badge("None","#1e293b","#475569")}</td>
                          <td style={TD}>{isExpired?badge("Expired","#7c2d12","#f87171"):isActive?badge("Active","#064e3b","#4ade80"):badge("Suspended","#3b0f0f","#f87171")}</td>
                          <td style={{...TD,color:isExpired?"#f87171":"#e2e8f0"}}>{sub?.trial_end?fmt(sub.trial_end):"-"}</td>
                          <td style={{...TD,color:"#64748b"}}>{fmt(shop.created_at)}</td>
                          <td style={TD}><Btn small color={isActive?"#dc2626":"#059669"} onClick={()=>toggleShop(shop.id,shop.owner_id,sub?.status)}>{isActive?"Deactivate":"Activate"}</Btn></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        )}
        {activeTab==="revenue"&&(
          <div style={{background:"#1e293b",borderRadius:12,border:"1px solid #334155",padding:24}}>
            <h3 style={{margin:"0 0 20px",color:"#f1f5f9"}}>💰 SaaS Revenue Overview</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:24}}>
              {[{label:"Total Shops",val:totalShops,color:"#0284c7",icon:"🏪"},{label:"Paid Subscribers",val:shops.filter(s=>s.subscriptions?.plan==="paid").length,color:"#059669",icon:"💳"},{label:"Trial Users",val:trialShops,color:"#d97706",icon:"⏰"},{label:"Monthly Revenue",val:`₹${totalRevenue}`,color:"#7c3aed",icon:"💰"}].map(c=>(
                <div key={c.label} style={{background:"#0f172a",borderRadius:10,padding:"16px 20px",border:`1px solid ${c.color}33`}}>
                  <div style={{fontSize:24,marginBottom:8}}>{c.icon}</div>
                  <div style={{color:c.color,fontSize:24,fontWeight:800}}>{c.val}</div>
                  <div style={{color:"#64748b",fontSize:11,textTransform:"uppercase",marginTop:6}}>{c.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#0f172a",borderRadius:10,padding:20,border:"1px solid #334155"}}>
              <h4 style={{margin:"0 0 16px",color:"#94a3b8",fontSize:12,textTransform:"uppercase"}}>Subscription Breakdown</h4>
              {shops.map(shop=>{
                const sub=shop.subscriptions;
                return(
                  <div key={shop.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1e293b"}}>
                    <div><div style={{color:"#f1f5f9",fontSize:13,fontWeight:600}}>{shop.shop_name}</div><div style={{color:"#64748b",fontSize:11}}>{shop.shop_email}</div></div>
                    <div style={{textAlign:"right"}}>{sub?.plan==="paid"?<span style={{color:"#4ade80",fontWeight:700}}>₹999/yr</span>:<span style={{color:"#f59e0b",fontSize:12}}>Trial</span>}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// RAZORPAY — loadScript helper
// ═══════════════════════════════════════════════════════════
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

const RAZORPAY_KEY_ID      = "rzp_test_SPrdk2NokVnlEF"; // ← replace with your key
const MONTHLY_PRICE_PAISE  = 14900;
const MONTHLY_PRICE_INR    = 149;
const ANNUAL_PRICE_PAISE   = 99900;
const ANNUAL_PRICE_INR     = 999;
const MONTHLY_FULL_YEAR    = 149 * 12;

// ═══════════════════════════════════════════════════════════
// UPGRADE BUTTON
// ═══════════════════════════════════════════════════════════
function UpgradeButton({ label = "⬆️ Upgrade to Pro", style: s }) {
  const { user, shopProfile, subscription, refreshUserData } = useAuth();
  const [paying, setPaying] = useState(false);
  const [msg,    setMsg]    = useState("");

  const handlePayment = async () => {
    setMsg(""); setPaying(true);
    const loaded = await loadRazorpayScript();
    if (!loaded) { setMsg("Payment gateway unavailable."); setPaying(false); return; }
    const options = {
      key: RAZORPAY_KEY_ID, amount: MONTHLY_PRICE_PAISE, currency: "INR",
      name: "MedStock Pro", description: "Monthly Plan (₹149/month)",
      prefill: { email: user?.email || "", name: shopProfile?.shop_name || "" },
      theme: { color: "#0284c7" },
      handler: async (response) => {
        const now = new Date(); const end = new Date(now); end.setMonth(end.getMonth() + 1);
        await supabase.from("subscriptions").update({
          plan: "paid", status: "active",
          razorpay_payment_id: response.razorpay_payment_id,
          current_period_start: now.toISOString(), current_period_end: end.toISOString(),
        }).eq("owner_id", user.id);
        setMsg("✅ Upgraded!"); refreshUserData(); setPaying(false);
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
    <div style={{display:"inline-flex",alignItems:"center",gap:8}}>
      <button onClick={handlePayment} disabled={paying||isPaid}
        style={{padding:"6px 16px",background:isPaid?"#064e3b":"#0284c7",color:"#fff",
          border:"none",borderRadius:8,fontWeight:700,fontSize:12,
          cursor:paying||isPaid?"not-allowed":"pointer",...s}}>
        {isPaid?"✅ Pro Active":paying?"⟳ Processing...":label}
      </button>
      {msg&&<span style={{fontSize:11,color:msg.startsWith("✅")?"#4ade80":"#f87171"}}>{msg}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRICING PAGE — shown when trial expires
// ═══════════════════════════════════════════════════════════
function PricingPage() {
  const { user, shopProfile, subscription, refreshUserData, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [paying,  setPaying]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const daysUsed = subscription?.trial_start
    ? Math.floor((new Date() - new Date(subscription.trial_start)) / 86400000) : 30;

  const handlePayment = async () => {
    setError(""); setPaying(true);
    const loaded = await loadRazorpayScript();
    if (!loaded) { setError("Failed to load payment gateway."); setPaying(false); return; }
    const isAnnual  = selectedPlan === "annual";
    const amountINR = isAnnual ? ANNUAL_PRICE_INR : MONTHLY_PRICE_INR;
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: isAnnual ? ANNUAL_PRICE_PAISE : MONTHLY_PRICE_PAISE,
      currency: "INR", name: "MedStock Pro",
      description: isAnnual ? "Annual Plan (₹999/year)" : "Monthly Plan (₹149/month)",
      prefill: { name: shopProfile?.shop_name||"Shop Owner", email: user?.email||"", contact: shopProfile?.phone||"" },
      notes: { shop_id: shopProfile?.id||"", owner_id: user?.id||"", plan: selectedPlan },
      theme: { color: "#0284c7" },
      handler: async (response) => { await activateSubscription(response.razorpay_payment_id, selectedPlan, amountINR); },
      modal: { ondismiss: () => { setError("Payment cancelled."); setPaying(false); } },
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (r) => { setError("Payment failed: "+(r.error?.description||"Try again.")); setPaying(false); });
    rzp.open();
  };

  const activateSubscription = async (paymentId, plan, amountINR) => {
    try {
      const now = new Date(); 
      const periodEnd = new Date(now);
      if (plan === "annual") periodEnd.setFullYear(periodEnd.getFullYear()+1);
      else periodEnd.setMonth(periodEnd.getMonth()+1);

      // ✅ Log user.id to confirm correct user
      console.log("Activating subscription for user:", user?.id);

      const { data: updateData, error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan:                 "paid",
          status:               "active",
          razorpay_payment_id:  paymentId,
          current_period_start: now.toISOString(),
          current_period_end:   periodEnd.toISOString(),
          updated_at:           now.toISOString(),
        })
        .eq("owner_id", user.id)
        .select(); // ✅ .select() returns updated rows — confirms update worked

      console.log("Update result:", updateData, "Error:", updateError);

      if (updateError) {
        setError("Payment received ✅ but activation failed. Payment ID: " + paymentId + " | Error: " + updateError.message);
        setPaying(false);
        return;
      }

      // ✅ Check if any row was actually updated
      if (!updateData || updateData.length === 0) {
        setError("Payment received ✅ but no subscription row found. Payment ID: " + paymentId + ". Contact support.");
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
      }).then(()=>{}).catch(()=>{});

      setPaying(false);
      await refreshUserData();
      setSuccess(true);

    } catch(e) { 
      console.error("activateSubscription error:", e);
      setError("Activation error: " + e.message); 
      setPaying(false); 
    }
  };

  // ✅ useEffect for navigation — not setTimeout in render body
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
      return () => clearTimeout(t);
    }
  }, [success, navigate]);

  if (success) {
    return (
      <div style={{minHeight:"100vh",background:"#060d1a",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"#1e293b",borderRadius:20,padding:28,maxWidth:460,width:"100%",border:"2px solid #059669",textAlign:"center"}}>
          <div style={{fontSize:60,marginBottom:16}}>🎉</div>
          <h2 style={{color:"#4ade80",margin:"0 0 10px"}}>Payment Successful!</h2>
          <p style={{color:"#94a3b8",fontSize:14,margin:"0 0 6px"}}>Your MedStock Pro subscription is now active.</p>
          <p style={{color:"#64748b",fontSize:12}}>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"#060d1a",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#1e293b",borderRadius:20,padding:28,maxWidth:460,width:"100%",border:"1px solid #334155",boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:38,marginBottom:6}}>💊</div>
          <h2 style={{color:"#f1f5f9",margin:"0 0 6px",fontSize:22,fontWeight:800}}>MedStock Pro</h2>
          <p style={{color:"#f87171",fontSize:12,margin:0,fontWeight:600}}>⏰ Your 30-day free trial has ended ({daysUsed} days used)</p>
          <p style={{color:"#94a3b8",fontSize:12,margin:"4px 0 0"}}>Choose a plan to continue</p>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:20}}>
          {/* Monthly */}
          <div onClick={()=>setSelectedPlan("monthly")} style={{flex:1,padding:"16px 14px",borderRadius:12,cursor:"pointer",background:"#0f172a",border:selectedPlan==="monthly"?"2px solid #0284c7":"2px solid #334155"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:10}}>
              <span style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase"}}>Monthly</span>
              <span style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${selectedPlan==="monthly"?"#0284c7":"#475569"}`,background:selectedPlan==="monthly"?"#0284c7":"transparent",display:"inline-block"}}/>
            </div>
            <div style={{color:"#f1f5f9",fontSize:28,fontWeight:800,lineHeight:1}}>₹149</div>
            <div style={{color:"#64748b",fontSize:11,marginTop:5}}>per month</div>
          </div>
          {/* Annual */}
          <div onClick={()=>setSelectedPlan("annual")} style={{flex:1,padding:"16px 14px",borderRadius:12,cursor:"pointer",background:"#0f172a",position:"relative",border:selectedPlan==="annual"?"2px solid #059669":"2px solid #334155"}}>
            <div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:"#059669",color:"#fff",padding:"2px 10px",borderRadius:20,fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>🔥 SAVE ₹{MONTHLY_FULL_YEAR-ANNUAL_PRICE_INR}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:10}}>
              <span style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase"}}>Annual</span>
              <span style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${selectedPlan==="annual"?"#059669":"#475569"}`,background:selectedPlan==="annual"?"#059669":"transparent",display:"inline-block"}}/>
            </div>
            <div style={{color:"#f1f5f9",fontSize:28,fontWeight:800,lineHeight:1}}>₹999</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5}}>
              <span style={{color:"#64748b",fontSize:11,textDecoration:"line-through"}}>₹{MONTHLY_FULL_YEAR}</span>
              <span style={{color:"#4ade80",fontSize:11,fontWeight:700}}>~₹83/mo</span>
            </div>
          </div>
        </div>
        <div style={{background:"#0f172a",borderRadius:10,padding:"14px 16px",marginBottom:18}}>
          <div style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:10}}>Everything included:</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px 8px"}}>
            {["✅ Unlimited medicines","✅ GST billing & invoices","✅ Purchases & stock-in","✅ Expiry date tracking","✅ Reorder alerts","✅ Analytics & reports","✅ Staff management","✅ Priority support"].map(f=>(
              <div key={f} style={{color:"#e2e8f0",fontSize:12}}>{f}</div>
            ))}
          </div>
        </div>
        {error&&<div style={{background:"#3b0f0f",color:"#f87171",padding:"10px 14px",borderRadius:8,marginBottom:14,fontSize:12,lineHeight:1.6}}>⚠️ {error}</div>}
        <button onClick={handlePayment} disabled={paying} style={{width:"100%",padding:"14px",fontSize:15,fontWeight:800,background:paying?"#1e3a5f":selectedPlan==="annual"?"#059669":"#0284c7",color:"#fff",border:"none",borderRadius:10,cursor:paying?"not-allowed":"pointer",opacity:paying?0.7:1,marginBottom:12}}>
          {paying?"⟳ Opening Payment...":selectedPlan==="annual"?"💳 Pay ₹999 — Annual Plan":"💳 Pay ₹149 — Monthly Plan"}
        </button>
        <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
          {["🔒 Secure","🇮🇳 Razorpay","⚡ Instant Access","↩️ Cancel Anytime"].map(t=>(
            <span key={t} style={{color:"#475569",fontSize:10,fontWeight:600}}>{t}</span>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {["UPI","GPay","PhonePe","Credit Card","Debit Card","Net Banking","Wallets"].map(m=>(
            <span key={m} style={{background:"#1e293b",color:"#64748b",padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:600}}>{m}</span>
          ))}
        </div>
        <div style={{textAlign:"center"}}>
          <button onClick={signOut} style={{background:"none",border:"none",color:"#475569",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROOT EXPORT
// BrowserRouter is the OUTERMOST wrapper so useNavigate works
// inside AppRoutes (which needs to be inside a Router)
// ═══════════════════════════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

// ─────────────────────────────────────────────────────────
// AppRoutes — all auth logic lives HERE, inside the Router
// so useNavigate() works correctly
// ─────────────────────────────────────────────────────────
function AppRoutes() {
  const { user, loading, isSuperAdmin, isSubscriptionActive, subscription, signOut } = useAuth();
  const navigate = useNavigate();

  // ✅ Logout fix: signOut + navigate to homepage
  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#060d1a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#38bdf8",fontSize:14}}>⟳ Loading MedStock Pro…</div>
    </div>
  );

  return (
    <Routes>
      <Route path="/"       element={<HomePage />} />
      <Route path="/login"  element={!user ? <AuthGate mode="login"  /> : <Navigate to="/dashboard" replace />} />
      <Route path="/signup" element={!user ? <AuthGate mode="signup" /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard"
        element={
          !user                                   ? <Navigate to="/login" replace /> :
          isSuperAdmin                            ? <SuperAdminDashboard onSignOut={handleSignOut} /> :
          subscription && !isSubscriptionActive() ? <PricingPage /> :
                                                    <Dashboard onSignOut={handleSignOut} />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}