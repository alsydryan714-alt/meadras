import { useState, useRef, useCallback } from "react";
import ExcelJS from "exceljs";
import { useAuth } from "@/contexts/auth";
import { Layout } from "@/components/layout";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileSpreadsheet, Users, GraduationCap, CheckCircle2,
  XCircle, AlertTriangle, Download, ArrowRight, RefreshCw, Info
} from "lucide-react";

type ImportTab = "teachers" | "classes";
type ImportMode = "append" | "replace";

interface TeacherRow { name: string; subject: string; maxWeeklyHours?: number; }
interface ClassRow { grade: string; section: string; }
interface ParsedData<T> { rows: T[]; headers: string[]; errors: string[]; }

const NOOR_TEACHER_ALIASES: Record<string, string> = {
  "اسم المعلم": "name", "الاسم": "name", "اسم المعلمة": "name",
  "الاسم الكامل": "name", "اسم المعلم/ة": "name", "المعلم": "name",
  "التخصص": "subject", "المادة": "subject", "المادة الدراسية": "subject",
  "تخصص المعلم": "subject", "مادة المعلم": "subject",
  "الحصص الأسبوعية": "maxWeeklyHours", "العبء التدريسي": "maxWeeklyHours",
  "الحصص": "maxWeeklyHours", "عدد الحصص": "maxWeeklyHours",
};

const NOOR_CLASS_ALIASES: Record<string, string> = {
  "الصف": "grade", "الصف الدراسي": "grade", "المرحلة": "grade",
  "المرحلة الدراسية": "grade", "الصف/المرحلة": "grade",
  "الفصل": "section", "الشعبة": "section", "رقم الفصل": "section",
  "فصل": "section", "الفصل الدراسي": "section",
};

function mapHeaders(headers: string[], aliases: Record<string, string>): Record<string, string> {
  const mapping: Record<string, string> = {};
  headers.forEach(h => {
    const normalized = h.trim().replace(/\s+/g, " ");
    if (aliases[normalized]) mapping[normalized] = aliases[normalized];
    else {
      for (const [alias, field] of Object.entries(aliases)) {
        if (normalized.includes(alias) || alias.includes(normalized)) {
          mapping[normalized] = field;
          break;
        }
      }
    }
  });
  return mapping;
}

function parseTeachersExcel(data: unknown[][]): ParsedData<TeacherRow> {
  const errors: string[] = [];
  if (data.length < 2) return { rows: [], headers: [], errors: ["الملف فارغ أو لا يحتوي على بيانات"] };

  const rawHeaders = data[0].map(String);
  const headerMap = mapHeaders(rawHeaders, NOOR_TEACHER_ALIASES);

  const nameCol = rawHeaders.findIndex(h => headerMap[h.trim()] === "name");
  const subjectCol = rawHeaders.findIndex(h => headerMap[h.trim()] === "subject");
  const hoursCol = rawHeaders.findIndex(h => headerMap[h.trim()] === "maxWeeklyHours");

  if (nameCol === -1) errors.push("⚠️ لم يتم العثور على عمود الاسم — جرب إعادة التسمية إلى 'اسم المعلم'");
  if (subjectCol === -1) errors.push("⚠️ لم يتم العثور على عمود التخصص — جرب إعادة التسمية إلى 'التخصص'");

  const rows: TeacherRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = nameCol !== -1 ? String(row[nameCol] ?? "").trim() : "";
    const subject = subjectCol !== -1 ? String(row[subjectCol] ?? "").trim() : "";
    if (!name && !subject) continue;
    if (!name) { errors.push(`السطر ${i + 1}: اسم فارغ — تم تجاهله`); continue; }
    if (!subject) { errors.push(`السطر ${i + 1}: تخصص فارغ للمعلم "${name}" — تم تجاهله`); continue; }
    const maxWeeklyHours = hoursCol !== -1 ? Number(row[hoursCol]) || 24 : 24;
    rows.push({ name, subject, maxWeeklyHours });
  }

  return { rows, headers: rawHeaders, errors };
}

