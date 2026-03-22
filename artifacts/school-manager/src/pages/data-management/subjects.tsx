import { useState } from "react";
import { PageWrapper } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useGetSubjects, useCreateSubject, useDeleteSubject } from "@workspace/api-client-react";
import { Plus, Trash2, BookOpen, Layers, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const BASE = (import.meta.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

type SubjectFormData = {
  name: string;
  officialHoursPerWeek: number;
  pairedPeriods: number;
  isActivity: boolean;
};

const LEVEL_LABELS: Record<string, string> = {
  elementary: "ابتدائي",
  middle: "متوسط",
  high: "ثانوي",
};

function TemplateImportDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [level, setLevel] = useState("elementary");
  const [preview, setPreview] = useState<any[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const r = await fetch(`${BASE}/api/subjects/templates/${level}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
      });
      const data = await r.json();
      setPreview(data);
    } finally {
      setLoadingPreview(false);
    }
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const r = await fetch(`${BASE}/api/subjects/import-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        body: JSON.stringify({ level }),
      });
      const result = await r.json();
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      toast({ title: "تم الاستيراد", description: `تم إضافة ${result.imported} مادة من قالب ${LEVEL_LABELS[level]} ✓` });
      onClose();
    } catch {
      toast({ title: "خطأ", description: "فشل الاستيراد", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-gray-500">اختر المرحلة الدراسية لاستيراد قائمة المواد الرسمية وفق منهج وزارة التعليم السعودية.</p>

      <div className="flex gap-2">
        {Object.entries(LEVEL_LABELS).map(([val, label]) => (
          <label key={val} className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${level === val ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
            <input type="radio" value={val} checked={level === val} onChange={() => { setLevel(val); setPreview(null); }} className="hidden" />
            <span className="text-xl">{val === "elementary" ? "🏫" : val === "middle" ? "🏛️" : "🎓"}</span>
            <span className="text-sm font-bold">{label}</span>
          </label>
        ))}
      </div>

      {!preview && (
        <Button variant="outline" onClick={loadPreview} disabled={loadingPreview} className="w-full rounded-xl">
          {loadingPreview ? "جارٍ التحميل..." : "معاينة القائمة"}
        </Button>
      )}

      {preview && (
        <div className="bg-gray-50 rounded-xl p-3 max-h-52 overflow-y-auto space-y-1">
          {preview.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm px-2 py-1 bg-white rounded-lg">
              <span className="font-medium">{s.name}</span>
              <div className="flex gap-2 text-xs text-gray-400">
                <span>{s.officialHoursPerWeek} حصة/أسبوع</span>
                {s.pairedPeriods > 0 && <span className="bg-blue-100 text-blue-600 px-2 rounded-full">زوجي</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="outline" onClick={onClose} className="rounded-xl">إلغاء</Button>
        <Button onClick={doImport} disabled={importing} className="rounded-xl shadow-lg shadow-primary/20 px-8">
          <Download className="w-4 h-4 ml-1" />
          {importing ? "جارٍ الاستيراد..." : "استيراد"}
        </Button>
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  const { data: subjects } = useGetSubjects();
  const { mutate: createSubject, isPending: isCreating } = useCreateSubject();
  const { mutate: deleteSubject } = useDeleteSubject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<SubjectFormData>({
    defaultValues: { officialHoursPerWeek: 2, pairedPeriods: 0, isActivity: false }
  });

  const onSubmit = (data: SubjectFormData) => {
    createSubject({ data: { name: data.name, officialHoursPerWeek: Number(data.officialHoursPerWeek), pairedPeriods: Number(data.pairedPeriods), isActivity: data.isActivity } as any }, {
      onSuccess: () => {
        setIsOpen(false);
        reset();
        queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
        toast({ title: "تم", description: "تم إضافة المادة بنجاح ✓" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("تأكيد حذف المادة؟")) {
      deleteSubject({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/subjects'] })
      });
    }
  };

  const activitySubjects = subjects?.filter((s: any) => s.isActivity) ?? [];
  const regularSubjects = subjects?.filter((s: any) => !s.isActivity) ?? [];

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">المواد الدراسية</h1>
            <p className="text-muted-foreground text-sm mt-1">قائمة المناهج المعتمدة — {subjects?.length ?? 0} مادة</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsTemplateOpen(true)} className="rounded-xl">
              <Layers className="w-4 h-4 ml-1" /> قوالب سعودية
            </Button>
            <Button onClick={() => setIsOpen(true)} className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 ml-1" /> إضافة مادة
            </Button>
          </div>
        </div>

        {activitySubjects.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-muted-foreground mb-3 px-1">الأنشطة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {activitySubjects.map((s: any) => (
                <Card key={s.id} className="p-4 rounded-2xl border-none shadow-md shadow-black/5 flex justify-between items-center bg-amber-50 hover:bg-amber-100 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⭐</span>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{s.name}</h3>
                      <p className="text-xs text-amber-600">نشاط</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          {activitySubjects.length > 0 && <h3 className="text-sm font-bold text-muted-foreground mb-3 px-1">المواد الأكاديمية</h3>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {regularSubjects.map((s: any) => (
              <Card key={s.id} className="p-5 rounded-2xl border-none shadow-md shadow-black/5 bg-white hover:bg-slate-50 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{s.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                          {s.officialHoursPerWeek ?? 1} حصة/أسبوع
                        </span>
                        {(s.pairedPeriods ?? 0) > 0 && (
                          <Badge className="bg-blue-100 text-blue-600 text-xs px-2">زوجي</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="text-rose-400 hover:text-rose-600 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {(!subjects || subjects.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا يوجد مواد مسجلة</p>
            <p className="text-sm mt-1">ابدأ بإضافة مادة أو استخدم قوالب التعليم السعودي</p>
          </div>
        )}

        {/* Add Subject Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">إضافة مادة جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div>
                <label className="block text-sm font-bold mb-2">اسم المادة *</label>
                <input {...register("name", { required: true })}
                  className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                  placeholder="مثال: الرياضيات" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-2">الحصص الرسمية/أسبوع</label>
                  <input type="number" min={1} max={20} {...register("officialHoursPerWeek")}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">حصص مزدوجة</label>
                  <input type="number" min={0} max={10} {...register("pairedPeriods")}
                    className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none" />
                  <p className="text-xs text-gray-400 mt-1">عدد الحصص المعمل/الزوجية</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" {...register("isActivity")} className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm font-medium">مادة نشاط (ليس أكاديمية)</span>
              </label>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">إلغاء</Button>
                <Button type="submit" disabled={isCreating} className="rounded-xl shadow-lg shadow-primary/20 px-8">حفظ</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Saudi Template Import Dialog */}
        <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Layers className="w-5 h-5 text-primary" /> استيراد قوالب التعليم السعودي
              </DialogTitle>
            </DialogHeader>
            <TemplateImportDialog onClose={() => setIsTemplateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}
