import "../src/index";
import type { RadioCalendarEvent } from "../src/index";

const today = new Date();
const at = (hhmm: string): Date => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), h ?? 0, m ?? 0);
};

const SAMPLE: readonly RadioCalendarEvent[] = [
  { id: "standup", title: "Daily standup", start: at("09:15"), end: at("09:45"), category: "team", description: "Platform team" },
  { id: "arch", title: "Architecture review", start: at("10:30"), end: at("11:30"), category: "team", description: "Leo, Priya, Mark" },
  { id: "qbr", title: "ACME QBR", start: at("10:45"), end: at("12:00"), category: "external", description: "ACME Corp · 6 guests" },
  { id: "vendor", title: "Vendor call", start: at("11:00"), end: at("11:30"), category: "external", description: "Northwind" },
  { id: "lunch", title: "Lunch with Sam", start: at("12:30"), end: at("13:15"), category: "personal" },
  { id: "sync", title: "Quick sync", start: at("13:45"), end: at("14:00"), category: "team", description: "Priya" },
  { id: "ana", title: "1:1 Ana", start: at("15:00"), end: at("15:30"), category: "personal" },
  { id: "onboard", title: "Customer onboarding", start: at("15:15"), end: at("16:15"), category: "external", description: "Globex · 3 guests" },
  { id: "retro", title: "Sprint retro", start: at("16:30"), end: at("17:15"), category: "team", description: "Platform team" },
];

const calendars = [...document.querySelectorAll("radio-calendar")];
const log = document.getElementById("log")!;
const input = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement;

calendars.forEach(cal => {
  cal.events = SAMPLE;
  cal.addEventListener("event-click", e => {
    log.textContent = `event-click → ${e.detail.event.title}`;
  });
});

const setAll = (attr: string, value: string) =>
  calendars.forEach(cal => (value ? cal.setAttribute(attr, value) : cal.removeAttribute(attr)));

input("hourFormat").addEventListener("change", e => setAll("hour-format", (e.target as HTMLSelectElement).value));
input("workStart").addEventListener("change", e => setAll("work-start", (e.target as HTMLInputElement).value));
input("workEnd").addEventListener("change", e => setAll("work-end", (e.target as HTMLInputElement).value));
input("now").addEventListener("change", e => {
  const value = (e.target as HTMLInputElement).value;
  setAll("now", value ? at(value).toISOString() : "");
});
