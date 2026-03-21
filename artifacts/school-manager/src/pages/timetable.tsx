import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import { useAuth } from "@/contexts/auth";
import { PageWrapper } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  useGetTimetable, 
  useGetClasses, 
  useGetTeachers, 
  useGetSubjects,
  useCreateTimetableSlot,
  useDeleteTimetableSlot
} from "@workspace/api-client-react";
import { Plus, Trash2, CalendarDays, Wand2, Download, Lock, Unlock, FileDown, Settings2, Clock, Coffee, BookOpen, ChevronDown, ChevronUp, Save } from "lucide-react";
import { exportElementToPDF } from "@/utils/pdf-export";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const SLOT_COLORS = [
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900", sub: "text-indigo-600" },
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", sub: "text-blue-600" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", sub: "text-purple-600" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", sub: "text-amber-600" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", sub: "text-rose-600" },
  { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-900", sub: "text-sky-600" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", sub: "text-emerald-600" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900", sub: "text-orange-600" },
];

function getSlotColor(subjectId: number) {
  return SLOT_COLORS[subjectId % SLOT_COLORS.length];
}

/** Format minutes-from-midnight to HH:MM */
function fmtTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface ScheduleSettings {
  startTime: string;
  periodDuration: number;
  breakAfterPeriod: number | null;
  breakDuration: number;
  prayerAfterPeriod: number | null;
  prayerDuration: number;
}

interface PeriodInfo {
  period: number;
  start: string;
  end: string;
  breakAfter?: { label: string; duration: number };
}

function calcPeriodTimes(s: ScheduleSettings, periodCount = 8): PeriodInfo[] {
  if (!s?.startTime) return PERIODS.map(p => ({ period: p, start: "", end: "" }));
  const [h, m] = s.startTime.split(":").map(Number);
  let cursor = h * 60 + m;
  const result: PeriodInfo[] = [];

  for (let p = 1; p <= periodCount; p++) {
    const start = fmtTime(cursor);
    cursor += s.periodDuration;
    const end = fmtTime(cursor);
    const info: PeriodInfo = { period: p, start, end };

    if (p === s.breakAfterPeriod) {
      info.breakAfter = { label: "فسحة", duration: s.breakDuration };
      cursor += s.breakDuration;
    }
    if (p === s.prayerAfterPeriod) {
      info.breakAfter = { label: "صلاة", duration: s.prayerDuration };
      cursor += s.prayerDuration;
    }

    result.push(info);
  }
  return result;
}

async function callAutoGenerate() {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}/api/timetable/auto-generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "فشل التوليد");
  return data;
}

async function fetchScheduleSettings(): Promise<ScheduleSettings> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}/api/schedule-settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function saveScheduleSettings(data: ScheduleSettings) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}/api/schedule-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("فشل الحفظ");
  return res.json();
}

