import { FALLBACK_TINTS, OVERFLOW_TINT, tintsForCategories, type GlassTint } from "./core/color";
import { DARK_LOOK, LIGHT_LOOK, SHARED_DEFS, glassSvg, hash, seeded, slabOutline, smoothPath, weatheringSvg, type GlassLook } from "./core/glass";
import { assignLanes, clampViewStart, viewWindow, type ViewWindow } from "./core/layout";
import { lampGlow } from "./core/lighting";
import {
  MINUTES_PER_DAY, compareDays, eventsForDay, formatClock, formatDuration, formatHourLabel,
  minutesIntoDay, parseClock, parseDateOnly, sameDay, startOfDay, toDate, type DayEvent,
} from "./core/time";
import {
  DEFAULT_CATEGORIES, type EventClickDetail, type HourFormat, type RadioCalendarCategories,
  type RadioCalendarEvent, type RadioCalendarTheme,
} from "./core/types";
import { rimLightImage } from "./rim";
import { DIAL, STYLES } from "./styles";

const MAX_LANES = 3;
const RIM_PAD = 14;
const SNAP_MS = 420;
const SWEEP_MS = 1400;
const DRAG_THRESHOLD_PX = 4;
const DEFAULT_WORK = { start: 9 * 60, end: 17 * 60 };
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600&display=swap";

type Piece = DayEvent & { readonly lane: number };

interface OverflowGroup {
  readonly start: number;
  readonly end: number;
  readonly items: readonly Piece[];
}

const HTML_ESCAPES: Readonly<Record<string, string>> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch] ?? ch);

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, style: Partial<CSSStyleDeclaration> = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  Object.assign(node.style, style);
  return node;
}

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// @font-face doesn't register from inside a shadow root, so the default font is loaded on the document once.
function ensureFont(): void {
  if (document.querySelector(`link[data-radio-calendar-font]`)) return;
  const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: FONT_HREF });
  link.dataset["radioCalendarFont"] = "";
  document.head.append(link);
}

let pieceUid = 0;

/**
 * `<radio-calendar>`: a day view drawn as a radio tuner dial. Meetings are pieces of colored glass laid over
 * the scale and a red needle marks the current time. Drag the dial to peek at the rest of the day.
 *
 * @fires event-click - When a meeting is clicked or activated with the keyboard. `detail: { event }`.
 */
export class RadioCalendar extends HTMLElement {
  static readonly observedAttributes = ["theme", "date", "work-start", "work-end", "hour-format", "now", "locale", "no-sweep", "no-font"];

  #events: readonly RadioCalendarEvent[] = [];
  #categories: RadioCalendarCategories = DEFAULT_CATEGORIES;

  readonly #shadow: ShadowRoot;
  readonly #faceplate: HTMLElement;
  readonly #dial: HTMLElement;
  readonly #track: HTMLElement;
  #tag: HTMLElement | null = null;
  #needle: HTMLElement | null = null;
  #cap: HTMLElement | null = null;
  #flag: HTMLElement | null = null;

