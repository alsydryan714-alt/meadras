import { useLocation } from "wouter";
import { ArrowRight, Check, RotateCcw, Clock, Shield } from "lucide-react";

const POLICIES = [
  {
    icon: Clock,
    title: "ضمان 30 يوم",
    content: "لديك 30 يوم كامل للتأكد من أن مدراس يناسب احتياجات مدرستك. إذا لم تكن راضياً، استرجع كامل المبلغ فوراً."
  },
  {
    icon: RotateCcw,
    title: "استرجاع سهل",
    content: "لا حاجة لشرح أسباب الاسترجاع. فقط أرسل لنا بريداً إلى support@madrass.sa وسنعيد المبلغ في يومين."
  },
  {
    icon: Check,
    title: "بدون شروط",
    content: "استرجع المبلغ كاملاً بدون خصومات أو رسوم إضافية. ضمان بدون شروط معقدة."
  },
  {
    icon: Shield,
    title: "ضمان الرضا",
    content: "نحن واثقون من جودة خدمتنا. إذا غيّرت رأيك، استرجع فلوسك - الأمر بهذه البساطة."
  },
];

export default function RefundPolicyPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1B4DB3, #2563EB)" }}>
              <span className="text-white font-black text-base" style={{ fontFamily: "'Tajawal', sans-serif" }}>م</span>
            </div>
            <span className="font-black" style={{ color: "#0A2463" }}>مدراس</span>
          </div>
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-primary font-semibold">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <RotateCcw className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">سياسة الاسترجاع والاسترداد</h1>
          <p className="text-gray-500">آخر تحديث: مارس 2026</p>
          <p className="text-gray-600 mt-4 max-w-xl mx-auto leading-relaxed">
            نحن واثقون من جودة خدمتنا. إذا لم تكن راضياً في أول 30 يوم، استرجع فلوسك بكل بساطة.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {POLICIES.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 mb-2">{p.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">{p.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-8 mb-12">
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">خطوات طلب الاسترجاع</h2>
            <ol className="space-y-4">
              {[
                { num: "1", title: "أرسل بريداً", desc: "أرسل لنا على support@madrass.sa مع ذكر رقم اشتراكك" },
                { num: "2", title: "تأكيد الطلب", desc: "سنؤكد استقبالنا لطلبك في خلال 24 ساعة" },
                { num: "3", title: "معالجة الاسترجاع", desc: "نعالج الاسترجاع في يوم عمل واحد" },
                { num: "4", title: "استقبال الفلوس", desc: "يصل المبلغ لحسابك في خلال يومين" },
              ].map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">حالات استثنائية</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• إذا استخدمت الاشتراك بشكل كامل لأكثر من 30 يوم، قد نطلب التحقق من حسن النية</p>
              <p>• الاشتراكات السنوية تخضع لنفس سياسة الـ 30 يوم من تاريخ الشراء</p>
              <p>• إذا كان هناك مشكلة تقنية، نحل المشكلة أولاً قبل الاسترجاع</p>
            </div>
          </section>
        </div>

        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
          <p className="text-blue-900 font-semibold text-sm">
            للاستفسار عن سياسة الاسترجاع، تواصل معنا على:
            <a href="mailto:support@madrass.sa" className="font-bold mr-2" style={{ color: "#1B4DB3" }}>support@madrass.sa</a>
          </p>
        </div>
      </main>
    </div>
  );
}