export default function TimetablePage() {
  const { user } = useAuth();
  const { data: classes } = useGetClasses();
  const { data: teachers } = useGetTeachers();
  const { data: subjects } = useGetSubjects();
  const { data: timetable } = useGetTimetable();
  
  const { mutate: createSlot, isPending: isCreating } = useCreateTimetableSlot();
  const { mutate: deleteSlot } = useDeleteTimetableSlot();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{day: number, period: number} | null>(null);
  const [confirmAutoGen, setConfirmAutoGen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [formTeacherId, setFormTeacherId] = useState<number | "">("");
  const [formSubjectId, setFormSubjectId] = useState<number | "">("");

  // ── Schedule settings state ──────────────────────────────────────
  const { data: savedSettings } = useQuery({
    queryKey: ["/api/schedule-settings"],
    queryFn: fetchScheduleSettings,
  });

  const [settings, setSettings] = useState<ScheduleSettings>({
    startTime: "07:30",
    periodDuration: 45,
    breakAfterPeriod: 3,
    breakDuration: 20,
    prayerAfterPeriod: 6,
    prayerDuration: 15,
  });

  useEffect(() => {
    if (savedSettings) setSettings(savedSettings);
  }, [savedSettings]);

  const { mutate: doSaveSettings, isPending: isSaving } = useMutation({
    mutationFn: saveScheduleSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-settings"] });
      toast({ title: "✓ تم حفظ إعدادات الجدول" });
      setShowSettings(false);
    },
    onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
  });

  const periodTimes = calcPeriodTimes(settings);

  // ── Auto-generate ────────────────────────────────────────────────
  const { mutate: doAutoGenerate, isPending: isGenerating } = useMutation({
    mutationFn: callAutoGenerate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/timetable'] });
      toast({ title: "تم التوليد التلقائي ✓", description: data.message || `تم توليد ${data.count} حصة بدون تعارضات` });
      setConfirmAutoGen(false);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  });

  const handleCreate = () => {
    if (!selectedClassId || !activeCell || !formTeacherId || !formSubjectId) return;
    
    const conflict = timetable?.find(t => 
      t.dayOfWeek === activeCell.day && 
      t.period === activeCell.period && 
      t.teacherId === formTeacherId
    );

    if (conflict) {
      toast({ title: "تعارض", description: "هذا المعلم مشغول في هذا الوقت في فصل آخر", variant: "destructive" });
      return;
    }

    createSlot({
      data: {
        classId: selectedClassId,
        dayOfWeek: activeCell.day,
        period: activeCell.period,
        teacherId: Number(formTeacherId),
        subjectId: Number(formSubjectId)
      }
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormTeacherId("");
        setFormSubjectId("");
        queryClient.invalidateQueries({ queryKey: ['/api/timetable'] });
        toast({ title: "تم", description: "تمت إضافة الحصة بنجاح" });
      }
    });
  };

  const { mutate: toggleLock } = useMutation({
    mutationFn: async ({ id, isLocked }: { id: number; isLocked: boolean }) => {
      const token = localStorage.getItem("auth_token");
      const r = await fetch(`${BASE}/api/timetable/${id}/lock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isLocked }),
      });
      if (!r.ok) throw new Error("فشل القفل");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timetable'] });
      toast({ title: "تم تحديث حالة القفل" });
    }
  });

  const handleDelete = (id: number) => {
    if(confirm("هل أنت متأكد من حذف هذه الحصة؟")) {
      deleteSlot({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/timetable'] });
        }
      });
    }
  };

  const openDialog = (day: number, period: number) => {
    setActiveCell({ day, period });
    setIsDialogOpen(true);
  };

  const currentClassSlots = timetable?.filter(t => t.classId === selectedClassId) || [];

  // ── Excel export ─────────────────────────────────────────────────
  async function exportToExcel() {
    if (!timetable?.length) {
      toast({ title: "لا يوجد جدول للتصدير", variant: "destructive" }); return;
    }
    const wb = new ExcelJS.Workbook();
    const teacherMap = new Map((teachers ?? []).map(t => [t.id, t.name]));
    const subjectMap = new Map((subjects ?? []).map(s => [s.id, s.name]));
    const classMap = new Map((classes ?? []).map(c => [c.id, `${c.grade} ${c.section}`]));

    const ws1 = wb.addWorksheet("الجدول الكامل");
    ws1.addRow(["الفصل", "اليوم", "رقم الحصة", "وقت البداية", "وقت النهاية", "المادة", "المعلم"]);
    timetable.forEach(slot => {
      const pi = periodTimes.find(p => p.period === slot.period);
      ws1.addRow([
        classMap.get(slot.classId) ?? slot.classId,
        DAYS[slot.dayOfWeek] ?? slot.dayOfWeek,
        slot.period,
        pi?.start ?? "",
        pi?.end ?? "",
        subjectMap.get(slot.subjectId) ?? slot.subjectId,
        teacherMap.get(slot.teacherId) ?? slot.teacherId,
      ]);
    });

    (classes ?? []).forEach(cls => {
      const classSlots = timetable.filter(s => s.classId === cls.id);
      if (!classSlots.length) return;
      const ws = wb.addWorksheet(`${cls.grade} ${cls.section}`.slice(0, 31));
      ws.addRow(["اليوم", ...PERIODS.map(p => {
        const pi = periodTimes.find(x => x.period === p);
        return `الحصة ${p}\n${pi?.start ?? ""} - ${pi?.end ?? ""}`;
      })]);
      DAYS.forEach((day, dayIdx) => {
        const daySlots = classSlots.filter(s => s.dayOfWeek === dayIdx);
        ws.addRow([day, ...PERIODS.map(p => {
          const s = daySlots.find(x => x.period === p);
          if (!s) return "";
          return `${subjectMap.get(s.subjectId) ?? "?"}\n${teacherMap.get(s.teacherId) ?? "?"}`;
        })]);
      });
    });

    (teachers ?? []).forEach(teacher => {
      const teacherSlots = timetable.filter(s => s.teacherId === teacher.id);
      if (!teacherSlots.length) return;
      const ws = wb.addWorksheet(teacher.name.slice(0, 31));
      ws.addRow(["اليوم", ...PERIODS.map(p => `الحصة ${p}`)]);
      DAYS.forEach((day, dayIdx) => {
        const daySlots = teacherSlots.filter(s => s.dayOfWeek === dayIdx);
        ws.addRow([day, ...PERIODS.map(p => {
          const s = daySlots.find(x => x.period === p);
          if (!s) return "";
          return `${classMap.get(s.classId) ?? "?"} - ${subjectMap.get(s.subjectId) ?? "?"}`;
        })]);
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "الجدول_الدراسي_مدرستي.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "✅ تم تصدير الجدول", description: "جدول كامل بفصل لكل شيت + جدول كل معلم" });
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-between items-start gap-3 no-print">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground">الجدول الدراسي</h1>
            <p className="text-muted-foreground text-sm mt-1">تخطيط وبناء الجدول بنظام الشبكة المرئية</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => exportElementToPDF("timetable-grid", "جدول-دراسي.pdf", "الجدول الدراسي")}
              className="rounded-xl font-bold gap-2 border-red-200 text-red-700 hover:bg-red-50"
            >
              <FileDown className="w-4 h-4" /> تصدير PDF
            </Button>
            <Button
              variant="outline"
              onClick={exportToExcel}
              className="rounded-xl font-bold gap-2 border-green-200 text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4" /> تصدير Excel
            </Button>
            <Button
              onClick={() => setConfirmAutoGen(true)}
              className="bg-gradient-to-l from-violet-600 to-blue-600 text-white hover:opacity-90 rounded-xl font-bold shadow-lg shadow-violet-500/20"
            >
              <Wand2 className="w-4 h-4 ml-2" /> توليد تلقائي بالذكاء الاصطناعي
            </Button>
          </div>
        </div>

        {/* ── Schedule Settings Card ───────────────────────────────── */}
        <Card className="border-border/50 shadow-xl shadow-black/5 no-print overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
            onClick={() => setShowSettings(v => !v)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Settings2 className="w-5 h-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground text-sm">إعدادات الجدول الزمني</p>
                <p className="text-xs text-muted-foreground">
                  البداية {settings.startTime} · مدة الحصة {settings.periodDuration} د
                  {settings.breakAfterPeriod ? ` · فسحة بعد الحصة ${settings.breakAfterPeriod}` : ""}
                  {settings.prayerAfterPeriod ? ` · صلاة بعد الحصة ${settings.prayerAfterPeriod}` : ""}
                </p>
              </div>
            </div>
            {showSettings ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showSettings && (
            <div className="border-t border-border/50 p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Start time */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                    <Clock className="w-4 h-4 text-primary" /> وقت بداية الدوام
                  </label>
                  <input
                    type="time"
                    value={settings.startTime}
                    onChange={e => setSettings(s => ({ ...s, startTime: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-center font-mono text-lg"
                    dir="ltr"
                  />
                </div>

                {/* Period duration */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" /> مدة الحصة (بالدقائق)
                  </label>
                  <input
                    type="number"
                    min={20} max={90}
                    value={settings.periodDuration}
                    onChange={e => setSettings(s => ({ ...s, periodDuration: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-center font-mono text-lg"
                  />
                </div>

                {/* Placeholder for alignment */}
                <div className="hidden lg:block" />

                {/* Break */}
                <div className="sm:col-span-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                    <Coffee className="w-4 h-4 text-orange-500" /> الفسحة — بعد الحصة رقم
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={settings.breakAfterPeriod ?? ""}
                      onChange={e => setSettings(s => ({ ...s, breakAfterPeriod: e.target.value ? Number(e.target.value) : null }))}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-center"
                    >
                      <option value="">بلا فسحة</option>
                      {PERIODS.map(p => <option key={p} value={p}>الحصة {p}</option>)}
                    </select>
                    {settings.breakAfterPeriod && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={5} max={60}
                          value={settings.breakDuration}
                          onChange={e => setSettings(s => ({ ...s, breakDuration: Number(e.target.value) }))}
                          className="w-20 px-2 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-center font-mono"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">د</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prayer */}
                <div className="sm:col-span-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                    <span className="text-green-600 font-bold text-base">☾</span>
                    <span>الصلاة — بعد الحصة رقم</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={settings.prayerAfterPeriod ?? ""}
                      onChange={e => setSettings(s => ({ ...s, prayerAfterPeriod: e.target.value ? Number(e.target.value) : null }))}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-center"
                    >
                      <option value="">بلا صلاة</option>
                      {PERIODS.map(p => <option key={p} value={p}>الحصة {p}</option>)}
                    </select>
                    {settings.prayerAfterPeriod && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={5} max={60}
                          value={settings.prayerDuration}
                          onChange={e => setSettings(s => ({ ...s, prayerDuration: Number(e.target.value) }))}
                          className="w-20 px-2 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-center font-mono"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">د</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Period times preview */}
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">معاينة توقيت الحصص</p>
                <div className="flex flex-wrap gap-2">
                  {periodTimes.map(p => (
                    <div key={p.period} className="flex flex-col items-center">
                      <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-center min-w-[70px]">
                        <p className="text-[10px] text-slate-500 font-bold">الحصة {p.period}</p>
                        <p className="text-xs font-mono font-bold text-slate-700">{p.start}</p>
                        <p className="text-[10px] text-slate-400">↓</p>
                        <p className="text-xs font-mono font-bold text-slate-700">{p.end}</p>
                      </div>
                      {p.breakAfter && (
                        <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.breakAfter.label === "فسحة" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                        }`}>
                          {p.breakAfter.label} {p.breakAfter.duration}د
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => doSaveSettings(settings)}
                  disabled={isSaving}
                  className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20 gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Class selector ───────────────────────────────────────── */}
        <Card className="p-4 sm:p-6 border-border/50 shadow-xl shadow-black/5 no-print">
          <div className="max-w-sm">
            <label className="block text-sm font-bold text-foreground mb-2">اختر الفصل لعرض الجدول</label>
            <select 
              className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
              value={selectedClassId || ""}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
            >
              <option value="" disabled>-- اختر الفصل --</option>
              {classes?.map(c => (
                <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* ── Timetable Grid ───────────────────────────────────────── */}
        {selectedClassId ? (
          <div id="timetable-grid" className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border/50 overflow-x-auto p-6">
            <div className="min-w-[800px]">
              {/* Period headers with time */}
              <div className="grid grid-cols-9 gap-4 mb-4">
                <div className="h-16"></div>
                {periodTimes.map(p => (
                  <div key={p.period} className="flex flex-col items-center gap-1">
                    <div className="w-full bg-slate-100 rounded-xl flex flex-col items-center justify-center py-2 px-1">
                      <span className="font-bold text-slate-600 text-sm">الحصة {p.period}</span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5" dir="ltr">
                        {p.start} – {p.end}
                      </span>
                    </div>
                    {p.breakAfter && (
                      <div className={`w-full text-center py-0.5 px-1 rounded-md text-[10px] font-bold ${
                        p.breakAfter.label === "فسحة"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {p.breakAfter.label === "فسحة" ? "☕" : "☾"} {p.breakAfter.label} ({p.breakAfter.duration}د)
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="space-y-4">
                {DAYS.map((dayName, dayIdx) => (
                  <div key={dayIdx} className="grid grid-cols-9 gap-4">
                    <div className="bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold shadow-md shadow-primary/20 h-24">
                      {dayName}
                    </div>
                    {PERIODS.map(period => {
                      const slot = currentClassSlots.find(s => s.dayOfWeek === dayIdx && s.period === period);
                      const colors = slot ? getSlotColor(slot.subjectId) : null;
                      const isLocked = (slot as any)?.isLocked;
                      return (
                        <div
                          key={`${dayIdx}-${period}`}
                          className={`h-24 rounded-xl border-2 transition-all relative group ${
                            slot
                              ? `${colors!.bg} ${isLocked ? "border-amber-400 ring-1 ring-amber-300" : colors!.border}`
                              : "border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-50 cursor-pointer flex items-center justify-center"
                          }`}
                          onClick={() => !slot && openDialog(dayIdx, period)}
                        >
                          {slot ? (
                            <div className="p-2 h-full flex flex-col justify-center items-center text-center">
                              {isLocked && (
                                <Lock className="w-3 h-3 text-amber-500 absolute top-1.5 right-1.5 opacity-70" />
                              )}
                              <p className={`font-bold text-sm leading-tight ${colors!.text}`}>{slot.subjectName}</p>
                              <p className={`text-xs mt-0.5 ${colors!.sub}`}>{slot.teacherName}</p>
                              <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleLock({ id: slot.id, isLocked: !isLocked }); }}
                                  title={isLocked ? "فك القفل" : "قفل الحصة"}
                                  className={`p-1 rounded-md transition-all ${isLocked ? "bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-600"}`}
                                >
                                  {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                </button>
                                {!isLocked && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(slot.id); }}
                                    className="p-1 bg-rose-100 text-rose-600 rounded-md hover:bg-rose-500 hover:text-white transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Plus className="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-border">
            <CalendarDays className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-600 mb-2">الرجاء اختيار فصل لعرض وبناء جدوله</h3>
            <p className="text-sm text-muted-foreground">أو استخدم زر "التوليد التلقائي" لبناء جدول كامل لجميع الفصول</p>
          </div>
        )}

        {/* ── Add slot dialog ──────────────────────────────────────── */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 font-sans border-0 shadow-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">إضافة حصة جديدة</DialogTitle>
              {activeCell && (
                <p className="text-muted-foreground mt-2">
                  يوم {DAYS[activeCell.day]} — الحصة {activeCell.period}
                  {(() => {
                    const pi = periodTimes.find(p => p.period === activeCell.period);
                    return pi ? <span className="text-primary font-mono mx-2" dir="ltr"> ({pi.start} – {pi.end})</span> : null;
                  })()}
                </p>
              )}
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">المادة الدراسية</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(Number(e.target.value))}
                >
                  <option value="" disabled>-- اختر المادة --</option>
                  {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">المعلم</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(Number(e.target.value))}
                >
                  <option value="" disabled>-- اختر المعلم --</option>
                  {teachers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">إلغاء</Button>
              <Button onClick={handleCreate} disabled={isCreating || !formTeacherId || !formSubjectId} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                حفظ الحصة
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Auto-generate confirm dialog ─────────────────────────── */}
        <Dialog open={confirmAutoGen} onOpenChange={setConfirmAutoGen}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 border-0 shadow-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-violet-600" /> التوليد التلقائي للجدول
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm font-semibold">⚠️ تنبيه</p>
                <p className="text-amber-700 text-sm mt-1">سيتم حذف الجدول الحالي وبناء جدول جديد تلقائياً بدون تعارضات بناءً على بيانات المعلمين والفصول والمواد.</p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>يوزّع المعلمين على الفصول بالتساوي</li>
                <li>يراعي نصاب كل معلم الأسبوعي</li>
                <li>يضمن عدم تضارب المعلم في نفس الوقت</li>
                <li>يطابق كل معلم مع مادة تخصصه</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmAutoGen(false)} className="rounded-xl">إلغاء</Button>
              <Button
                onClick={() => doAutoGenerate()}
                disabled={isGenerating}
                className="rounded-xl bg-gradient-to-l from-violet-600 to-blue-600 font-bold shadow-lg shadow-violet-500/20"
              >
                {isGenerating ? "جارٍ التوليد..." : "توليد الجدول الآن"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PageWrapper>
  );
}
