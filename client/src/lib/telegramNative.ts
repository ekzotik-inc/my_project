export type TelegramWebApp = {
  initData: string;
  version?: string;
  platform?: string;
  isFullscreen?: boolean;
  themeParams?: {
    bg_color?: string;
    secondary_bg_color?: string;
    header_bg_color?: string;
    bottom_bar_bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  safeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
  contentSafeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
  ready: () => void;
  expand: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  requestFullscreen?: () => void;
  onEvent?: (event: "safeAreaChanged" | "contentSafeAreaChanged" | "fullscreenChanged", callback: () => void) => void;
  offEvent?: (event: "safeAreaChanged" | "contentSafeAreaChanged" | "fullscreenChanged", callback: () => void) => void;
  BackButton?: { show: () => void; hide: () => void; onClick: (callback: () => void) => void; offClick: (callback: () => void) => void };
  HapticFeedback?: {
    impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    selectionChanged?: () => void;
    notificationOccurred?: (type: "error" | "success" | "warning") => void;
  };
};

export function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

export function telegramSelectionHaptic() {
  getTelegramWebApp()?.HapticFeedback?.selectionChanged?.();
}

export function telegramImpact(style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light") {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred?.(style);
}

export function applyTelegramSafeAreas(app: TelegramWebApp) {
  const root = document.documentElement;
  const safe = app.contentSafeAreaInset || app.safeAreaInset || {};
  root.style.setProperty("--tg-safe-top", `${safe.top || 0}px`);
  root.style.setProperty("--tg-safe-bottom", `${safe.bottom || 0}px`);
  root.style.setProperty("--tg-safe-left", `${safe.left || 0}px`);
  root.style.setProperty("--tg-safe-right", `${safe.right || 0}px`);
}
