import { hexToRgba, type AppThemeTokens } from "../constants/app-themes"

/** Serializable theme payload injected into dashboard-v2 WebViews. */
export type NativeWebThemePayload = {
  isDark: boolean
  accent: string
  accentHover: string
  accentSoft: string
  accentSoftStrong: string
  accentBorder: string
  accentDark: string
  background: string
  surface: string
  tint: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  warning: string
  groupedBackground: string
}

/** Neutral grouped canvas for embedded web modules (matches native module screens). */
export const NATIVE_WEB_MODULE_CANVAS_LIGHT = "#f2f2f7"

/** Horizontal inset for embedded web module content (matches native ModuleScreen padding). */
export const NATIVE_WEB_MODULE_INSET = 16

export function nativeWebModuleCanvas(theme: NativeWebThemePayload): string {
  return theme.isDark ? theme.background : NATIVE_WEB_MODULE_CANVAS_LIGHT
}

export function nativeWebThemePayload(tokens: AppThemeTokens): NativeWebThemePayload {
  return {
    isDark: tokens.isDark,
    accent: tokens.accent,
    accentHover: tokens.accentHover,
    accentSoft: tokens.accentSoft,
    accentSoftStrong: tokens.accentSoftStrong,
    accentBorder: tokens.accentBorder,
    accentDark: tokens.accentDark,
    background: tokens.background,
    surface: tokens.surface,
    tint: tokens.tint,
    border: tokens.border,
    text: tokens.text,
    textSecondary: tokens.textSecondary,
    textMuted: tokens.textMuted,
    warning: tokens.warning,
    groupedBackground: tokens.native.groupedBackground,
  }
}

