import { useState } from "react";
import { PageWrapper } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useGetTeachers,
  useGetClasses,
  useGenerateExamCommittee,
  useSaveExamCommittee,
  useGetExamCommittees,
} from "@workspace/api-client-react";
import { Settings2, Save, Printer, Users, ClipboardList, FileDown, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { exportElementToPDF, openWhatsAppNoPhone } from "@/utils/pdf-export";

export default function ExamsPage() {
  const { data: teachers } = useGetTeachers();
  const { data: classes } = useGetClasses();
  const { mutate: generate, isPending: isGenerating } = useGenerateExamCommittee();
  const { mutate: save, isPending: isSaving } = useSaveExamCommittee();
  const { data: savedCommittees } = useGetExamCommittees();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [examName, setExamName] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState<number | "">("");
  const [proctorsPerRoom, setProctorsPerRoom] = useState<number | "">(2);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<{ id: number; label: string }[]>([]);
  const [useClassMode, setUseClassMode] = useState(true);

  const [currentResult, setCurrentResult] = useState<any[] | null>(null);

  const toggleTeacher = (id: number) =>
    setSelectedTeachers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleClass = (cls: { id: number; grade: string; section: string }) => {
    const label = `${cls.grade} - ${cls.section}`;
    setSelectedClasses(prev =>
      prev.some(c => c.id === cls.id)
        ? prev.filter(c => c.id !== cls.id)
        : [...prev, { id: cls.id, label }]
    );
  };

  const selectAllTeachers = () => teachers && setSelectedTeachers(teachers.map(t => t.id));
  const selectAllClasses = () =>
    classes && setSelectedClasses(classes.map(c => ({ id: c.id, label: `${c.grade} - ${c.section}` })));

  const effectiveRooms = useClassMode ? selectedClasses.length : Number(numberOfRooms);

  const handleGenerate = () => {
    if (!examName) {
      toast({ title: "خطأ", description: "الرجاء إدخال اسم الاختبار", variant: "destructive" }); return;
    }
    if (useClassMode && selectedClasses.length === 0) {
      toast({ title: "خطأ", description: "الرجاء اختيار فصل واحد على الأقل", variant: "destructive" }); return;
    }
    if (!useClassMode && !numberOfRooms) {
      toast({ title: "خطأ", description: "الرجاء إدخال عدد اللجان", variant: "destructive" }); return;
    }
    if (!proctorsPerRoom) {
      toast({ title: "خطأ", description: "الرجاء إدخال عدد الملاحظين", variant: "destructive" }); return;
    }
    if (selectedTeachers.length < effectiveRooms * Number(proctorsPerRoom)) {
      toast({ title: "تنبيه", description: "عدد المعلمين المختارين لا يكفي لتغطية جميع اللجان", variant: "destructive" }); return;
    }

    // Snapshot class labels NOW (before async generate)
    const classLabelSnapshot = [...selectedClasses];

    generate({
      data: {
        examName,
        numberOfRooms: effectiveRooms,
        proctorsPerRoom: Number(proctorsPerRoom),
        teacherIds: selectedTeachers,
      }
    }, {
      onSuccess: (data: any[]) => {
        const enriched = data.map((room, i) => {
          const label = useClassMode && classLabelSnapshot[i]
            ? classLabelSnapshot[i].label
            : null;
          return { ...room, ...(label ? { className: label } : {}) };
        });
        setCurrentResult(enriched);
        toast({ title: "تم التوليد", description: "تم توليد اللجان بنجاح، يرجى الحفظ لاعتمادها" });
      }
    });
  };

  const handleSave = () => {
    if (!currentResult) return;
    save({
      data: { examName, assignments: currentResult }
    }, {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم حفظ تشكيل اللجان بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['/api/exam-committees'] });
        setCurrentResult(null);
        setExamName("");
        setSelectedClasses([]);
      }
    });
  };

  const handleWhatsApp = () => {
    if (!currentResult || !currentResult.length) return;
    let text = `📋 *لجان الملاحظة — ${examName}*\n\n`;
    currentResult.forEach(room => {
      const label = room.className || `لجنة (${room.roomNumber})`;
      text += `🏫 *${label}*\n`;
      room.teachers.forEach((t: any, i: number) => { text += `  ${i + 1}. ${t.name}\n`; });
      text += "\n";
    });
    text += `_مدعوم بنظام مدراس للإدارة المدرسية_`;
    openWhatsAppNoPhone(text);
  };

  return (
    <PageWrapper printTitle={examName ? `لجان الملاحظة — ${examName}` : "لجان الملاحظة"}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-3 no-print">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground">لجان الاختبار</h1>
            <p className="text-muted-foreground text-sm mt-1">توزيع المعلمين على قاعات الاختبار بشكل عادل وعشوائي</p>
          </div>
          {currentResult && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => exportElementToPDF("exam-result", `لجان-${examName}.pdf`, `لجان الملاحظة — ${examName}`)} className="gap-2 border-red-200 text-red-700 hover:bg-red-50 rounded-xl">
                <FileDown className="w-4 h-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white border-transparent rounded-xl">
                <Share2 className="w-4 h-4" /> واتساب
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 rounded-xl">
                <Printer className="w-4 h-4" /> طباعة
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 rounded-xl">
                <Save className="w-4 h-4" /> حفظ اللجان
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Form column */}
          <div className="lg:col-span-1 space-y-5 no-print">
            <Card className="shadow-lg border-border/50">
              <CardContent className="p-5 space-y-5">

                {/* Exam name */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">اسم الاختبار / الفترة *</label>
                  <input
                    type="text"
                    placeholder="مثال: اختبار منتصف الفصل الأول"
                    value={examName}
                    onChange={e => setExamName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                {/* Mode toggle */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">طريقة تحديد اللجان</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setUseClassMode(true)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition ${useClassMode ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >
                      ربط بالفصول
                    </button>
                    <button
                      onClick={() => setUseClassMode(false)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition ${!useClassMode ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >
                      عدد اللجان
                    </button>
                  </div>
                </div>

                {/* Class selector OR manual room count */}
                {useClassMode ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-foreground">الفصول الداخلة في الاختبار</label>
                      <button onClick={selectAllClasses} className="text-xs text-primary font-bold hover:underline">تحديد الكل</button>
                    </div>
                    <div className="h-48 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {classes?.length ? classes.map(cls => (
                        <label key={cls.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={selectedClasses.some(c => c.id === cls.id)}
                            onChange={() => toggleClass(cls as any)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-semibold text-slate-700">{cls.grade} - {cls.section}</span>
                        </label>
                      )) : (
                        <p className="text-xs text-center text-muted-foreground py-4">لا يوجد فصول مضافة بعد</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {selectedClasses.length > 0 ? `${selectedClasses.length} فصل = ${selectedClasses.length} لجنة` : "اختر الفصول"}
                    </p>
                    {selectedClasses.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedClasses.map(c => (
                          <span key={c.id} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{c.label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">عدد اللجان (القاعات)</label>
                    <input
                      type="number" min="1"
                      value={numberOfRooms}
                      onChange={e => setNumberOfRooms(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                )}

                {/* Proctors per room */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">الملاحظون لكل لجنة</label>
                  <input
                    type="number" min="1"
                    value={proctorsPerRoom}
                    onChange={e => setProctorsPerRoom(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                {/* Teachers selector */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-foreground">المعلمون المتاحون للملاحظة</label>
                    <button onClick={selectAllTeachers} className="text-xs text-primary font-bold hover:underline">تحديد الكل</button>
                  </div>
                  <div className="h-52 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {teachers?.map(teacher => (
                      <label key={teacher.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.id)}
                          onChange={() => toggleTeacher(teacher.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-semibold text-slate-700">{teacher.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    تم تحديد: {selectedTeachers.length} معلم
                    {effectiveRooms > 0 && ` (المطلوب: ${effectiveRooms * Number(proctorsPerRoom || 0)})`}
                  </p>
                </div>

                <Button
                  className="w-full py-5 rounded-xl text-base font-bold shadow-xl shadow-primary/20"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <Settings2 className="w-5 h-5 ml-2" />
                  {isGenerating ? "جارٍ التوليد..." : "توليد التوزيع آلياً"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results column */}
          <div className="lg:col-span-2">
            {currentResult ? (
              <div id="exam-result" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentResult.map((room, idx) => {
                  const label = room.className || `لجنة (${room.roomNumber})`;
                  return (
                    <Card key={room.roomNumber} className="border-t-4 border-t-primary shadow-md print-break-inside-avoid">
                      <div className="bg-slate-50 p-4 border-b">
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          {label}
                        </h3>
                        {room.className && (
                          <p className="text-xs text-muted-foreground mt-0.5">لجنة رقم {idx + 1}</p>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2 bg-white">
                        {room.teachers.map((t: any, i: number) => (
                          <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {i + 1}
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm">{t.name}</p>
                              {t.subject && <p className="text-xs text-muted-foreground">{t.subject}</p>}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-border h-full flex flex-col items-center justify-center min-h-[300px]">
                <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-600 mb-2">قم بتعبئة البيانات وتوليد التوزيع</h3>
                <p className="text-sm text-muted-foreground">يمكنك ربط اللجان بالفصول الدراسية لعرض أوضح</p>
              </div>
            )}

            {/* Saved committees */}
            {savedCommittees && savedCommittees.length > 0 && !currentResult && (
              <div className="mt-6 bg-white rounded-2xl border border-border/50 p-5">
                <h3 className="font-extrabold text-base text-foreground mb-3">اللجان المحفوظة</h3>
                <div className="space-y-2">
                  {savedCommittees.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="font-bold text-sm text-foreground">{c.examName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.assignments?.length} لجنة</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
