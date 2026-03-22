import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, ClipboardList, Users } from "lucide-react";

const BASE = (import.meta.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

async function fetchJSON(url: string) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

async function postJSON(url: string, body: any) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function putJSON(url: string, body: any) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function deleteReq(url: string) {
  const token = localStorage.getItem("auth_token");
  await fetch(`${BASE}${url}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low:    { label: "منخفضة", color: "bg-slate-100 text-slate-600" },
  medium: { label: "متوسطة", color: "bg-yellow-100 text-yellow-700" },
  high:   { label: "عالية", color: "bg-red-100 text-red-700" },
};

const STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
  pending:     { label: "قيد الانتظار", icon: Clock, color: "text-yellow-600" },
  in_progress: { label: "جارٍ التنفيذ", icon: AlertCircle, color: "text-blue-700" },
  done:        { label: "مكتملة", icon: CheckCircle2, color: "text-teal-600" },
};

export default function TasksPage() {
  const { user } = useAuth();
  const isProfessional = (user?.subscription?.plan === "professional" || user?.subscription?.plan === "madrass") && user?.subscription?.isActive;

  if (!isProfessional) {
    return <UpgradePrompt title="إدارة المهام" description="أرسل مهام وتذكيرات للمعلمين بسهولة" />;
  }
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => fetchJSON(`${BASE}/api/tasks`) });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: () => fetchJSON(`${BASE}/api/teachers`) });

  const [isOpen, setIsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({ title: "", description: "", teacherId: "" as any, dueDate: "", priority: "medium" });

  const createMutation = useMutation({
    mutationFn: (body: any) => postJSON(`${BASE}/api/tasks`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "تم", description: "تمت إضافة المهمة بنجاح" });
      setIsOpen(false);
      setForm({ title: "", description: "", teacherId: "", dueDate: "", priority: "medium" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      putJSON(`${BASE}/api/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteReq(`${BASE}/api/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "تم", description: "تم حذف المهمة" });
    },
  });

  const tasksArr = Array.isArray(tasks) ? tasks : [];
  const teachersArr = Array.isArray(teachers) ? teachers : [];

  const filtered = tasksArr.filter((t: any) => filterStatus === "all" || t.status === filterStatus);

  const stats = {
    total: tasksArr.length,
    pending: tasksArr.filter((t: any) => t.status === "pending").length,
    in_progress: tasksArr.filter((t: any) => t.status === "in_progress").length,
    done: tasksArr.filter((t: any) => t.status === "done").length,
  };

  const onSubmit = () => {
    if (!form.title.trim()) return;
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      teacherId: form.teacherId ? Number(form.teacherId) : undefined,
      dueDate: form.dueDate || undefined,
      priority: form.priority,
      status: "pending",
    });
  };

  const nextStatus = (cur: string) => cur === "pending" ? "in_progress" : cur === "in_progress" ? "done" : "pending";

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground">مهام المعلمين</h1>
            <p className="text-muted-foreground text-sm mt-1">إدارة وتوزيع المهام الإدارية والتعليمية</p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="rounded-xl font-bold shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 ml-1" /> مهمة جديدة
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "إجمالي المهام", value: stats.total, color: "bg-blue-50 text-blue-700" },
            { label: "قيد الانتظار", value: stats.pending, color: "bg-yellow-50 text-yellow-700" },
            { label: "جارٍ التنفيذ", value: stats.in_progress, color: "bg-blue-50 text-blue-600" },
            { label: "مكتملة", value: stats.done, color: "bg-green-50 text-green-700" },
          ].map(s => (
            <Card key={s.label} className="p-4 border-border/50 text-center shadow-sm">
              <div className={`text-3xl font-black ${s.color.split(" ")[1]} mb-1`}>{s.value}</div>
              <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "الكل" },
            { key: "pending", label: "قيد الانتظار" },
            { key: "in_progress", label: "جارٍ التنفيذ" },
            { key: "done", label: "مكتملة" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${filterStatus === f.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="p-16 text-center border-dashed border-border">
              <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-semibold">لا توجد مهام {filterStatus !== "all" ? "في هذا التصنيف" : ""}</p>
              <p className="text-sm text-muted-foreground/60 mt-1">أضف مهمة جديدة بالضغط على الزر أعلاه</p>
            </Card>
          ) : filtered.map((task: any) => {
            const status = STATUS_MAP[task.status] || STATUS_MAP.pending;
            const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
            const StatusIcon = status.icon;
            return (
              <Card key={task.id} className="p-4 border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => updateStatus.mutate({ id: task.id, status: nextStatus(task.status) })}
                    className={`mt-0.5 shrink-0 ${status.color} hover:scale-110 transition-transform`}
                    title="تغيير الحالة"
                  >
                    <StatusIcon className="w-6 h-6" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-bold text-foreground ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </h3>
                      <Badge className={`text-[10px] ${priority.color} hover:${priority.color} border-0`}>{priority.label}</Badge>
                    </div>
                    {task.description && <p className="text-sm text-muted-foreground mb-2">{task.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {task.teacherName && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {task.teacherName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(task.id)}
                    className="shrink-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add task dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 border-0 shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">إضافة مهمة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="block text-sm font-bold mb-1.5">عنوان المهمة *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                placeholder="مثال: مراجعة خطة الدرس"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5">الوصف</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none resize-none"
                placeholder="تفاصيل إضافية..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1.5">المعلم المسؤول</label>
                <select
                  value={form.teacherId}
                  onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-sm"
                >
                  <option value="">-- بدون تحديد --</option>
                  {teachersArr.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5">الأولوية</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-sm"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5">تاريخ الاستحقاق</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button
              onClick={onSubmit}
              disabled={!form.title.trim() || createMutation.isPending}
              className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20"
            >
              حفظ المهمة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
