/**
 * Injected into the embedded web quiz-taker while an assessment is live.
 *
 * Removes the routes a student can use to lift question text out of the app:
 * the iOS long-press callout (Copy / Look Up / Share…), text selection outside
 * answer fields, the context menu, and drag-out of question images. Answer
 * inputs and code editors keep normal selection so typing, cursor placement and
 * the instructor-controlled copy/paste policy still work.
 */
export const ASSESSMENT_WEBVIEW_HARDENING_SCRIPT = `(function () {
  try {
    if (window.__ccAssessmentHardened) return;
    window.__ccAssessmentHardened = true;

    var css = [
      'html, body { -webkit-touch-callout: none !important; }',
      'body, body * { -webkit-user-select: none !important; user-select: none !important; -webkit-user-drag: none !important; }',
      'input, textarea, select, [contenteditable="true"], [contenteditable=""],',
      '.cm-editor, .cm-editor *, .cm-content, .monaco-editor, .monaco-editor * {',
      '  -webkit-user-select: text !important; user-select: text !important;',
      '  -webkit-touch-callout: default !important;',
      '}'
    ].join('\\n');

    var apply = function () {
      if (!document.head || document.getElementById('cc-assessment-hardening')) return;
      var style = document.createElement('style');
      style.id = 'cc-assessment-hardening';
      style.textContent = css;
      document.head.appendChild(style);
    };
    apply();
    document.addEventListener('DOMContentLoaded', apply);

    var isEditable = function (el) {
      if (!el || !el.closest) return false;
      return !!el.closest('input, textarea, select, [contenteditable="true"], .cm-editor, .monaco-editor');
    };

    document.addEventListener('contextmenu', function (e) {
      if (!isEditable(e.target)) e.preventDefault();
    }, true);

    document.addEventListener('dragstart', function (e) {
      if (!isEditable(e.target)) e.preventDefault();
    }, true);
  } catch (err) {
    /* hardening is best-effort */
  }
})();
true;`