function parseClassesExcel(data: unknown[][]): ParsedData<ClassRow> {
  const errors: string[] = [];
  if (data.length < 2) return { rows: [], headers: [], errors: ["الملف فارغ أو لا يحتوي على بيانات"] };

  const rawHeaders = data[0].map(String);
  const headerMap = mapHeaders(rawHeaders, NOOR_CLASS_ALIASES);

  const gradeCol = rawHeaders.findIndex(h => headerMap[h.trim()] === "grade");
  const sectionCol = rawHeaders.findIndex(h => headerMap[h.trim()] === "section");

  if (gradeCol === -1) errors.push("⚠️ لم يتم العثور على عمود الصف — جرب إعادة التسمية إلى 'الصف'");
  if (sectionCol === -1) errors.push("⚠️ لم يتم العثور على عمود الفصل — جرب إعادة التسمية إلى 'الفصل'");

  const rows: ClassRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const grade = gradeCol !== -1 ? String(row[gradeCol] ?? "").trim() : "";
    const section = sectionCol !== -1 ? String(row[sectionCol] ?? "").trim() : "";
    if (!grade && !section) continue;
    if (!grade) { errors.push(`السطر ${i + 1}: صف فارغ — تم تجاهله`); continue; }
    if (!section) { errors.push(`السطر ${i + 1}: فصل فارغ — تم تجاهله`); continue; }
    rows.push({ grade, section });
  }

  return { rows, headers: rawHeaders, errors };
}

