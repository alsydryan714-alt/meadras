import { useLocation } from "wouter";
import { GraduationCap, ArrowRight, Shield, Lock, Eye, Database, Bell, Mail } from "lucide-react";

const SECTIONS = [
  {
    icon: Database,
    title: "البيانات التي نجمعها",
    content: "نجمع البيانات التي تُدخلها بنفسك فقط: اسمك، بريدك الإلكتروني، بيانات المدرسة والمعلمين، والجداول الدراسية. لا نجمع أي بيانات إضافية دون إذنك."
  },
  {
    icon: Lock,
    title: "كيف نحمي بياناتك",
    content: "جميع البيانات مشفرة بتقنية SSL 256-bit أثناء النقل والتخزين. سيرفراتنا موجودة داخل المملكة العربية السعودية ومطابقة لمتطلبات هيئة الاتصالات وتقنية المعلومات."
  },
  {
    icon: Eye,
    title: "مشاركة البيانات",
    content: "لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث تجاري. قد نشارك البيانات مع مزودي الخدمات الضروريين لتشغيل المنصة فقط، وتحت اتفاقيات سرية صارمة."
  },
  {
    icon: Bell,
    title: "الإشعارات والتواصل",
    content: "قد نرسل لك إشعارات تشغيلية مهمة عبر البريد الإلكتروني (مثل تأكيد التسجيل، وإعادة تعيين كلمة المرور). يمكنك إلغاء الاشتراك في النشرات التسويقية في أي وقت."
  },
  {
    icon: Database,
    title: "الاحتفاظ بالبيانات",
    content: "نحتفظ ببياناتك طالما حسابك نشطاً. عند إلغاء الاشتراك، يمكنك طلب حذف جميع بياناتك خلال 30 يوماً."
  },
  {
    icon: Mail,
    title: "حقوقك",
    content: "يحق لك طلب الاطلاع على بياناتك، تعديلها، أو حذفها في أي وقت. للتواصل: support@madrass.sa"
  },
];

export default function PrivacyPage() {
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
            <ArrowRight className="w-4 h-4" /> العودة للرئيسية
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">سياسة الخصوصية</h1>
          <p className="text-gray-500">آخر تحديث: مارس 2026</p>
          <p className="text-gray-600 mt-4 max-w-xl mx-auto leading-relaxed">
            نلتزم في مدراس بحماية خصوصيتك وبيانات مدرستك. هذه السياسة تشرح كيف نجمع البيانات ونستخدمها ونحميها.
          </p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 mb-2">{s.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">{s.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
          <p className="text-blue-800 font-semibold text-sm">
            للاستفسار عن سياسة الخصوصية، تواصل معنا على:
            <a href="mailto:privacy@madrass.sa" className="text-primary font-bold mr-2">privacy@madrass.sa</a>
          </p>
        </div>
      </main>
    </div>
  );
}
