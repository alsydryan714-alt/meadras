import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import {
  CheckCircle2, Star, ArrowLeft, Play,
  Users, CalendarDays, ClipboardList, UserCheck, BarChart3,
  MessageSquare, Shield, Zap, Globe, TrendingUp, Building2,
  ChevronDown, Lock, BadgeCheck, PhoneCall, Menu, X,
  Sparkles, Clock, Award
} from "lucide-react";
import { SchoolLogo } from "@/components/school-logo";

const STATS = [
  { value: "500+", label: "مدرسة سعودية" },
  { value: "15,000+", label: "معلم ومعلمة" },
  { value: "98%", label: "نسبة رضا العملاء" },
  { value: "0", label: "تعارضات في الجداول" },
];

const FEATURES = [
  {
    icon: UserCheck,
    color: "bg-blue-500",
    title: "حصص الانتظار الذكية",
    desc: "النظام يكتشف غياب المعلم ويقترح أفضل بديل على طول — بناءً على الجدول والحصص المتاحة وكل شيء.",
    tag: "الأكثر استخداماً"
  },
  {
    icon: CalendarDays,
    color: "bg-violet-500",
    title: "الجدول الدراسي الذكي",
    desc: "بناء جدول كامل من غير تعارضات. اكتشاف فوري إذا فيه مشكلة، مع إمكانية مشاركة الجدول لكل معلم مباشرة.",
    tag: "جديد"
  },
  {
    icon: ClipboardList,
    color: "bg-emerald-500",
    title: "لجان الاختبار",
    desc: "توزيع عادل وعشوائي للمعلمين على القاعات — بضغطة واحدة. مع دعم كامل للطباعة والتصدير.",
  },
  {
    icon: MessageSquare,
    color: "bg-green-500",
    title: "مشاركة واتساب فورية",
    desc: "أرسل جداول حصص الانتظار والجداول الدراسية للمعلمين بشكل مباشر عبر واتساب — لكل معلم رابط خاص فيه.",
    tag: "wow"
  },
  {
    icon: BarChart3,
    color: "bg-orange-500",
    title: "تقارير وتحليلات متقدمة",
    desc: "لوحة تحليلات تفاعلية توضح معدلات الغياب والحصص والأداء — مع رسوم بيانية جميلة وسهلة.",
  },
  {
    icon: Shield,
    color: "bg-slate-600",
    title: "أمان تام وخصوصية",
    desc: "بيانات مدرستك محمية بتشفير SSL 256-bit وموجودة في سيرفرات داخل المملكة العربية السعودية.",
  },
];


const PRICING = [
  {
    name: "مدراس",
    price: 69,
    priceYearly: 219,
    desc: "كل الميزات بدون قيود",
    features: ["جدول دراسي غير محدود", "حصص انتظار ذكية", "لجان اختبار", "مشاركة واتساب", "استيراد نور", "تصدير مدرستي", "تحليلات متقدمة", "إدارة مهام", "حسابات متعددة", "دعم أولوية"],
    cta: "ابدأ الآن",
    highlight: true,
  },
];

