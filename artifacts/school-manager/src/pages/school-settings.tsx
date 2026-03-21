import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { Settings, School, User, Image, Clock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EDUCATION_REGIONS = [
  "الرياض", "مكة المكرمة", "المدينة المنورة", "القصيم", "الشرقية",
  "عسير", "تبوك", "حائل", "الحدود الشمالية", "جازان", "نجران", "الباحة", "الجوف"
];

export default function SchoolSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", principalName: "", educationRegion: "",
    schoolType: "general", maxPeriodsPerDay: 7, logoUrl: "",
  });

  useEffect(() => {
    if (!user?.schoolId) return;
    fetch(`${BASE}/api/schools/${user.schoolId}/settings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
    }).then(r => r.json()).then(d => {
      if (d.id) setForm({
        name: d.name || "", principalName: d.principalName || "",
        educationRegion: d.educationRegion || "", schoolType: d.schoolType || "general",
        maxPeriodsPerDay: d.maxPeriodsPerDay || 7, logoUrl: d.logoUrl || "",
      });
    });
  }, [user?.schoolId]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!user?.schoolId) return;
    setSaving(true);
    try {
      await fetch(`${BASE}/api/schools/${user.schoolId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        body: JSON.stringify(form),
      });
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات المدرسة بنجاح ✓" });
    } catch {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">إعدادات المدرسة</h1>
            <p className="text-muted-foreground text-sm">البيانات الأساسية والهوية البصرية</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-primary font-bold text-sm pb-2 border-b">
            <School className="w-4 h-4" /> بيانات المدرسة
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">اسم المدرسة</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">المنطقة التعليمية</label>
              <select value={form.educationRegion} onChange={e => setForm(f => ({ ...f, educationRegion: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none bg-white">
                <option value="">اختر المنطقة</option>
                {EDUCATION_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-primary font-bold text-sm pb-2 border-b">
            <User className="w-4 h-4" /> بيانات الإدارة
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">اسم المدير / الوكيل</label>
            <input value={form.principalName} onChange={e => setForm(f => ({ ...f, principalName: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
              placeholder="يظهر في خانة الاعتماد في التقارير المطبوعة" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-primary font-bold text-sm pb-2 border-b">
            <Image className="w-4 h-4" /> شعار المدرسة
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
              {form.logoUrl
                ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-contain" />
                : <span className="text-2xl">🏫</span>}
            </div>
            <div>
              <label className="cursor-pointer">
                <span className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition">
                  تحميل شعار جديد
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              <p className="text-xs text-muted-foreground mt-2">PNG، JPG بدقة عالية — يُدمج في قوالب الطباعة</p>
              {form.logoUrl && (
                <button onClick={() => setForm(f => ({ ...f, logoUrl: "" }))}
                  className="text-xs text-rose-500 mt-1 hover:underline">إزالة الشعار</button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-primary font-bold text-sm pb-2 border-b">
            <Clock className="w-4 h-4" /> الجدول الزمني
          </div>
          <div>
            <label className="block text-sm font-bold mb-3">الحد الأقصى للحصص في اليوم</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setForm(f => ({ ...f, maxPeriodsPerDay: Math.max(4, f.maxPeriodsPerDay - 1) }))}
                className="w-10 h-10 rounded-xl bg-gray-100 font-bold text-lg hover:bg-gray-200 transition">−</button>
              <span className="text-2xl font-black text-primary w-12 text-center">{form.maxPeriodsPerDay}</span>
              <button onClick={() => setForm(f => ({ ...f, maxPeriodsPerDay: Math.min(10, f.maxPeriodsPerDay + 1) }))}
                className="w-10 h-10 rounded-xl bg-gray-100 font-bold text-lg hover:bg-gray-200 transition">+</button>
              <span className="text-sm text-muted-foreground">حصة / يوم</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-3">نوع النظام الأكاديمي</label>
            <div className="flex gap-3">
              {[
                { value: "general", label: "فصول ومسارات" },
                { value: "courses", label: "مقررات أكاديمية" },
              ].map(t => (
                <label key={t.value} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition ${form.schoolType === t.value ? "border-primary bg-primary/5 text-primary font-bold" : "border-border text-gray-600"}`}>
                  <input type="radio" value={t.value} checked={form.schoolType === t.value}
                    onChange={() => setForm(f => ({ ...f, schoolType: t.value }))} className="hidden" />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="rounded-xl px-8 shadow-lg shadow-primary/20">
            {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
