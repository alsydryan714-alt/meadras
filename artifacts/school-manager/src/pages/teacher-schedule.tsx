import { useEffect, useState } from "react";
import { CalendarDays, Clock, BookOpen, Users, RefreshCw, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchoolLogo } from "@/components/school-logo";
import { openWhatsApp } from "@/utils/pdf-export";

const BASE = (import.meta.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

interface TimetableEntry {
  id: number; teacherId: number; classId: number; subjectId: number;
  dayOfWeek?: number; day?: string; period: number; className?: string; classSection?: string; subjectName?: string;
}

function loadSchedule(token: string, callback: (data: any) => void) {
  fetch(`${BASE}/api/teachers/schedule/${token}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  })
    .then(r => r.json())
    .then(callback)
    .catch(() => callback({ error: "فشل في تحميل البيانات" }));
}

function getDayName(entry: TimetableEntry): string {
  if (entry.day && DAYS.includes(entry.day)) return entry.day;
  if (entry.dayOfWeek !== undefined) return DAYS[entry.dayOfWeek] || "";
  return "";
}

export default function TeacherSchedulePage() {
  const token = window.location.pathname.split("/schedule/")[1];
  const [teacher, setTeacher] = useState<any>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!token) { setError("رابط غير صالح"); setLoading(false); return; }
    loadSchedule(token, (d) => {
      if (d.error) { setError(d.error); setLoading(false); return; }
      setTeacher(d.teacher);
      setTimetable(d.timetable || []);
      setLoading(false);
    });
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSchedule(token, (d) => {
      if (d.error) { setError(d.error); } else {
        setTeacher(d.teacher);
        setTimetable(d.timetable || []);
        setError("");
      }
      setRefreshing(false);
    });
  };

  const handleShareWhatsApp = () => {
    const url = window.location.href;
    const text = `📅 *جدول الأستاذ ${teacher?.name}*\n\nيمكنك الاطلاع على جدول حصصك الأسبوعي عبر الرابط التالي:\n${url}\n\n_مدعوم بنظام مدراس للإدارة المدرسية_`;
    if (teacher?.phone) {
      openWhatsApp(teacher.phone, text);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-2xl animate-pulse mx-auto mb-3" />
          <p className="text-muted-foreground">جارٍ تحميل الجدول...</p>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50" dir="rtl">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">رابط غير صالح</h2>
          <p className="text-gray-500">{error || "لم يتم العثور على المعلم"}</p>
        </div>
      </div>
    );
  }

  function getCell(day: string, period: number) {
    return timetable.find(t => getDayName(t) === day && t.period === period);
  }

  const totalSlots = timetable.length;
  const hijriDate = (() => {
    try { return new Date().toLocaleDateString("ar-SA-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return ""; }
  })();

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: "#F4F7FF" }}>
      <header className="text-white py-8 px-4" style={{ background: "linear-gradient(135deg, #0A2463, #1B4DB3)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <SchoolLogo size="md" showText={false} className="mb-4" />
            <h1 className="text-xl font-semibold text-white/70 mb-1">جدول المعلم</h1>
            <h2 className="text-3xl font-black text-yellow-300 mb-3">{teacher.name}</h2>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <BookOpen className="w-3.5 h-3.5 ml-1" /> {teacher.subject}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Clock className="w-3.5 h-3.5 ml-1" /> {teacher.maxWeeklyHours} حصة أسبوعياً
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Users className="w-3.5 h-3.5 ml-1" /> {totalSlots} حصة مجدولة
              </Badge>
            </div>
            {hijriDate && <p className="text-white/40 text-xs mt-3">{hijriDate}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Action bar */}
        <div className="flex items-center justify-between bg-white rounded-2xl shadow p-4 border border-border/40">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <span className="font-extrabold text-gray-900">الجدول الأسبوعي</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleShareWhatsApp} size="sm" className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl gap-2 shadow-lg shadow-green-500/20">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">مشاركة عبر واتساب</span>
            </Button>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm" className="rounded-xl gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshing ? "تحديث..." : "تحديث"}</span>
            </Button>
          </div>
        </div>

        {/* Timetable grid */}
        <div className="bg-white rounded-3xl shadow-xl border border-border/40 overflow-hidden">
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[600px] text-center text-sm border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="py-2 px-3 bg-gray-50 rounded-xl font-bold text-gray-600 text-xs">الحصة</th>
                  {DAYS.map(d => (
                    <th key={d} className="py-2 px-3 bg-primary/10 rounded-xl font-bold text-primary text-xs">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(p => (
                  <tr key={p}>
                    <td className="py-2 px-3 bg-gray-50 rounded-xl font-bold text-gray-500 text-xs">{p}</td>
                    {DAYS.map(d => {
                      const cell = getCell(d, p);
                      const className = cell?.className || "";
                      const classSection = cell?.classSection || "";
                      const displayClass = classSection ? `${className}/${classSection}` : className;
                      return (
                        <td key={d} className="py-1">
                          {cell ? (
                            <div className="text-white rounded-xl py-2 px-2 shadow-md" style={{ background: "linear-gradient(135deg, #1B4DB3, #0A2463)" }}>
                              <div className="font-bold text-xs">{cell.subjectName || teacher.subject}</div>
                              {displayClass && (
                                <div className="text-[10px] flex items-center justify-center gap-1 mt-0.5" style={{ color: "#DBEAFE" }}>
                                  <Users className="w-2.5 h-2.5" />{displayClass}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-xl py-3 text-gray-300 text-xs">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Share again card */}
        <div className="bg-white rounded-2xl border border-green-200 p-4 flex items-center justify-between gap-3 shadow-sm">
          <div>
            <p className="font-bold text-gray-800">شارك هذا الجدول مع أولياء الأمور أو الزملاء</p>
            <p className="text-xs text-gray-500 mt-0.5">الرابط مباشر ولا يحتاج تسجيل دخول</p>
          </div>
          <Button onClick={handleShareWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl gap-2 shrink-0">
            <Share2 className="w-4 h-4" />
            مشاركة
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-400">مدعوم بنظام <span className="font-black" style={{ color: "#1B4DB3" }}>مدراس</span> للإدارة المدرسية الذكية</p>
        </div>
      </main>
    </div>
  );
}
