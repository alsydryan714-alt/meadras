import { useState, useRef, useEffect } from "react";
import { PageWrapper } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useGetTeachers, useCreateTeacher, useDeleteTeacher, useUpdateTeacher } from "@workspace/api-client-react";
import { Plus, Trash2, UserCog, Copy, MessageSquare, QrCode, Lock, Grid3x3, Share2, Calendar, CheckSquare, Pencil, ClipboardList, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

const BASE = (import.meta.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

type TeacherFormData = {
  name: string;
  shortName: string;
  subject: string;
  maxWeeklyHours: number;
  phone?: string;
  isSeconded: boolean;
  hideFromPrint: boolean;
};

function getScheduleUrl(token: string) {
  return `${window.location.origin}${BASE}/schedule/${token}`;
}

function BlockingGrid({ teacher, onClose }: { teacher: any; onClose: () => void }) {
  const { toast } = useToast();
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const periods = [1, 2, 3, 4, 5, 6, 7];

  useState(() => {
    fetch(`${BASE}/api/teachers/${teacher.id}/blocked-periods`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
    }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setBlocked(new Set(data.map((b: any) => `${b.dayOfWeek}-${b.period}`)));
      setLoading(false);
    });
  });

  const toggle = async (day: number, period: number) => {
    const key = `${day}-${period}`;
    const isBlocked = blocked.has(key);
    if (isBlocked) {
      await fetch(`${BASE}/api/teachers/${teacher.id}/blocked-periods`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        body: JSON.stringify({ dayOfWeek: day, period }),
      });
      setBlocked(b => { const n = new Set(b); n.delete(key); return n; });
    } else {
      await fetch(`${BASE}/api/teachers/${teacher.id}/blocked-periods`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        body: JSON.stringify({ dayOfWeek: day, period }),
      });
      setBlocked(b => new Set(b).add(key));
    }
    toast({ title: isBlocked ? "تم فتح الحصة" : "تم إغلاق الحصة" });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">انقر على الخلية لإغلاق/فتح الحصة — الخلايا المظللة تعني أن المعلم غير متاح</p>
      {loading ? <div className="text-center py-4 text-gray-400">جارٍ التحميل...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="py-2 px-2 font-bold text-gray-500">الحصة</th>
                {DAYS.map(d => <th key={d} className="py-2 px-2 font-bold text-primary">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p}>
                  <td className="py-1 px-2 bg-gray-50 rounded-lg font-bold text-gray-500">{p}</td>
                  {DAYS.map((_, dayIdx) => {
                    const key = `${dayIdx}-${p}`;
                    const isBlocked = blocked.has(key);
                    return (
                      <td key={dayIdx} className="py-1">
                        <button onClick={() => toggle(dayIdx, p)}
                          className={`w-full h-9 rounded-lg transition-all text-xs font-bold border-2 ${isBlocked ? "bg-rose-100 border-rose-300 text-rose-600" : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"}`}>
                          {isBlocked ? "🔒" : "✓"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={onClose} className="rounded-xl">حفظ وإغلاق</Button>
      </div>
    </div>
  );
}

function QRDialog({ teacher, onClose }: { teacher: any; onClose: () => void }) {
  const url = teacher.shareToken ? getScheduleUrl(teacher.shareToken) : "";
  const { toast } = useToast();
  return (
    <div className="text-center space-y-4">
      <p className="text-sm text-gray-500">رمز QR خاص بجدول <strong>{teacher.name}</strong></p>
      <div className="flex justify-center">
        <div className="p-4 bg-white rounded-2xl shadow-md border border-border inline-block">
          <QRCodeSVG value={url} size={200} level="H" />
        </div>
      </div>
      <p className="text-xs text-gray-400 break-all">{url}</p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast({ title: "تم النسخ" }); }} className="rounded-xl">
          <Copy className="w-4 h-4 ml-1" /> نسخ الرابط
        </Button>
        <Button onClick={onClose} className="rounded-xl">إغلاق</Button>
      </div>
    </div>
  );
}

function ShareDialog({ teacher, onClose }: { teacher: any; onClose: () => void }) {
  const { toast } = useToast();
  const scheduleUrl = teacher.shareToken ? getScheduleUrl(teacher.shareToken) : "";
  
  const shareSchedule = () => {
    if (!scheduleUrl) return;
    const msg = `جدول ${teacher.name}\n\n${scheduleUrl}`;
    navigator.clipboard.writeText(msg);
    toast({ title: "تم النسخ", description: "تم نسخ الجدول وجاهز للمشاركة ✓" });
    setTimeout(() => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank"), 500);
  };

  const shareTasks = () => {
    const msg = `مهام ${teacher.name}\n\nسيتم تحديثك بأحدث المهام والمسؤوليات`;
    navigator.clipboard.writeText(msg);
    toast({ title: "تم النسخ", description: "تم نسخ رسالة المهام وجاهزة للمشاركة ✓" });
    setTimeout(() => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank"), 500);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 font-medium mb-4">اختر طريقة المشاركة مع <strong>{teacher.name}</strong></p>
      
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={shareSchedule}
          className="flex items-center gap-3 p-4 rounded-2xl border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-300 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-right">
            <h4 className="font-bold text-gray-900">مشاركة الجدول الدراسي</h4>
            <p className="text-xs text-gray-500">أرسل رابط الجدول عبر واتساب</p>
          </div>
        </button>

        <button
          onClick={shareTasks}
          className="flex items-center gap-3 p-4 rounded-2xl border-2 border-teal-100 hover:bg-teal-50 hover:border-teal-300 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-right">
            <h4 className="font-bold text-gray-900">مشاركة المهام</h4>
            <p className="text-xs text-gray-500">أرسل المهام عبر واتساب</p>
          </div>
        </button>
      </div>

      <div className="pt-3 flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose} className="rounded-xl">إغلاق</Button>
      </div>
    </div>
  );
}

function TeacherActionsMenu({ teacher, position, onClose, onAction }: {
  teacher: any;
  position: { top: number; right: number };
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const actions = [
    { key: "edit", icon: Pencil, label: "تعديل بيانات المعلم", desc: "تعديل الاسم والتخصص والنصاب والجوال", color: "text-blue-600", bg: "bg-blue-50", hoverBg: "hover:bg-blue-50" },
    { key: "schedule", icon: Calendar, label: "عرض الجدول الدراسي", desc: "فتح رابط جدول المعلم ومشاركته", color: "text-indigo-600", bg: "bg-indigo-50", hoverBg: "hover:bg-indigo-50" },
    { key: "blocking", icon: Grid3x3, label: "إدارة الحصص المتاحة", desc: "إغلاق أو فتح حصص معينة للمعلم", color: "text-rose-600", bg: "bg-rose-50", hoverBg: "hover:bg-rose-50" },
    { key: "tasks", icon: ClipboardList, label: "المهام والمسؤوليات", desc: "عرض وإدارة مهام المعلم", color: "text-teal-600", bg: "bg-teal-50", hoverBg: "hover:bg-teal-50" },
    { key: "whatsapp", icon: MessageSquare, label: "إرسال واتساب", desc: "إرسال رسالة واتساب مباشرة للمعلم", color: "text-green-600", bg: "bg-green-50", hoverBg: "hover:bg-green-50" },
    { key: "share", icon: Share2, label: "مشاركة مع المعلم", desc: "مشاركة الجدول أو المهام عبر واتساب", color: "text-purple-600", bg: "bg-purple-50", hoverBg: "hover:bg-purple-50" },
    { key: "qr", icon: QrCode, label: "رمز QR للجدول", desc: "عرض رمز QR لمسحه بالجوال", color: "text-violet-600", bg: "bg-violet-50", hoverBg: "hover:bg-violet-50" },
    { key: "copy", icon: Copy, label: "نسخ رابط الجدول", desc: "نسخ رابط الجدول للمشاركة", color: "text-sky-600", bg: "bg-sky-50", hoverBg: "hover:bg-sky-50" },
    { key: "delete", icon: Trash2, label: "حذف المعلم", desc: "حذف المعلم نهائياً من النظام", color: "text-red-600", bg: "bg-red-50", hoverBg: "hover:bg-red-50" },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-2xl shadow-2xl shadow-black/15 border border-slate-200 py-2 w-72 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ top: position.top, left: Math.min(position.right, window.innerWidth - 300), maxHeight: "80vh", overflowY: "auto" }}
    >
      <div className="px-4 py-2 border-b border-slate-100 mb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <UserCog className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">{teacher.name}</p>
              <p className="text-xs text-slate-500">{teacher.subject}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {actions.map((action, i) => (
        <button
          key={action.key}
          onClick={() => { onAction(action.key); onClose(); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${action.hoverBg} ${i === actions.length - 1 ? "border-t border-slate-100 mt-1" : ""}`}
        >
          <div className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
            <action.icon className={`w-4 h-4 ${action.color}`} />
          </div>
          <div className="min-w-0">
            <p className={`font-bold text-sm ${action.key === "delete" ? "text-red-600" : "text-slate-800"}`}>{action.label}</p>
            <p className="text-xs text-slate-400 leading-tight">{action.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function TeachersPage() {
  const { data: teachers } = useGetTeachers();
  const { mutate: createTeacher, isPending: isCreating } = useCreateTeacher();
  const { mutate: deleteTeacher } = useDeleteTeacher();
  const updateTeacherMutation = useUpdateTeacher();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [blockingTeacher, setBlockingTeacher] = useState<any>(null);
  const [qrTeacher, setQrTeacher] = useState<any>(null);
  const [shareTeacher, setShareTeacher] = useState<any>(null);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [actionsMenu, setActionsMenu] = useState<{ teacher: any; position: { top: number; right: number } } | null>(null);

  const { register, handleSubmit, reset } = useForm<TeacherFormData>({
    defaultValues: { maxWeeklyHours: 24, isSeconded: false, hideFromPrint: false }
  });

  const editForm = useForm<TeacherFormData>();

  const onSubmit = (data: TeacherFormData) => {
    createTeacher({ data: { name: data.name, subject: data.subject, maxWeeklyHours: Number(data.maxWeeklyHours), phone: data.phone, shortName: data.shortName, isSeconded: data.isSeconded, hideFromPrint: data.hideFromPrint } as any }, {
      onSuccess: () => {
        setIsOpen(false);
        reset();
        queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
        toast({ title: "تم", description: "تم إضافة المعلم بنجاح ✓" });
      }
    });
  };

  const onEditSubmit = (data: TeacherFormData) => {
    if (!editTeacher) return;
    updateTeacherMutation.mutate({ id: editTeacher.id, data: { name: data.name, subject: data.subject, maxWeeklyHours: Number(data.maxWeeklyHours), phone: data.phone, shortName: data.shortName, isSeconded: data.isSeconded, hideFromPrint: data.hideFromPrint } as any }, {
      onSuccess: () => {
        setEditTeacher(null);
        queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
        toast({ title: "تم", description: "تم تحديث بيانات المعلم ✓" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("تأكيد حذف المعلم؟")) {
      deleteTeacher({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
          toast({ title: "تم", description: "تم الحذف بنجاح" });
        }
      });
    }
  };

  const openWhatsApp = (teacher: any) => {
    const url = teacher.shareToken ? getScheduleUrl(teacher.shareToken) : null;
    if (!url) return;
    const msg = `السلام عليكم ${teacher.name}، يمكنك متابعة جدولك الدراسي عبر الرابط:\n${url}`;
    const phone = teacher.phone ? teacher.phone.replace(/\D/g, "") : "";
    const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(wa, "_blank");
  };

  const copyLink = (teacher: any) => {
    const url = teacher.shareToken ? getScheduleUrl(teacher.shareToken) : null;
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => toast({ title: "تم النسخ", description: "تم نسخ رابط الجدول ✓" }));
  };

  const handleTeacherNameClick = (teacher: any, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActionsMenu({
      teacher,
      position: { top: rect.bottom + 8, right: rect.left }
    });
  };

  const handleAction = (action: string, teacher: any) => {
    switch (action) {
      case "edit":
        setEditTeacher(teacher);
        editForm.reset({
          name: teacher.name,
          shortName: (teacher as any).shortName || "",
          subject: teacher.subject,
          maxWeeklyHours: teacher.maxWeeklyHours,
          phone: teacher.phone || "",
          isSeconded: (teacher as any).isSeconded || false,
          hideFromPrint: (teacher as any).hideFromPrint || false,
        });
        break;
      case "schedule":
        if (teacher.shareToken) {
          window.open(getScheduleUrl(teacher.shareToken), "_blank");
        } else {
          toast({ title: "لا يوجد جدول", description: "لم يتم إنشاء جدول لهذا المعلم بعد", variant: "destructive" });
        }
        break;
      case "blocking":
        setBlockingTeacher(teacher);
        break;
      case "tasks":
        window.location.href = `${BASE}/tasks`;
        break;
      case "whatsapp":
        openWhatsApp(teacher);
        break;
      case "share":
        setShareTeacher(teacher);
        break;
      case "qr":
        setQrTeacher(teacher);
        break;
      case "copy":
        copyLink(teacher);
        break;
      case "delete":
        handleDelete(teacher.id);
        break;
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-5 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground">بيانات المعلمين</h1>
            <p className="text-muted-foreground text-sm mt-1">إدارة قائمة المعلمين — {teachers?.length ?? 0} معلم</p>
          </div>
          <Button onClick={() => setIsOpen(true)} size="sm" className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 ml-1" /> <span className="hidden sm:inline">إضافة</span> معلم
          </Button>
        </div>

        <Card className="border-none shadow-xl shadow-black/5 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-4 font-bold text-slate-600 text-sm">المعلم</th>
                  <th className="px-4 py-4 font-bold text-slate-600 text-sm hidden sm:table-cell">الاسم المختصر</th>
                  <th className="px-4 py-4 font-bold text-slate-600 text-sm">التخصص</th>
                  <th className="px-4 py-4 font-bold text-slate-600 text-sm hidden md:table-cell">النصاب</th>
                  <th className="px-4 py-4 font-bold text-slate-600 text-sm hidden md:table-cell">الحالة</th>
                  <th className="px-4 py-4 font-bold text-slate-600 text-sm hidden lg:table-cell">انتظار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {teachers?.map(teacher => (
                  <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <button
                        onClick={(e) => handleTeacherNameClick(teacher, e)}
                        className="flex items-center gap-3 group cursor-pointer text-right"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                          <UserCog className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">{teacher.name}</span>
                          <p className="text-xs text-slate-400 sm:hidden">{teacher.subject}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground text-sm hidden sm:table-cell">{(teacher as any).shortName || "—"}</td>
                    <td className="px-4 py-4 text-muted-foreground hidden sm:table-cell">{teacher.subject}</td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-bold">
                        {teacher.maxWeeklyHours} حصة
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {(teacher as any).isSeconded && <Badge className="bg-amber-100 text-amber-700 text-xs">منتدب</Badge>}
                        {(teacher as any).hideFromPrint && <Badge className="bg-gray-100 text-gray-500 text-xs">مخفي</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold text-primary hidden lg:table-cell">{(teacher as any).weeklySubstitutionCount ?? 0}</td>
                  </tr>
                ))}
                {(!teachers || teachers.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">لا يوجد معلمون مسجلون</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-blue-700 font-medium">💡 اضغط على اسم أي معلم لعرض جميع الأدوات المتاحة (تعديل، جدول، واتساب، مهام، وغيرها)</p>
        </div>

        {actionsMenu && (
          <TeacherActionsMenu
            teacher={actionsMenu.teacher}
            position={actionsMenu.position}
            onClose={() => setActionsMenu(null)}
            onAction={(action) => handleAction(action, actionsMenu.teacher)}
          />
        )}

        {/* Add Teacher Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">إضافة معلم جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-2">الاسم الرباعي *</label>
                  <input {...register("name", { required: true })}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                    placeholder="أحمد محمد عبدالله" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">الاسم المختصر</label>
                  <input {...register("shortName")}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                    placeholder="أ. أحمد" />
                  <p className="text-xs text-gray-400 mt-1">للطباعة في الجداول الضيقة</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-2">التخصص *</label>
                  <input {...register("subject", { required: true })}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                    placeholder="رياضيات" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">النصاب الأسبوعي</label>
                  <input type="number" defaultValue={24} {...register("maxWeeklyHours", { required: true })}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">رقم الجوال (واتساب)</label>
                <input {...register("phone")}
                  className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                  placeholder="966XXXXXXXX (مع رمز الدولة)" dir="ltr" />
              </div>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("isSeconded")} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm font-medium">معلم منتدب</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("hideFromPrint")} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm font-medium">إخفاء من الطباعة</span>
                </label>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">إلغاء</Button>
                <Button type="submit" disabled={isCreating} className="rounded-xl shadow-lg shadow-primary/20 px-8">حفظ</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Teacher Dialog */}
        <Dialog open={!!editTeacher} onOpenChange={() => setEditTeacher(null)}>
          <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                تعديل بيانات المعلم
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-2">الاسم الرباعي *</label>
                  <input {...editForm.register("name", { required: true })}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                    placeholder="أحمد محمد عبدالله" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">الاسم المختصر</label>
                  <input {...editForm.register("shortName")}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                    placeholder="أ. أحمد" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-2">التخصص *</label>
                  <input {...editForm.register("subject", { required: true })}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                    placeholder="رياضيات" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">النصاب الأسبوعي</label>
                  <input type="number" {...editForm.register("maxWeeklyHours", { required: true })}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">رقم الجوال (واتساب)</label>
                <input {...editForm.register("phone")}
                  className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                  placeholder="966XXXXXXXX (مع رمز الدولة)" dir="ltr" />
              </div>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...editForm.register("isSeconded")} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm font-medium">معلم منتدب</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...editForm.register("hideFromPrint")} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm font-medium">إخفاء من الطباعة</span>
                </label>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditTeacher(null)} className="rounded-xl">إلغاء</Button>
                <Button type="submit" disabled={updateTeacherMutation.isPending} className="rounded-xl shadow-lg shadow-primary/20 px-8">
                  {updateTeacherMutation.isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Blocking Grid Dialog */}
        <Dialog open={!!blockingTeacher} onOpenChange={() => setBlockingTeacher(null)}>
          <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-500" />
                إغلاق حصص — {blockingTeacher?.name}
              </DialogTitle>
            </DialogHeader>
            {blockingTeacher && <BlockingGrid teacher={blockingTeacher} onClose={() => setBlockingTeacher(null)} />}
          </DialogContent>
        </Dialog>

        {/* QR Dialog */}
        <Dialog open={!!qrTeacher} onOpenChange={() => setQrTeacher(null)}>
          <DialogContent className="sm:max-w-sm bg-white rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" /> رمز QR للمعلم
              </DialogTitle>
            </DialogHeader>
            {qrTeacher && <QRDialog teacher={qrTeacher} onClose={() => setQrTeacher(null)} />}
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={!!shareTeacher} onOpenChange={() => setShareTeacher(null)}>
          <DialogContent className="sm:max-w-sm bg-white rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-teal-600" /> مشاركة مع المعلم
              </DialogTitle>
            </DialogHeader>
            {shareTeacher && <ShareDialog teacher={shareTeacher} onClose={() => setShareTeacher(null)} />}
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}
