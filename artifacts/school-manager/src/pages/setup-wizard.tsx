import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, School, BookOpen, User, ArrowLeft, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EDUCATION_REGIONS = [
  "الرياض", "مكة المكرمة", "المدينة المنورة", "القصيم", "الشرقية",
  "عسير", "تبوك", "حائل", "الحدود الشمالية", "جازان", "نجران", "الباحة", "الجوف"
];

const SCHOOL_TYPES = [
  { value: "general", label: "فصول ومسارات", desc: "ابتدائي، متوسط، ثانوي — التعليم العام السعودي", icon: "🏫" },
  { value: "courses", label: "مقررات أكاديمية", desc: "معاهد وكليات — تسجيل مستقل لكل طالب أو شعبة", icon: "🎓" },
];

export default function SetupWizard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    principalName: "",
    educationRegion: "",
    schoolType: "general",
    maxPeriodsPerDay: 7,
    logoUrl: "",
  });

  const steps = [
    { num: 1, label: "بيانات المدرسة", icon: School },
    { num: 2, label: "النظام الأكاديمي", icon: BookOpen },
    { num: 3, label: "المعلومات الإضافية", icon: User },
  ];

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleFinish = async () => {
    if (!user?.schoolId) return;
    setSaving(true);
    try {
      await fetch(`${BASE}/api/schools/${user.schoolId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        body: JSON.stringify({ ...form, setupComplete: true }),
      });
      navigate("/dashboard");
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"
      style={{ background: "linear-gradient(135deg, #0A2463 0%, #0D1F5C 50%, #1B4DB3 100%)" }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{ background: "linear-gradient(135deg, #1B4DB3, #2563EB)" }}>
            <span className="text-white font-black text-3xl" style={{ fontFamily: "'Tajawal', sans-serif" }}>م</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">إعداد مدرستك</h1>
          <p className="text-white/70">أكمل البيانات الأساسية للبدء في استخدام مدراس</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.num;
            const active = step === s.num;
            return (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${active ? "bg-white text-primary" : done ? "bg-blue-600 text-white" : "bg-white/10 text-white/50"}`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="text-sm font-bold hidden sm:block">{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className="w-8 h-0.5 bg-white/20" />}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-gray-900 mb-6">بيانات المدرسة</h2>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">اسم المدرسة *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="مثال: مدرسة الملك عبدالعزيز الابتدائية" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">اسم المدير</label>
                <input value={form.principalName} onChange={e => setForm(f => ({ ...f, principalName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="يظهر في خانة الاعتماد والتوقيع في التقارير" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">المنطقة التعليمية</label>
                <select value={form.educationRegion} onChange={e => setForm(f => ({ ...f, educationRegion: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none bg-white">
                  <option value="">اختر المنطقة</option>
                  {EDUCATION_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">شعار المدرسة (اختياري)</label>
                <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-primary transition-colors">
                  {form.logoUrl
                    ? <img src={form.logoUrl} alt="logo" className="w-12 h-12 object-contain rounded-lg" />
                    : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">🖼️</div>}
                  <div>
                    <p className="font-bold text-gray-700 text-sm">تحميل الشعار</p>
                    <p className="text-xs text-gray-400">PNG، JPG بدقة عالية</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-gray-900 mb-6">نوع النظام الأكاديمي</h2>
              <p className="text-sm text-gray-500 mb-4">هذا الإعداد يحدد منطق الجدولة ولا يمكن تغييره لاحقاً إلا من خلال الدعم الفني.</p>
              <div className="space-y-3">
                {SCHOOL_TYPES.map(t => (
                  <label key={t.value} className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${form.schoolType === t.value ? "border-primary bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="schoolType" value={t.value} checked={form.schoolType === t.value}
                      onChange={() => setForm(f => ({ ...f, schoolType: t.value }))} className="hidden" />
                    <span className="text-3xl">{t.icon}</span>
                    <div>
                      <p className="font-black text-gray-900">{t.label}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{t.desc}</p>
                    </div>
                    {form.schoolType === t.value && <CheckCircle2 className="w-5 h-5 text-primary ml-auto shrink-0 mt-1" />}
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-gray-900 mb-6">الجدول الزمني</h2>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">الحد الأقصى للحصص في اليوم</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm(f => ({ ...f, maxPeriodsPerDay: Math.max(4, f.maxPeriodsPerDay - 1) }))}
                    className="w-10 h-10 rounded-xl bg-gray-100 font-bold text-lg hover:bg-gray-200 transition">−</button>
                  <span className="text-2xl font-black text-primary w-16 text-center">{form.maxPeriodsPerDay}</span>
                  <button onClick={() => setForm(f => ({ ...f, maxPeriodsPerDay: Math.min(10, f.maxPeriodsPerDay + 1) }))}
                    className="w-10 h-10 rounded-xl bg-gray-100 font-bold text-lg hover:bg-gray-200 transition">+</button>
                  <span className="text-sm text-gray-500">حصة / يوم</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">بناءً على أعلى نصاب في المدرسة. الافتراضي 7 حصص.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <h3 className="font-bold text-blue-900 mb-3 text-sm">ملخص إعدادك</h3>
                <div className="space-y-1.5 text-sm text-blue-700">
                  <p>🏫 <strong>المدرسة:</strong> {form.name || "—"}</p>
                  <p>👤 <strong>المدير:</strong> {form.principalName || "—"}</p>
                  <p>📍 <strong>المنطقة:</strong> {form.educationRegion || "—"}</p>
                  <p>🎓 <strong>النظام:</strong> {form.schoolType === "general" ? "فصول ومسارات" : "مقررات أكاديمية"}</p>
                  <p>⏰ <strong>الحصص:</strong> {form.maxPeriodsPerDay} حصة يومياً</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1} className="rounded-xl">
              <ArrowRight className="w-4 h-4 ml-1" /> السابق
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(s => s + 1)} className="rounded-xl px-8" disabled={step === 1 && !form.name.trim()}>
                التالي <ArrowLeft className="w-4 h-4 mr-1" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving} className="rounded-xl px-8 bg-primary">
                {saving ? "جارٍ الحفظ..." : "ابدأ الآن ✓"}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-4">يمكنك تعديل هذه الإعدادات لاحقاً من لوحة إعدادات المدرسة</p>
      </div>
    </div>
  );
}
