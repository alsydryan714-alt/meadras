import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, Lock, AlertCircle, Loader2, CreditCard, ArrowRight, ShieldCheck, ExternalLink } from "lucide-react";

const BASE = (import.meta.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

const PLAN_NAMES: Record<string, string> = {
  madrass: "مدراس",
  basic: "الأساسية",
  professional: "الاحترافية",
  enterprise: "المؤسسية",
};

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  madrass: { monthly: 69, yearly: 219 },
  basic: { monthly: 99, yearly: 990 },
  professional: { monthly: 199, yearly: 1990 },
  enterprise: { monthly: 399, yearly: 3990 },
};

export default function PaymentPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan") || "madrass";
  const billing = (params.get("billing") || "monthly") as "monthly" | "yearly";

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");

  const price = PLAN_PRICES[plan]?.[billing] ?? 199;
  const planName = PLAN_NAMES[plan] ?? "الاحترافية";

  useEffect(() => {
    if (!user) { navigate("/login"); return; }

    fetch(`${BASE}/api/payment/link?plan=${plan}&billing=${billing}`)
      .then(r => r.json())
      .then(data => {
        setPaymentUrl(data.url || null);
        if (!data.url) setError("رابط الدفع لهذه الخطة غير متاح حالياً. يرجى التواصل مع الدعم.");
      })
      .catch(() => setError("تعذّر تحميل رابط الدفع. يرجى المحاولة لاحقاً."))
      .finally(() => setLoadingLink(false));
  }, [user, plan, billing]);

  function handlePay() {
    if (!paymentUrl) return;
    setRedirecting(true);
    window.location.href = paymentUrl;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl shadow-lg shadow-primary/30 mb-3">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">إتمام الاشتراك</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-black/8 overflow-hidden border border-border/40">
          <div className="bg-gradient-to-l from-primary to-blue-700 p-5 text-white flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">الخطة المختارة</p>
              <h2 className="text-xl font-extrabold">{planName}</h2>
              <p className="text-blue-100 text-sm">{billing === "yearly" ? "اشتراك سنوي" : "اشتراك شهري"}</p>
            </div>
            <div className="text-left">
              <p className="text-3xl font-black">{price}</p>
              <p className="text-blue-100 text-sm">ريال سعودي</p>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">دفع آمن ومشفر عبر بوابة Moyasar المعتمدة</span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { key: "mada", label: "مدى" },
                { key: "visa", label: "Visa" },
                { key: "mastercard", label: "Mastercard" },
                { key: "applepay", label: "Apple Pay" },
              ].map(card => (
                <div key={card.key} className="border border-border/50 rounded-xl p-2 flex items-center justify-center bg-gray-50">
                  <CreditCard className="w-4 h-4 text-muted-foreground ml-1" />
                  <span className="text-xs font-bold text-gray-600">{card.label}</span>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">خطة {planName}</span>
                <span className="font-semibold">{price} ر.س</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المدة</span>
                <span className="font-semibold">{billing === "yearly" ? "سنة واحدة" : "شهر واحد"}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-base font-bold">
                <span>الإجمالي</span>
                <span className="text-primary">{price} ر.س</span>
              </div>
            </div>

            <Button
              onClick={handlePay}
              className="w-full h-13 rounded-xl text-base font-bold py-3.5"
              disabled={loadingLink || redirecting || !paymentUrl}
            >
              {loadingLink
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ التحميل...</>
                : redirecting
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ التحويل لبوابة الدفع...</>
                : <><ExternalLink className="w-4 h-4 ml-2" /> ادفع {price} ريال</>
              }
            </Button>

            {!loadingLink && paymentUrl && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                سيتم تحويلك لبوابة Moyasar الآمنة لإدخال بيانات البطاقة
              </p>
            )}

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              بياناتك محمية ومشفرة بالكامل
            </div>

            <button
              onClick={() => navigate("/pricing")}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5" /> العودة لاختيار الخطة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
