import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  title: string;
  description: string;
}

export function UpgradePrompt({ title, description }: UpgradePromptProps) {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#F4F7FF" }}>
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "#FFE5CC" }}>
            <Lock className="w-8 h-8" style={{ color: "#F5A623" }} />
          </div>
        </div>

        <h1 className="text-3xl font-black mb-3" style={{ color: "#0A2463" }}>{title}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">{description}</p>

        <p className="text-sm font-semibold mb-6" style={{ color: "#1B4DB3" }}>
          هذه الميزة متاحة فقط في باقة <strong>الاحترافية</strong>
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/pricing")}
            className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2"
            style={{ background: "#1B4DB3" }}
          >
            ترقية الآن ← <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="w-full h-12 rounded-xl font-bold"
          >
            العودة للرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
