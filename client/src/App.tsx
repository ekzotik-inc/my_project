import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminOverview from "./pages/AdminOverview";
import ParticipantsPage from "./pages/ParticipantsPage";
import PeriodsPage from "./pages/PeriodsPage";
import TeamsPage from "./pages/TeamsPage";
import TelegramSettingsPage from "./pages/TelegramSettingsPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import BroadcastsPage from "./pages/BroadcastsPage";
import CommunicationRhythmPage from "./pages/CommunicationRhythmPage";
import ExportsPage from "./pages/ExportsPage";
import ReviewCenterPage from "./pages/ReviewCenterPage";
import StatisticsPage from "./pages/StatisticsPage";
import GalleryPage from "./pages/GalleryPage";
import MiniAppGatewayPage from "./pages/MiniAppGatewayPage";
import { useAuth } from "./_core/hooks/useAuth";

function AdminShell({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function OverviewRoute() { const { user, loading } = useAuth(); if (loading) return <MiniAppGatewayPage />; if (!user) return <MiniAppGatewayPage />; return user.role === "pc_admin" ? <AdminShell><ReviewCenterPage /></AdminShell> : <AdminShell><AdminOverview /></AdminShell>; }
function ParticipantsRoute() { return <AdminShell><ParticipantsPage /></AdminShell>; }
function TeamsRoute() { return <AdminShell><TeamsPage /></AdminShell>; }
function PeriodsRoute() { return <AdminShell><PeriodsPage /></AdminShell>; }
function TelegramRoute() { return <AdminShell><TelegramSettingsPage /></AdminShell>; }
function ActivitiesRoute() { return <AdminShell><ActivitiesPage /></AdminShell>; }
function BroadcastsRoute() { return <AdminShell><BroadcastsPage /></AdminShell>; }
function CommunicationRhythmRoute() { return <AdminShell><CommunicationRhythmPage /></AdminShell>; }
function ExportsRoute() { return <AdminShell><ExportsPage /></AdminShell>; }
function ReviewCenterRoute() { return <AdminShell><ReviewCenterPage /></AdminShell>; }

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={OverviewRoute} />
      <Route path={"/participants"} component={ParticipantsRoute} />
      <Route path={"/teams"} component={TeamsRoute} />
      <Route path={"/periods"} component={PeriodsRoute} />
      <Route path={"/telegram"} component={TelegramRoute} />
      <Route path={"/activities"} component={ActivitiesRoute} />
      <Route path={"/broadcasts"} component={BroadcastsRoute} />
      <Route path={"/communication"} component={CommunicationRhythmRoute} />
      <Route path={"/exports"} component={ExportsRoute} />
      <Route path={"/review"} component={ReviewCenterRoute} />
      <Route path={"/statistics"} component={StatisticsPage} />
      <Route path={"/gallery"} component={GalleryPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
