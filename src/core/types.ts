/** A meeting or other block of time shown as a piece of glass on the dial. */
export interface RadioCalendarEvent {
  /** Stable identifier; also seeds the piece's tint variation. */
  readonly id?: string;
  readonly title: string;
  /** A `Date` or anything `new Date()` accepts, such as an ISO 8601 string. */
  readonly start: Date | string;
  readonly end: Date | string;
  /** Key into `categories`. Unknown or missing categories use a neutral slate glass. */
  readonly category?: string;
  /** Extra line shown in the hover details, for example attendees. */
  readonly description?: string;
}

export interface RadioCalendarCategory {
  /** Glass color as `#rrggbb`. Pass several to vary the tint from piece to piece, like real sea glass. */
  readonly color: string | readonly string[];
  readonly label?: string;
}

export type RadioCalendarCategories = Readonly<Record<string, RadioCalendarCategory>>;

export type RadioCalendarTheme = "light" | "dark" | "auto";

export type HourFormat = "12" | "24";

export interface EventClickDetail {
  readonly event: RadioCalendarEvent;
}

export const DEFAULT_CATEGORIES: RadioCalendarCategories = {
  external: { label: "External", color: ["#2f6fb0", "#3a86a8"] },
  team: { label: "Team", color: ["#2f8a4a", "#4a9a3a"] },
  personal: { label: "1:1 & personal", color: ["#9a5a22", "#8a3a22"] },
};
