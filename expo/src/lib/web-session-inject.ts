import type { AppThemeTokens } from "../constants/app-themes"
import {
  buildNativeWebThemeCss,
  nativeWebModuleCanvas,
  nativeWebThemePayload,
  NATIVE_WEB_MODULE_CANVAS_LIGHT,
  type NativeWebThemePayload,
} from "./native-web-theme-inject"
import type { FacultySession, GuestSession, StudentSession, SummerSession } from "./session"

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000
const NATIVE_LIGHT_BG = "#f8fafc"
const NATIVE_DARK_BG = "#0c0f16"

/** Inject web session storage so dashboard-v2 pages authenticate like the browser. */
export type StudentWebInjectOptions = {
  /** Full-screen lecture slide viewer — hide dashboard chrome. */
  immersiveLecture?: boolean
  /** Selected appearance theme — drives CSS variables in embedded web modules. */
  theme?: AppThemeTokens
}

function resolveStudentNativeBackground(theme?: AppThemeTokens): NativeWebThemePayload | null {
  return theme ? nativeWebThemePayload(theme) : null
}

export function buildWebSessionInjectScript(
  session: StudentSession,
  options?: StudentWebInjectOptions,
): string {
  const webSession = {
    id: session.id,
    name: session.name,
    section: session.section,
    databaseId: session.databaseId,
    courseId: session.courseId,
    courseCode: session.courseCode,
    courseTitle: session.courseTitle,
    expiresAt: Date.now() + SESSION_DURATION_MS}

  const payload = JSON.stringify(webSession)
  const immersive = Boolean(options?.immersiveLecture)
  const themePayload = resolveStudentNativeBackground(options?.theme)
  const themeJson = themePayload ? JSON.stringify(themePayload) : "null"
  const themeCss = themePayload ? JSON.stringify(buildNativeWebThemeCss(themePayload)) : "null"
  const defaultBg = themePayload?.background ?? NATIVE_LIGHT_BG
  const notetakerCanvas = themePayload ? nativeWebModuleCanvas(themePayload) : NATIVE_WEB_MODULE_CANVAS_LIGHT
  return `
    (function () {
      try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
          crypto.randomUUID = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              var r = Math.random() * 16 | 0;
              var v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
          };
        }
        var session = ${payload};
        var immersive = ${immersive ? "true" : "false"};
        var theme = ${themeJson};
        var themeCss = ${themeCss};
        var lightBg = theme ? theme.background : '${NATIVE_LIGHT_BG}';
        var notetakerBg = theme ? ${JSON.stringify(notetakerCanvas)} : '${NATIVE_WEB_MODULE_CANVAS_LIGHT}';
        var darkBg = '${NATIVE_DARK_BG}';
        var isNotetaker = /\\/ai-notetaker(?:\\/|$)/.test(window.location.pathname || '');
        var pageBg = isNotetaker ? notetakerBg : lightBg;
        window.__COURSE_COLLAB_NATIVE__ = true;
        document.documentElement.dataset.nativeApp = 'true';
        document.documentElement.style.backgroundColor = pageBg;
        if (theme && theme.isDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
        if (document.body) {
          document.body.classList.add('cc-native-app');
          document.body.style.backgroundColor = pageBg;
          if (immersive) document.body.classList.add('cc-student-lecture-immersive');
        } else {
          document.addEventListener('DOMContentLoaded', function () {
            document.body.classList.add('cc-native-app');
            document.body.style.backgroundColor = pageBg;
            if (immersive) document.body.classList.add('cc-student-lecture-immersive');
          });
        }
        if (themeCss) {
          var themeStyle = document.getElementById('cc-native-theme-style');
          if (!themeStyle) {
            themeStyle = document.createElement('style');
            themeStyle.id = 'cc-native-theme-style';
            (document.head || document.documentElement).appendChild(themeStyle);
          }
          themeStyle.textContent = themeCss;
        }
        if (/\\/ai-notetaker(?:\\/|$)/.test(window.location.pathname || '')) {
          if (document.body) document.body.dataset.ccNotetakerNative = 'true';
        }
        localStorage.setItem('studentSession', JSON.stringify(session));
        localStorage.setItem('studentDatabaseId', session.databaseId || '');
        sessionStorage.setItem('studentId', session.id || '');
        sessionStorage.setItem('studentName', session.name || '');
        sessionStorage.setItem('studentSection', session.section || '');
        sessionStorage.setItem('studentDatabaseId', session.databaseId || '');
        var style = document.createElement('style');
        var rules = [
          'html,body{background:' + lightBg + '!important}',
          'body.cc-native-app .dashboard-v2-premium,body.cc-native-app .dashboard-v2-shell{background:' + lightBg + '!important}',
          'body.cc-native-app:has([data-codebench-native-root]) .dashboard-v2-premium,',
          'body.cc-native-app:has([data-codebench-native-root]) .dashboard-v2-shell,',
          'body.cc-native-app:has([data-codebench-native-root]) html,',
          'body.cc-native-app:has([data-codebench-native-root]) body{background:' + darkBg + '!important}',
          'body.cc-native-app [data-native-hide],body.cc-native-app [data-dashboard-topbar],body.cc-native-app aside[data-tour="sidebar"]{display:none!important}',
          'body.cc-native-app main[data-tour="main-content"]{margin-left:0!important;padding-top:0!important;padding-bottom:0!important}',
          'body.cc-native-app[data-cc-notetaker-native="true"],body.cc-native-app[data-cc-notetaker-native="true"] html,body.cc-native-app[data-cc-notetaker-native="true"] body{background:' + notetakerBg + '!important}',
          'body.cc-native-app main[data-tour="main-content"]:has([data-notetaker-native-root]){padding:8px 16px 32px!important;background:' + notetakerBg + '!important;box-sizing:border-box!important}',
          'body.cc-native-app .dashboard-v2-premium:has([data-notetaker-native-root]){background:' + notetakerBg + '!important;overflow-y:auto!important}',
          'body.cc-native-app .question-text-content .katex:not(.katex-display){display:inline-block;margin:0 0.42em;padding:0 0.08em;vertical-align:-0.08em}',
          'body.cc-native-app .question-text-content .katex-display{margin:0.65rem 0}',
          'body.cc-native-app [data-quiz-native-root]{min-height:100%!important}',
          /* CodeBench native: keep XP visible; allow toolbars to scroll; fix XP menu contrast */
          'body.cc-native-app [data-codebench-native-shell],body.cc-native-app [data-codebench-toolbar]{min-width:0!important}',
          'body.cc-native-app [data-codebench-toolbar-top]{overflow:hidden!important;min-width:0!important}',
          'body.cc-native-app [data-codebench-toolbar-scroll],body.cc-native-app [data-codebench-toolbar-tools]{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important;scrollbar-width:none!important;min-width:0!important;flex:1 1 auto!important}',
          'body.cc-native-app [data-codebench-toolbar-scroll]::-webkit-scrollbar,body.cc-native-app [data-codebench-toolbar-tools]::-webkit-scrollbar{display:none!important;height:0!important}',
          'body.cc-native-app [data-codebench-xp-slot],body.cc-native-app [data-codebench-xp-trigger]{flex-shrink:0!important}',
          'body.cc-native-app [data-codebench-xp-trigger]{max-width:64px!important;min-width:52px!important;padding-left:8px!important;padding-right:8px!important}',
          'body.cc-native-app [data-codebench-xp-menu],body.cc-native-app [data-codebench-xp-menu] *{color:inherit}',
          'body.cc-native-app [data-codebench-xp-menu]{background:#ffffff!important;color:#0f172a!important;border-color:#e2e8f0!important}',
          'body.cc-native-app [data-codebench-xp-menu] [data-codebench-xp-tracker] p,body.cc-native-app [data-codebench-xp-menu] [data-codebench-xp-tracker] span{color:#0f172a!important}',
          'body.cc-native-app [data-codebench-xp-menu] [data-codebench-xp-tracker] p:first-child,body.cc-native-app [data-codebench-xp-menu] [data-codebench-xp-tracker] span:last-child{color:#9a7200!important}',
          'body.cc-native-app [data-codebench-xp-menu] [role="menuitem"]{color:#0f172a!important;font-weight:600!important}',
          'body.cc-native-app [data-codebench-xp-menu] [role="menuitem"][data-highlighted],body.cc-native-app [data-codebench-xp-menu] [role="menuitem"]:focus{background:rgba(88,44,131,0.12)!important;color:#582c83!important}',
          'body.cc-native-app [data-codebench-xp-menu] [role="menuitem"] span{color:inherit!important}',
          /* Fallback for production toolbar before data-* attrs ship: scroll the whole top control row */
          'body.cc-native-app [data-codebench-native-shell] > div:first-child > div:first-child{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important;scrollbar-width:none!important;min-width:0!important}',
          'body.cc-native-app [data-codebench-native-shell] > div:first-child > div:first-child::-webkit-scrollbar{display:none!important}',
          'body.cc-native-app [data-codebench-native-shell] > div:first-child > div:nth-child(2){overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important}',
          'body.cc-native-app:has([data-codebench-native-shell]) [data-radix-popper-content-wrapper] [role="menuitem"]{color:#0f172a!important;font-weight:600!important}',
          'body.cc-native-app:has([data-codebench-native-shell]) [data-radix-popper-content-wrapper] [role="menuitem"] span{color:#0f172a!important}',
          'body.cc-native-app:has([data-codebench-native-shell]) [data-radix-popper-content-wrapper] [role="menuitem"][data-highlighted],body.cc-native-app:has([data-codebench-native-shell]) [data-radix-popper-content-wrapper] [role="menuitem"]:focus{background:rgba(88,44,131,0.12)!important;color:#582c83!important}',
          'body.cc-native-app:has([data-codebench-native-shell]) [data-radix-popper-content-wrapper] [role="menuitem"][data-highlighted] span,body.cc-native-app:has([data-codebench-native-shell]) [data-radix-popper-content-wrapper] [role="menuitem"]:focus span{color:#582c83!important}',
        ];
        if (immersive) {
          rules.push(
            'body.cc-student-lecture-immersive .dashboard-v2-premium,body.cc-student-lecture-immersive .dashboard-v2-shell{height:100%!important;max-height:100%!important;min-height:0!important;overflow:hidden!important}',
            'body.cc-student-lecture-immersive .dashboard-v2-premium > div,body.cc-student-lecture-immersive .dashboard-v2-shell > div{height:100%!important;max-height:100%!important;min-height:0!important}',
            'body.cc-student-lecture-immersive [data-dashboard-topbar],body.cc-student-lecture-immersive aside[data-tour="sidebar"]{display:none!important}',
            'body.cc-student-lecture-immersive main[data-tour="main-content"]{margin-left:0!important;padding:0!important;min-height:0!important;height:100%!important}',
          );
        }
        style.textContent = rules.join('');
        (document.head || document.documentElement).appendChild(style);
      } catch (e) {}
      true;
    })();
  `
}

