# radio-calendar

A day-view calendar drawn as a vintage radio tuner dial. Meetings are pieces of colored glass laid over the scale, a red needle with a time flag marks _now_, and dragging the dial lets you peek at the rest of the day before it springs back to working hours.

It's a [Web Component](https://developer.mozilla.org/docs/Web/API/Web_components), so it works in plain HTML and in any framework. A small React wrapper is included.

**[Live demo](https://igorfil.github.io/radio-calendar/)**

## Install

```sh
npm install radio-calendar
```

## Use it in HTML

```html
<script type="module">
  import "radio-calendar";

  const calendar = document.querySelector("radio-calendar");
  calendar.events = [
    { id: "1", title: "Daily standup", start: "2026-11-13T09:15", end: "2026-11-13T09:45", category: "team" },
    { id: "2", title: "ACME QBR", start: "2026-11-13T10:45", end: "2026-11-13T12:00", category: "external",
      description: "ACME Corp · 6 guests" },
  ];
  calendar.addEventListener("event-click", e => console.log(e.detail.event));
</script>

<radio-calendar theme="auto" work-start="09:00" work-end="17:00"></radio-calendar>
```

Importing the package registers the `<radio-calendar>` element. It fills the width of its container.

## Use it in React

```tsx
import { RadioCalendar } from "radio-calendar/react";

export function Today({ meetings }) {
  return (
    <RadioCalendar
      events={meetings}
      theme="dark"
      workStart="08:30"
      workEnd="17:30"
      onEventClick={({ event }) => openMeeting(event.id)}
    />
  );
}
```

The wrapper passes `events` and `categories` as properties (not attributes) and turns `event-click` into `onEventClick`.

## Attributes

| Attribute | Values | Default | |
|---|---|---|---|
| `theme` | `light`, `dark`, `auto` | `light` | `auto` follows the system color scheme. |
| `date` | `YYYY-MM-DD` | today | The day to show. The needle only appears on today. |
| `work-start` | `HH:MM` | `09:00` | Hours outside work are shaded. The dial shows work hours plus an hour either side. |
| `work-end` | `HH:MM` | `17:00` | |
| `hour-format` | `12`, `24` | `12` | Scale labels, needle flag and hover details. |
| `locale` | BCP 47 tag | `en-US` | Language of the date printed on the scale. |
| `now` | ISO 8601 date-time | real clock | Pretend the current time is this; the clock keeps running from there. Handy for demos and screenshots. |
| `no-sweep` | boolean | off | Skip the needle sweep when the component first appears. Also skipped when the user prefers reduced motion. |
| `no-font` | boolean | off | Don't load Barlow Condensed from Google Fonts. Set `--rc-font-family` to use your own font. |

## Properties

### `events: RadioCalendarEvent[]`

```ts
interface RadioCalendarEvent {
  id?: string;           // stable id; also keeps the piece's tint stable
  title: string;
  start: Date | string;  // a Date or anything `new Date()` accepts
  end: Date | string;
  category?: string;     // key into `categories`
  description?: string;  // extra line in the hover details
}
```

Events that overlap the displayed day are drawn, clipped to that day. Up to three overlapping meetings stack on top of each other; any more collapse into a `+N` piece. Events with times that can't be parsed are skipped and reported once with `console.warn`.

### `categories: Record<string, { color: string | string[]; label?: string }>`

Glass colors per category, as `#rrggbb`. Give several colors to vary the tint from piece to piece, like real sea glass. Setting this replaces the defaults:

```js
calendar.categories = {
  focus: { color: "#7a3fa0" },
  ops: { color: ["#b0472f", "#c06a2a"] },
};
```

The defaults are `external` (blue), `team` (green) and `personal` (brown). Meetings with no category, or an unknown one, use a neutral slate glass.

## Events

| Event | `detail` | |
|---|---|---|
| `event-click` | `{ event: RadioCalendarEvent }` | A meeting was clicked or activated with the keyboard. It bubbles and crosses the shadow boundary. Releasing a drag over a meeting doesn't fire it. |

## Styling

The component renders in a shadow root, so page styles don't leak in. You can still:

- set `--rc-font-family` on the element to change the font, and
- target the `faceplate`, `dial` and `event` parts with `::part()`.

## Browser support

Built and checked in current Chrome. It uses only standard web platform features (custom elements, shadow DOM, SVG filters, `backdrop-filter`, `color-mix()`), so current Edge, Safari and Firefox should work too, but they haven't been tested yet.

## Develop

```sh
npm install
npm run dev         # demo with hot reload
npm test            # unit tests
npm run typecheck
npm run build       # library into dist/
npm run build:demo  # static demo into demo-dist/
```

`prototype/` holds the original single-file design explorations the component was built from.

## License

[MIT](LICENSE) © Igor Fil
