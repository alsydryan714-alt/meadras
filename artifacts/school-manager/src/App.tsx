import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { TrialBanner } from "@/components/trial-banner";
import { TrialExpiredGate } from "@/components/trial-expired-gate";
import { FreeTrialBadge } from "@/components/free-trial-badge";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

import Dashboard from "./pages/dashboard";
import SubstitutionsPage from "./pages/substitutions";
import TimetablePage from "./pages/timetable";
import ExamsPage from "./pages/exams";
import TeachersPage from "./pages/data-management/teachers";
import ClassesPage from "./pages/data-management/classes";
import SubjectsPage from "./pages/data-management/subjects";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import PricingPage from "./pages/pricing";
import PaymentPage from "./pages/payment";
import PaymentSuccessPage from "./pages/payment-success";
import LandingPage from "./pages/landing";
import AnalyticsPage from "./pages/analytics";
import TasksPage from "./pages/tasks";
import NoorImportPage from "./pages/noor-import";
import PrivacyPage from "./pages/privacy";
import RefundPolicyPage from "./pages/refund-policy";
import TermsPage from "./pages/terms";
import TeacherSchedulePage from "./pages/teacher-schedule";
import SetupWizard from "./pages/setup-wizard";
import SchoolSettings from "./pages/school-settings";
import CalendarPage from "./pages/calendar";
import AdminPage from "./pages/admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary animate-pulse mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <TrialBanner />
      {children}
    </>
  );
}

function HomeRoute() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard");
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary animate-pulse mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/payment/success" component={PaymentSuccessPage} />
      <Route path="/payment" component={PaymentPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/refund-policy" component={RefundPolicyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/schedule/:token" component={TeacherSchedulePage} />
      <Route path="/dashboard">
        <AuthGuard><Dashboard /></AuthGuard>
      </Route>
      <Route path="/substitutions">
        <AuthGuard><SubstitutionsPage /></AuthGuard>
      </Route>
      <Route path="/timetable">
        <AuthGuard><TimetablePage /></AuthGuard>
      </Route>
      <Route path="/exams">
        <AuthGuard><ExamsPage /></AuthGuard>
      </Route>
      <Route path="/analytics">
        <AuthGuard><AnalyticsPage /></AuthGuard>
      </Route>
      <Route path="/tasks">
        <AuthGuard><TasksPage /></AuthGuard>
      </Route>
      <Route path="/noor-import">
        <AuthGuard><NoorImportPage /></AuthGuard>
      </Route>
      <Route path="/data/teachers">
        <AuthGuard><TeachersPage /></AuthGuard>
      </Route>
      <Route path="/data/classes">
        <AuthGuard><ClassesPage /></AuthGuard>
      </Route>
      <Route path="/data/subjects">
        <AuthGuard><SubjectsPage /></AuthGuard>
      </Route>
      <Route path="/setup-wizard" component={SetupWizard} />
      <Route path="/settings">
        <AuthGuard><SchoolSettings /></AuthGuard>
      </Route>
      <Route path="/admin" component={AdminPage} />
      <Route path="/calendar">
        <AuthGuard><CalendarPage /></AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <FreeTrialBadge />
            <TrialExpiredGate>
              <Router />
            </TrialExpiredGate>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