export function buildGuestWebSessionInjectScript(
  session: GuestSession,
  options?: StudentWebInjectOptions,
): string {
  const studentLike: StudentSession = {
    portal: "student",
    id: session.id,
    name: session.name,
    databaseId: session.databaseId,
    section: "GUEST",
    expiresAt: session.expiresAt,
  }
  return buildWebSessionInjectScript(studentLike, options)
}

export function buildSummerWebSessionInjectScript(
  session: SummerSession,
  options?: StudentWebInjectOptions,
): string {
  const webSession = {
    id: session.id,
    name: session.name,
    databaseId: session.databaseId,
    email: session.email ?? "",
    studentProgramRole: session.studentProgramRole ?? "summer_camper",
    section: "SUMMER_CAMP",
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }

  const payload = JSON.stringify(webSession)
  const themePayload = resolveStudentNativeBackground(options?.theme)
  const themeJson = themePayload ? JSON.stringify(themePayload) : "null"
  const themeCss = themePayload ? JSON.stringify(buildNativeWebThemeCss(themePayload)) : "null"
  const defaultBg = themePayload?.background ?? NATIVE_LIGHT_BG

  return `
    (function () {
      try {
        var session = ${payload};
        var theme = ${themeJson};
        var themeCss = ${themeCss};
        var lightBg = theme ? theme.background : '${NATIVE_LIGHT_BG}';
        window.__COURSE_COLLAB_NATIVE__ = true;
        document.documentElement.dataset.nativeApp = 'true';
        document.documentElement.style.backgroundColor = lightBg;
        if (theme && theme.isDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        }
        localStorage.setItem('summerCampSession', JSON.stringify(session));
        localStorage.setItem('studentSession', JSON.stringify(session));
        localStorage.setItem('studentDatabaseId', session.databaseId || '');
        sessionStorage.setItem('studentId', session.id || '');
        sessionStorage.setItem('studentName', session.name || '');
        sessionStorage.setItem('studentSection', session.section || 'SUMMER_CAMP');
        if (themeCss) {
          var themeStyle = document.getElementById('cc-native-theme-style');
          if (!themeStyle) {
            themeStyle = document.createElement('style');
            themeStyle.id = 'cc-native-theme-style';
            (document.head || document.documentElement).appendChild(themeStyle);
          }
          themeStyle.textContent = themeCss;
        }
        var style = document.createElement('style');
        style.textContent = [
          'html,body{background:' + lightBg + '!important}',
          'body.cc-native-app [data-native-hide],body.cc-native-app [data-dashboard-topbar]{display:none!important}',
          'body.cc-native-app aside[data-tour="sidebar"]{display:none!important}',
          'body.cc-native-app main[data-tour="main-content"]{margin-left:0!important;padding-top:0!important}',
        ].join('');
        (document.head || document.documentElement).appendChild(style);
        function applyBodyClasses() {
          document.body.classList.add('cc-native-app');
          document.body.style.backgroundColor = lightBg;
        }
        if (document.body) applyBodyClasses();
        else document.addEventListener('DOMContentLoaded', applyBodyClasses);
      } catch (e) {}
      true;
    })();
  `
}

