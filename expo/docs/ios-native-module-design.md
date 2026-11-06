# CourseCollab — Native + Modern Module Design

Canonical guide for designing or redesigning any faculty/student module in the Expo app.
Apply this whenever building a new module screen or remodeling an existing one.

**Direction:** a **blend** — native iOS/Android structure and interaction patterns, with **controlled modern brand personality** (accordion drawer, semantic color tiles, dashboard KPIs). Not a pure Settings clone; not a web dashboard.

**Sources (Apple HIG + materials):**
- [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)
- [Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)

**Implementation anchors in this repo:**
- Tokens (iOS + Android): `expo/src/constants/faculty-native-theme.ts` (`NATIVE`, `SYSTEM`)
- Communication accents: `expo/src/constants/faculty-communication-theme.ts`
- Shared UI: `expo/src/components/faculty/faculty-communication-ui.tsx`, `faculty-shared.tsx`, `faculty-module-shell.tsx`
- **Module Action Bar:** `ModuleSearchDockProvider` + `StudentSearchToolbar` / `FacultySearchToolbar` + `ModuleAddActionSheet`. Intentional Search / Add / Filter dock. Do not remove it solely because it sits at the bottom of a page.
- Shell chrome: `expo/src/components/shell/shell-shared.tsx` (`nativeChrome`), `FacultyDrawer.tsx`, `FacultyTopBar.tsx`
- Reference modules: Notifications, Discussions, Student Support; Dashboard uses the same canvas
- Modern accents: `MODERN` in `faculty-native-theme.ts` (drawer, KPIs, brand stripe)
- **Faculty Color Hunt (web parity):** [faculty-color-hunt-palettes.md](./faculty-color-hunt-palettes.md) — orange CTAs, cyan links, signature list cards, per-module tokens
- **Student Color Hunt (web parity):** [student-color-hunt-palettes.md](./student-color-hunt-palettes.md)

---

## 0. Native + Modern blend (read first)

CourseCollab should feel **at home on iOS and Android** while still looking like **our product**.

| Zone | Native (structure wins) | Modern (personality wins) |
|------|-------------------------|---------------------------|
| **Module screens** | Grouped canvas, inset lists, hairlines, Title Case headers, segmented filters, system tint text actions | Soft **semantic icon tiles** on rows; one **module accent** per area; status chips with dot + label |
| **Side drawer** | Clear hierarchy, readable type, single expanded accordion group | **Accordion chips**, gradient nav icons, gold brand stripe, animated rail, count badges |
| **Dashboard only** | Grouped sections, calm typography, pull-to-refresh | **KPI grid**, charts, quick-action chips, colored metric icons |
| **Top bar / sheets** | Native title weight, translucent chrome, safe areas | Notification badge; brand teal for primary CTAs outside system tint |
| **Everywhere** | Accessibility, no color-only status, search + “+” toolbar row | CourseCollab teal + gold used **sparingly** as brand anchors |

### Decision rule

1. **Layout, density, and interaction** → follow HIG / Material (`NATIVE`, grouped lists, sheets).
2. **Brand and scanability** → add modern touches only in the zones above.
3. When in doubt: **native structure, modern accent** — not the reverse.

### Examples in this repo

- **Good blend:** Communication modules (native inbox lists + orange/indigo/blue icon tiles); restored drawer accordion; dashboard KPI cards with `SYSTEM` colored icons.
- **Too native:** Flattening the drawer into a plain grouped list; removing all semantic color from rows.
- **Too modern:** Shadow-bordered cards for every list item; gradient heroes on every module; purple AI-default chrome.

---

## Platform notes (iOS + Android)

| Concern | iOS | Android |
|---------|-----|---------|
| Grouped canvas | `#f2f2f7` | `#f5f5f5` |
| Section radius | 12 | 16 |
| Row height | ~52 | ~56 |
| Title weight | 600 | 700 |
| Title tracking | −0.4 | 0.15 |
| Tint | `#007AFF` | `#1B6EF3` |
| Press | opacity ~0.55 | opacity ~0.88 + `android_ripple` where useful |
| Raised chrome | soft shadow | `elevation: 2` |
| Separators | HIG hairline rgba | Material 12% black |