  #nowOffsetMs = 0;
  #view: ViewWindow = viewWindow(DEFAULT_WORK.start, DEFAULT_WORK.end);
  #viewStart = this.#view.homeStart;
  #sweeping = false;
  #swept = false;
  #renderQueued = false;
  #drag: { x: number; start: number; id: number; moved: boolean } | null = null;
  #frame: number | null = null;
  #timer: ReturnType<typeof setInterval> | null = null;
  #resize: ResizeObserver | null = null;
  #darkQuery: MediaQueryList | null = null;
  readonly #onSchemeChange = () => this.#scheduleRender();
  readonly #warned = new Set<string>();

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    this.#shadow.innerHTML = `<style>${STYLES}</style>${SHARED_DEFS}
      <div class="faceplate" part="faceplate">
        <div class="bezel"><section class="dial" part="dial"><div class="track"></div></section></div>
      </div>`;
    this.#faceplate = this.#shadow.querySelector(".faceplate")!;
    this.#dial = this.#shadow.querySelector(".dial")!;
    this.#track = this.#shadow.querySelector(".track")!;
    this.#bindDrag();
  }

  /** Meetings to show. Only those overlapping the displayed date are drawn. */
  get events(): readonly RadioCalendarEvent[] { return this.#events; }
  set events(value: readonly RadioCalendarEvent[]) {
    this.#events = Array.isArray(value) ? value : [];
    this.#scheduleRender();
  }

  /** Category key → glass color(s). Replaces the defaults (external, team, personal). */
  get categories(): RadioCalendarCategories { return this.#categories; }
  set categories(value: RadioCalendarCategories) {
    this.#categories = value && typeof value === "object" ? value : DEFAULT_CATEGORIES;
    this.#scheduleRender();
  }

  get theme(): RadioCalendarTheme {
    const v = this.getAttribute("theme");
    return v === "dark" || v === "auto" ? v : "light";
  }
  set theme(value: RadioCalendarTheme) { this.setAttribute("theme", value); }

  get hourFormat(): HourFormat { return this.getAttribute("hour-format") === "24" ? "24" : "12"; }
  set hourFormat(value: HourFormat) { this.setAttribute("hour-format", value); }

  connectedCallback(): void {
    if (!this.hasAttribute("no-font")) ensureFont();
    this.#resize = new ResizeObserver(() => this.#scheduleRender());
    this.#resize.observe(this.#dial);
    this.#darkQuery = matchMedia("(prefers-color-scheme: dark)");
    this.#darkQuery.addEventListener("change", this.#onSchemeChange);
    this.#timer = setInterval(() => this.#tick(), 1000);
    this.#render();
  }

  disconnectedCallback(): void {
    this.#resize?.disconnect();
    this.#darkQuery?.removeEventListener("change", this.#onSchemeChange);
    if (this.#timer) clearInterval(this.#timer);
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#resize = null;
    this.#darkQuery = null;
    this.#timer = null;
    this.#frame = null;
  }

  attributeChangedCallback(name: string): void {
    if (name === "now") this.#nowOffsetMs = this.#parseNowOffset();
    if (name === "work-start" || name === "work-end") {
      this.#view = viewWindow(...this.#workHours());
      this.#viewStart = this.#view.homeStart;
    }
    this.#scheduleRender();
  }

  // Each problem is reported once per element, not on every re-render.
  #warn(messages: readonly string[]): void {
    messages.filter(m => !this.#warned.has(m)).forEach(m => {
      this.#warned.add(m);
      console.warn(`<radio-calendar>: ${m}`);
    });
  }

  #now(): Date { return new Date(Date.now() + this.#nowOffsetMs); }

  #parseNowOffset(): number {
    const raw = this.getAttribute("now");
    if (!raw) return 0;
    const parsed = toDate(raw);
    if (!parsed.ok) {
      this.#warn([`now: ${parsed.error}`]);
      return 0;
    }
    return parsed.value.getTime() - Date.now();
  }

  #day(): Date {
    const raw = this.getAttribute("date");
    if (!raw) return startOfDay(this.#now());
    const parsed = parseDateOnly(raw);
    if (parsed.ok) return parsed.value;
    this.#warn([`date: ${parsed.error}`]);
    return startOfDay(this.#now());
  }

  #workHours(): [number, number] {
    const read = (attr: string, fallback: number) => {
      const raw = this.getAttribute(attr);
      if (!raw) return fallback;
      const parsed = parseClock(raw);
      if (parsed.ok) return parsed.value;
      this.#warn([`${attr}: ${parsed.error}`]);
      return fallback;
    };
    const start = read("work-start", DEFAULT_WORK.start);
    const end = read("work-end", DEFAULT_WORK.end);
    if (end > start) return [start, end];
    this.#warn([`work-end must be after work-start; using 09:00–17:00`]);
    return [DEFAULT_WORK.start, DEFAULT_WORK.end];
  }

  #resolvedTheme(): "light" | "dark" {
    const theme = this.theme;
    if (theme === "auto") return this.#darkQuery?.matches ? "dark" : "light";
    return theme;
  }

  #pxPerMin(): number { return this.#dial.clientWidth / this.#view.span; }
  #pct(min: number): string { return `${(min / MINUTES_PER_DAY) * 100}%`; }

  #scheduleRender(): void {
    if (this.#renderQueued || !this.isConnected) return;
    this.#renderQueued = true;
    queueMicrotask(() => {
      this.#renderQueued = false;
      if (this.isConnected) this.#render();
    });
  }

  #render(): void {
    const dark = this.#resolvedTheme() === "dark";
    const look = dark ? DARK_LOOK : LIGHT_LOOK;
    const format = this.hourFormat;
    const [workStart, workEnd] = this.#workHours();
    const today = this.#now();
    const day = this.#day();
    const isToday = sameDay(day, today);

    this.#faceplate.classList.toggle("theme-dark", dark);
    this.#shadow.querySelectorAll(".dial > .dial-msg").forEach(el => el.remove());
    const track = this.#track;
    track.replaceChildren();
    track.style.width = `${MINUTES_PER_DAY * this.#pxPerMin()}px`;
    this.#applyPan();

    this.#buildScale(workStart, workEnd, format);
    const inscription = make("div", "inscription", { left: this.#pct(this.#view.homeStart + this.#view.span) });
    inscription.textContent = day
      .toLocaleDateString(this.getAttribute("locale") ?? "en-US", { weekday: "short", month: "short", day: "numeric" })
      .replace(",", "");
    track.append(inscription);

    this.#needle = make("div", "needle");
    this.#flag = make("span", "now-flag");
    this.#needle.append(this.#flag);
    this.#cap = make("div", "needle-cap");
    this.#tag = make("div", "tag");
    if (isToday) track.append(this.#needle, this.#cap);

    const { accepted, rejected } = eventsForDay(this.#events, day);
    const { tints, rejected: badColors } = tintsForCategories(this.#categories);
    this.#warn([...rejected, ...badColors]);

    const placed = assignLanes(accepted);
    const visible = placed.filter(p => p.lane < MAX_LANES);
    const hidden = placed.filter(p => p.lane >= MAX_LANES);
    const dayOrder = compareDays(day, today);
    const nowMin = minutesIntoDay(today);
    const isPast = (p: { end: number }) => dayOrder < 0 || (dayOrder === 0 && p.end <= nowMin);

    visible.forEach(p => track.append(this.#piece(p, tints.get(p.category) ?? FALLBACK_TINTS, look, format, isPast(p))));
    if (hidden.length) {
      const group: OverflowGroup = {
        start: Math.min(...hidden.map(p => p.start)),
        end: Math.max(...hidden.map(p => p.end)),
        items: hidden,
      };
      track.append(this.#overflowChip(group, look, format));
    }
    if (!placed.length) {
      const msg = make("div", "dial-msg");
      msg.textContent = "Clear signal — no meetings";
      this.#dial.append(msg);
    }
    track.append(this.#tag);

    if (dark) this.#lightPieces();
    this.#tick();
    if (!this.#swept && isToday) {
      this.#swept = true;
      if (!this.hasAttribute("no-sweep") && !prefersReducedMotion()) this.#sweepIn();
    }
  }

  #buildScale(workStart: number, workEnd: number, format: HourFormat): void {
    const track = this.#track;
    track.append(
      make("div", "offhours left", { left: "0", width: this.#pct(workStart) }),
      make("div", "offhours right", { left: this.#pct(workEnd), right: "0" }),
      make("div", "scale-line"),
    );
    const firstVisibleHour = Math.floor(this.#view.homeStart / 60) + 1;
    Array.from({ length: MINUTES_PER_DAY / 15 + 1 }, (_, i) => i * 15).forEach(min => {
      const off = min < workStart || min > workEnd;
      const offCls = off ? " is-off" : "";
      if (min % 30 === 0) track.append(make("div", `grid${min % 60 ? " half" : ""}`, { left: this.#pct(min) }));
      const kind = min % 60 === 0 ? "h" : min % 30 === 0 ? "m30" : "m15";
      track.append(make("div", `tick ${kind}${offCls}`, { left: this.#pct(min) }));
      if (min % 60 !== 0) return;
      const hour = min / 60;
      const label = make("div", `hour-label${offCls}`, { left: this.#pct(min) });
      label.textContent = formatHourLabel(hour, format);
      track.append(label);
      if (format === "12" && (hour === firstVisibleHour || hour === 12)) {
        const ampm = make("div", `ampm${offCls}`, { left: this.#pct(min) });
        ampm.textContent = hour < 12 ? "AM" : "PM";
        track.append(ampm);
      }
    });
  }

  #piece(p: Piece, tints: readonly GlassTint[], look: GlassLook, format: HourFormat, past: boolean): HTMLButtonElement {
    const rnd = seeded(hash(p.key + p.start) + 1);
    const tint = tints[Math.floor(rnd() * tints.length)] ?? OVERFLOW_TINT;
    const width = Math.max(18, (p.end - p.start) * this.#pxPerMin() - 3);
    const narrow = p.end - p.start < 30;
    const node = this.#glassNode(`glass${narrow ? " narrow" : ""}${past ? " past" : ""}`, p.start, width, tint, look, rnd);
    node.style.zIndex = String(10 + p.lane);
    node.dataset["end"] = String(p.end);
    node.setAttribute("aria-label", `${p.title}, ${formatClock(p.start, format)} to ${formatClock(p.end, format)}`);
    node.querySelector(".content")!.innerHTML = `<span class="etch">${escapeHtml(narrow ? p.title.slice(0, 1) : p.title)}</span>`;
    const details = `<b>${escapeHtml(p.title)}</b><br>${formatClock(p.start, format)} – ${formatClock(p.end, format)} · ${formatDuration(p.end - p.start)}` +
      (p.description ? `<br><span class="muted">${escapeHtml(p.description)}</span>` : "");
    this.#bindDetails(node, details);
    node.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent<EventClickDetail>("event-click", { detail: { event: p.source }, bubbles: true, composed: true }));
    });
    return node;
  }

  #overflowChip(group: OverflowGroup, look: GlassLook, format: HourFormat): HTMLButtonElement {
    const node = this.#glassNode("glass overflow", group.start, 40, OVERFLOW_TINT, look, seeded(group.start + 1));
    node.style.zIndex = String(10 + MAX_LANES);
    node.setAttribute("aria-label", `${group.items.length} more meetings`);
    node.querySelector(".content")!.innerHTML = `<span class="etch">+${group.items.length}</span>`;
    this.#bindDetails(node, `<b>${group.items.length} more</b>` +
      group.items.map(i => `<br>${formatClock(i.start, format)} ${escapeHtml(i.title)}`).join(""));
    return node;
  }

  #glassNode(className: string, start: number, width: number, tint: GlassTint, look: GlassLook, rnd: () => number): HTMLButtonElement {
    const h = DIAL.glassHeight;
    const pts = slabOutline(width, h, look.corner);
    const path = smoothPath(pts);
    const id = `rc${pieceUid++}`;
    const node = make("button", className, { left: this.#pct(start), width: `${width}px` });
    node.type = "button";
    node.part.add("event");
    node.style.setProperty("--core", tint.core);

    const W = Math.ceil(width + RIM_PAD * 2), H = Math.ceil(h + RIM_PAD * 2);
    const rimPath = smoothPath(pts, RIM_PAD, RIM_PAD);
    const lens = make("span", "lens", {
      left: `${-RIM_PAD}px`, top: `${-RIM_PAD}px`, width: `${W}px`, height: `${H}px`, clipPath: `path("${rimPath}")`,
    });
    lens.style.setProperty("backdrop-filter", `blur(${look.blur}px) saturate(${look.saturate}) brightness(${look.brightness})`);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${width} ${h}`);
    svg.innerHTML = glassSvg({
      id, path, rim: rimLightImage(rimPath, W, H, 0.8), rimPad: RIM_PAD, w: width, h, tint, look,
      weathering: weatheringSvg(width, h, rnd, look),
    });
    node.append(lens, svg, make("span", "content"));
    return node;
  }

  #bindDetails(node: HTMLElement, html: string): void {
    const show = () => this.#showTag(node, html);
    const hide = () => this.#tag?.classList.remove("show");
    node.addEventListener("mouseenter", show);
    node.addEventListener("focus", show);
    node.addEventListener("mouseleave", hide);
    node.addEventListener("blur", hide);
  }

  #showTag(target: HTMLElement, html: string): void {
    const tag = this.#tag;
    if (!tag) return;
    tag.innerHTML = html;
    const trackRect = this.#track.getBoundingClientRect();
    const dialRect = this.#dial.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const visibleLeft = dialRect.left - trackRect.left;
    tag.style.left = `${Math.max(visibleLeft, Math.min(r.left - trackRect.left, visibleLeft + dialRect.width - 260))}px`;
    const below = r.bottom - trackRect.top + 8;
    tag.style.top = `${below + 84 > trackRect.height ? r.top - trackRect.top - 84 : below}px`;
    tag.classList.add("show");
  }

  #tick(): void {
    const now = this.#now();
    if (!sameDay(this.#day(), now) || !this.#needle || !this.#cap || !this.#flag) return;
    const m = minutesIntoDay(now);
    if (!this.#sweeping) {
      this.#needle.style.left = this.#pct(m);
      this.#cap.style.left = this.#pct(m);
    }
    this.#flag.textContent = formatClock(m, this.hourFormat);
    this.#placeFlag();
    this.#shadow.querySelectorAll<HTMLElement>(".glass:not(.overflow)").forEach(g =>
      g.classList.toggle("past", Number(g.dataset["end"]) <= m));
  }

  // Flip the flag to the needle's left when it would run off the right edge of the window.
  #placeFlag(): void {
    if (!this.#flag) return;
    const x = (minutesIntoDay(this.#now()) - this.#viewStart) * this.#pxPerMin();
    this.#flag.classList.toggle("flip", x > this.#dial.clientWidth - 48);
  }

  #applyPan(): void {
    this.#track.style.transform = `translateX(${-this.#viewStart * this.#pxPerMin()}px)`;
    this.#placeFlag();
    if (this.#faceplate.classList.contains("theme-dark")) this.#lightPieces();
  }

  // Lamps sit behind the scale at fixed spots in the window, so the glow shifts as the day is dragged under them.
  #lightPieces(): void {
    const dialRect = this.#dial.getBoundingClientRect();
    if (!dialRect.width) return;
    this.#shadow.querySelectorAll<HTMLElement>(".glass").forEach(g => {
      const r = g.getBoundingClientRect();
      const glow = lampGlow((r.left + r.width / 2 - dialRect.left) / dialRect.width);
      g.style.setProperty("--glow-l", glow.left.toFixed(3));
      g.style.setProperty("--glow-r", glow.right.toFixed(3));
      g.style.setProperty("--glow-t", glow.top.toFixed(3));
    });
  }

  #sweepIn(): void {
    const needle = this.#needle, cap = this.#cap;
    if (!needle || !cap) return;
    this.#sweeping = true;
    this.#dial.classList.add("sweeping");
    const glasses = [...this.#shadow.querySelectorAll<HTMLElement>(".glass")];
    glasses.forEach(g => (g.style.opacity = "0"));
    const target = minutesIntoDay(this.#now());
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / SWEEP_MS);
      const ease = 1 - Math.pow(1 - k, 3);
      const wobble = Math.sin(k * Math.PI * 3) * (1 - k) * 60;
      const at = this.#pct(Math.max(0, target * ease + wobble));
      needle.style.left = at;
      cap.style.left = at;
      if (k < 1) {
        this.#frame = requestAnimationFrame(step);
        return;
      }
      this.#frame = null;
      this.#sweeping = false;
      this.#dial.classList.remove("sweeping");
      glasses.forEach((g, i) => setTimeout(() => (g.style.opacity = ""), i * 70));
    };
    this.#frame = requestAnimationFrame(step);
  }

  // Dragging is only a peek: on release the dial eases back to the working-hours view.
  #snapHome(): void {
    const from = this.#viewStart;
    const home = this.#view.homeStart;
    if (prefersReducedMotion()) {
      this.#viewStart = home;
      this.#applyPan();
      return;
    }
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / SNAP_MS);
      this.#viewStart = from + (home - from) * (1 - Math.pow(1 - k, 3));
      this.#applyPan();
      this.#frame = k < 1 ? requestAnimationFrame(step) : null;
    };
    this.#frame = requestAnimationFrame(step);
  }

  #bindDrag(): void {
    const dial = this.#dial;
    dial.addEventListener("pointerdown", e => {
      if (e.button !== 0 || this.#sweeping) return;
      if (this.#frame) cancelAnimationFrame(this.#frame);
      this.#frame = null;
      this.#drag = { x: e.clientX, start: this.#viewStart, id: e.pointerId, moved: false };
    });
    dial.addEventListener("pointermove", e => {
      const drag = this.#drag;
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      if (!drag.moved) {
        drag.moved = true;
        dial.classList.add("dragging");
        this.#tag?.classList.remove("show");
        try {
          dial.setPointerCapture(drag.id);
        } catch {
          // Synthetic or already-released pointers can't be captured; dragging still works without capture.
        }
      }
      this.#viewStart = clampViewStart(drag.start - dx / this.#pxPerMin(), this.#view.span);
      this.#applyPan();
    });
    const end = () => {
      if (this.#drag?.moved) {
        // Swallow the click that follows a drag so releasing over a meeting doesn't activate it.
        const swallow = (e: Event) => e.stopPropagation();
        dial.addEventListener("click", swallow, { capture: true });
        setTimeout(() => dial.removeEventListener("click", swallow, { capture: true }), 0);
        this.#snapHome();
      }
      dial.classList.remove("dragging");
      this.#drag = null;
    };
    dial.addEventListener("pointerup", end);
    dial.addEventListener("pointercancel", end);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "radio-calendar": RadioCalendar;
  }
  interface HTMLElementEventMap {
    "event-click": CustomEvent<EventClickDetail>;
  }
}
