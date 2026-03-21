import { useAuth } from "@/contexts/auth";
import { Clock } from "lucide-react";

export function TrialBanner() {
  const { user } = useAuth();
  const sub = user?.subscription;

  if (!sub || sub.status !== "trial" || !sub.isActive || !sub.expiresAt) return null;

  const now = new Date().getTime();
  const expires = new Date(sub.expiresAt).getTime();
  const daysLeft = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-gradient-to-l from-amber-500 to-orange-500 text-white text-center py-2 px-4 text-sm font-bold flex items-center justify-center gap-2 no-print">
      <Clock className="w-4 h-4" />
      <span>
        تجربة مجانية — متبقي {daysLeft} {daysLeft === 1 ? "يوم" : "أيام"}
      </span>
    </div>
  );
}
