const BRUSHED = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'><filter id='b'><feTurbulence type='fractalNoise' baseFrequency='0.002 0.9' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.4 -0.45'/></filter><rect width='100%' height='100%' filter='url(%23b)'/></svg>")`;

/** Scale geometry shared by CSS and the renderer. */
export const DIAL = {
  height: 136,
  scaleY: 54,
  glassTop: 74,
  glassHeight: 46,
} as const;

export const STYLES = `
  :host {
    display: block;
    font-family: var(--rc-font-family, "Barlow Condensed", "Helvetica Neue", Arial, sans-serif);
    --brushed: ${BRUSHED};
    --ink: #2b2b29;
    --ink-soft: #6b6b67;
    --needle: #b8231a;
  }
  :host([hidden]) { display: none; }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; }

  .faceplate {
    width: 100%;
    padding: 16px 28px;
    border-radius: 4px;
    background:
      linear-gradient(90deg, rgba(255,255,255,0) 10%, rgba(255,255,255,.22) 38%, rgba(255,255,255,0) 62%, rgba(255,255,255,.12) 85%, rgba(255,255,255,0)),
      var(--brushed),
      linear-gradient(180deg, #d4d4d0 0%, #bebeb9 55%, #c9c9c4 100%);
    background-size: 100% 100%, 2400px 300px, 100% 100%;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.7), inset 0 -1px 0 rgba(0,0,0,.25), 0 24px 50px rgba(0,0,0,.6);
    color: var(--ink);
  }
  .bezel {
    padding: 6px;
    border-radius: 3px;
    background: linear-gradient(180deg, #4a4a47, #2a2a28);
    box-shadow: 0 1px 0 rgba(255,255,255,.6), inset 0 1px 2px rgba(0,0,0,.6);
  }
  .dial {
    position: relative;
    height: ${DIAL.height}px;
    /* No border-radius: a rounded overflow clip becomes a mask, which disables backdrop-filter on the glass. */
    background:
      radial-gradient(ellipse 60% 70% at 20% 0%, rgba(255,236,200,.35), transparent 70%),
      radial-gradient(ellipse 60% 70% at 80% 0%, rgba(255,236,200,.35), transparent 70%),
      linear-gradient(180deg, rgba(241,241,236,.55), rgba(214,214,207,.55)),
      var(--brushed),
      linear-gradient(180deg, #f1f1ec 0%, #e3e3dd 60%, #d6d6cf 100%);
    background-size: 100% 100%, 100% 100%, 100% 100%, 2400px 300px, 100% 100%;
    box-shadow: inset 0 10px 18px -6px rgba(0,0,0,.45), inset 0 -4px 8px -4px rgba(0,0,0,.3);
    overflow: hidden;
    cursor: grab;
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
  }
  .dial::after {
    content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 70;
    background: linear-gradient(165deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.04) 35%, transparent 36%, transparent 100%);
  }
  .dial.dragging { cursor: grabbing; }
  .dial.dragging .glass { pointer-events: none; }
  .track { position: absolute; top: 0; bottom: 0; left: 0; will-change: transform; }

  .offhours { position: absolute; top: 0; bottom: 0; background: rgba(40,40,36,.14); }
  .offhours.left { border-right: 1px solid rgba(40,40,36,.35); }
  .offhours.right { border-left: 1px solid rgba(40,40,36,.35); }

  .scale-line { position: absolute; left: 0; right: 0; top: ${DIAL.scaleY}px; height: 1px; background: #3a3a37; }
  .tick { position: absolute; width: 1px; background: #3a3a37; bottom: calc(100% - ${DIAL.scaleY}px); }
  .tick.h { height: 14px; }
  .tick.m30 { height: 9px; }
  .tick.m15 { height: 5px; }
  .grid { position: absolute; top: ${DIAL.scaleY}px; bottom: 0; width: 1px; background: rgba(40,40,36,.13); }
  .grid.half { background: rgba(40,40,36,.06); }
  .hour-label {
    position: absolute; top: 18px; transform: translateX(-50%);
    font-size: 19px; font-weight: 300; letter-spacing: .02em; color: var(--ink);
  }
  .ampm, .inscription {
    position: absolute; top: ${DIAL.scaleY + 4}px;
    font-size: 10px; font-weight: 500; color: var(--ink-soft); white-space: nowrap;
  }
  .ampm { transform: translateX(-50%); letter-spacing: .14em; }
  .inscription { z-index: 2; pointer-events: none; transform: translateX(calc(-100% - 14px)); letter-spacing: .2em; text-transform: uppercase; }
  .is-off { opacity: .4; }

  .needle {
    position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px;
    background: linear-gradient(90deg, #7d150f, var(--needle) 50%, #7d150f);
    box-shadow: 1px 0 3px rgba(0,0,0,.25);
    z-index: 1;
    transition: left 1s linear;
  }
  .needle::after {
    content: ""; position: absolute; left: -5px; bottom: 0; width: 12px; height: 10px;
    background: linear-gradient(180deg, #3c3c39, #1f1f1d);
    border-radius: 2px 2px 0 0;
  }
  .needle-cap {
    position: absolute; top: ${DIAL.scaleY - 8}px; width: 6px; height: 16px; margin-left: -3px;
    background: var(--needle); border-radius: 1px;
    box-shadow: 0 1px 2px rgba(0,0,0,.3);
    z-index: 50;
    transition: left 1s linear;
  }
  .sweeping .needle, .sweeping .needle-cap { transition: none; }
  .now-flag {
    position: absolute; top: 2px; left: 1px;
    padding: 1px 5px 1px 4px; border-radius: 0 2px 2px 0;
    background: var(--needle); color: #fff4ec;
    font-size: 10px; font-weight: 600; letter-spacing: .06em; line-height: 12px; white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0,0,0,.3);
  }
  .now-flag.flip { left: auto; right: 1px; border-radius: 2px 0 0 2px; padding: 1px 4px 1px 5px; }

  .glass {
    position: absolute;
    top: ${DIAL.glassTop}px;
    height: ${DIAL.glassHeight}px;
    padding: 0; border: 0; background: none;
    cursor: pointer; text-align: left;
    transition: transform .2s ease-out, opacity .5s ease-out;
  }
  /* Opacity, filter or mix-blend-mode on .glass would isolate it and blank out the frosted backdrop, so effects go on children. */
  .glass .lens { position: absolute; pointer-events: none; }
  .glass svg { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; transition: filter .3s; }
  .glass .cast { transform: translate(6px, 10px); transition: transform .2s ease-out; }
  .glass:hover .cast, .glass:focus-visible .cast { transform: translate(9px, 16px); }
  .glass .content {
    display: flex; flex-direction: column; position: relative; overflow: hidden;
    height: ${DIAL.glassHeight}px;
    padding: 7px 10px 6px 11px;
  }
  .glass.narrow .content { padding: 7px 0 0; text-align: center; }
  .glass.past svg { filter: saturate(.6) brightness(1.05); }
  .glass.past .content { opacity: .75; }
  .glass:hover, .glass:focus-visible { z-index: 40 !important; transform: translateY(-3px); }
  .glass:focus-visible { outline: none; }
  .glass:focus-visible .content { text-decoration: underline; text-underline-offset: 3px; }
  .etch {
    overflow: hidden;
    font-size: 14px; line-height: 1.1; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    color: color-mix(in srgb, color-mix(in srgb, var(--core) 45%, #000) 82%, transparent);
    text-shadow: 0 1px 0 rgba(255,255,255,.38), 0 -1px 0 rgba(0,0,0,.2);
  }
  .defs { position: absolute; width: 0; height: 0; }

  .tag {
    position: absolute; z-index: 60; pointer-events: none;
    min-width: 190px; max-width: 260px;
    padding: 9px 12px; border-radius: 3px;
    background: rgba(30,30,28,.9);
    color: #eeeee8; font-size: 14px; line-height: 1.4; letter-spacing: .03em;
    box-shadow: 0 8px 20px rgba(0,0,0,.35);
    opacity: 0; transform: translateY(3px);
    transition: opacity .15s ease-out, transform .15s ease-out;
  }
  .tag.show { opacity: 1; transform: none; }
  .tag b { font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
  .tag .muted { color: #aeaea6; }

  .dial-msg {
    pointer-events: none;
    position: absolute; left: 0; right: 0; top: 58%; text-align: center;
    font-size: 14px; font-weight: 500; letter-spacing: .3em; text-transform: uppercase;
    color: var(--ink-soft);
  }

  /* Dark: room lights off, only dim lamps behind the scale. */
  .theme-dark { --ink: #e9dcc2; --ink-soft: #a89878; --needle: #ff3b2a; }
  .theme-dark.faceplate {
    background:
      linear-gradient(90deg, rgba(255,255,255,0) 10%, rgba(255,255,255,.05) 38%, rgba(255,255,255,0) 62%, rgba(255,255,255,.03) 85%, rgba(255,255,255,0)),
      var(--brushed),
      linear-gradient(180deg, #2c2c2e 0%, #222224 55%, #262628 100%);
    background-size: 100% 100%, 2400px 300px, 100% 100%;
    background-blend-mode: normal, soft-light, normal;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08), inset 0 -1px 0 rgba(0,0,0,.5), 0 24px 50px rgba(0,0,0,.8);
  }
  .theme-dark .bezel { background: linear-gradient(180deg, #121213, #0a0a0b); box-shadow: 0 1px 0 rgba(255,255,255,.06), inset 0 1px 2px rgba(0,0,0,.8); }
  .theme-dark .dial {
    background:
      radial-gradient(ellipse 3.5% 16% at 12.5% 0%, rgba(255,214,150,.5), transparent 70%),
      radial-gradient(ellipse 3.5% 16% at 37.5% 0%, rgba(255,214,150,.5), transparent 70%),
      radial-gradient(ellipse 3.5% 16% at 62.5% 0%, rgba(255,214,150,.5), transparent 70%),
      radial-gradient(ellipse 3.5% 16% at 87.5% 0%, rgba(255,214,150,.5), transparent 70%),
      radial-gradient(ellipse 14% 110% at 12.5% 0%, rgba(255,166,72,.26), transparent 70%),
      radial-gradient(ellipse 14% 110% at 37.5% 0%, rgba(255,166,72,.26), transparent 70%),
      radial-gradient(ellipse 14% 110% at 62.5% 0%, rgba(255,166,72,.26), transparent 70%),
      radial-gradient(ellipse 14% 110% at 87.5% 0%, rgba(255,166,72,.26), transparent 70%),
      linear-gradient(180deg, rgba(40,34,26,.6), rgba(10,9,8,.6)),
      var(--brushed),
      linear-gradient(180deg, #1b1916 0%, #11100e 70%, #0b0a09 100%);
    background-size: 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 2400px 300px, 100% 100%;
    background-blend-mode: normal, normal, normal, normal, normal, normal, normal, normal, normal, soft-light, normal;
    box-shadow: inset 0 10px 18px -6px rgba(0,0,0,.8), inset 0 -4px 8px -4px rgba(0,0,0,.6);
  }
  .theme-dark .dial::after { background: linear-gradient(165deg, rgba(255,220,170,.05) 0%, rgba(255,220,170,.015) 35%, transparent 36%); }
  .theme-dark .offhours { background: rgba(0,0,0,.38); }
  .theme-dark .offhours.left { border-right-color: rgba(255,200,140,.12); }
  .theme-dark .offhours.right { border-left-color: rgba(255,200,140,.12); }
  .theme-dark .scale-line, .theme-dark .tick { background: #cdb991; box-shadow: 0 0 4px rgba(255,170,80,.35); }
  .theme-dark .hour-label { text-shadow: 0 0 8px rgba(255,170,80,.45); }
  .theme-dark .inscription { text-shadow: 0 0 6px rgba(255,170,80,.4); }
  .theme-dark .grid { background: rgba(255,214,160,.06); }
  .theme-dark .grid.half { background: rgba(255,214,160,.03); }
  .theme-dark .needle { box-shadow: 0 0 6px 1px rgba(255,60,40,.55); }
  .theme-dark .needle-cap { box-shadow: 0 0 6px rgba(255,60,40,.7); }
  .theme-dark .now-flag { box-shadow: 0 0 8px rgba(255,60,40,.55); }
  .theme-dark .glass .glow-l { opacity: var(--glow-l, 0); }
  .theme-dark .glass .glow-r { opacity: var(--glow-r, 0); }
  .theme-dark .glass .glow-t { opacity: var(--glow-t, 0); }
  .theme-dark .glass .halo-l { opacity: calc(var(--glow-l, 0) * .16); }
  .theme-dark .glass .halo-r { opacity: calc(var(--glow-r, 0) * .16); }
  .theme-dark .etch { color: rgba(255,236,206,.78); text-shadow: 0 0 6px rgba(255,170,80,.35), 0 -1px 0 rgba(0,0,0,.6); }
  .theme-dark .glass.past svg { filter: saturate(.6) brightness(.85); }

  @media (prefers-reduced-motion: reduce) {
    .needle, .needle-cap, .glass, .glass .cast, .tag { transition: none; }
  }
`;
