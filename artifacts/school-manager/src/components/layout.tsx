import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { PrintHeader } from "./print-header";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  GraduationCap, 
  BookOpen, 
  UserCheck,
  ClipboardList,
  Menu,
  X,
  LogOut,
  CreditCard,
  BadgeCheck,
  BarChart3,
  ListTodo,
  FileSpreadsheet,
  Settings,
  CalendarRange
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { SchoolLogo } from "./school-logo";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/substitutions", label: "حصص الانتظار", icon: UserCheck },
  { href: "/timetable", label: "الجدول الدراسي", icon: CalendarDays },
  { href: "/calendar", label: "تقويم المدرسة", icon: CalendarRange },
  { href: "/exams", label: "لجان الاختبار", icon: ClipboardList },
  { href: "/tasks", label: "مهام المعلمين", icon: ListTodo },
  { href: "/analytics", label: "التقارير والتحليلات", icon: BarChart3 },
  { href: "/noor-import", label: "استيراد من نور", icon: FileSpreadsheet },
  { href: "/data/teachers", label: "المعلمون", icon: Users },
  { href: "/data/classes", label: "الفصول", icon: GraduationCap },
  { href: "/data/subjects", label: "المواد الدراسية", icon: BookOpen },
  { href: "/settings", label: "إعدادات المدرسة", icon: Settings },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const currentPage = navItems.find(n => location === n.href || (n.href !== "/" && location.startsWith(n.href)));

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen w-full bg-background" dir="rtl">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 right-0 h-full w-72 bg-sidebar text-sidebar-foreground flex flex-col shadow-2xl z-40
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto
      `}>
        <div className="p-5 border-b border-sidebar-border/50 flex items-center justify-between">
          <SchoolLogo size="md" showText={true} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-sidebar-foreground/60 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                <div className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer
                  transition-all duration-200 group
                  ${isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                  }
                `}>
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 space-y-2 border-t border-sidebar-border/50 pt-3">
          {user?.subscription?.isActive ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 rounded-xl">
              <BadgeCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-teal-300 truncate">
                  خطة {user.subscription.plan === "madrass" ? "مدراس" : user.subscription.plan === "basic" ? "الأساسية" : user.subscription.plan === "professional" ? "الاحترافية" : "المؤسسية"}
                </p>
                <p className="text-[10px] text-teal-400/70">اشتراك نشط</p>
              </div>
            </div>
          ) : (
            <Link href="/pricing" onClick={() => setSidebarOpen(false)}>
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-xl cursor-pointer transition-colors">
                <CreditCard className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-xs font-bold text-yellow-300">ترقية الاشتراك</p>
              </div>
            </Link>
          )}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
              {user?.name?.charAt(0) || "م"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || "المستخدم"}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.schoolName || ""}</p>
            </div>
            <button onClick={handleLogout} className="text-sidebar-foreground/50 hover:text-red-400 transition-colors p-1" title="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 w-full lg:max-w-[calc(100%-18rem)]">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-6 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
              {currentPage?.label || "الصفحة"}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-end hidden sm:block">
              <p className="text-xs font-bold text-foreground truncate max-w-32">{user?.name || "المستخدم"}</p>
              <p className="text-xs text-muted-foreground truncate max-w-32">{user?.schoolName || "المدرسة"}</p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.charAt(0) || "م"}
            </div>
            <button onClick={handleLogout} className="hidden sm:flex text-muted-foreground hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-x-hidden">
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 right-0 left-0 bg-white border-t border-border z-20 flex justify-around py-2 px-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  <item.icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
                  <span className="text-[9px] font-bold leading-tight text-center">{item.label.split(" ")[0]}</span>
                </div>
              </Link>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-bold">المزيد</span>
          </button>
        </nav>
      </main>
    </div>
  );
}

export function PageWrapper({ children, printTitle }: { children: ReactNode; printTitle?: string }) {
  return (
    <>
      <div className="no-print pb-16 lg:pb-0">
        <Layout>{children}</Layout>
      </div>
      <div className="print-only hidden p-6" dir="rtl">
        <PrintHeader title={printTitle} />
        {children}
      </div>
    </>
  );
}