export type FacultyWebInjectOptions = {
  /** Full-screen lecture preview — hide dashboard chrome, show only slide viewer. */
  immersiveLecture?: boolean
}

export function buildFacultyWebSessionInjectScript(
  session: FacultySession,
  course?: { id: number; course_code: string; course_title: string } | null,
  options?: FacultyWebInjectOptions,
): string {
  const webSession = {
    id: session.id,
    username: session.username,
    name: session.name,
    email: session.email,
    role: session.role,
    selectedCourseId: course?.id ?? null,
    selectedCourseCode: course?.course_code ?? null,
    selectedCourseTitle: course?.course_title ?? null,
    expiresAt: Date.now() + SESSION_DURATION_MS}

  const payload = JSON.stringify(webSession)
  const immersive = Boolean(options?.immersiveLecture)
  return `
    (function () {
      try {
        var session = ${payload};
        var immersive = ${immersive ? "true" : "false"};
        var lightBg = '${NATIVE_LIGHT_BG}';
        window.__COURSE_COLLAB_NATIVE__ = true;
        document.documentElement.dataset.nativeApp = 'true';
        document.documentElement.style.backgroundColor = lightBg;
        document.documentElement.style.colorScheme = 'light';
        localStorage.setItem('instructorSession', JSON.stringify(session));
        localStorage.setItem('instructorId', String(session.id || ''));
        if (session.selectedCourseId != null) {
          localStorage.setItem('selectedCourseId', String(session.selectedCourseId));
        }
        var rules = [
          'html,body{background:' + lightBg + '!important;color-scheme:light;margin:0;padding:0;width:100%;height:100%;overflow:hidden}',
          'body.cc-native-app [data-native-hide],body.cc-native-app [data-dashboard-topbar],body.cc-native-app aside[data-tour="sidebar"]{display:none!important}',
          'body.cc-native-app main[data-tour="main-content"],body.cc-native-app .instructor-dashboard-v2 main{margin-left:0!important;padding-top:0!important;padding-bottom:0!important}',
          'body.cc-native-app [data-lecture-native-back]{display:none!important}',
          'body.cc-native-app [data-lecture-viewer-nav]{padding-top:0!important}',
        ];
        if (immersive) {
          rules.push(
            'body.cc-faculty-lecture-immersive .instructor-dashboard-v2{height:100%!important;max-height:100%!important;min-height:0!important;overflow:hidden!important}',
            'body.cc-faculty-lecture-immersive .instructor-dashboard-v2 > div.relative{height:100%!important;max-height:100%!important;min-height:0!important;overflow:hidden!important}',
            'body.cc-faculty-lecture-immersive .instructor-dashboard-v2 > div.relative > header{display:none!important}',
            'body.cc-faculty-lecture-immersive .instructor-dashboard-v2 aside{display:none!important}',
            'body.cc-faculty-lecture-immersive .instructor-dashboard-v2 main{margin-left:0!important;padding:0!important;min-height:0!important;flex:1!important}',
            'body.cc-faculty-lecture-immersive .instructor-dashboard-v2 .fixed.pointer-events-none{display:none!important}',
            'body.cc-faculty-lecture-immersive .instructor-dashboard-v2 .flex.min-h-0.flex-1{min-height:0!important;height:100%!important}',
          );
        }
        var style = document.createElement('style');
        style.id = 'cc-native-faculty-style';
        style.textContent = rules.join('');
        var prev = document.getElementById('cc-native-faculty-style');
        if (prev) prev.remove();
        (document.head || document.documentElement).appendChild(style);
        function applyBodyClasses() {
          document.body.classList.add('cc-native-app');
          document.body.style.backgroundColor = lightBg;
          if (immersive) document.body.classList.add('cc-faculty-lecture-immersive');
        }
        if (document.body) applyBodyClasses();
        else document.addEventListener('DOMContentLoaded', applyBodyClasses);
      } catch (e) {}
      true;
    })();
  `
}

