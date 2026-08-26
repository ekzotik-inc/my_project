import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { CalendarRange, CheckSquare2, ClipboardCheck, Download, HeartHandshake, LayoutDashboard, LogOut, MessageCircleHeart, PanelLeft, Send, Settings, Sparkles, Users, UsersRound } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { VisibleDeedMark } from "./VisibleDeedMark";
import { trpc } from "@/lib/trpc";
import { applyTelegramSafeAreas, getTelegramWebApp, telegramSelectionHaptic, telegramSupportsVersion } from "@/lib/telegramNative";
import { mobileAdminQuickPaths } from "@/lib/mobileAdminNavigation";

const menuItems = [
  { icon: LayoutDashboard, label: "Обзор", path: "/", access: "chief" },
  { icon: Users, label: "Участники", path: "/participants", access: "moderator" },
  { icon: ClipboardCheck, label: "На проверке", path: "/review", access: "moderator", badge: true },
  { icon: UsersRound, label: "Команды", path: "/teams", access: "chief" },
  { icon: CalendarRange, label: "Периоды", path: "/periods", access: "chief" },
  { icon: CheckSquare2, label: "Активности", path: "/activities", access: "chief" },
  { icon: Send, label: "Рассылки", path: "/broadcasts", access: "chief" },
  { icon: MessageCircleHeart, label: "Ритм общения", path: "/communication", access: "moderator" },
  { icon: Download, label: "Экспорт", path: "/exports", access: "chief" },
  { icon: Settings, label: "Telegram", path: "/telegram", access: "chief" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return <div className="paper-grain flex min-h-screen items-center justify-center bg-[#F8FBF5] p-5 text-center"><div className="max-w-sm rounded-[2rem] bg-white p-7 shadow-[0_24px_55px_-38px_rgba(22,63,47,0.45)]"><VisibleDeedMark className="mx-auto bg-[#163F2F] text-white" /><p className="mt-6 text-[10px] font-extrabold tracking-[0.16em] text-[#55705E]">ДОБРЫЕ ДЕЛА</p><h1 className="mt-2 text-2xl font-extrabold tracking-[-0.05em]">Откройте рабочую панель из Telegram</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Доступ Chief и P&amp;C определяется по защищённым данным Telegram Mini App — пароль не требуется.</p></div></div>;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const visibleMenuItems = menuItems.filter(item => item.access === "moderator" || user?.role === "admin");
  const isMobile = useIsMobile();
  const canModerate = user?.role === "admin" || user?.role === "pc_admin";
  const { data: reviewCenter } = trpc.admin.reviewCenter.dashboard.useQuery(undefined, { enabled: canModerate });
  const awaitingReview = reviewCenter?.summary.awaitingReview ?? 0;
  const mobileQuickItems = mobileAdminQuickPaths(user?.role).flatMap(path => {
    const item = menuItems.find(menuItem => menuItem.path === path);
    return item ? [item] : [];
  });

  useEffect(() => {
    const app = getTelegramWebApp();
    if (!app) return;
    const background = app.themeParams?.bg_color || "#F8FBF5";
    app.ready();
    app.expand();
    if (telegramSupportsVersion(app, "6.1")) {
      app.setHeaderColor?.(background);
      app.setBackgroundColor?.(background);
    }
    if (telegramSupportsVersion(app, "7.10")) app.setBottomBarColor?.(background);
    applyTelegramSafeAreas(app);
    const updateSafeAreas = () => applyTelegramSafeAreas(app);
    if (telegramSupportsVersion(app, "8.0")) {
      app.onEvent?.("safeAreaChanged", updateSafeAreas);
      app.onEvent?.("contentSafeAreaChanged", updateSafeAreas);
    }
    return () => {
      if (telegramSupportsVersion(app, "8.0")) {
        app.offEvent?.("safeAreaChanged", updateSafeAreas);
        app.offEvent?.("contentSafeAreaChanged", updateSafeAreas);
      }
    };
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-[#E8DFC9] bg-[#F9F6EC]/92 backdrop-blur"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-20 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 items-center gap-2">
                  <VisibleDeedMark className="h-7 w-7 rounded-lg [&_svg:first-child]:h-3.5 [&_svg:first-child]:w-3.5" />
                  <span className="truncate text-xs font-extrabold tracking-[0.12em] text-[#163F2F]">ДОБРЫЕ ДЕЛА</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {visibleMenuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-11 rounded-xl font-semibold transition-all hover:bg-[#E8F3EE] data-[active=true]:bg-[#DCEFD7] data-[active=true]:text-[#163F2F]"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                      {item.badge && awaitingReview > 0 ? <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#C9474F] px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:top-1">{awaitingReview > 99 ? "99+" : awaitingReview}</span> : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-[radial-gradient(circle_at_95%_0%,rgba(235,211,155,0.28),transparent_22rem),radial-gradient(circle_at_3%_16%,rgba(213,231,217,0.3),transparent_24rem)]">
        {isMobile && (
          <div className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-[#E9DFCB] bg-[#FBF8F0]/92 px-3 pt-[var(--tg-safe-top)] backdrop-blur supports-[backdrop-filter]:backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-10 w-10 rounded-xl border border-[#E3ECE1] bg-white shadow-sm" />
              <VisibleDeedMark className="h-9 w-9 rounded-xl [&_svg:first-child]:h-4 [&_svg:first-child]:w-4" />
              <div className="flex flex-col"><span className="text-[9px] font-extrabold tracking-[0.13em] text-[#6A8170]">{user?.role === "admin" ? "CHIEF SPACE" : "P&C SPACE"}</span><span className="text-sm font-extrabold tracking-[-0.025em] text-[#163F2F]">{activeMenuItem?.label ?? "Меню"}</span></div>
            </div>
            {awaitingReview > 0 ? <button onClick={() => setLocation("/review")} className="soft-press rounded-xl bg-[#FFF0F0] px-3 py-2 text-xs font-extrabold text-[#A6444B]">{awaitingReview} ждут</button> : null}
          </div>
        )}
        <main className={`flex-1 p-4 sm:p-5 ${isMobile ? "pb-[calc(6.5rem+var(--tg-safe-bottom))]" : ""}`}><div key={location} className="route-enter h-full">{children}</div></main>
        {isMobile ? <nav className="fixed inset-x-3 bottom-[calc(0.65rem+var(--tg-safe-bottom))] z-50 flex items-center rounded-[1.45rem] border border-white/90 bg-white/[0.94] p-1.5 shadow-[0_22px_48px_-26px_rgba(22,63,47,0.52)] backdrop-blur" aria-label="Быстрые действия">
          {mobileQuickItems.map(item => {
            const active = location === item.path;
            return <button key={item.path} onClick={() => { telegramSelectionHaptic(); setLocation(item.path); }} className={`soft-press relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-extrabold ${active ? "bg-[#163F2F] text-white" : "text-[#587065]"}`}><item.icon className="h-4 w-4" />{item.label}{item.badge && awaitingReview > 0 ? <span className="absolute right-[17%] top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[#C9474F] px-1 py-0.5 text-[8px] font-extrabold leading-none text-white">{awaitingReview > 99 ? "99+" : awaitingReview}</span> : null}</button>;
          })}
          <button onClick={() => { telegramSelectionHaptic(); toggleSidebar(); }} className="soft-press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-extrabold text-[#587065]"><PanelLeft className="h-4 w-4" />Меню</button>
        </nav> : null}
      </SidebarInset>
    </>
  );
}