async function downloadSampleExcel(type: "teachers" | "classes") {
  const wb = new ExcelJS.Workbook();
  if (type === "teachers") {
    const ws = wb.addWorksheet("المعلمون");
    ws.addRows([
      ["اسم المعلم", "التخصص", "الحصص الأسبوعية"],
      ["أحمد محمد السعيد", "رياضيات", 24],
      ["سارة عبدالله الغامدي", "لغة عربية", 20],
      ["خالد إبراهيم العمري", "علوم", 22],
      ["نورة سليمان الشمري", "إنجليزي", 24],
    ]);
  } else {
    const ws = wb.addWorksheet("الفصول");
    ws.addRows([
      ["الصف", "الفصل"],
      ["الأول", "أ"],
      ["الأول", "ب"],
      ["الثاني", "أ"],
      ["الثاني", "ب"],
      ["الثالث", "أ"],
    ]);
  }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = type === "teachers" ? "نموذج_المعلمين.xlsx" : "نموذج_الفصول.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

function DropZone({ onFile, accept = ".xlsx,.xls,.csv" }: { onFile: (file: File) => void; accept?: string }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
        ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/40"}
      `}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm font-medium">اسحب ملف Excel هنا أو اضغط للاختيار</p>
      <p className="text-xs text-muted-foreground mt-1">.xlsx / .xls / .csv — مصدّر من نظام نور</p>
    </div>
  );
}

const BASE = (import.meta.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export default function NoorImportPage() {
  const { user } = useAuth();
  const isProfessional = (user?.subscription?.plan === "professional" || user?.subscription?.plan === "madrass") && user?.subscription?.isActive;

  if (!isProfessional) {
    return <UpgradePrompt title="استيراد بيانات من نور" description="استورد بيانات المعلمين والفصول مباشرةً من ملفات نور" />;
  }
  const { toast } = useToast();
  const token = localStorage.getItem("auth_token") ?? "";

  const [activeTab, setActiveTab] = useState<ImportTab>("teachers");
  const [importMode, setImportMode] = useState<ImportMode>("append");

  const [teachersParsed, setTeachersParsed] = useState<ParsedData<TeacherRow> | null>(null);
  const [classesParsed, setClassesParsed] = useState<ParsedData<ClassRow> | null>(null);
  const [teachersFile, setTeachersFile] = useState<string>("");
  const [classesFile, setClassesFile] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null);

  async function readFile(file: File): Promise<unknown[][]> {
    const buffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const rows: unknown[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      if (Array.isArray(row.values)) {
        rows.push((row.values as unknown[]).slice(1));
      } else if (row.values && typeof row.values === "object") {
        rows.push(Object.values(row.values));
      }
    });
    return rows;
  }

  async function handleTeachersFile(file: File) {
    try {
      const data = await readFile(file);
      setTeachersParsed(parseTeachersExcel(data));
      setTeachersFile(file.name);
      setImportResult(null);
    } catch (e) {
      toast({ title: "خطأ في قراءة الملف", description: String(e), variant: "destructive" });
    }
  }

  async function handleClassesFile(file: File) {
    try {
      const data = await readFile(file);
      setClassesParsed(parseClassesExcel(data));
      setClassesFile(file.name);
      setImportResult(null);
    } catch (e) {
      toast({ title: "خطأ في قراءة الملف", description: String(e), variant: "destructive" });
    }
  }

  async function doImport() {
    setLoading(true);
    setImportResult(null);
    try {
      if (activeTab === "teachers" && teachersParsed) {
        const res = await fetch(`${BASE}/api/teachers/bulk-import`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ teachers: teachersParsed.rows, mode: importMode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "فشل الاستيراد");
        setImportResult(data);
        toast({ title: `✅ تم استيراد ${data.imported} معلم بنجاح` });
      } else if (activeTab === "classes" && classesParsed) {
        const res = await fetch(`${BASE}/api/classes/bulk-import`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ classes: classesParsed.rows, mode: importMode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "فشل الاستيراد");
        setImportResult(data);
        toast({ title: `✅ تم استيراد ${data.imported} فصل بنجاح` });
      }
    } catch (e) {
      toast({ title: "فشل الاستيراد", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const parsed = activeTab === "teachers" ? teachersParsed : classesParsed;
  const fileName = activeTab === "teachers" ? teachersFile : classesFile;
  const hasData = parsed && parsed.rows.length > 0;

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-7 w-7 text-primary" />
              استيراد من نظام نور
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              استيراد بيانات المعلمين والفصول من ملفات Excel الخاصة بنور — بدلاً من الإدخال اليدوي
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadSampleExcel(activeTab)} className="gap-2">
            <Download className="h-4 w-4" />
            تحميل نموذج Excel
          </Button>
        </div>

        {/* How it works */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-2 items-start">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800 space-y-1">
                <p className="font-semibold">كيف تستخرج الملف من نور؟</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-blue-700 mt-2">
                  {[
                    "1. افتح نظام نور",
                    "2. اختر التقارير → بيانات المعلمين أو الجدول المدرسي",
                    "3. صدّر التقرير بصيغة Excel",
                    "4. ارفع الملف هنا مباشرة",
                  ].map(s => (
                    <span key={s} className="flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2">
          {([
            { id: "teachers", label: "استيراد المعلمين", icon: Users },
            { id: "classes", label: "استيراد الفصول", icon: GraduationCap },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setImportResult(null); }}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"}
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {activeTab === "teachers" ? "ملف المعلمين" : "ملف الفصول"}
              </CardTitle>
              <CardDescription>
                {activeTab === "teachers"
                  ? "يجب أن يحتوي الملف على أعمدة: اسم المعلم، التخصص"
                  : "يجب أن يحتوي الملف على أعمدة: الصف، الفصل"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeTab === "teachers"
                ? <DropZone onFile={handleTeachersFile} />
                : <DropZone onFile={handleClassesFile} />
              }
              {fileName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" />
                  {fileName}
                </p>
              )}

              {/* Import mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">وضع الاستيراد</label>
                <Select value={importMode} onValueChange={v => setImportMode(v as ImportMode)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">إضافة للبيانات الموجودة</SelectItem>
                    <SelectItem value="replace">استبدال كل البيانات</SelectItem>
                  </SelectContent>
                </Select>
                {importMode === "replace" && (
                  <p className="text-xs text-amber-600 flex gap-1 items-center">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    سيتم حذف جميع {activeTab === "teachers" ? "المعلمين" : "الفصول"} الحاليين
                  </p>
                )}
              </div>

              <Button
                className="w-full gap-2"
                disabled={!hasData || loading}
                onClick={doImport}
              >
                {loading
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> جارٍ الاستيراد...</>
                  : <><Upload className="h-4 w-4" /> استيراد {parsed?.rows.length ?? 0} سجل</>
                }
              </Button>

              {/* Result */}
              {importResult && (
                <div className="bg-teal-50 border border-green-200 rounded-lg p-3 text-sm text-teal-800 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                  <div>
                    <p className="font-semibold">تم الاستيراد بنجاح!</p>
                    <p className="text-xs">{importResult.imported} من أصل {importResult.total} سجل</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>معاينة البيانات</span>
                {hasData && (
                  <Badge variant="secondary">{parsed!.rows.length} سجل</Badge>
                )}
              </CardTitle>
              <CardDescription>تأكد من صحة البيانات قبل الاستيراد</CardDescription>
            </CardHeader>
            <CardContent>
              {!parsed ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                  <FileSpreadsheet className="h-10 w-10 opacity-30" />
                  <p>ارفع ملف Excel لمعاينة البيانات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Errors */}
                  {parsed.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                      {parsed.errors.slice(0, 5).map((e, i) => (
                        <p key={i} className="text-xs text-amber-700 flex gap-1.5 items-start">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {e}
                        </p>
                      ))}
                      {parsed.errors.length > 5 && (
                        <p className="text-xs text-amber-600">و {parsed.errors.length - 5} تحذير آخر...</p>
                      )}
                    </div>
                  )}

                  {/* Table */}
                  {hasData ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-y-auto max-h-72">
                        <table className="w-full text-xs">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-right font-medium text-muted-foreground">#</th>
                              {activeTab === "teachers" ? (
                                <>
                                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">الاسم</th>
                                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">التخصص</th>
                                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">الحصص</th>
                                </>
                              ) : (
                                <>
                                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">الصف</th>
                                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">الفصل</th>
                                </>
                              )}
                              <th className="px-3 py-2 text-right font-medium text-muted-foreground">الحالة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(parsed.rows as (TeacherRow | ClassRow)[]).slice(0, 50).map((row, i) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                                <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                                {activeTab === "teachers" ? (
                                  <>
                                    <td className="px-3 py-1.5 font-medium">{(row as TeacherRow).name}</td>
                                    <td className="px-3 py-1.5 text-muted-foreground">{(row as TeacherRow).subject}</td>
                                    <td className="px-3 py-1.5 text-muted-foreground">{(row as TeacherRow).maxWeeklyHours ?? 24}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-1.5 font-medium">{(row as ClassRow).grade}</td>
                                    <td className="px-3 py-1.5 text-muted-foreground">{(row as ClassRow).section}</td>
                                  </>
                                )}
                                <td className="px-3 py-1.5">
                                  <CheckCircle2 className="h-4 w-4 text-teal-500" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsed.rows.length > 50 && (
                          <p className="text-center text-xs text-muted-foreground py-2 bg-muted/20">
                            يتم عرض أول 50 سجل من أصل {parsed.rows.length}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                      <XCircle className="h-8 w-8 text-destructive/50" />
                      <p>لم يتم العثور على بيانات صالحة</p>
                      <p className="text-xs">راجع التحذيرات أعلاه</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expected columns hint */}
        <Card className="border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">الأعمدة المدعومة في ملف نور</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold mb-2 text-foreground">بيانات المعلمين</p>
              <div className="space-y-1 text-muted-foreground">
                {[["اسم المعلم / الاسم / الاسم الكامل", "اسم المعلم"],
                  ["التخصص / المادة / المادة الدراسية", "المادة"],
                  ["الحصص الأسبوعية / العبء التدريسي", "الحصص (اختياري)"]
                ].map(([aliases, desc]) => (
                  <p key={desc}><span className="font-mono bg-muted px-1 rounded">{aliases}</span> → {desc}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold mb-2 text-foreground">بيانات الفصول</p>
              <div className="space-y-1 text-muted-foreground">
                {[["الصف / الصف الدراسي / المرحلة", "الصف"],
                  ["الفصل / الشعبة / رقم الفصل", "الفصل"],
                ].map(([aliases, desc]) => (
                  <p key={desc}><span className="font-mono bg-muted px-1 rounded">{aliases}</span> → {desc}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
