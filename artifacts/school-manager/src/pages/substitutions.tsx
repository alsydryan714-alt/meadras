import { useState } from "react";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  useGetTeachers, 
  useRecommendSubstitutions, 
  useSaveSubstitutions, 
  useGetSubstitutions 
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Printer, Share2, Sparkles, CheckCircle2, UserX, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { openWhatsAppNoPhone, buildSubstitutionText, exportElementToPDF } from "@/utils/pdf-export";

export default function SubstitutionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedAbsentIds, setSelectedAbsentIds] = useState<number[]>([]);
  const [assignments, setAssignments] = useState<Record<number, number>>({});
  
  const { data: teachers } = useGetTeachers();
  const { data: existingPlan, isLoading: isLoadingPlan } = useGetSubstitutions({ date });
  const { mutate: recommend, isPending: isRecommending } = useRecommendSubstitutions();
  const { mutate: save, isPending: isSaving } = useSaveSubstitutions();
  
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const handleGenerate = () => {
    if (selectedAbsentIds.length === 0) {
      toast({ title: "خطأ", description: "الرجاء اختيار معلم غائب واحد على الأقل", variant: "destructive" });
      return;
    }
    
    recommend({ data: { date, absentTeacherIds: selectedAbsentIds } }, {
      onSuccess: (data) => {
        setRecommendations(data);
        // Auto-select the first recommendation for each slot
        const initialAssignments: Record<number, number> = {};
        data.forEach(slot => {
          if (slot.recommendedTeachers.length > 0) {
            initialAssignments[slot.timetableSlotId] = slot.recommendedTeachers[0].teacherId;
          }
        });
        setAssignments(initialAssignments);
        toast({ title: "تم التوليد", description: "تم توليد أفضل التوصيات لحصص الانتظار بنجاح" });
      }
    });
  };

  const handleSave = () => {
    const assignmentsList = Object.entries(assignments).map(([slotId, teacherId]) => ({
      timetableSlotId: parseInt(slotId),
      substituteTeacherId: teacherId
    }));
    
    save({ data: { date, absentTeacherIds: selectedAbsentIds, assignments: assignmentsList } }, {
      onSuccess: () => {
        toast({ title: "نجاح", description: "تم حفظ حصص الانتظار بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['/api/substitutions'] });
      }
    });
  };

  const toggleAbsent = (id: number) => {
    setSelectedAbsentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const generateWhatsAppText = () => {
    if (!existingPlan || existingPlan.assignments.length === 0) {
      toast({ title: "تنبيه", description: "لا يوجد حصص محفوظة لإرسالها", variant: "destructive" });
      return;
    }
    const absentNames = existingPlan.absentTeacherIds
      .map(id => teachers?.find(x => x.id === id)?.name || "")
      .filter(Boolean);
    const text = buildSubstitutionText(date, absentNames, existingPlan.assignments);
    openWhatsAppNoPhone(text);
  };

  return (
    <PageWrapper printTitle={`جدول حصص الانتظار — ${date}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-start gap-3 no-print">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground">حصص الانتظار</h1>
            <p className="text-muted-foreground text-sm mt-1">إدارة غياب المعلمين وتوزيع حصص الانتظار بذكاء</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => exportElementToPDF("substitution-plan", "حصص-الانتظار.pdf", `حصص الانتظار — ${date}`)}>
              <FileDown className="w-4 h-4 sm:ml-2" /> <span className="hidden sm:inline">تصدير PDF</span>
            </Button>
            <Button variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/5" onClick={() => window.print()}>
              <Printer className="w-4 h-4 sm:ml-2" /> <span className="hidden sm:inline">طباعة</span>
            </Button>
            <Button size="sm" className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg shadow-[#25D366]/30" onClick={generateWhatsAppText}>
              <Share2 className="w-4 h-4 sm:ml-2" /> <span className="hidden sm:inline">إرسال واتساب</span><span className="sm:hidden">واتساب</span>
            </Button>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Controls Column */}
          <div className="lg:col-span-1 space-y-6 no-print">
            <Card className="shadow-lg border-border/50">
              <CardContent className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">تاريخ اليوم</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                    <UserX className="w-4 h-4 text-rose-500" />
                    المعلمون الغائبون
                  </label>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {teachers?.map(teacher => (
                      <label key={teacher.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedAbsentIds.includes(teacher.id) ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-border hover:bg-slate-50'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedAbsentIds.includes(teacher.id)}
                          onChange={() => toggleAbsent(teacher.id)}
                          className="w-5 h-5 rounded text-primary focus:ring-primary"
                        />
                        <span className="font-semibold">{teacher.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full py-6 rounded-xl text-lg font-bold shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all"
                  onClick={handleGenerate}
                  disabled={isRecommending || selectedAbsentIds.length === 0}
                >
                  {isRecommending ? "جاري الحساب..." : (
                    <>
                      <Sparkles className="w-5 h-5 ml-2" />
                      توليد التوصيات الذكية
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Column */}
          <div id="substitution-plan" className="lg:col-span-2 space-y-6">
            
            {/* Display existing saved plan if no new recommendations are being edited */}
            {!recommendations.length && existingPlan && existingPlan.assignments.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
                <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                  يوجد جدول محفوظ لهذا اليوم
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {existingPlan.assignments.map(a => (
                    <div key={a.id} className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col justify-center print-break-inside-avoid">
                      <div className="flex justify-between items-center mb-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-md">الحصة {a.period}</span>
                        <span className="font-bold text-foreground">فصل {a.className}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-through">أساسي: {a.absentTeacherName}</p>
                      <p className="font-bold text-primary mt-1 flex items-center gap-1">
                        بديل: {a.substituteTeacherName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommendations.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between no-print">
                  <h2 className="text-2xl font-bold text-foreground">توصيات النظام</h2>
                  <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                    <CheckCircle2 className="w-5 h-5 ml-2" />
                    حفظ واعتماد
                  </Button>
                </div>

                <div className="space-y-4">
                  {recommendations.map(slot => (
                    <Card key={slot.timetableSlotId} className="overflow-hidden border-2 border-primary/10 shadow-lg print-break-inside-avoid">
                      <div className="bg-slate-50 border-b p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {slot.period}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-foreground">فصل {slot.className} - {slot.subjectName}</h4>
                            <p className="text-sm text-rose-600 font-medium">غائب: {slot.absentTeacherName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <p className="text-sm font-bold text-muted-foreground mb-3">اختر المعلم البديل:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {slot.recommendedTeachers.map((rt: any, idx: number) => (
                            <label 
                              key={rt.teacherId} 
                              className={`
                                flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all
                                ${assignments[slot.timetableSlotId] === rt.teacherId 
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                                  : 'border-border hover:border-primary/30'}
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <input 
                                  type="radio" 
                                  name={`slot-${slot.timetableSlotId}`}
                                  checked={assignments[slot.timetableSlotId] === rt.teacherId}
                                  onChange={() => setAssignments(prev => ({ ...prev, [slot.timetableSlotId]: rt.teacherId }))}
                                  className="w-4 h-4 text-primary"
                                />
                                <div>
                                  <p className="font-bold text-foreground">{rt.teacherName}</p>
                                  <p className="text-xs text-muted-foreground">حصص الانتظار هذا الأسبوع: {rt.weeklySubstitutionCount}</p>
                                </div>
                              </div>
                              {idx === 0 && (
                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-md">الأفضل</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    </Card>
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