Use `NATIVE` from `faculty-native-theme.ts` — never hard-code only iOS values. Keep one codebase; `Platform.select` lives inside tokens.

---

## 1. Core themes (always)

### Clarity
- Text legible at a glance; prefer system-like sizes (17 body, 13 secondary, 12 captions).
- Icons precise and paired with labels — never rely on color alone.
- Negative space and hierarchy highlight what matters; remove ornamental chrome.

### Deference
- Content is the star. UI supports tasks; it does not compete.
- Prefer light, airy surfaces over heavy borders or multi-layer shadows on **list rows**.
- Avoid card-everywhere layouts. Use **inset grouped lists** on a grouped background.
- **Exception (modern):** dashboard KPI/chart cards and drawer nav chips may use soft elevation — not module list items.

### Depth
- Hierarchy via layers: grouped canvas → white inset sections → sheets/modals above.
- Pressed opacity / brief highlight for feedback; sheets for detail, not nested pages when a page sheet fits.
- Content can sit on the standard materials layer; reserve “glass” feel for chrome (bars/sheets), not list rows.

---

## 2. Design principles checklist

| Principle | Do | Don’t |
|-----------|----|-------|
| **Aesthetic integrity** | Match seriousness of the task (faculty tools = calm, predictable) | Playful decoration that fights productivity |
| **Consistency** | Settings/Mail patterns, SF-like icons, shared tokens | One-off layouts per module |
| **Direct manipulation** | Tap rows, pull-to-refresh, segmented filters | Hidden actions with no affordance |
| **Feedback** | Pressed states, spinners, badges, status chips with labels | Silent failures or color-only status |
| **Metaphors** | Inbox, queues, boards, chevrons = drill-in | Fake skeuomorphism or web-dashboard widgets |
| **User control** | Cancel, Mark all read, Approve/Reject, filters | Auto-destructive actions without confirm |

---

## 3. Layout & structure (native recipes)

### Page canvas
- Background: `IOS.groupedBackground` (`#f2f2f7` on iOS) — **not** flat white full-bleed for list modules.
- Horizontal inset: ~16pt.
- Bottom padding: safe area + ~32.

### Inset grouped lists
- White group (`IOS.secondaryGrouped`) with `borderRadius: 12`.
- Rows separated by **hairline** separators, not individual bordered cards.
- Comfortable row min height ~52; icon tile ~30×30, radius ~7 (Settings style).
- Trailing **disclosure chevron** for navigation rows.

### Section headers & footers
- Header: **Title Case**, 13pt semibold, secondary label — not ALL CAPS screaming.
- Footer: 13pt secondary explanatory copy under the group.

### Filters & modes
- Prefer **segmented control** (iOS track + white active pill) for 2–3 modes (All / Unread, Boards / Moderation).
- Prefer system **tint blue** (`#007AFF`) for text actions (“Mark All as Read”).

### Empty states
- Centered icon in soft circular fill, title (semibold ~20), short secondary body.
- Title Case; calm copy; no emoji clutter.

### Sheets
- Use page-sheet / bottom sheet for detail and quick actions.
- Sheet background = grouped (`nativeChrome.sheetBg` / `#f2f2f7`).
- Grabber handle, clear title, one primary text action in the header when needed.

---

## 4. Color system

### Rules
1. **One primary meaning per color** in a module (don’t reuse orange for both “warning” and “brand flourish”).
2. **Never color alone** — always reinforce with icon and/or text label.
3. Prefer **Apple system hues** (`COMM_SYSTEM`: blue, indigo, orange, red, green, …) for status and categories.
4. Use **soft fills** behind icons; keep body text near black / secondary gray for contrast.
5. Tint interactive text with system blue unless the module owns a deliberate accent (e.g. notifications orange for unread dots only).

### Module accents (Communication reference)
| Module | Accent | Meaning |
|--------|--------|---------|
| Notifications | Orange | Attention / inbox |
| Discussions | Indigo | Conversation |
| Student Support | Blue | Help / system |

Extend the same pattern when adding modules: pick one accent family, keep semantic status colors consistent globally.

---

## 5. Typography

