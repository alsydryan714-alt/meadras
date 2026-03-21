import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/auth";

export function FreeTrialBadge() {
  const { user } = useAuth();
  if (user) return null;
  return (
    <div
      className="fixed top-4 left-4 z-40 sm:left-auto sm:right-4 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg animate-pulse"
      style={{ background: "#FEF3C7", color: "#92400E" }}
    >
      <Sparkles className="w-4 h-4" />
      جرّب 7 أيام مجاناً
    </div>
  );
}
