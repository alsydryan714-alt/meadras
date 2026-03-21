import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const { user, token, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [planName, setPlanName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("id");

    if (!paymentId || !token) {
      setLoading(false);
      setMessage("معرّف الدفع غير موجود");
      return;
    }

    verifyPayment(paymentId);
  }, [token]);

  async function verifyPayment(paymentId: string) {
    try {
      const res = await fetch(`${BASE}/api/payment/verify/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setMessage(data.message);
        setPlanName(data.subscription?.plan || "");
        await refreshUser();
      } else {
        setSuccess(false);
        setMessage(data.message || data.error || "فشل في التحقق من الدفع");
      }
    } catch {
      setSuccess(false);
      setMessage("حدث خطأ أثناء التحقق من الدفع");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">جارٍ التحقق من الدفع...</h2>
          <p className="text-muted-foreground">يرجى الانتظار بينما نتحقق من عملية الدفع</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-teal-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">تم الاشتراك بنجاح!</h1>
          <p className="text-muted-foreground mb-2">
            مرحباً {user?.name}، {message}
          </p>
          <p className="text-sm text-muted-foreground mb-8">يمكنك الآن الاستمتاع بجميع ميزات النظام.</p>
          <Button className="w-full h-12 rounded-xl font-bold" onClick={() => navigate("/dashboard")}>
            الانتقال للوحة التحكم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">لم تتم عملية الدفع</h1>
        <p className="text-muted-foreground mb-8">{message}</p>
        <div className="space-y-3">
          <Button className="w-full h-12 rounded-xl font-bold" onClick={() => navigate("/pricing")}>
            إعادة المحاولة
          </Button>
          <button
            onClick={() => navigate("/")}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
          >
            <ArrowRight className="w-3.5 h-3.5" /> العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}
