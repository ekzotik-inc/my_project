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
import { CalendarRange, CheckSquare2, Download, HeartHandshake, LayoutDashboard, LogOut, MessageCircleHeart, PanelLeft, Send, Settings, Sparkles, Users, UsersRound } from "lucide-react";
import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Обзор", path: "/", access: "chief" },
  { icon: Users, label: "Участники", path: "/participants", access: "moderator" },
  { icon: UsersRound, label: "Команды", path: "/teams", access: "chief" },
  { icon: CalendarRange, label: "Периоды", path: "/periods", access: "chief" },
  { icon: CheckSquare2, label: "Активности", path: "/activities", access: "chief" },
  { icon: Send, label: "Рассылки", path: "/broadcasts", access: "chief" },
  { icon: MessageCircleHeart, label: "Ритм общения", path: "/communication", access: "chief" },
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
  const { loading, user, login } = useAuth();
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "pc_admin">("admin");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    try { await login(role, password); setPassword(""); }
    catch { setLoginError("Не удалось войти: проверьте выбранную роль и пароль."); }
  }

  if (!user) {
    return (
      <div className="paper-grain relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
        <div className="float-slow absolute -left-24 top-12 h-64 w-64 rounded-full bg-[#D8EDBF] blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-[5rem] bg-[#BDE1EF] opacity-80 blur-3xl" />
        <form onSubmit={signIn} className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/85 p-7 shadow-[0_30px_80px_-40px_rgba(31,73,48,0.45)] backdrop-blur sm:p-9">
          <div className="flex items-start justify-between gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163F2F] text-white shadow-lg"><HeartHandshake className="h-5 w-5" /></div><span className="rounded-full bg-[#E8F3EE] px-3 py-1.5 text-[10px] font-extrabold tracking-[0.14em] text-[#25613F]">ДОБРЫЕ ДЕЛА</span></div>
          <div className="mt-7"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#55705E]">пространство команды</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.055em] text-[#163F2F]">Управляйте добром, которое видно</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Создавайте общие активности, поддерживайте участников и отмечайте каждый подтверждённый результат.</p></div>
          <div className="mt-7 w-full"><p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#55705E]">Ваша роль</p><div className="grid grid-cols-2 gap-2"><Button type="button" variant={role === "admin" ? "default" : "outline"} className="soft-press rounded-xl" onClick={() => setRole("admin")}>Chief</Button><Button type="button" variant={role === "pc_admin" ? "default" : "outline"} className="soft-press rounded-xl" onClick={() => setRole("pc_admin")}>P&amp;C</Button></div></div>
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-4 h-12 w-full rounded-xl border border-[#BFD7C5] bg-white px-4 text-sm shadow-inner" placeholder="Пароль" autoComplete="current-password" required />
          {loginError && <p className="mt-3 w-full text-sm text-destructive">{loginError}</p>}
          <Button type="submit" size="lg" className="soft-press mt-5 w-full rounded-xl bg-[#163F2F] shadow-lg hover:bg-[#215640]">Войти в пространство <Sparkles className="ml-2 h-4 w-4" /></Button>
        </form>
      </div>
    );
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
          className="border-r border-[#D6E6D9] bg-[#F7FBF4]/90 backdrop-blur"
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#163F2F] text-white"><HeartHandshake className="h-3.5 w-3.5" /></div>
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

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Меню"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-5">{children}</main>
      </SidebarInset>
    </>
  );
}