export const NATIVE_APP_UA_SUFFIX = " CourseCollab-Native"

export type LectureWebToolPanel = "workspace" | "sample-practice"

/** Hide student save-notes UI and disable ink editing in embedded lecture workspace. */
export function buildLectureWorkspaceStudentViewInjectScript(): string {
  return `
    (function () {
      function applyReadOnlyWorkspace() {
        try {
          var nodes = document.querySelectorAll('button,[role="button"]');
          for (var i = 0; i < nodes.length; i++) {
            var label = String(nodes[i].textContent || nodes[i].getAttribute('aria-label') || '').trim();
            if (label === 'Save notes' || label === 'Saving…') {
              nodes[i].style.display = 'none';
            }
          }
          var spans = document.querySelectorAll('span,p,div');
          for (var j = 0; j < spans.length; j++) {
            var text = String(spans[j].textContent || '');
            if (text.indexOf('autosave') !== -1 || text.indexOf('Your notes autosave') !== -1) {
              spans[j].style.display = 'none';
            }
          }
          var styleId = 'cc-native-workspace-readonly';
          if (!document.getElementById(styleId)) {
            var style = document.createElement('style');
            style.id = styleId;
            style.textContent = [
              'canvas { pointer-events: none !important; }',
              '[data-circuit-workspace-canvas], [data-workspace-canvas] { pointer-events: none !important; }',
              '[data-workspace-toolbar] button, [data-circuit-workspace-toolbar] button { pointer-events: none !important; opacity: 0.55; }',
            ].join('');
            (document.head || document.documentElement).appendChild(style);
          }
        } catch (e) {}
      }
      applyReadOnlyWorkspace();
      var ticks = 0;
      var timer = setInterval(function () {
        applyReadOnlyWorkspace();
        if (++ticks > 40) clearInterval(timer);
      }, 400);
      true;
    })();
  `
}

