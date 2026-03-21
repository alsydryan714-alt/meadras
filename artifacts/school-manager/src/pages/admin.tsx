import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Stats {
  totalSchools: number;
  activeSchools: number;
  trialSchools: number;
  expiredSchools: number;
  totalRevenue: number;
}

interface School {
  id: number;
  name: string;
  city: string;
  is_active: boolean;
  setup_complete: boolean;
  email: string;
  admin_name: string;
  plan: string;
  sub_status: string;
  sub_active: boolean;
  amount: number;
  expires_at: string | null;
  started_at: string;
}

interface Payment {
  id: number;
  school: string;
  plan: string;
  amount: number;
  status: string;
  date: string;
}

type Page = "dashboard" | "subscribers" | "revenue" | "plans";
type Filter = "all" | "active" | "trial" | "expired";

const PLAN_LABELS: Record<string, string> = { basic: "أساسي", professional: "احترافي", trial: "تجريبي" };
const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  basic: { monthly: 149, yearly: 1490 },
  professional: { monthly: 299, yearly: 2990 },
};

function authHeaders() {
  const token = localStorage.getItem("madrass_admin_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function AdminPage() {
  const { toast } = useToast();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("Rsyg991@gmail.com");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState<Page>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState("madrass");
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    const r = await fetch(`${BASE}/api/admin/stats`, { headers: authHeaders() });
    if (r.ok) setStats(await r.json());
  }, []);

  const fetchSchools = useCallback(async () => {
    const r = await fetch(`${BASE}/api/admin/schools`, { headers: authHeaders() });
    if (r.ok) setSchools(await r.json());
  }, []);

  const fetchPayments = useCallback(async () => {
    const r = await fetch(`${BASE}/api/admin/payments`, { headers: authHeaders() });
    if (r.ok) setPayments(await r.json());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("madrass_admin_token");
    if (token) { setLoggedIn(true); }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetchStats();
    fetchSchools();
    fetchPayments();
  }, [loggedIn, fetchStats, fetchSchools, fetchPayments]);

  async function doLogin() {
    setLoginError("");
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPass }),
    });
    const data = await r.json();
    if (!r.ok) { setLoginError(data.error || "بيانات غير صحيحة"); return; }
    if (data.user?.role !== "super_admin") { setLoginError("هذا الحساب ليس مشرفاً عاماً"); return; }
    localStorage.setItem("madrass_admin_token", data.token);
    setLoggedIn(true);
  }

  function doLogout() {
    localStorage.removeItem("madrass_admin_token");
    setLoggedIn(false);
  }

  async function toggleSchool(id: number, activate: boolean) {
    await fetch(`${BASE}/api/admin/schools/${id}/status`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ isActive: activate }),
    });
    fetchSchools(); fetchStats();
    toast({ title: activate ? "تم تفعيل المدرسة" : "تم إيقاف المدرسة" });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const school = schools.find(s => s.id === deleteTarget);
    await fetch(`${BASE}/api/admin/schools/${deleteTarget}`, { method: "DELETE", headers: authHeaders() });
    setDeleteTarget(null);
    fetchSchools(); fetchStats();
    toast({ title: `تم حذف ${school?.name}` });
  }

  async function addSchool() {
    if (!newName || !newEmail) { toast({ title: "أدخل الاسم والبريد", variant: "destructive" }); return; }
    setLoading(true);
    const r = await fetch(`${BASE}/api/admin/schools`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: newName, email: newEmail, plan: newPlan }),
    });
    setLoading(false);
    if (!r.ok) { const e = await r.json(); toast({ title: e.error || "خطأ", variant: "destructive" }); return; }
    setShowAddModal(false); setNewName(""); setNewEmail(""); setNewPlan("madrass");
    fetchSchools(); fetchStats();
    toast({ title: `✓ تم إنشاء حساب ${newName}` });
  }

  const filteredSchools = schools.filter(s => {
    const matchSearch = s.name.includes(search) || (s.email || "").includes(search);
    if (!matchSearch) return false;
    if (filter === "all") return true;
    if (filter === "active") return s.sub_status === "active" && s.sub_active;
    if (filter === "trial") return s.sub_status === "trial" && s.sub_active;
    if (filter === "expired") return !s.sub_active;
    return true;
  });

  const PAGE_INFO: Record<Page, [string, string]> = {
    dashboard: ["لوحة المتابعة", "نظرة عامة على المنصة"],
    subscribers: ["المشتركون", "إدارة مدارس مدراس"],
    revenue: ["الإيرادات", "سجل المدفوعات"],
    plans: ["الباقات", "أسعار الاشتراكات"],
  };

  if (!loggedIn) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(150deg,#020C2B 0%,#0A2463 50%,#1B4DB3 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Tajawal', sans-serif" }} dir="rtl">
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 48, width: 400, backdropFilter: "blur(20px)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: "white", letterSpacing: -2 }}>مد<span style={{ color: "#00B89F" }}>راس</span></div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 4, letterSpacing: 2 }}>ADMIN PORTAL · لوحة التحكم</p>
          </div>
          {["البريد الإلكتروني", "كلمة المرور"].map((label, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500, marginBottom: 8, letterSpacing: 1 }}>{label}</label>
              <input
                type={i === 1 ? "password" : "email"}
                value={i === 0 ? loginEmail : loginPass}
                onChange={e => i === 0 ? setLoginEmail(e.target.value) : setLoginPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doLogin()}
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 16px", color: "white", fontFamily: "Tajawal", fontSize: 14, outline: "none", direction: "ltr", boxSizing: "border-box" }}
                placeholder={i === 0 ? "Rsyg991@gmail.com" : "123456789"}
              />
            </div>
          ))}
          <button
            onClick={doLogin}
            style={{ width: "100%", background: "linear-gradient(135deg,#1B4DB3,#2563EB)", border: "none", borderRadius: 12, padding: 14, color: "white", fontFamily: "Tajawal", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8 }}
          >دخول</button>
          {loginError && <p style={{ color: "#F43F5E", fontSize: 12, textAlign: "center", marginTop: 12 }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  const s = style;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Tajawal', sans-serif", background: "#F4F7FF", direction: "rtl" }}>
      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "white", letterSpacing: -1 }}>مد<span style={{ color: "#00B89F" }}>راس</span></div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2, letterSpacing: 1 }}>PLATFORM ADMIN</p>
        </div>
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {[
            { key: "dashboard", label: "الرئيسية", icon: "▦" },
            { key: "subscribers", label: "المشتركون", icon: "🏫" },
            { key: "revenue", label: "الإيرادات", icon: "💰" },
            { key: "plans", label: "الباقات", icon: "⭐" },
          ].map(item => (
            <div
              key={item.key}
              onClick={() => setPage(item.key as Page)}
              style={{ ...s.navItem, ...(page === item.key ? s.navActive : {}) }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span> {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#1B4DB3,#F5A623)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>م</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>مشرف المنصة</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>super_admin</div>
            </div>
            <button onClick={doLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 16 }} title="خروج">⎋</button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ marginRight: 240, flex: 1 }}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0A2463" }}>{PAGE_INFO[page][0]}</div>
            <div style={{ fontSize: 12, color: "#6B7DB3", marginTop: 1 }}>{PAGE_INFO[page][1]}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { fetchStats(); fetchSchools(); fetchPayments(); toast({ title: "تم التحديث" }); }} style={s.btnGhost}>↻ تحديث</button>
            {page === "subscribers" && (
              <button onClick={() => setShowAddModal(true)} style={s.btnPrimary}>+ إضافة مدرسة</button>
            )}
          </div>
        </div>

        <div style={{ padding: "28px 32px" }}>
          {/* ── Dashboard ── */}
          {page === "dashboard" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
                {[
                  { label: "إجمالي المدارس", val: stats?.totalSchools ?? "…", color: "#1B4DB3", bg: "#DBEAFE", icon: "🏫" },
                  { label: "اشتراكات نشطة", val: stats?.activeSchools ?? "…", color: "#065F46", bg: "#D1FAE5", icon: "✅" },
                  { label: "فترة تجريبية", val: stats?.trialSchools ?? "…", color: "#1E40AF", bg: "#DBEAFE", icon: "⏳" },
                  { label: "إيرادات الباقات", val: (stats?.totalRevenue ?? 0).toLocaleString() + " ر.س", color: "#92400E", bg: "#FEF3C7", icon: "💰" },
                ].map((card, i) => (
                  <div key={i} style={s.statCard}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 14 }}>{card.icon}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 500, color: "#0A2463", lineHeight: 1 }}>{card.val}</div>
                    <div style={{ fontSize: 12, color: "#6B7DB3", marginTop: 4 }}>{card.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "white", borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(10,36,99,0.08)", border: "1px solid rgba(10,36,99,0.12)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0A2463", marginBottom: 16 }}>آخر المدارس المسجّلة</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F4F7FF" }}>
                      {["المدرسة", "البريد", "الباقة", "الحالة", "الانتهاء"].map(h => (
                        <th key={h} style={{ padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#6B7DB3", textAlign: "right", borderBottom: "1px solid rgba(10,36,99,0.12)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schools.slice(0, 8).map(school => (
                      <tr key={school.id} style={{ borderBottom: "1px solid rgba(10,36,99,0.06)" }}>
                        <td style={{ padding: "13px 16px", fontWeight: 700, fontSize: 13, color: "#0A2463" }}>{school.name}</td>
                        <td style={{ padding: "13px 16px", fontSize: 12, color: "#6B7DB3" }}>{school.email}</td>
                        <td style={{ padding: "13px 16px" }}><StatusBadge type="plan" val={school.plan} /></td>
                        <td style={{ padding: "13px 16px" }}><StatusBadge type="status" val={school.sub_status} active={school.sub_active} /></td>
                        <td style={{ padding: "13px 16px", fontSize: 12, color: "#6B7DB3" }}>{school.expires_at ? new Date(school.expires_at).toLocaleDateString("ar-SA") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Subscribers ── */}
          {page === "subscribers" && (
            <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 3px rgba(10,36,99,0.08)", border: "1px solid rgba(10,36,99,0.12)", overflow: "hidden" }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(10,36,99,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F4F7FF", border: "1px solid rgba(10,36,99,0.12)", borderRadius: 10, padding: "8px 14px", flex: 1, maxWidth: 300 }}>
                  <span style={{ color: "#6B7DB3", fontSize: 14 }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث عن مدرسة أو بريد..." style={{ border: "none", background: "transparent", fontFamily: "Tajawal", fontSize: 13, outline: "none", width: "100%", color: "#0A2463" }} />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["all", "active", "trial", "expired"] as Filter[]).map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ ...s.filterTab, ...(filter === f ? s.filterTabActive : {}) }}>
                      {{ all: "الكل", active: "نشط", trial: "تجريبي", expired: "منتهي" }[f]}
                    </button>
                  ))}
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#F4F7FF" }}>
                  <tr>
                    {["المدرسة", "المدير / البريد", "الباقة", "الحالة", "الانتهاء", "إجراءات"].map(h => (
                      <th key={h} style={{ padding: "11px 18px", fontSize: 11, fontWeight: 700, color: "#6B7DB3", textAlign: "right", borderBottom: "1px solid rgba(10,36,99,0.12)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.map(school => (
                    <tr key={school.id} style={{ borderBottom: "1px solid rgba(10,36,99,0.06)" }}>
                      <td style={{ padding: "13px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#0A2463,#1B4DB3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white", flexShrink: 0 }}>
                            {school.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#0A2463" }}>{school.name}</div>
                            <div style={{ fontSize: 11, color: "#6B7DB3" }}>{school.city || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "13px 18px" }}>
                        <div style={{ fontSize: 13, color: "#0A2463" }}>{school.admin_name || "—"}</div>
                        <div style={{ fontSize: 11, color: "#6B7DB3" }}>{school.email || "—"}</div>
                      </td>
                      <td style={{ padding: "13px 18px" }}><StatusBadge type="plan" val={school.plan} /></td>
                      <td style={{ padding: "13px 18px" }}><StatusBadge type="status" val={school.sub_status} active={school.sub_active} /></td>
                      <td style={{ padding: "13px 18px", fontSize: 12, color: "#6B7DB3" }}>
                        {school.expires_at ? new Date(school.expires_at).toLocaleDateString("ar-SA") : "—"}
                      </td>
                      <td style={{ padding: "13px 18px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button
                            onClick={() => toggleSchool(school.id, !school.is_active)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: school.is_active ? "#D1FAE5" : "#FEE2E2", color: school.is_active ? "#065F46" : "#991B1B", fontSize: 14 }}
                            title={school.is_active ? "إيقاف" : "تفعيل"}
                          >{school.is_active ? "✓" : "✗"}</button>
                          <button
                            onClick={() => setDeleteTarget(school.id)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#FEE2E2", color: "#991B1B", fontSize: 13 }}
                            title="حذف"
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSchools.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#6B7DB3" }}>لا توجد نتائج</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Revenue ── */}
          {page === "revenue" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "إجمالي الإيرادات", val: (stats?.totalRevenue ?? 0).toLocaleString() },
                  { label: "اشتراكات نشطة", val: String(stats?.activeSchools ?? 0) },
                  { label: "معدل الاشتراكات", val: stats && stats.totalSchools ? Math.round(stats.activeSchools / stats.totalSchools * 100) + "%" : "—" },
                ].map((c, i) => (
                  <div key={i} style={s.statCard}>
                    <div style={{ fontSize: 12, color: "#6B7DB3", marginBottom: 8 }}>{c.label}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 500, color: "#0A2463" }}>{c.val} {i === 0 ? "ر.س" : ""}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(10,36,99,0.08)", border: "1px solid rgba(10,36,99,0.12)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0A2463", marginBottom: 16 }}>سجل المدفوعات</div>
                {payments.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#6B7DB3", padding: 32 }}>لا توجد مدفوعات مسجّلة بعد</p>
                ) : payments.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(10,36,99,0.08)" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0A2463", fontSize: 13 }}>{p.school}</div>
                      <div style={{ color: "#6B7DB3", fontSize: 12 }}>{PLAN_LABELS[p.plan] || p.plan}</div>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 500, color: "#1B4DB3" }}>{p.amount} ر.س</div>
                      <div style={{ fontSize: 11, color: "#6B7DB3" }}>{new Date(p.date).toLocaleDateString("ar-SA")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Plans ── */}
          {page === "plans" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {Object.entries(PLAN_PRICES).map(([planKey, prices]) => (
                <div key={planKey} style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(10,36,99,0.08)", border: "1px solid rgba(10,36,99,0.12)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0A2463" }}>
                      {planKey === "madrass" ? "باقة مدراس" : planKey === "basic" ? "الباقة الأساسية" : "الباقة الاحترافية"}
                    </div>
                    <StatusBadge type="plan" val={planKey} />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1, textAlign: "center", padding: 12, background: "#F4F7FF", borderRadius: 10, border: "1px solid rgba(10,36,99,0.12)" }}>
                      <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 500, color: "#0A2463" }}>{prices.monthly}</div>
                      <div style={{ fontSize: 11, color: "#6B7DB3", marginTop: 2 }}>ر.س / شهر</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center", padding: 12, background: "#F4F7FF", borderRadius: 10, border: "1px solid rgba(10,36,99,0.12)" }}>
                      <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 500, color: "#0A2463" }}>{prices.yearly}</div>
                      <div style={{ fontSize: 11, color: "#6B7DB3", marginTop: 2 }}>ر.س / سنة</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#1B4DB3", background: "#DBEAFE", padding: "2px 6px", borderRadius: 4, marginTop: 4, display: "inline-block" }}>
                        وفّر {Math.round((1 - prices.yearly / (prices.monthly * 12)) * 100)}%
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, fontSize: 12, color: "#6B7DB3" }}>
                    المشتركون الحاليون: <strong style={{ color: "#0A2463" }}>
                      {schools.filter(s => s.plan === planKey && s.sub_active).length}
                    </strong> مدرسة
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add School Modal ── */}
      {showAddModal && (
        <div style={s.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()} dir="rtl">
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0A2463", marginBottom: 6 }}>إضافة مدرسة جديدة</div>
            <div style={{ fontSize: 13, color: "#6B7DB3", marginBottom: 24 }}>ستُنشأ بكلمة مرور افتراضية: 123456</div>
            {[
              { label: "اسم المدرسة", val: newName, set: setNewName, type: "text", ph: "مدرسة الملك عبدالعزيز" },
              { label: "البريد الإلكتروني للمدير", val: newEmail, set: setNewEmail, type: "email", ph: "admin@school.sa" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6B7DB3", marginBottom: 6, letterSpacing: 0.5 }}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  style={{ width: "100%", border: "1.5px solid rgba(10,36,99,0.12)", borderRadius: 10, padding: "10px 14px", fontFamily: "Tajawal", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6B7DB3", marginBottom: 6, letterSpacing: 0.5 }}>الباقة</label>
              <select value={newPlan} onChange={e => setNewPlan(e.target.value)} style={{ width: "100%", border: "1.5px solid rgba(10,36,99,0.12)", borderRadius: 10, padding: "10px 14px", fontFamily: "Tajawal", fontSize: 13, outline: "none", background: "white" }}>
                <option value="madrass">مدراس</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowAddModal(false)} style={s.btnGhost}>إلغاء</button>
              <button onClick={addSchool} disabled={loading} style={s.btnPrimary}>{loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div style={s.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div style={{ ...s.modal, textAlign: "center", width: 380 }} onClick={e => e.stopPropagation()} dir="rtl">
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>🗑</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0A2463", marginBottom: 8 }}>تأكيد الحذف</div>
            <div style={{ fontSize: 13, color: "#6B7DB3", marginBottom: 24 }}>
              هل أنت متأكد من حذف "{schools.find(s => s.id === deleteTarget)?.name}"؟ لا يمكن التراجع.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteTarget(null)} style={s.btnGhost}>إلغاء</button>
              <button onClick={confirmDelete} style={{ ...s.btnPrimary, background: "#EF4444" }}>حذف نهائياً</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ type, val, active }: { type: "plan" | "status"; val: string; active?: boolean }) {
  if (type === "plan") {
    const map: Record<string, [string, string, string]> = {
      basic: ["#DBEAFE", "#0A2463", "أساسي"],
      professional: ["#FEF3C7", "#92400E", "احترافي"],
      trial: ["#DBEAFE", "#1E40AF", "تجريبي"],
    };
    const [bg, color, label] = map[val] ?? ["#F3F4F6", "#6B7280", val];
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>{label}</span>;
  }
  const isActive = active !== false && (val === "active" || val === "trial");
  const cfg = val === "active" ? ["#D1FAE5", "#065F46", "نشط"]
    : val === "trial" ? ["#DBEAFE", "#1E40AF", "تجريبي"]
    : ["#FEE2E2", "#991B1B", "منتهي"];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: cfg[0], color: cfg[1] }}>{cfg[2]}</span>;
}

const style = {
  sidebar: { width: 240, minHeight: "100vh", background: "#0A2463", display: "flex", flexDirection: "column" as const, position: "fixed" as const, right: 0, top: 0, bottom: 0, zIndex: 100 },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 2, transition: "all 0.15s" },
  navActive: { background: "#1B4DB3", color: "white" },
  topbar: { background: "white", borderBottom: "1px solid rgba(10,36,99,0.12)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky" as const, top: 0, zIndex: 50 },
  statCard: { background: "white", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 3px rgba(10,36,99,0.08)", border: "1px solid rgba(10,36,99,0.12)" },
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontFamily: "Tajawal", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#1B4DB3", color: "white" },
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontFamily: "Tajawal", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid rgba(10,36,99,0.12)", background: "transparent", color: "#6B7DB3" },
  filterTab: { padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid transparent", fontFamily: "Tajawal", background: "transparent", color: "#6B7DB3" },
  filterTabActive: { background: "#1B4DB3", color: "white", border: "1px solid transparent" },
  modalOverlay: { position: "fixed" as const, inset: 0, background: "rgba(10,36,99,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" },
  modal: { background: "white", borderRadius: 20, padding: 32, width: 480, maxWidth: "90vw" },
};
