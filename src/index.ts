import { RadioCalendar } from "./radio-calendar";

export { RadioCalendar };
export { DEFAULT_CATEGORIES } from "./core/types";
export type {
  EventClickDetail,
  HourFormat,
  RadioCalendarCategories,
  RadioCalendarCategory,
  RadioCalendarEvent,
  RadioCalendarTheme,
} from "./core/types";

export const TAG_NAME = "radio-calendar";

// Importing the package registers the element; guard so a second copy on the page doesn't throw.
if (typeof customElements !== "undefined" && !customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, RadioCalendar);
}
