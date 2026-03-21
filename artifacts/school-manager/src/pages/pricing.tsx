import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import { SchoolLogo } from "@/components/school-logo";

export default function PricingPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  const plan = {
    name: "مدراس",
    price: 69,
    priceYearly: 219,
    description: "كل الميزات بدون قيود",
    features: [
      "إدارة المعلمين والمواد والفصول (غير محدود)",
      "الجدول الدراسي الذكي (فصول غير محدودة)",
      "حصص الانتظار الذكية مع اقتراح البديل",
      "لجان الاختبار والمراقبة",
      "مشاركة رابط واتساب لكل معلم",
      "استيراد بيانات من نور (Excel)",
      "تصدير جداول مدرستي (Excel)",
      "التحليلات والتقارير المتقدمة",
      "إدارة المهام والتذكيرات",
      "دعم متقدم",
      "حسابات متعددة المستخدمين",
      "جرب مجاناً 7 أيام",
    ]
  };

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: "#F4F7FF" }}>
      <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-10" style={{ borderColor: "#DBEAFE" }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <SchoolLogo size="sm" showText={true} textColor="#0A2463" />
          <div className="flex items-center gap-3">
            {user && (
              <>
                <button onClick={() => navigate("/")} className="text-sm font-semibold flex items-center gap-1" style={{ color: "#1B4DB3" }}>
                  <ArrowLeft className="w-4 h-4" /> الرئيسية
                </button>
                <Button variant="outline" size="sm" onClick={logout}>تسجيل الخروج</Button>
              </>
            )}
            {!user && (
              <Button size="sm" onClick={() => navigate("/login")}>دخول</Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge className="mb-4 text-sm px-4 py-1" style={{ background: "#DBEAFE", color: "#0A2463" }}>
            باقة واحدة شاملة
          </Badge>
          <h1 className="text-4xl font-black mb-4" style={{ color: "#0A2463" }}>سعر واحد - كل الميزات</h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "#6B7DB3" }}>
            باقة شاملة موحدة تتضمن جميع الميزات المتقدمة بسعر منخفض
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div
            key={plan.name}
            className="bg-white rounded-3xl overflow-hidden shadow-xl border-2"
            style={{ borderColor: "#1B4DB3" }}
          >
            <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-8 text-white">
              <h3 className="text-2xl font-black mb-1">{plan.name}</h3>
              <p className="text-white/70 text-sm">{plan.description}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-black">{plan.price}</span>
                <div className="mb-1 text-white/70">
                  <div className="text-sm">ريال</div>
                  <div className="text-xs">/شهر</div>
                </div>
              </div>
              <p className="text-xs text-white/60 mt-3">
                أو <span className="font-bold text-yellow-300">{plan.priceYearly} ريال سنوياً</span> بدلاً من {plan.price * 12}
              </p>
            </div>

            <div className="p-8">
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#0A2463" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#DBEAFE" }}>
                      <Check className="w-3 h-3" style={{ color: "#1B4DB3" }} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              {user ? (
                <Button
                  onClick={() => navigate("/payment?plan=madrass&billing=monthly")}
                  className="w-full h-12 rounded-xl font-bold text-base"
                  style={{ background: "#1B4DB3", color: "white" }}
                >
                  اشترك الآن ←
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/register")}
                  className="w-full h-12 rounded-xl font-bold text-base"
                  style={{ background: "#1B4DB3", color: "white" }}
                >
                  ابدأ الآن مجاناً ←
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 bg-white rounded-3xl p-8 shadow-lg" style={{ border: "1px solid #DBEAFE" }}>
          <h3 className="text-xl font-bold mb-6 text-center" style={{ color: "#0A2463" }}>الأسئلة الشائعة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: "هل يمكنني الاسترجاع خلال 30 يوم؟", a: "نعم، 30 يوم ضمان استرجاع كامل المبلغ بدون أسئلة." },
              { q: "كم التجربة المجانية؟", a: "جرب مجاناً 7 أيام كاملة - وصول كامل لجميع الميزات." },
              { q: "هل أحتاج بطاقة ائتمان للتجربة؟", a: "لا، لا نحتاج بطاقتك أثناء الـ 7 أيام المجانية." },
              { q: "كيف يتم الدفع؟", a: "ندعم بطاقات مدى وفيزا وماستركارد وسداد." },
            ].map((item, i) => (
              <div key={i} className="space-y-1.5">
                <h4 className="font-bold text-sm" style={{ color: "#0A2463" }}>{item.q}</h4>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7DB3" }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
