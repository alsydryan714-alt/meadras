import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { SchoolLogo } from "@/components/school-logo";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"
      style={{ background: "linear-gradient(135deg, #0A2463 0%, #0D1F5C 50%, #0A2463 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex justify-center">
          <SchoolLogo size="lg" showText={true} />
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-black/8 p-8 border border-border/40">
          <h2 className="text-xl font-bold text-gray-900 mb-6">تسجيل الدخول</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">البريد الإلكتروني</label>
              <Input
                type="email"
                placeholder="example@school.sa"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  className="absolute left-3 top-3.5 text-muted-foreground"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ الدخول...</> : "تسجيل الدخول"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <button onClick={() => navigate("/register")} className="text-primary font-semibold hover:underline">
                إنشاء حساب جديد
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#DBEAFE", opacity: 0.7 }}>
          نظام مخصص لوكلاء ومديري المدارس السعودية
        </p>
      </div>
    </div>
  );
}
