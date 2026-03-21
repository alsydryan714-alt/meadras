import { PageWrapper } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, AlertCircle, UserCheck, CalendarDays, ClipboardList, FileSpreadsheet, Settings, ListTodo, BarChart3, QrCode } from "lucide-react";
import { useGetTeachers, useGetClasses, useGetSubjects, useGetSubstitutions } from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const HIJRI_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const quickLinks = [
  { href: "/substitutions", label: "تسجيل الغياب", desc: "حصص الانتظار اليومية", icon: UserCheck, color: "bg-blue-600", shadow: "shadow-blue-200" },
  { href: "/timetable", label: "الجدول الدراسي", desc: "إسناد وتعديل الحصص", icon: CalendarDays, color: "bg-primary", shadow: "shadow-blue-200" },
  { href: "/exams", label: "لجان الاختبار", desc: "توزيع مراقبي الاختبارات", icon: ClipboardList, color: "bg-purple-500", shadow: "shadow-purple-200" },
  { href: "/tasks", label: "مهام المعلمين", desc: "متابعة التكليفات", icon: ListTodo, color: "bg-amber-500", shadow: "shadow-amber-200" },
  { href: "/noor-import", label: "استيراد نور", desc: "رفع بيانات المنصة الوطنية", icon: FileSpreadsheet, color: "bg-teal-500", shadow: "shadow-teal-200" },
  { href: "/analytics", label: "التقارير", desc: "إحصائيات وتحليلات", icon: BarChart3, color: "bg-indigo-600", shadow: "shadow-indigo-200" },
  { href: "/data/teachers", label: "المعلمون", desc: "بيانات وجداول", icon: Users, color: "bg-blue-500", shadow: "shadow-blue-200" },
  { href: "/settings", label: "إعدادات", desc: "بيانات المدرسة والشعار", icon: Settings, color: "bg-gray-500", shadow: "shadow-gray-200" },
];

export default function Dashboard() {
  const { data: teachers } = useGetTeachers();
  const { data: classes } = useGetClasses();
  const { data: subjects } = useGetSubjects();
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: substitutions } = useGetSubstitutions({ date: today });

  const dayName = HIJRI_DAYS[new Date().getDay()];
  const dashboardUrl = `${window.location.origin}/dashboard`;

  const stats = [
    { label: "المعلمون", value: teachers?.length || 0, icon: Users, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "الفصول", value: classes?.length || 0, icon: GraduationCap, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100" },
    { label: "المواد", value: subjects?.length || 0, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
    { label: "غياب اليوم", value: substitutions?.absentTeacherIds.length || 0, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight">لوحة التحكم</h1>
            <p className="text-muted-foreground mt-1 text-sm">نظرة عامة على إحصائيات المدرسة</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowQR(true)}
              className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-border hover:bg-blue-50 transition flex items-center gap-2"
            >
              <QrCode className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">رمز الدخول</span>
            </button>
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-border text-end">
              <p className="text-xs text-muted-foreground font-medium">{dayName}</p>
              <p className="text-base font-bold text-primary">{format(new Date(), 'yyyy/MM/dd')}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className={`border ${stat.border} shadow-sm hover:shadow-md transition-shadow`}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg} ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground leading-tight">{stat.label}</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold mt-0.5 text-foreground">{stat.value}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Access Grid */}
        <div>
          <h2 className="text-base font-bold text-muted-foreground mb-3">وصول سريع</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map((link, i) => (
              <motion.div key={link.href} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                <Link href={link.href}>
                  <div className={`group bg-white border border-border rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:shadow-black/5 transition-all hover:-translate-y-0.5`}>
                    <div className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center mb-3 shadow-lg ${link.shadow} group-hover:scale-110 transition-transform`}>
                      <link.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-bold text-foreground text-sm leading-tight">{link.label}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 leading-tight">{link.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Today's substitutions */}
        <Card className="border-none shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-foreground">
              <UserCheck className="w-5 h-5 text-primary" />
              حصص الانتظار لليوم
            </h3>
            <Link href="/substitutions">
              <span className="text-xs text-primary font-bold hover:underline cursor-pointer">عرض الكل</span>
            </Link>
          </div>
          <CardContent className="p-6 bg-white">
            {substitutions && substitutions.assignments.length > 0 ? (
              <div className="space-y-3">
                {substitutions.assignments.slice(0, 5).map((assignment, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100 gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm">الحصة {assignment.period} — {assignment.className}</p>
                      <p className="text-xs text-muted-foreground">الغائب: {assignment.absentTeacherName}</p>
                    </div>
                    <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold text-xs shrink-0">
                      {assignment.substituteTeacherName}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="w-7 h-7 text-slate-400" />
                </div>
                <h4 className="font-bold text-slate-600 text-sm">لا يوجد غياب مسجل اليوم</h4>
                <p className="text-slate-400 text-xs mt-1">جميع المعلمين حاضرون</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-sm bg-white rounded-2xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" /> رمز الدخول السريع
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500">امسح هذا الرمز للدخول لوحة التحكم</p>
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-2xl shadow-md border border-border inline-block">
                <QRCodeSVG value={dashboardUrl} size={200} level="H" />
              </div>
            </div>
            <p className="text-xs text-gray-400 break-all">{dashboardUrl}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(dashboardUrl); toast({ title: "تم النسخ" }); }} className="rounded-xl">
                <Copy className="w-4 h-4 ml-1" /> نسخ الرابط
              </Button>
              <Button onClick={() => setShowQR(false)} className="rounded-xl">إغلاق</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
