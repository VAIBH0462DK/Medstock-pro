// src/components/Analytics.jsx
// ─── This file is lazy-loaded. Recharts (~500KB) only downloads
//     when the user navigates to Analytics. ───────────────────
import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const fmtMoney = v => `₹${parseFloat(v||0).toFixed(2)}`;

export default function Analytics({ sales, purchases }) {
  const [period, setPeriod] = useState("6m");
  const validSales = sales.filter(s => !s.isReturn);
  const returns    = sales.filter(s =>  s.isReturn);
  const now        = new Date();
  const monthCount = period==="3m" ? 3 : period==="6m" ? 6 : 12;

  const monthlyData = useMemo(() => {
    const months = [];
    for(let i=monthCount-1; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push({
        key:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
        label: d.toLocaleDateString("en-IN", {month:"short", year:"2-digit"}),
      });
    }
    return months.map(m => {
      const mSales     = validSales.filter(s => (s.saleDate||"").startsWith(m.key));
      const mPurchases = purchases.filter(p => (p.purchaseDate||"").startsWith(m.key));
      const revenue    = mSales.reduce((s,r)     => s + parseFloat(r.netTotal||0), 0);
      const cost       = mPurchases.reduce((s,p) => s + parseFloat(p.totalAmount||0), 0);
      const gst        = mSales.reduce((s,r)     => s + parseFloat(r.gstTotal||0), 0);
      return { month:m.label, revenue:+revenue.toFixed(2), cost:+cost.toFixed(2), profit:+(revenue-cost).toFixed(2), gst:+gst.toFixed(2) };
    });
  }, [validSales, purchases, monthCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRevenue = validSales.reduce((s,r) => s + parseFloat(r.netTotal||0), 0);
  const totalCost    = purchases.reduce((s,p)  => s + parseFloat(p.totalAmount||0), 0);
  const totalGST     = validSales.reduce((s,r) => s + parseFloat(r.gstTotal||0), 0);
  const totalReturns = returns.reduce((s,r)    => s + parseFloat(r.netTotal||0), 0);

  const topMeds = useMemo(() => {
    const medSales = {};
    validSales.forEach(s => {
      (s.items||[]).forEach(i => {
        if (!medSales[i.medicineName]) medSales[i.medicineName] = {qty:0, revenue:0};
        medSales[i.medicineName].qty     += parseFloat(i.quantity||0);
        medSales[i.medicineName].revenue += parseFloat(i.amount||0);
      });
    });
    return Object.entries(medSales).sort((a,b) => b[1].revenue-a[1].revenue).slice(0,6);
  }, [validSales]);

  const payData = useMemo(() => {
    const payMap = {};
    validSales.forEach(s => { payMap[s.paymentMode||"Cash"] = (payMap[s.paymentMode||"Cash"]||0)+1; });
    return Object.entries(payMap).map(([name,value]) => ({name,value}));
  }, [validSales]);

  const PIE_COLORS = ["#0284c7","#059669","#d97706","#7c3aed"];

  const StatCard = ({label,val,color,icon}) => (
    <div style={{background:"#1e293b", borderRadius:12, padding:"16px 18px", border:`1px solid ${color}33`, borderLeft:`3px solid ${color}`}}>
      <div style={{fontSize:20, marginBottom:4}}>{icon}</div>
      <div style={{color, fontSize:20, fontWeight:800}}>{val}</div>
      <div style={{color:"#94a3b8", fontSize:11, fontWeight:600, marginTop:4, textTransform:"uppercase"}}>{label}</div>
    </div>
  );

  const TH = {padding:"9px 12px", textAlign:"left", color:"#94a3b8", fontSize:11, fontWeight:700, textTransform:"uppercase", borderBottom:"1px solid #1e293b", whiteSpace:"nowrap"};
  const TD = {padding:"9px 12px", color:"#e2e8f0", fontSize:13, borderBottom:"1px solid #1e293b"};

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
        <h2 style={{margin:0, color:"#f1f5f9"}}>📈 Analytics</h2>
        <div style={{display:"flex", gap:6}}>
          {["3m","6m","12m"].map(p => (
            <button key={p} onClick={()=>setPeriod(p)}
              style={{padding:"5px 12px", borderRadius:6, border:"none", fontSize:12, fontWeight:700, cursor:"pointer",
                background:period===p?"#0284c7":"#1e293b", color:period===p?"#fff":"#64748b"}}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24}}>
        <StatCard icon="💰" label="Total Revenue"   val={fmtMoney(totalRevenue)}            color="#0284c7"/>
        <StatCard icon="📦" label="Total Purchases" val={fmtMoney(totalCost)}               color="#d97706"/>
        <StatCard icon="📊" label="Gross Profit"    val={fmtMoney(totalRevenue-totalCost)}  color="#059669"/>
        <StatCard icon="🏛️" label="GST Collected"   val={fmtMoney(totalGST)}                color="#7c3aed"/>
        <StatCard icon="↩️" label="Returns Value"   val={fmtMoney(totalReturns)}            color="#dc2626"/>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20}}>
        <div style={{background:"#1e293b", borderRadius:12, padding:16, border:"1px solid #334155"}}>
          <h4 style={{margin:"0 0 12px", color:"#94a3b8", fontSize:12, textTransform:"uppercase"}}>Revenue vs Cost</h4>
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
        <div style={{background:"#1e293b", borderRadius:12, padding:16, border:"1px solid #334155"}}>
          <h4 style={{margin:"0 0 12px", color:"#94a3b8", fontSize:12, textTransform:"uppercase"}}>Profit Trend</h4>
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
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div style={{background:"#1e293b", borderRadius:12, padding:16, border:"1px solid #334155"}}>
          <h4 style={{margin:"0 0 12px", color:"#94a3b8", fontSize:12, textTransform:"uppercase"}}>Top Medicines by Revenue</h4>
          {topMeds.length===0 ? <p style={{color:"#475569", fontSize:13}}>No sales data.</p> :
            topMeds.map(([name,data],i) => (
              <div key={name} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #0f172a"}}>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <span style={{color:"#475569", fontSize:11, fontWeight:700, width:16}}>#{i+1}</span>
                  <span style={{color:"#e2e8f0", fontSize:12}}>{name}</span>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:"#4ade80", fontSize:12, fontWeight:700}}>{fmtMoney(data.revenue)}</div>
                  <div style={{color:"#475569", fontSize:10}}>{data.qty} units</div>
                </div>
              </div>
            ))
          }
        </div>
        <div style={{background:"#1e293b", borderRadius:12, padding:16, border:"1px solid #334155"}}>
          <h4 style={{margin:"0 0 12px", color:"#94a3b8", fontSize:12, textTransform:"uppercase"}}>Payment Methods</h4>
          {payData.length===0 ? <p style={{color:"#475569", fontSize:13}}>No sales data.</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={payData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                  {payData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                </Pie>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}