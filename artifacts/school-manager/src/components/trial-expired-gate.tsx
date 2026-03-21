import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Lock, LogOut, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const ALLOWED_PATHS = ["/pricing", "/payment"];

export function TrialExpiredGate({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!user) return <>{children}</>;

  const sub = user.subscription;
  const hasActivePaid = sub && sub.status !== "trial" && sub.isActive;
  const hasActiveTrial = sub && sub.status === "trial" && sub.isActive;

  if (hasActivePaid || hasActiveTrial) {
    return <>{children}</>;
  }

  if (ALLOWED_PATHS.some(p => location.startsWith(p))) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"
      style={{ background: "linear-gradient(135deg, #0A2463 0%, #0D1F5C 45%, #1B4DB3 100%)" }}>
      <div className="w-full max-w-md text-center bg-white rounded-3xl p-10 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-red-100">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <h1 className="text-3xl font-black mb-3" style={{ color: "#0A2463" }}>
          انتهت الفترة التجريبية
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          انتهت فترة التجربة المجانية (7 أيام). اشترك الآن للاستمرار في استخدام جميع ميزات مدراس.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/pricing")}
            className="w-full h-14 rounded-xl font-black text-base flex items-center justify-center gap-2"
            style={{ background: "#1B4DB3" }}
          >
            اشترك الآن <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => { logout(); navigate("/"); }}
            className="w-full h-12 rounded-xl font-bold text-gray-500 hover:text-red-600 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </Button>
        </div>
      </div>
    </div>
  );
}