/** Combined inject: open workspace panel + student read-only chrome. */
export function buildLectureWorkspaceNativeInjectScript(): string {
  return `${buildLectureToolPanelInjectScript("workspace")}\n${buildLectureWorkspaceStudentViewInjectScript()}`
}

/** After the lecture web viewer loads, open the requested tool panel instead of the slide deck. */
export function buildLectureToolPanelInjectScript(panel: LectureWebToolPanel): string {
  const panelJson = JSON.stringify(panel)
  return `
    (function () {
      var panel = ${panelJson};
      var labels = panel === 'workspace'
        ? ['workspace', 'in-class workspace', 'problems']
        : ['sample practice', 'practice', 'examples'];
      function matchesLabel(text) {
        var value = String(text || '').trim().toLowerCase();
        if (!value) return false;
        return labels.some(function (label) { return value.indexOf(label) !== -1; });
      }
      function tryOpen() {
        var attrSelectors = panel === 'workspace'
          ? [
              '[data-lecture-panel="workspace"]',
              '[data-native-lecture-workspace]',
              '[data-open-workspace]',
              '[data-workspace-trigger]',
            ]
          : [
              '[data-lecture-panel="sample-practice"]',
              '[data-native-lecture-sample-practice]',
              '[data-open-sample-practice]',
              '[data-sample-practice-trigger]',
            ];
        for (var i = 0; i < attrSelectors.length; i++) {
          var attrTarget = document.querySelector(attrSelectors[i]);
          if (attrTarget) {
            attrTarget.click();
            return true;
          }
        }
        var buttons = document.querySelectorAll('button,[role="button"],a');
        for (var j = 0; j < buttons.length; j++) {
          var btn = buttons[j];
          var aria = btn.getAttribute('aria-label') || btn.getAttribute('title') || btn.textContent || '';
          if (matchesLabel(aria)) {
            btn.click();
            return true;
          }
        }
        if (typeof window.__ccOpenLecturePanel === 'function') {
          window.__ccOpenLecturePanel(panel);
          return true;
        }
        try {
          window.dispatchEvent(new CustomEvent('cc-native-open-lecture-panel', { detail: { panel: panel } }));
        } catch (e) {}
        return false;
      }
      var attempts = 0;
      var timer = setInterval(function () {
        if (tryOpen() || ++attempts > 48) clearInterval(timer);
      }, 250);
      true;
    })();
  `
}
