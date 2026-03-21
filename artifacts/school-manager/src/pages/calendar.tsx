import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, ChevronLeft, Trash2, CalendarDays, Palmtree, GraduationCap, Flag, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DAYS_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const HIJRI_MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الثاني", "جمادى الأولى", "جمادى الثانية", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];

const EVENT_TYPES = [
  { value: "holiday", label: "إجازة رسمية", icon: Palmtree, color: "#EF4444" },
  { value: "exam", label: "امتحانات", icon: GraduationCap, color: "#8B5CF6" },
  { value: "event", label: "فعالية", icon: Flag, color: "#1B4DB3" },
  { value: "important", label: "مهم", icon: Star, color: "#F59E0B" },
];

const SAUDI_HOLIDAYS = [
  { title: "اليوم الوطني السعودي", date: "2025-09-23", type: "holiday", color: "#EF4444" },
  { title: "يوم التأسيس", date: "2026-02-22", type: "holiday", color: "#EF4444" },
  { title: "إجازة منتصف الفصل الأول", date: "2025-10-25", endDate: "2025-10-31", type: "holiday", color: "#EF4444" },
  { title: "إجازة الفصل الأول", date: "2026-01-15", endDate: "2026-01-22", type: "holiday", color: "#EF4444" },
  { title: "إجازة الفصل الثاني (منتصف)", date: "2026-03-28", endDate: "2026-04-03", type: "holiday", color: "#EF4444" },
];

