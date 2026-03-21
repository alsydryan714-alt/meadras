import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, AlertCircle, Search, Plus, Check } from "lucide-react";
import { SchoolLogo } from "@/components/school-logo";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface School { id: number; name: string; city: string; region: string; }

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [schoolSearch, setSchoolSearch] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [selectedSchoolName, setSelectedSchoolName] = useState("");
  const [isCustomSchool, setIsCustomSchool] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!showDropdown) return;
    fetch(`${BASE}/api/schools?search=${encodeURIComponent(schoolSearch)}`)
      .then(r => r.json())
      .then(setSchools)
      .catch(() => {});
  }, [schoolSearch, showDropdown]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSchoolInput(val: string) {
    setSchoolSearch(val);
    setSelectedSchoolId(null);
    setSelectedSchoolName("");
    setIsCustomSchool(false);
    setShowDropdown(true);
  }

  function selectExisting(school: School) {
    setSelectedSchoolId(school.id);
    setSelectedSchoolName(school.name);
    setSchoolSearch(school.name);
    setIsCustomSchool(false);
    setShowDropdown(false);
  }

  function selectCustom() {
    const trimmed = schoolSearch.trim();
    setSelectedSchoolId(null);
    setSelectedSchoolName(trimmed);
    setIsCustomSchool(true);
    setShowDropdown(false);
  }

  const schoolReady = selectedSchoolId !== null || (isCustomSchool && selectedSchoolName.length >= 2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolReady) { setError("يرجى اختيار مدرستك أو كتابة اسمها"); return; }
    setError("");
    setLoading(true);
    try {
      if (selectedSchoolId) {
        await register({ name, email, password, schoolId: selectedSchoolId });
      } else {
        await register({ name, email, password, schoolName: selectedSchoolName });
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "خطأ في إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  }

  const showCreateOption = schoolSearch.trim().length >= 2 &&
    !schools.some(s => s.name.toLowerCase() === schoolSearch.trim().toLowerCase());

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"
      style={{ background: "linear-gradient(135deg, #0A2463 0%, #0D1F5C 50%, #0A2463 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex justify-center">
          <SchoolLogo size="lg" showText={true} />
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-xl font-bold mb-6" style={{ color: "#0A2463" }}>إنشاء حساب جديد</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#0A2463" }}>الاسم الكامل</label>
              <Input
                placeholder="أحمد محمد العمري"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#0A2463" }}>البريد الإلكتروني</label>
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
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#0A2463" }}>كلمة المرور</label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="6 أحرف على الأقل"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
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

            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#0A2463" }}>
                اسم المدرسة
              </label>

              <div className="relative">
                <Search className="absolute right-3 top-3.5 w-4 h-4" style={{ color: "#1B4DB3" }} />
                <Input
                  placeholder="ابحث عن مدرستك أو اكتب اسمها..."
                  value={schoolSearch}
                  onChange={e => handleSchoolInput(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  className={`h-12 rounded-xl pr-10 transition-all ${schoolReady ? "border-blue-500 ring-1 ring-blue-300" : ""}`}
                />
                {schoolReady && (
                  <div className="absolute left-3 top-3.5">
                    <Check className="w-4 h-4" style={{ color: "#1B4DB3" }} />
                  </div>
                )}
              </div>

              {isCustomSchool && (
                <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#1B4DB3" }}>
                  <Plus className="w-3 h-3" />
                  سيتم إنشاء مدرسة جديدة باسم: <strong>{selectedSchoolName}</strong>
                </p>
              )}

              {showDropdown && (schools.length > 0 || showCreateOption) && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-52 overflow-y-auto"
                  style={{ borderColor: "#DBEAFE" }}>

                  {schools.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full text-right px-4 py-3 hover:bg-blue-50 flex flex-col border-b last:border-0 transition-colors"
                      style={{ borderColor: "#EFF6FF" }}
                      onClick={() => selectExisting(s)}
                    >
                      <span className="font-semibold text-sm" style={{ color: "#0A2463" }}>{s.name}</span>
                      {s.city && <span className="text-xs text-muted-foreground">{s.city}{s.region ? ` — ${s.region}` : ""}</span>}
                    </button>
                  ))}

                  {showCreateOption && (
                    <button
                      type="button"
                      className="w-full text-right px-4 py-3 flex items-center gap-2.5 transition-colors"
                      style={{ background: "#EFF6FF" }}
                      onClick={selectCustom}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "#DBEAFE" }}>
                        <Plus className="w-3.5 h-3.5" style={{ color: "#1B4DB3" }} />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm" style={{ color: "#1B4DB3" }}>إضافة مدرسة جديدة</div>
                        <div className="text-xs text-muted-foreground">"{schoolSearch.trim()}"</div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-bold mt-2"
              disabled={loading || !schoolReady}
              style={{ background: schoolReady ? "#1B4DB3" : undefined }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ إنشاء الحساب...</>
                : "إنشاء الحساب ←"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              لديك حساب بالفعل؟{" "}
              <button onClick={() => navigate("/login")} className="font-semibold hover:underline" style={{ color: "#1B4DB3" }}>
                تسجيل الدخول
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#DBEAFE", opacity: 0.6 }}>
          نظام مخصص لوكلاء ومديري المدارس السعودية
        </p>
      </div>
    </div>
  );
}