export function buildNativeWebThemeCss(theme: NativeWebThemePayload): string {
  const ntRoot = "body.cc-native-app [data-notetaker-native-root]"
  const qz = "body.cc-native-app [data-quiz-native-root]"
  const canvas = nativeWebModuleCanvas(theme)

  return `
:root {
  --cc-accent: ${theme.accent};
  --cc-accent-hover: ${theme.accentHover};
  --cc-accent-soft: ${theme.accentSoft};
  --cc-accent-soft-strong: ${theme.accentSoftStrong};
  --cc-accent-border: ${theme.accentBorder};
  --cc-accent-dark: ${theme.accentDark};
  --cc-background: ${theme.background};
  --cc-notetaker-canvas: ${canvas};
  --cc-surface: ${theme.surface};
  --cc-text: ${theme.text};
  --cc-text-secondary: ${theme.textSecondary};
  --cc-text-muted: ${theme.textMuted};
  --cc-warning: ${theme.warning};
  --primary: var(--cc-accent);
  --primary-foreground: #ffffff;
  --background: var(--cc-background);
  --foreground: var(--cc-text);
  --card: var(--cc-surface);
  --card-foreground: var(--cc-text);
  --border: ${theme.border};
  --ring: var(--cc-accent-border);
  --muted: ${theme.tint};
  --muted-foreground: var(--cc-text-muted);
  --secondary: ${theme.tint};
  --secondary-foreground: var(--cc-text);
}

html, body.cc-native-app {
  background: var(--cc-background) !important;
  color: var(--cc-text);
}

body.cc-native-app .dashboard-v2-premium,
body.cc-native-app .dashboard-v2-shell,
body.cc-native-app .native-app-compact,
body.cc-native-app .native-app-shell {
  background: var(--cc-background) !important;
}

body.cc-native-app[data-cc-notetaker-native="true"],
body.cc-native-app[data-cc-notetaker-native="true"] html,
body.cc-native-app .dashboard-v2-premium:has([data-notetaker-native-root]),
body.cc-native-app main[data-tour="main-content"]:has([data-notetaker-native-root]) {
  background: var(--cc-notetaker-canvas) !important;
  background-image: none !important;
  --cc-background: var(--cc-notetaker-canvas);
  --background: var(--cc-notetaker-canvas);
  padding: 8px ${NATIVE_WEB_MODULE_INSET}px 32px !important;
  box-sizing: border-box !important;
}

${ntRoot} {
  background: var(--cc-notetaker-canvas) !important;
  background-image: none !important;
  color: var(--cc-text) !important;
}

${ntRoot}.bg-gradient-to-br,
${ntRoot}.bg-gradient-to-r,
${ntRoot}.bg-gradient-to-b,
${ntRoot}.min-h-screen {
  background: var(--cc-notetaker-canvas) !important;
  background-image: none !important;
}

/* Native grouped layout — matches ModuleScreen / inset lists. */
[data-notetaker-native-layout].cc-native-notetaker {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-width: 0;
}

.cc-native-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.cc-native-section-header {
  margin: 0 0 8px 2px;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  letter-spacing: -0.08px;
  color: var(--cc-text-secondary) !important;
  text-transform: none;
}

.cc-native-group {
  background: var(--cc-surface) !important;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: none !important;
  border: none !important;
}

.cc-native-panel {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cc-native-panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  color: var(--cc-text) !important;
}

.cc-native-panel-body {
  margin: 0;
  font-size: 13px;
  line-height: 18px;
  color: var(--cc-text-secondary) !important;
}

.cc-native-progress-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.cc-native-progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  line-height: 16px;
  color: var(--cc-text-muted) !important;
}

.cc-native-progress {
  background: ${hexToRgba(theme.accent, 0.12)} !important;
}

.cc-native-progress > div {
  background: var(--cc-accent) !important;
}

.cc-native-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 12px;
  background: var(--cc-surface) !important;
  border: 0.5px solid ${theme.border} !important;
  box-shadow: none !important;
}

.cc-native-search-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--cc-text-muted) !important;
}

.cc-native-search-input {
  flex: 1;
  min-width: 0;
  border: 0 !important;
  outline: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 6px 0 !important;
  margin: 0 !important;
  font-size: 16px !important;
  line-height: 20px !important;
  color: var(--cc-text) !important;
}

.cc-native-search-input::placeholder {
  color: var(--cc-text-muted) !important;
}

.cc-native-row,
.cc-native-link-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 12px 14px;
  border: 0 !important;
  border-bottom: 0.5px solid ${theme.border} !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  text-decoration: none !important;
  color: inherit !important;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.cc-native-row-last,
.cc-native-note-item-last .cc-native-note-link {
  border-bottom: none !important;
}

.cc-native-row:active,
.cc-native-link-row:active,
.cc-native-note-link:active {
  opacity: 0.55;
}

.cc-native-row-primary .cc-native-row-title {
  color: var(--cc-accent) !important;
}

.cc-native-row-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cc-native-row-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  letter-spacing: -0.2px;
  color: var(--cc-text) !important;
}

.cc-native-row-subtitle {
  font-size: 12px;
  line-height: 16px;
  color: var(--cc-text-secondary) !important;
}

.cc-native-row-chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--cc-text-muted) !important;
  opacity: 0.65;
}

.cc-native-icon-tile {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${hexToRgba(theme.textMuted, 0.12)} !important;
  color: var(--cc-text-secondary) !important;
}

.cc-native-icon-tile-accent {
  background: var(--cc-accent-soft) !important;
  color: var(--cc-accent) !important;
}

.cc-native-status-pill {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 14px;
  text-transform: capitalize;
  background: ${hexToRgba(theme.textMuted, 0.12)} !important;
  color: var(--cc-text-secondary) !important;
}

.cc-native-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cc-native-note-item {
  display: flex;
  align-items: stretch;
  border-bottom: 0.5px solid ${theme.border};
}

.cc-native-note-item-last {
  border-bottom: none;
}

.cc-native-note-link {
  flex: 1;
  min-width: 0;
}

.cc-native-note-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  flex-shrink: 0;
  border: 0;
  border-left: 0.5px solid ${theme.border};
  background: transparent !important;
  color: #ff3b30 !important;
}

.cc-native-empty,
.cc-native-empty-block {
  padding: 28px 16px;
  text-align: center;
}

.cc-native-empty {
  margin: 0;
  font-size: 13px;
  line-height: 18px;
  color: var(--cc-text-secondary) !important;
}

.cc-native-empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.cc-native-empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
}

.cc-native-empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--cc-text) !important;
}

.cc-native-empty-body {
  margin: 0;
  max-width: 280px;
  font-size: 13px;
  line-height: 18px;
  color: var(--cc-text-secondary) !important;
}

.cc-native-inline-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--cc-text-muted) !important;
  border-bottom: 0.5px solid ${theme.border};
}

.cc-native-skeleton-list {
  display: flex;
  flex-direction: column;
}

.cc-native-skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 0.5px solid ${theme.border};
}

.cc-native-skeleton-tile {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: ${hexToRgba(theme.textMuted, 0.12)};
}

.cc-native-skeleton-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cc-native-skeleton-line {
  height: 10px;
  border-radius: 999px;
  background: ${hexToRgba(theme.textMuted, 0.12)};
}

.cc-native-skeleton-line-wide {
  width: 68%;
}

.cc-native-skeleton-line-narrow {
  width: 42%;
}

/* Legacy web notetaker cards (non-native layout) — theme accents only. */
${ntRoot}:not([data-notetaker-native-layout]) .bg-gradient-to-r,
${ntRoot}:not([data-notetaker-native-layout]) button.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--cc-accent), var(--cc-accent-hover)) !important;
  color: #ffffff !important;
}

${ntRoot}:not([data-notetaker-native-layout]) .text-primary,
${ntRoot}:not([data-notetaker-native-layout]) .text-indigo-600,
${ntRoot}:not([data-notetaker-native-layout]) .text-violet-600 {
  color: var(--cc-accent) !important;
}

${ntRoot}:not([data-notetaker-native-layout]) .bg-primary {
  background-color: var(--cc-accent) !important;
}

${ntRoot}:not([data-notetaker-native-layout]) .bg-primary\\/10 {
  background-color: var(--cc-accent-soft) !important;
}

${qz},
body.cc-native-app main[data-tour="main-content"]:has([data-quiz-native-root]),
body.cc-native-app html:has([data-quiz-native-root]),
body.cc-native-app body:has([data-quiz-native-root]) {
  background: var(--cc-background) !important;
}

${qz} button.bg-gradient-to-r,
${qz} button.bg-gradient-to-r.from-blue-600,
${qz} .from-blue-500,
${qz} .from-blue-600,
${qz} .to-indigo-600,
${qz} .to-indigo-700 {
  --tw-gradient-from: var(--cc-accent) var(--tw-gradient-from-position);
  --tw-gradient-to: var(--cc-accent-hover) var(--tw-gradient-to-position);
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);
}

${qz} button.bg-gradient-to-r.from-blue-600 {
  background-image: linear-gradient(to right, var(--cc-accent), var(--cc-accent-hover)) !important;
  color: #ffffff !important;
}

${qz} .bg-blue-600,
${qz} .bg-indigo-600 {
  background-color: var(--cc-accent) !important;
  color: #ffffff !important;
}

${qz} .text-blue-600,
${qz} .text-indigo-600 {
  color: var(--cc-accent) !important;
}

${qz} .text-primary,
${qz} .border-primary,
${qz} .ring-primary {
  color: var(--cc-accent) !important;
  border-color: var(--cc-accent-border) !important;
  --tw-ring-color: var(--cc-accent-border) !important;
}
`.trim()
}