const STEPS = [
  { num: "01", title: "سجّل مدرستك بسرعة", desc: "أدخل بيانات المدرسة والمعلمين — ما في معقدات، ما فيه أوراق، وابدأ من طول." },
  { num: "02", title: "بنِ الجدول الدراسي بذكاء", desc: "النظام يكتشف التعارضات على طول ويساعدك تبني جدول مثالي لكل الفصول." },
  { num: "03", title: "أدِر الغياب بضغطة زر", desc: "سجّل الغياب، احصل على أفضل بديل، وأرسل الجدول للمعلمين عبر واتساب من نفس المكان." },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (user) { navigate("/dashboard"); return; }
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, [user]);

  return (
    <div className="min-h-screen bg-white" dir="rtl">

      {/* Sticky Navbar */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-md" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <SchoolLogo size="sm" showText={true} textColor="#0A2463" />
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
            <a href="#features" className="hover:text-primary transition-colors">المميزات</a>
            <a href="#how" className="hover:text-primary transition-colors">كيفية الاستخدام</a>
            <a href="#pricing" className="hover:text-primary transition-colors">الأسعار</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>دخول</Button>
            <Button size="sm" className="rounded-xl font-bold shadow-lg shadow-primary/25" onClick={() => navigate("/register")}>
              ابدأ مجاناً ←
            </Button>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-border px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm font-semibold text-gray-700 py-2" onClick={() => setMobileMenu(false)}>المميزات</a>
            <a href="#pricing" className="block text-sm font-semibold text-gray-700 py-2" onClick={() => setMobileMenu(false)}>الأسعار</a>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" size="sm" onClick={() => navigate("/login")}>دخول</Button>
              <Button className="flex-1" size="sm" onClick={() => navigate("/register")}>ابدأ مجاناً</Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-24 px-4"
        style={{ background: "linear-gradient(135deg, #0A2463 0%, #0D1F5C 45%, #1B4DB3 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto text-center text-white">
          <Badge className="mb-6 bg-white/20 text-white hover:bg-white/20 border-white/30 text-sm px-4 py-1.5">
            <Sparkles className="w-3.5 h-3.5 ml-1.5" /> الحل الرقمي الأول للمدارس السعودية
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6">
            غيّر إدارة مدرستك<br />
            <span className="text-yellow-300">بطريقة ذكية وسهلة</span>
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "#DBEAFE" }}>
            مدراس يحل أكثر المشاكل صعوبة — من حصص الانتظار والجداول وحتى لجان الاختبار — كل شيء بعربية 100% وفي دقائق.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-blue-50 font-black text-base h-14 px-8 rounded-2xl shadow-2xl shadow-black/20"
              onClick={() => navigate("/register")}
            >
              جرّب 7 أيام مجاناً ← بدون بطاقة ائتمان
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 font-bold text-base h-14 px-8 rounded-2xl"
              onClick={() => navigate("/login")}
            >
              <Play className="w-4 h-4 ml-2" /> شاهد العرض التوضيحي
            </Button>
          </div>

          {/* App Preview Card */}
          <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur rounded-3xl border border-white/20 p-4 shadow-2xl">
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-5 mx-4 flex items-center px-3">
                  <span className="text-[10px] text-gray-500 font-mono">madrass.sa</span>
                </div>
              </div>
              <div className="grid grid-cols-4 h-48 sm:h-64 text-right">
                <div className="bg-slate-800 p-3 flex flex-col gap-1.5">
                  {["لوحة التحكم","حصص الانتظار","الجدول الدراسي","لجان الاختبار","المعلمون"].map(item => (
                    <div key={item} className={`px-2 py-1.5 rounded-lg text-[9px] sm:text-xs font-bold ${item === "حصص الانتظار" ? "bg-primary text-white" : "text-white/60"}`}>{item}</div>
                  ))}
                </div>
                <div className="col-span-3 p-4 bg-gray-50">
                  <div className="text-xs font-black text-gray-800 mb-3">جدول حصص الانتظار — اليوم</div>
                  <div className="space-y-2">
                    {[
                      { teacher: "أ. أحمد المطيري", period: "الحصة الأولى", class: "3/أ", color: "bg-blue-100 border-blue-300" },
                      { teacher: "أ. فاطمة الزهراني", period: "الحصة الثالثة", class: "5/ب", color: "bg-green-100 border-green-300" },
                      { teacher: "أ. خالد القحطاني", period: "الحصة الخامسة", class: "1/ج", color: "bg-purple-100 border-purple-300" },
                    ].map(row => (
                      <div key={row.teacher} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[9px] sm:text-xs font-semibold ${row.color}`}>
                        <span className="text-gray-600">{row.class}</span>
                        <span className="text-gray-500">{row.period}</span>
                        <span className="text-gray-800">{row.teacher}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="flex-1 bg-green-500 text-white text-[9px] sm:text-xs font-bold py-1.5 rounded-lg text-center">نسخ للواتساب</div>
                    <div className="flex-1 bg-blue-500 text-white text-[9px] sm:text-xs font-bold py-1.5 rounded-lg text-center">طباعة الجدول</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-3xl sm:text-4xl font-black text-primary">{s.value}</div>
              <div className="text-sm text-gray-500 font-medium mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">المميزات</Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">كل اللي تحتاجه قيادة المدرسة</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">أدوات ذكية صممت خصيصاً لحل مشاكل المدارس السعودية</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-extrabold text-gray-900">{f.title}</h3>
                    {f.tag && (
                      <Badge className={`text-[10px] ${f.tag === "wow" ? "bg-green-100 text-green-700" : f.tag === "جديد" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"} hover:bg-inherit`}>
                        {f.tag}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">كيفية الاستخدام</Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">ابدأ في 3 خطوات بسيطة</h2>
          </div>
          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-xl shadow-primary/25">
                  {step.num}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-extrabold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 px-4 text-white" style={{ background: "linear-gradient(135deg, #0A2463, #0D1F5C)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-white/10 text-white hover:bg-white/10 border-white/20">ليش مدراس؟</Badge>
          <h2 className="text-3xl font-black mb-10">تميّز واضح عن البدائل الأخرى</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "أسرع إعداد", desc: "ابدأ في أقل من 10 دقائق — ما في تدريبات معقدة، كل شيء سهل وبسيط." },
              { icon: Globe, title: "عربي 100%", desc: "واجهة عربية كاملة من اليمين لليسار — مصممة للبيئة التعليمية السعودية بالذات." },
              { icon: TrendingUp, title: "أكثر ميزات بسعر أقل", desc: "تحليلات متقدمة، واتساب، واستيراد نور — بأسعار أقل من المنافسين بكتير." },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/10 rounded-3xl p-6 border border-white/10 text-right">
                  <Icon className="w-8 h-8 text-yellow-300 mb-3" />
                  <h3 className="font-extrabold text-lg mb-2">{item.title}</h3>
                  <p className="text-blue-200 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">الأسعار</Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">جرّب 7 أيام مجاناً</h2>
            <p className="text-lg text-gray-500 mb-6">احصل على وصول كامل للخطة مباشرة عند التسجيل —  🎁</p>
            <div className="inline-block px-6 py-3 rounded-2xl font-bold" style={{ background: "#FEF3C7", color: "#92400E" }}>
              ✨ كل المشتركين الجدد يحصلون على تجربة 7 أيام مجانية
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-lg mx-auto">
            {PRICING.map(plan => (
              <div
                key={plan.name}
                className={`rounded-3xl p-6 border transition-transform hover:-translate-y-1 bg-gradient-to-br from-primary to-blue-700 text-white border-primary shadow-2xl shadow-primary/15`}
              >
                <Badge className="mb-3 bg-white/20 text-white hover:bg-white/20 border-0">
                  <Star className="w-3 h-3 fill-yellow-300 text-yellow-300 ml-1" /> باقة واحدة شاملة
                </Badge>
                <h3 className={`text-xl font-extrabold mb-1 text-white`}>{plan.name}</h3>
                <p className={`text-sm mb-4 text-blue-100`}>{plan.desc}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className={`text-4xl font-black text-white`}>{plan.price}</span>
                  <span className={`mb-1.5 text-sm text-blue-200`}>ريال/شهر</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 text-blue-200`} />
                      <span className={`text-blue-100`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-11 rounded-xl font-bold bg-white text-primary hover:bg-blue-50`}
                  onClick={() => navigate("/register")}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-12 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {[
              { icon: Lock, label: "تشفير SSL 256-bit" },
              { icon: Shield, label: "سيرفرات " },
              { icon: BadgeCheck, label: "متوافق مع وزارة التعليم" },
              { icon: Clock, label: "" },
              { icon: Award, label: "ضمان رضا 30 يوم" },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2 text-sm text-gray-600 font-semibold">
                  <Icon className="w-5 h-5 text-teal-500" />
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black text-gray-900 mb-6">ابدأ اليوم — بلا التزام</h2>
          <p className="text-lg text-gray-500 mb-8">جرّب مدراس مجاناً لـ 7 أيام. إذا لم يعجبك، استرجع فلوسك بكاملها — ضمان 30 يوم.</p>
          <Button size="lg" className="px-10 h-14 rounded-2xl font-black text-base shadow-lg shadow-primary/25"
            onClick={() => navigate("/register")}>
            ابدأ الآن مجاناً ←
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1B4DB3, #2563EB)" }}>
              <span className="text-white font-black" style={{ fontFamily: "'Tajawal', sans-serif" }}>م</span>
            </div>
            <span className="font-black" style={{ color: "#0A2463" }}>مدراس</span>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <button onClick={() => navigate("/privacy")} className="hover:text-primary transition-colors">سياسة الخصوصية</button>
            <button onClick={() => navigate("/refund-policy")} className="hover:text-primary transition-colors">سياسة الاسترجاع</button>
            <a href="mailto:support@madrass.sa" className="hover:text-primary transition-colors">تواصل معنا</a>
          </div>
          <p className="text-xs text-gray-500">© 2026 مدراس. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}

const ReviewSection = () => <></>;
