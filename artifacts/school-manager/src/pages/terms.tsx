import { useLocation } from "wouter";
import { GraduationCap, ArrowRight, FileText } from "lucide-react";

const TERMS = [
  {
    title: "1. قبول الشروط",
    content: "باستخدامك لمنصة مدراس، فإنك توافق على الالتزام بهذه الشروط. إذا كنت تمثل مدرسة أو مؤسسة تعليمية، فإنك تؤكد صلاحيتك للموافقة نيابةً عنها."
  },
  {
    title: "2. الخدمة والاستخدام",
    content: "مدراس منصة إدارة مدارس للاستخدام التعليمي. يُمنع استخدام المنصة لأي غرض غير مشروع أو مخالف للأنظمة السعودية. يحق لنا إيقاف الحسابات المخالفة."
  },
  {
    title: "3. الاشتراكات والدفع",
    content: "تُحتسب رسوم الاشتراك مقدماً. الاسترداد متاح خلال 30 يوماً من الاشتراك إذا لم تكن راضياً. يتم تجديد الاشتراكات تلقائياً ما لم تُلغها قبل 24 ساعة من تاريخ التجديد."
  },
  {
    title: "4. الملكية الفكرية",
    content: "جميع حقوق الملكية الفكرية للمنصة محفوظة لـ مدراس. بياناتك ومحتوى مدرستك ملكٌ لك. نحن لا نمتلك أي حق في محتوى المدرسة الذي تُدخله."
  },
  {
    title: "5. المسؤولية",
    content: "نسعى لتوفير أفضل خدمة، لكننا لا نضمن عدم انقطاع الخدمة. لا نتحمل المسؤولية عن الأضرار غير المباشرة الناتجة عن استخدام المنصة."
  },
  {
    title: "6. تعديل الشروط",
    content: "نحتفظ بحق تعديل هذه الشروط مع إشعار مسبق بـ 30 يوماً عبر البريد الإلكتروني. الاستمرار في الاستخدام بعد الإشعار يعني قبولك للشروط الجديدة."
  },
  {
    title: "7. القانون المطبق",
    content: "تخضع هذه الشروط للأنظمة والقوانين المعمول بها في المملكة العربية السعودية. أي نزاع يُحل وفق الجهات القضائية المختصة في المملكة."
  },
];

export default function TermsPage() {
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
            <span className="font-black text-gray-900" style={{ color: "#0A2463" }}>مدراس</span>
          </div>
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-primary font-semibold">
            <ArrowRight className="w-4 h-4" /> العودة للرئيسية
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">شروط الاستخدام</h1>
          <p className="text-gray-500">آخر تحديث: مارس 2026</p>
          <p className="text-gray-600 mt-4 max-w-xl mx-auto leading-relaxed">
            يرجى قراءة هذه الشروط بعناية قبل استخدام منصة مدراس. استخدامك للمنصة يعني موافقتك على هذه الشروط.
          </p>
        </div>

        <div className="space-y-5">
          {TERMS.map((t, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl p-6">
              <h3 className="font-extrabold text-gray-900 mb-2 text-base">{t.title}</h3>
              <p className="text-gray-600 leading-relaxed text-sm">{t.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 p-6 bg-gray-50 rounded-2xl text-center">
          <p className="text-gray-600 text-sm">
            للاستفسار عن هذه الشروط:
            <a href="mailto:legal@madrass.sa" className="text-primary font-bold mr-2">legal@madrass.sa</a>
          </p>
        </div>
      </main>
    </div>
  );
}