/** Standalone script — re-run when appearance theme changes without reloading the WebView. */
export function buildNativeWebThemeInjectScript(tokens: AppThemeTokens): string {
  const theme = nativeWebThemePayload(tokens)
  const css = JSON.stringify(buildNativeWebThemeCss(theme))
  const themeJson = JSON.stringify(theme)

  return `
    (function () {
      try {
        var theme = ${themeJson};
        var css = ${css};
        var root = document.documentElement;
        if (theme.isDark) {
          root.classList.add('dark');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.remove('dark');
          root.style.colorScheme = 'light';
        }
        var isNotetaker = /\\/ai-notetaker(?:\\/|$)/.test(window.location.pathname || '');
        var pageBg = isNotetaker
          ? (theme.isDark ? theme.background : '${NATIVE_WEB_MODULE_CANVAS_LIGHT}')
          : theme.background;
        root.style.backgroundColor = pageBg;
        if (document.body) document.body.style.backgroundColor = pageBg;
        if (isNotetaker) {
          document.body.dataset.ccNotetakerNative = 'true';
        } else {
          delete document.body.dataset.ccNotetakerNative;
        }
        var style = document.getElementById('cc-native-theme-style');
        if (!style) {
          style = document.createElement('style');
          style.id = 'cc-native-theme-style';
          (document.head || document.documentElement).appendChild(style);
        }
        style.textContent = css;
      } catch (e) {}
      true;
    })();
  `
}
