import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const API = (import.meta.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "") + "/api";

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

interface PaymentLink {
  plan: string;
  billing_cycle: string;
  url: string;
}

type Page = "dashboard" | "subscribers" | "revenue" | "plans";
type Filter = "all" | "active" | "trial" | "expired";

const PLAN_LABELS: Record<string, string> = { madrass: "مدراس", basic: "أساسي", professional: "احترافي", trial: "تجريبي" };
const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  madrass: { monthly: 69, yearly: 219 },
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
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [savingLinks, setSavingLinks] = useState(false);
  const [subModal, setSubModal] = useState<School | null>(null);
  const [subAction, setSubAction] = useState<"activate" | "trial" | "cancel">("activate");
  const [subBilling, setSubBilling] = useState<"monthly" | "yearly">("monthly");
  const [subDays, setSubDays] = useState(30);
  const [subAmount, setSubAmount] = useState(69);
  const [subLoading, setSubLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchStats = useCallback(async () => {
    const r = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
    if (r.ok) setStats(await r.json());
  }, []);

  const fetchSchools = useCallback(async () => {
    const r = await fetch(`${API}/admin/schools`, { headers: authHeaders() });
    if (r.ok) setSchools(await r.json());
  }, []);

  const fetchPayments = useCallback(async () => {
    const r = await fetch(`${API}/admin/payments`, { headers: authHeaders() });
    if (r.ok) setPayments(await r.json());
  }, []);

  const fetchPaymentLinks = useCallback(async () => {
    const r = await fetch(`${API}/payment/links`, { headers: authHeaders() });
    if (r.ok) setPaymentLinks(await r.json());
  }, []);

  async function savePaymentLinks() {
    setSavingLinks(true);
    const r = await fetch(`${API}/payment/links`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(paymentLinks),
    });
    setSavingLinks(false);
    if (r.ok) {
      toast({ title: "✓ تم حفظ روابط الدفع" });
    } else {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    }
  }

  function updateLink(plan: string, cycle: string, url: string) {
    setPaymentLinks(prev => prev.map(l =>
      l.plan === plan && l.billing_cycle === cycle ? { ...l, url } : l
    ));
  }

  useEffect(() => {
    const token = localStorage.getItem("madrass_admin_token");
    if (token) setLoggedIn(true);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetchStats();
    fetchSchools();
    fetchPayments();
    fetchPaymentLinks();
  }, [loggedIn, fetchStats, fetchSchools, fetchPayments, fetchPaymentLinks]);

  async function doLogin() {
    setLoginError("");
    const r = await fetch(`${API}/auth/login`, {
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
    await fetch(`${API}/admin/schools/${id}/status`, {
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
    await fetch(`${API}/admin/schools/${deleteTarget}`, { method: "DELETE", headers: authHeaders() });
    setDeleteTarget(null);
    fetchSchools(); fetchStats();
    toast({ title: `تم حذف ${school?.name}` });
  }

  async function addSchool() {
    if (!newName || !newEmail) { toast({ title: "أدخل الاسم والبريد", variant: "destructive" }); return; }
    setLoading(true);
    const r = await fetch(`${API}/admin/schools`, {
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

  async function doSubAction() {
    if (!subModal) return;
    setSubLoading(true);
    let r: Response;
    if (subAction === "activate") {
      r = await fetch(`${API}/admin/schools/${subModal.id}/subscription`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ plan: "madrass", billing: subBilling, daysFromNow: subDays, amount: subAmount }),
      });
    } else if (subAction === "trial") {
      r = await fetch(`${API}/admin/schools/${subModal.id}/trial`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ days: subDays }),
      });
    } else {
      r = await fetch(`${API}/admin/schools/${subModal.id}/subscription`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    }
    setSubLoading(false);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      toast({ title: e.error || "حدث خطأ", variant: "destructive" });
      return;
    }
    const msgs = { activate: "✅ تم تفعيل الاشتراك", trial: "⏳ تم تفعيل التجربة المجانية", cancel: "🚫 تم إلغاء الاشتراك" };
    toast({ title: msgs[subAction] });
    setSubModal(null);
    fetchSchools(); fetchStats();
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
                placeholder={i === 0 ? "Rsyg991@gmail.com" : "كلمة المرور"}
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

  const navItems = [
    { key: "dashboard", label: "الرئيسية", icon: "▦" },
    { key: "subscribers", label: "المشتركون", icon: "🏫" },
    { key: "revenue", label: "الإيرادات", icon: "💰" },
    { key: "plans", label: "الباقات", icon: "⭐" },
  ] as const;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Tajawal', sans-serif", background: "#F4F7FF", direction: "rtl" }}>

      {/* ── Mobile Top Bar ── */}
      {isMobile && (
        <div style={{ position: "fixed", top: 0, right: 0, left: 0, height: 56, background: "#0A2463", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: -1 }}>مد<span style={{ color: "#00B89F" }}>راس</span></div>
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 40, height: 40, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: "block", width: 20, height: 2, background: "white", borderRadius: 2, transition: "all 0.2s",
                transform: mobileMenuOpen && i === 0 ? "rotate(45deg) translate(5px, 5px)" : mobileMenuOpen && i === 2 ? "rotate(-45deg) translate(5px, -5px)" : "none",
                opacity: mobileMenuOpen && i === 1 ? 0 : 1
              }} />
            ))}
          </button>
        </div>
      )}

      {/* ── Mobile Drawer ── */}
      {isMobile && mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 190 }} onClick={() => setMobileMenuOpen(false)}>
          <div style={{ position: "absolute", top: 56, right: 0, width: 240, bottom: 0, background: "#0A2463", padding: "20px 12px", boxShadow: "-4px 0 24px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <nav>
              {navItems.map(item => (
                <div key={item.key} onClick={() => { setPage(item.key as Page); setMobileMenuOpen(false); }}
                  style={{ ...s.navItem, ...(page === item.key ? s.navActive : {}) }}
                >
                  <span style={{ fontSize: 15 }}>{item.icon}</span> {item.label}
                </div>
              ))}
            </nav>
            <div style={{ position: "absolute", bottom: 20, right: 12, left: 12 }}>
              <button onClick={() => { localStorage.removeItem("madrass_admin_token"); window.location.reload(); }}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontFamily: "Tajawal", fontSize: 13, cursor: "pointer" }}
              >تسجيل الخروج</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      {!isMobile && (
      <aside style={s.sidebar}>
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "white", letterSpacing: -1 }}>مد<span style={{ color: "#00B89F" }}>راس</span></div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2, letterSpacing: 1 }}>PLATFORM ADMIN</p>
        </div>
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {navItems.map(item => (
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
      )}

      {/* ── Main ── */}
      <div style={{ marginRight: isMobile ? 0 : 240, flex: 1, paddingTop: isMobile ? 56 : 0, minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ ...s.topbar, padding: isMobile ? "14px 12px" : "18px 32px", flexWrap: "wrap", gap: isMobile ? 8 : 0 }}>
          <div>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: "#0A2463" }}>{PAGE_INFO[page][0]}</div>
            {!isMobile && <div style={{ fontSize: 12, color: "#6B7DB3", marginTop: 1 }}>{PAGE_INFO[page][1]}</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { fetchStats(); fetchSchools(); fetchPayments(); toast({ title: "تم التحديث" }); }} style={{ ...s.btnGhost, fontSize: isMobile ? 11 : 13, padding: isMobile ? "6px 10px" : "8px 18px" }}>↻ تحديث</button>
            {page === "subscribers" && (
              <button onClick={() => setShowAddModal(true)} style={{ ...s.btnPrimary, fontSize: isMobile ? 11 : 13, padding: isMobile ? "6px 10px" : "10px 22px" }}>+ إضافة</button>
            )}
          </div>
        </div>

        <div style={{ padding: isMobile ? "16px 12px" : "28px 32px" }}>
          {/* ── Dashboard ── */}
          {page === "dashboard" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 8 : 16, marginBottom: isMobile ? 16 : 28 }}>
                {[
                  { label: "إجمالي المدارس", val: stats?.totalSchools ?? "…", color: "#1B4DB3", bg: "#DBEAFE", icon: "🏫" },
                  { label: "اشتراكات نشطة", val: stats?.activeSchools ?? "…", color: "#065F46", bg: "#D1FAE5", icon: "✅" },
                  { label: "فترة تجريبية", val: stats?.trialSchools ?? "…", color: "#1E40AF", bg: "#DBEAFE", icon: "⏳" },
                  { label: "إيرادات الباقات", val: (stats?.totalRevenue ?? 0).toLocaleString() + " ر.س", color: "#92400E", bg: "#FEF3C7", icon: "💰" },
                ].map((card, i) => (
                  <div key={i} style={{ ...s.statCard, padding: isMobile ? "12px 10px" : 22 }}>
                    <div style={{ width: isMobile ? 30 : 40, height: isMobile ? 30 : 40, borderRadius: 8, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 14 : 18, marginBottom: isMobile ? 8 : 14 }}>{card.icon}</div>
                    <div style={{ fontFamily: "monospace", fontSize: isMobile ? 20 : 28, fontWeight: 500, color: "#0A2463", lineHeight: 1 }}>{card.val}</div>
                    <div style={{ fontSize: isMobile ? 10 : 12, color: "#6B7DB3", marginTop: 4 }}>{card.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "white", borderRadius: 16, padding: isMobile ? 12 : 22, boxShadow: "0 1px 3px rgba(10,36,99,0.08)", border: "1px solid rgba(10,36,99,0.12)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0A2463", marginBottom: 12 }}>آخر المدارس المسجّلة</div>
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 500 : "auto" }}>
                  <thead>
                    <tr style={{ background: "#F4F7FF" }}>
                      {["المدرسة", "البريد", "الباقة", "الحالة", "الانتهاء"].map(h => (
                        <th key={h} style={{ padding: isMobile ? "8px 10px" : "11px 16px", fontSize: 11, fontWeight: 700, color: "#6B7DB3", textAlign: "right", borderBottom: "1px solid rgba(10,36,99,0.12)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schools.slice(0, 8).map(school => (
                      <tr key={school.id} style={{ borderBottom: "1px solid rgba(10,36,99,0.06)" }}>
                        <td style={{ padding: isMobile ? "10px" : "13px 16px", fontWeight: 700, fontSize: 12, color: "#0A2463", whiteSpace: "nowrap" }}>{school.name}</td>
                        <td style={{ padding: isMobile ? "10px" : "13px 16px", fontSize: 11, color: "#6B7DB3", direction: "ltr", textAlign: "right" }}>{school.email}</td>
                        <td style={{ padding: isMobile ? "10px" : "13px 16px" }}><StatusBadge type="plan" val={school.plan} /></td>
                        <td style={{ padding: isMobile ? "10px" : "13px 16px" }}><StatusBadge type="status" val={school.sub_status} active={school.sub_active} /></td>
                        <td style={{ padding: isMobile ? "10px" : "13px 16px", fontSize: 11, color: "#6B7DB3", whiteSpace: "nowrap" }}>{school.expires_at ? new Date(school.expires_at).toLocaleDateString("ar-SA") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          )}

          {/* ── Subscribers ── */}
          {page === "subscribers" && (
            <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 3px rgba(10,36,99,0.08)", border: "1px solid rgba(10,36,99,0.12)", overflow: "hidden" }}>
              <div style={{ padding: isMobile ? "12px" : "18px 22px", borderBottom: "1px solid rgba(10,36,99,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: isMobile ? 8 : 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F4F7FF", border: "1px solid rgba(10,36,99,0.12)", borderRadius: 10, padding: "8px 14px", flex: 1, maxWidth: isMobile ? "100%" : 300, minWidth: 0 }}>
                  <span style={{ color: "#6B7DB3", fontSize: 14 }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث عن مدرسة أو بريد..." style={{ border: "none", background: "transparent", fontFamily: "Tajawal", fontSize: 13, outline: "none", width: "100%", color: "#0A2463" }} />
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(["all", "active", "trial", "expired"] as Filter[]).map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ ...s.filterTab, ...(filter === f ? s.filterTabActive : {}), fontSize: isMobile ? 10 : 11, padding: isMobile ? "5px 8px" : "6px 14px" }}>
                      {{ all: "الكل", active: "نشط", trial: "تجريبي", expired: "منتهي" }[f]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 650 : "auto" }}>
                <thead style={{ background: "#F4F7FF" }}>
                  <tr>
                    {["المدرسة", "المدير / البريد", "الباقة", "الحالة", "الانتهاء", "إجراءات"].map(h => (
                      <th key={h} style={{ padding: isMobile ? "8px 10px" : "11px 18px", fontSize: 11, fontWeight: 700, color: "#6B7DB3", textAlign: "right", borderBottom: "1px solid rgba(10,36,99,0.12)", whiteSpace: "nowrap" }}>{h}</th>
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
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button
                            onClick={() => { setSubModal(school); setSubAction(school.sub_active ? "activate" : "trial"); setSubDays(school.sub_status === "active" ? 30 : 7); setSubAmount(69); setSubBilling("monthly"); }}
                            style={{ padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "#DBEAFE", color: "#1B4DB3", fontSize: 11, fontWeight: 700, fontFamily: "Tajawal", whiteSpace: "nowrap" }}
                            title="إدارة الاشتراك"
                          >⚙ اشتراك</button>
                          <button
                            onClick={() => toggleSchool(school.id, !school.is_active)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: school.is_active ? "#D1FAE5" : "#FEE2E2", color: school.is_active ? "#065F46" : "#991B1B", fontSize: 14 }}
                            title={school.is_active ? "إيقاف الدخول" : "تفعيل الدخول"}
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
            </div>
          )}

          {/* ── Revenue ── */}
          {page === "revenue" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: isMobile ? 8 : 16, marginBottom: 24 }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Plan card — single "madrass" plan */}
              <div style={{ background: "white", borderRadius: 16, padding: 28, boxShadow: "0 1px 3px rgba(10,36,99,0.08)", border: "2px solid #1B4DB3", maxWidth: 560 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#0A2463" }}>باقة مدراس</div>
                    <div style={{ fontSize: 13, color: "#6B7DB3", marginTop: 4 }}>الباقة الموحدة لجميع مدارس مدراس</div>
                  </div>
                  <div style={{ background: "#DBEAFE", color: "#0A2463", fontWeight: 700, fontSize: 12, padding: "4px 14px", borderRadius: 20 }}>مدراس</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div style={{ textAlign: "center", padding: 18, background: "#F4F7FF", borderRadius: 12, border: "1px solid rgba(10,36,99,0.12)" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 700, color: "#0A2463", lineHeight: 1 }}>69</div>
                    <div style={{ fontSize: 13, color: "#6B7DB3", marginTop: 4 }}>ريال / شهر</div>
                  </div>
                  <div style={{ textAlign: "center", padding: 18, background: "#F0FFF4", borderRadius: 12, border: "1px solid rgba(0,184,159,0.25)", position: "relative" }}>
                    <div style={{ position: "absolute", top: -10, right: 12, background: "#00B89F", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>وفّر 74%</div>
                    <div style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 700, color: "#065F46", lineHeight: 1 }}>219</div>
                    <div style={{ fontSize: 13, color: "#6B7DB3", marginTop: 4 }}>ريال / سنة</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#6B7DB3", borderTop: "1px solid rgba(10,36,99,0.08)", paddingTop: 16 }}>
                  المشتركون الحاليون: <strong style={{ color: "#0A2463", fontSize: 16 }}>
                    {schools.filter(s => s.sub_active).length}
                  </strong> مدرسة نشطة من أصل <strong style={{ color: "#0A2463" }}>{schools.length}</strong> مسجّلة
                </div>
              </div>

              {/* Payment links management */}
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(10,36,99,0.08)", border: "1px solid rgba(10,36,99,0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0A2463" }}>روابط الدفع (Fatura)</div>
                    <div style={{ fontSize: 12, color: "#6B7DB3", marginTop: 3 }}>الصق رابط فاتورة Moyasar لكل دورة فوترة</div>
                  </div>
                  <button
                    onClick={savePaymentLinks}
                    disabled={savingLinks}
                    style={{ background: savingLinks ? "#6B7DB3" : "linear-gradient(135deg,#1B4DB3,#2563EB)", border: "none", borderRadius: 10, padding: "8px 20px", color: "white", fontFamily: "Tajawal", fontSize: 13, fontWeight: 700, cursor: savingLinks ? "not-allowed" : "pointer" }}
                  >
                    {savingLinks ? "جارٍ الحفظ..." : "حفظ الروابط"}
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { plan: "madrass", label: "مدراس — شهري (69 ر.س)", cycle: "monthly" },
                    { plan: "madrass", label: "مدراس — سنوي (219 ر.س)", cycle: "yearly" },
                  ].map(row => {
                    const link = paymentLinks.find(l => l.plan === row.plan && l.billing_cycle === row.cycle);
                    return (
                      <div key={`${row.plan}-${row.cycle}`}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0A2463", marginBottom: 6 }}>{row.label}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            type="url"
                            value={link?.url || ""}
                            onChange={e => updateLink(row.plan, row.cycle, e.target.value)}
                            placeholder="https://..."
                            dir="ltr"
                            style={{ flex: 1, border: "1.5px solid rgba(10,36,99,0.15)", borderRadius: 10, padding: "10px 14px", fontFamily: "monospace", fontSize: 13, outline: "none", color: "#0A2463", background: link?.url ? "#F0FFF4" : "white" }}
                          />
                          {link?.url && (
                            <a href={link.url} target="_blank" rel="noreferrer" style={{ color: "#1B4DB3", fontSize: 18, textDecoration: "none", padding: "4px 8px" }} title="فتح الرابط">↗</a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                <option value="madrass">مدراس (69 ر.س/شهر)</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowAddModal(false)} style={s.btnGhost}>إلغاء</button>
              <button onClick={addSchool} disabled={loading} style={s.btnPrimary}>{loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription Management Modal ── */}
      {subModal && (
        <div style={s.modalOverlay} onClick={() => setSubModal(null)}>
          <div style={{ ...s.modal, width: isMobile ? "95vw" : 500, maxHeight: isMobile ? "90vh" : "auto", overflowY: "auto" }} onClick={e => e.stopPropagation()} dir="rtl">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0A2463" }}>إدارة الاشتراك</div>
                <div style={{ fontSize: 12, color: "#6B7DB3", marginTop: 2 }}>{subModal.name}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <StatusBadge type="status" val={subModal.sub_status} active={subModal.sub_active} />
                <StatusBadge type="plan" val={subModal.plan} />
              </div>
            </div>

            {subModal.expires_at && (
              <div style={{ background: "#F4F7FF", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#6B7DB3" }}>
                تاريخ الانتهاء الحالي: <strong style={{ color: "#0A2463" }}>{new Date(subModal.expires_at).toLocaleDateString("ar-SA")}</strong>
              </div>
            )}

            {/* Action Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#F4F7FF", padding: 6, borderRadius: 12 }}>
              {([
                { key: "activate", label: "✅ تفعيل اشتراك مدفوع", color: "#065F46", bg: "#D1FAE5" },
                { key: "trial",    label: "⏳ تجربة مجانية",       color: "#1E40AF", bg: "#DBEAFE" },
                { key: "cancel",   label: "🚫 إلغاء الاشتراك",    color: "#991B1B", bg: "#FEE2E2" },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setSubAction(tab.key); setSubDays(tab.key === "trial" ? 7 : 30); }}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "Tajawal", fontSize: 11, fontWeight: 700, background: subAction === tab.key ? tab.bg : "transparent", color: subAction === tab.key ? tab.color : "#6B7DB3", transition: "all 0.15s" }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Action Content */}
            {subAction === "activate" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6B7DB3", marginBottom: 6 }}>دورة الفوترة</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([["monthly", "شهري — 69 ر.س", 30, 69], ["yearly", "سنوي — 219 ر.س", 365, 219]] as const).map(([val, label, days, amt]) => (
                      <button
                        key={val}
                        onClick={() => { setSubBilling(val); setSubDays(days); setSubAmount(amt); }}
                        style={{ flex: 1, padding: "10px", borderRadius: 10, border: subBilling === val ? "2px solid #1B4DB3" : "1.5px solid rgba(10,36,99,0.15)", cursor: "pointer", fontFamily: "Tajawal", fontSize: 12, fontWeight: 700, background: subBilling === val ? "#DBEAFE" : "white", color: subBilling === val ? "#0A2463" : "#6B7DB3" }}
                      >{label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6B7DB3", marginBottom: 6 }}>عدد الأيام</label>
                    <input type="number" value={subDays} min={1} max={3650} onChange={e => setSubDays(Number(e.target.value))}
                      style={{ width: "100%", border: "1.5px solid rgba(10,36,99,0.12)", borderRadius: 10, padding: "9px 12px", fontFamily: "Tajawal", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6B7DB3", marginBottom: 6 }}>المبلغ (ر.س)</label>
                    <input type="number" value={subAmount} min={0} onChange={e => setSubAmount(Number(e.target.value))}
                      style={{ width: "100%", border: "1.5px solid rgba(10,36,99,0.12)", borderRadius: 10, padding: "9px 12px", fontFamily: "Tajawal", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ background: "#F0FFF4", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#065F46", border: "1px solid #BBF7D0" }}>
                  سيتم تفعيل اشتراك نشط لمدة <strong>{subDays} يوم</strong> بمبلغ <strong>{subAmount} ر.س</strong>
                </div>
              </div>
            )}

            {subAction === "trial" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6B7DB3", marginBottom: 6 }}>مدة التجربة (بالأيام)</label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {[7, 14, 30, 60].map(d => (
                      <button key={d} onClick={() => setSubDays(d)}
                        style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: subDays === d ? "2px solid #1B4DB3" : "1.5px solid rgba(10,36,99,0.15)", cursor: "pointer", fontFamily: "Tajawal", fontSize: 11, fontWeight: 700, background: subDays === d ? "#DBEAFE" : "white", color: subDays === d ? "#0A2463" : "#6B7DB3" }}
                      >{d} يوم</button>
                    ))}
                  </div>
                  <input type="number" value={subDays} min={1} max={365} onChange={e => setSubDays(Number(e.target.value))}
                    style={{ width: "100%", border: "1.5px solid rgba(10,36,99,0.12)", borderRadius: 10, padding: "9px 12px", fontFamily: "Tajawal", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ background: "#DBEAFE", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#1E40AF", border: "1px solid #BFDBFE" }}>
                  ⏳ سيتم منح <strong>{subDays} يوم</strong> تجربة مجانية — تنتهي في {new Date(Date.now() + subDays * 86400000).toLocaleDateString("ar-SA")}
                </div>
              </div>
            )}

            {subAction === "cancel" && (
              <div style={{ background: "#FEF2F2", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid #FECACA" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🚫</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#991B1B", marginBottom: 6 }}>إلغاء اشتراك {subModal.name}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>سيتم إيقاف اشتراك هذه المدرسة فوراً ولن تستطيع الدخول</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setSubModal(null)} style={s.btnGhost}>إلغاء</button>
              <button
                onClick={doSubAction}
                disabled={subLoading}
                style={{
                  ...s.btnPrimary,
                  background: subAction === "cancel" ? "#EF4444" : subAction === "trial" ? "#1E40AF" : "#1B4DB3",
                  opacity: subLoading ? 0.7 : 1,
                }}
              >
                {subLoading ? "جارٍ التنفيذ..." : subAction === "activate" ? "✅ تفعيل الاشتراك" : subAction === "trial" ? "⏳ تفعيل التجربة" : "🚫 إلغاء الاشتراك"}
              </button>
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
      madrass: ["#DBEAFE", "#0A2463", "مدراس"],
      basic: ["#E0E7FF", "#3730A3", "أساسي"],
      professional: ["#FEF3C7", "#92400E", "احترافي"],
      enterprise: ["#FCE7F3", "#9D174D", "مؤسسي"],
      trial: ["#F3F4F6", "#374151", "تجريبي"],
    };
    const [bg, color, label] = map[val] ?? ["#F3F4F6", "#6B7280", val || "—"];
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>{label}</span>;
  }
  if (!val) return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#F3F4F6", color: "#9CA3AF" }}>—</span>;
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