function getHijriDate(date: Date): string {
  try {
    return date.toLocaleDateString("ar-SA-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

interface SchoolEvent {
  id: number;
  schoolId?: number;
  title: string;
  date: string;
  endDate?: string | null;
  type: string;
  description?: string | null;
  color: string;
}

function getToken() {
  return localStorage.getItem("auth_token") || "";
}

export default function CalendarPage() {
  const { toast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editEvent, setEditEvent] = useState<SchoolEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    date: "",
    endDate: "",
    type: "event",
    description: "",
    color: "#1B4DB3",
  });

  useEffect(() => { loadEvents(); }, [year, month]);

  async function loadEvents() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/calendar?year=${year}&month=${month + 1}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await r.json();
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.title || !form.date) {
      toast({ title: "خطأ", description: "العنوان والتاريخ مطلوبان", variant: "destructive" });
      return;
    }
    const method = editEvent ? "PUT" : "POST";
    const url = editEvent ? `${BASE}/api/calendar/${editEvent.id}` : `${BASE}/api/calendar`;
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ...form, endDate: form.endDate || null }),
    });
    if (r.ok) {
      toast({ title: "تم الحفظ", description: editEvent ? "تم تعديل الحدث" : "تم إضافة الحدث" });
      setShowDialog(false);
      setEditEvent(null);
      setForm({ title: "", date: "", endDate: "", type: "event", description: "", color: "#1B4DB3" });
      loadEvents();
    } else {
      toast({ title: "خطأ", description: "فشل في حفظ الحدث", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    await fetch(`${BASE}/api/calendar/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    toast({ title: "تم الحذف" });
    loadEvents();
  }

  async function addSaudiHolidays() {
    let added = 0;
    for (const h of SAUDI_HOLIDAYS) {
      const r = await fetch(`${BASE}/api/calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...h, description: null }),
      });
      if (r.ok) added++;
    }
    toast({ title: "تم الاستيراد", description: `تم إضافة ${added} إجازة رسمية` });
    loadEvents();
  }

  function openAdd(dateStr?: string) {
    setEditEvent(null);
    setForm({ title: "", date: dateStr || "", endDate: "", type: "event", description: "", color: "#1B4DB3" });
    setShowDialog(true);
  }

  function openEdit(event: SchoolEvent) {
    setEditEvent(event);
    setForm({ title: event.title, date: event.date, endDate: event.endDate || "", type: event.type, description: event.description || "", color: event.color });
    setShowDialog(true);
  }

  function getEventsForDay(dateStr: string) {
    return events.filter(e => {
      if (e.date === dateStr) return true;
      if (e.endDate && e.date <= dateStr && e.endDate >= dateStr) return true;
      return false;
    });
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentHijri = getHijriDate(new Date(year, month, 1));

  const daysByType = Object.fromEntries(EVENT_TYPES.map(t => [t.value, events.filter(e => e.type === t.value).length]));

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-primary" />
              تقويم المدرسة
            </h1>
            <p className="text-muted-foreground text-sm mt-1">إجازات رسمية، امتحانات، وفعاليات المدرسة</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={addSaudiHolidays} className="rounded-xl gap-2">
              <Palmtree className="w-4 h-4 text-green-600" />
              إضافة الإجازات السعودية
            </Button>
            <Button size="sm" className="rounded-xl gap-2 shadow-lg shadow-primary/20" onClick={() => openAdd()}>
              <Plus className="w-4 h-4" />
              إضافة حدث
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EVENT_TYPES.map(t => (
            <div key={t.value} className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${t.color}20` }}>
                <t.icon className="w-5 h-5" style={{ color: t.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{daysByType[t.value] || 0}</p>
                <p className="text-xs text-muted-foreground">{t.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-3xl shadow-xl border border-border/50 overflow-hidden">

          {/* Month Nav */}
          <div className="p-5 border-b border-border/50 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0A2463, #1B4DB3)" }}>
            <button onClick={prevMonth} className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-black text-white">{MONTHS_AR[month]} {year}</h2>
              {currentHijri && <p className="text-xs text-white/60 mt-0.5">{currentHijri}</p>}
            </div>
            <button onClick={nextMonth} className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/50">
            {DAYS_AR.map(d => (
              <div key={d} className="py-3 text-center text-xs font-bold text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] border-b border-l border-border/30 p-1 bg-gray-50/50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = getEventsForDay(dateStr);
              const isToday = dateStr === todayStr;
              const dayOfWeek = (firstDay + i) % 7;
              const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

              return (
                <div
                  key={day}
                  onClick={() => openAdd(dateStr)}
                  className={`min-h-[90px] border-b border-l border-border/30 p-1.5 cursor-pointer hover:bg-primary/5 transition-colors group ${isWeekend ? "bg-slate-50/70" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${isToday ? "bg-primary text-white shadow-md" : "text-foreground group-hover:bg-primary/10"}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); openEdit(ev); }}
                        className="text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80 transition"
                        style={{ background: ev.color }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pr-1">+{dayEvents.length - 2} أخرى</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Events list for this month */}
        {events.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl border border-border/50 p-5">
            <h3 className="font-extrabold text-lg text-foreground mb-4">أحداث {MONTHS_AR[month]}</h3>
            <div className="space-y-2">
              {events.sort((a, b) => a.date.localeCompare(b.date)).map(ev => {
                const evType = EVENT_TYPES.find(t => t.value === ev.type);
                return (
                  <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-slate-50 group">
                    <div className="w-3 h-full min-h-[40px] rounded-full shrink-0" style={{ background: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.date}{ev.endDate && ev.endDate !== ev.date ? ` → ${ev.endDate}` : ""}
                        {evType && <span className="mr-2 font-medium" style={{ color: ev.color }}>{evType.label}</span>}
                      </p>
                      {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(ev)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-lg">
                        <CalendarDays className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-white rounded-3xl border border-border/50 shadow">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-semibold">لا يوجد أحداث في هذا الشهر</p>
            <p className="text-sm mt-1">اضغط على أي يوم لإضافة حدث، أو استورد الإجازات السعودية مباشرة</p>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) setEditEvent(null); }}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editEvent ? "تعديل حدث" : "إضافة حدث جديد"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-sm font-bold mb-1.5">العنوان *</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-input outline-none focus:ring-2 focus:ring-primary"
                  placeholder="مثال: إجازة اليوم الوطني"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1.5">تاريخ البداية *</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-input outline-none focus:ring-2 focus:ring-primary"
                    value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">تاريخ النهاية</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-input outline-none focus:ring-2 focus:ring-primary"
                    value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">النوع</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setForm(f => ({ ...f, type: t.value, color: t.color }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition ${form.type === t.value ? "border-current" : "border-border text-muted-foreground hover:border-current/40"}`}
                      style={{ color: form.type === t.value ? t.color : undefined, borderColor: form.type === t.value ? t.color : undefined }}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5">ملاحظات</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-input outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2} placeholder="وصف اختياري..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                {editEvent && (
                  <Button variant="outline" className="rounded-xl text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => { handleDelete(editEvent.id); setShowDialog(false); }}>
                    <Trash2 className="w-4 h-4 ml-1" /> حذف
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">إلغاء</Button>
                <Button onClick={handleSave} className="rounded-xl shadow-lg shadow-primary/20">حفظ الحدث</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PageWrapper>
  );
}
