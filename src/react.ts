import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from "react";
import type { RadioCalendar as RadioCalendarElement } from "./radio-calendar";
import type {
  EventClickDetail, HourFormat, RadioCalendarCategories, RadioCalendarEvent, RadioCalendarTheme,
} from "./core/types";
import "./index";

export interface RadioCalendarProps {
  readonly events?: readonly RadioCalendarEvent[];
  readonly categories?: RadioCalendarCategories;
  readonly theme?: RadioCalendarTheme;
  /** `YYYY-MM-DD`; defaults to today. */
  readonly date?: string;
  /** `HH:MM`; defaults to `09:00`. */
  readonly workStart?: string;
  /** `HH:MM`; defaults to `17:00`. */
  readonly workEnd?: string;
  readonly hourFormat?: HourFormat;
  /** Pretend the current time is this (ISO 8601). Useful for demos and screenshots. */
  readonly now?: string;
  readonly locale?: string;
  readonly noSweep?: boolean;
  readonly noFont?: boolean;
  readonly onEventClick?: (detail: EventClickDetail) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
}

// Custom-element boolean attributes are present or absent; `false` must remove them.
const flag = (value: boolean | undefined) => (value ? "" : undefined);

/** React wrapper around `<radio-calendar>` that passes arrays and objects as properties, not attributes. */
export const RadioCalendar = forwardRef<RadioCalendarElement, RadioCalendarProps>(function RadioCalendar(props, ref) {
  const { events, categories, onEventClick, className, style } = props;
  const el = useRef<RadioCalendarElement | null>(null);
  // The element exists by the time React reads the handle, after mount.
  useImperativeHandle(ref, () => el.current!, []);

  useEffect(() => {
    if (el.current) el.current.events = events ?? [];
  }, [events]);

  useEffect(() => {
    if (el.current && categories) el.current.categories = categories;
  }, [categories]);

  useEffect(() => {
    const node = el.current;
    if (!node || !onEventClick) return;
    const handler = (e: CustomEvent<EventClickDetail>) => onEventClick(e.detail);
    node.addEventListener("event-click", handler);
    return () => node.removeEventListener("event-click", handler);
  }, [onEventClick]);

  return createElement("radio-calendar", {
    ref: el,
    className,
    style,
    theme: props.theme,
    date: props.date,
    "work-start": props.workStart,
    "work-end": props.workEnd,
    "hour-format": props.hourFormat,
    now: props.now,
    locale: props.locale,
    "no-sweep": flag(props.noSweep),
    "no-font": flag(props.noFont),
  });
});