- Prefer default system font (San Francisco on iOS via React Native).
- Body rows ~17 regular; unread/emphasis → semibold, not giant weights everywhere.
- Secondary ~13–15 at `IOS.secondaryLabel`; tertiary for timestamps.
- Letter-spacing slightly tight on titles (`-0.3` / `-0.4`) to feel native.
- Support Dynamic Type when touching text styles later; don’t hard-lock tiny text.

---

## 6. Materials, Liquid Glass & version resilience

### Two layers (never confuse them)

| Layer | What belongs here | Material |
|-------|-------------------|----------|
| **Content** | Lists, forms, cards, charts, module screens | Standard / opaque grouped backgrounds (`NATIVE.groupedBackground`, white inset groups) |
| **Navigation / chrome** | Top bars, tab bars, toolbars, sidebars, sheets, menus, floating controls | System materials — including **Liquid Glass** on supported OS versions |

Apple’s rule: Liquid Glass is for the **navigation layer that floats above content**, not for every list row or dashboard card. See [Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) and [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass).

### What Liquid Glass is (for us)

- A **system** material on recent Apple OS releases: optical “glass” + fluid motion on bars, sheets, controls.
- Standard SwiftUI / UIKit / AppKit chrome (**NavigationBar**, **TabBar**, **Toolbar**, **Sheets**, **Menus**, …) picks it up when you build with the latest SDK — often **with little or no custom code**.
- Accessibility (Reduce Transparency, Increase Contrast, Reduce Motion) and user Liquid Glass preferences **adapt automatically** when you use system components.

### Will we have to redesign everything if Apple drops Liquid Glass?

**No — if we follow the resilient strategy below.**

| Approach | Risk if Apple changes materials | Our stance |
|----------|----------------------------------|------------|
| Hard-code blur/glass on every screen | High — full visual rewrite | **Forbidden** |
| Custom `glassEffect` / fake glass on content lists | High — fights HIG + a11y | **Forbidden** for module content |
| Design to **HIG structure** (grouped lists, sections, chrome vs content) + use **system / standard chrome** where possible | Low — content stays valid; chrome follows the OS | **Required** |
| Optional progressive enhancement for chrome only | Low — older OS keeps solid/translucent chrome | **Preferred** |

**Yes: designing with native standards so the frontend can look different per OS version is a real (and recommended) pattern.**

Think of it as:

1. **Semantic UI** — “this is a navigation bar / sheet / grouped list / primary action” (structure + meaning).
2. **Platform renderer** — iOS 26+ may paint chrome with Liquid Glass; older iOS uses classic bars; Android uses Material. Same screen definition, different presentation.

Apple’s own adoption path is exactly that: rebuild with latest SDKs, prefer standard components, remove custom bar backgrounds that block system materials. If materials evolve again, system components track the platform; your **content** layout (grouped lists, Title Case headers, search+add toolbars) does not need a ground-up redesign.

### CourseCollab (Expo / React Native) policy

We are not a pure SwiftUI app, so true system Liquid Glass only appears where we use **native** chrome (or future Expo/RN wrappers that map to UIKit/SwiftUI bars). Policy:

1. **Content modules** stay on `NATIVE` tokens + inset grouped lists (stable across iOS versions and Android).
2. **Do not** sprinkle custom glass/blur across module bodies to “look like iOS 26.”
3. **Chrome** (`FacultyTopBar`, sheets, drawer): keep translucent / system-like; avoid opaque brand gradients that would block a future native glass bar.
4. When we can adopt native stack headers / sheets (Expo Router native options, `expo-blur` only on chrome, or a thin native module), treat that as **progressive enhancement** — content screens stay unchanged.
5. **Test** Reduce Transparency / Increase Contrast; custom chrome must remain readable when glass is disabled.

### Safe testing of Liquid Glass

- Prefer testing on a **device/simulator running a Liquid Glass–enabled OS** with an app that uses **system** navigation components.
- For this Expo app: evaluate glass only on **chrome** (header/sheet/drawer). Keep module interiors opaque.
- If a glass experiment looks noisy or hurts readability, **revert chrome only** — no module redesign required.

### Do / Don’t

**Do**
- Separate content recipes from chrome materials in docs and code.
- Prefer system (or system-mapped) bars, sheets, and menus when available.
- Keep search + `trailingAction` (“+”) on the **bottom Liquid Glass dock** (`StudentSearchToolbar` / `FacultySearchToolbar`, default `placement="dock"`).
- Use `placement="inline"` for search inside modals/sheets only.

**Don’t**
- Place search fields at the top of module scroll content (too close to floating header; blocks glass contrast).
- Apply glass to list rows, KPI grids, or chart cards.
- Stack glass on glass.
- Tint every control; reserve accent for primary actions.
- Bake Liquid Glass into the brand identity of CourseCollab content.

---

## 7. Interaction & accessibility

- `accessibilityRole`, labels that include category + title when color encodes type.
- Destructive actions use system red text and confirm when irreversible.
- Hit targets ≥ ~44pt tall where possible; use `hitSlop` on compact header actions.
- Pull-to-refresh tint = system blue or module accent sparingly.

---

## 8. Implementation recipe (new or redesigned module)

1. **Scope** — What is the user’s one job on this screen? (inbox, queue, directory, editor)
2. **Structure** — Segmented modes? One grouped list? Multiple sections?
3. **Tokens** — Reuse `IOS` + `COMM_SYSTEM`; add module accent only if needed.
4. **Build with** `CommGroupedList`, `CommListRow`, `CommSegmentedControl`, `CommSectionHeader/Footer`, `CommEmptyState` when it fits; extend the shared kit instead of forking styles.
5. **Wire data** — Real APIs when available; honest empty/coming-soon copy when not.
6. **Register** — `faculty-registry.tsx` / student `registry.tsx` + nav entry.
7. **Pass the brand test** — Native in structure and interaction; CourseCollab personality in drawer, KPIs, and icon tiles — not a generic web dashboard.

### Anti-patterns (reject these)
- Stacked white cards with thick borders and drop shadows for every item
- Purple-on-white AI-default gradients as the whole theme
- ALL CAPS section labels
- Color-only status (red dot with no label)
- Dense KPI strips in the first viewport of a non-dashboard module
- Mixing student purple chrome into faculty slate/teal tools without intent

---

## 9. Communication modules (reference implementation)

| Screen | File | Pattern |
|--------|------|---------|
| Notifications | `FacultyNotificationsScreen.tsx` | Segmented inbox + typed rows |
| Notifications sheet | `FacultyNotificationsSheet.tsx` | Same type styles in a sheet |
| Discussions | `FacultyDiscussionsScreen.tsx` | Boards / Moderation grouped lists |
| Student Support | `FacultyStudentSupportScreen.tsx` | Queues + live password resets + guides |

When redesigning other modules, copy **structure and density** from these, not only colors.

---

## 10. Quick PR self-check

- [ ] Grouped background, not full-bleed white
- [ ] Inset grouped lists with hairlines
- [ ] Title-case section headers
- [ ] Segmented control if ≤3 modes
- [ ] Icon + label for every colored meaning
- [ ] System tint for primary text actions
- [ ] Empty state matches native calm style
- [ ] Registered in module registry + nav
- [ ] No new one-off design system invented
- [ ] No Liquid Glass / heavy blur on **content** rows — chrome + bottom search dock only
- [ ] Custom bar backgrounds won’t block a future system material (prefer translucent/system chrome)

---

## 11. Bottom Liquid Glass search dock

Module search is **not** inline at the top of lists. It floats on a **bottom glass pill** so list content scrolls behind it (same contrast model as Apple Music / Messages / Safari).

| Component | Role |
|-----------|------|
| `GlassBottomSearchDock` | Outer floating glass capsule (`clear` glass, hairline border, 16px inset) |
| `LiquidGlassSearchField` | Inner dark/translucent search capsule + trailing icon rail |
| `ModuleSearchDockProvider` | Registers active search; lives in `AppShellFrame` |
| `StudentSearchToolbar` / `FacultySearchToolbar` | Default `placement="dock"` — renders at bottom |
| `placement="inline"` | Modals/sheets only — solid grouped search row, not docked |

Agent skill: `.cursor/skills/liquid-glass-search/SKILL.md`
