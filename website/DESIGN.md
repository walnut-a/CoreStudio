---
name: CoreStudio Website
description: A local-first image-generation canvas presented as a living workshop.
colors:
  ink: "#1b1b1f"
  primary: "#6965db"
  primary-hover: "#5753d0"
  muted: "#5c5c5c"
  quiet: "#7a7a7a"
  paper: "#f6f6f9"
  surface: "#ffffff"
  surface-high: "#f1f0ff"
  surface-low: "#ececf4"
  line: "#f1f0ff"
  success: "#2d9b59"
typography:
  display:
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: "clamp(3.25rem, 4.2vw, 4.35rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  body:
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: "1.03rem"
    fontWeight: 400
    lineHeight: 1.5
  interface:
    fontFamily: '"Assistant", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.82rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  handle: "2px"
  compact: "0.375rem"
  control: "0.5rem"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.interface}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  tool-button-active:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    size: "36px"
  image-result:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
---

# Design System: CoreStudio Website

## Overview

**Creative North Star: "The Living Canvas Workshop"**

CoreStudio does not sit inside a conventional marketing page. The page itself behaves like a restrained Excalidraw workspace: product proof, controls, references, generated work, and the download action coexist on one paper-white canvas. The mood is precise, quiet, and useful rather than promotional.

The visual identity remains grounded in the incumbent CoreStudio palette, production design tokens, and application icon. Silver industrial-design imagery supplies material depth; every toolbar, zoom control, minimap, composer, and action uses the same geometry and states as the desktop product. Generation is communicated by the production status-dot pattern and light content de-emphasis, not a decorative effect layer.

**Key Characteristics:**

- One continuous dotted canvas instead of stacked landing-page sections.
- Real raster material references and generated results, connected by hand-drawn paths.
- Compact desktop-tool controls with clear selected, hover, focus, and disabled states.
- Camera movement reveals project, generation, and Agent writeback without turning the page into a full editor.
- Download remains the only dominant action.

## Colors

The palette is CoreStudio's existing Excalidraw-derived system: white islands, gray-violet surfaces, dark text, and a small amount of violet and green for state.

### Primary

- **CoreStudio Primary:** Carries the macOS download, selected tools, focus, and the send control using the production primary, hover, and active values.
- **Excalidraw Selection:** Marks selection geometry, minimap state, and generating connectors.

### Neutral

- **Paper White:** Infinite-canvas ground behind the dotted grid.
- **Clean Surface:** Floating controls, the result frame, minimap, and composer.
- **Workshop Ink:** Display lettering and high-priority interface text.
- **Working Gray:** Supporting copy and passive controls.
- **Construction Line:** Borders and lightweight geometry.

### Named Rules

**The Production Token Rule.** Website controls use the values from `apps/image-board-desktop/src/app/styles/designTokens.css`; local approximations are not a second source of truth.

**The Material Carries Color Rule.** Outside active generation, warmth and chroma come from the industrial-design imagery, not decorative page backgrounds.

## Typography

**Display Font:** System CJK sans stack, led by PingFang SC on macOS.

**Body Font:** The same CJK sans stack for a continuous product voice.

**Label/Interface Font:** Assistant for Latin interface text, with the CJK stack as fallback.

**Character:** Heavy, compact display lettering reads like a selected text object on a working canvas. Interface type stays smaller and denser so tools remain subordinate to the work.

### Hierarchy

- **Display** (700, responsive 3.25–4.35rem, 0.98 line-height): the single selected product proposition.
- **Body** (400, 1.03rem, 1.5 line-height): one short supporting sentence below the proposition.
- **Interface** (600–700, 0.7–0.9rem): toolbars, chips, status, composer, and metadata.

### Named Rules

**The Selected Statement Rule.** The largest text should feel like an editable canvas object through scale and selection geometry, not like a polished marketing billboard.

## Layout

The desktop world is a fixed 1400 × 780 spatial plane centered inside the viewport. A three-column reading order—title and references, connectors and model choice, generated result and Agent writeback—provides narrative without page scrolling. Header, zoom/minimap, composer, and source links stay pinned to the viewport edge as canvas chrome.

Camera transforms, not document flow, reveal alternate moments. At 820px and below, the toolbar is removed, the controls stack into the top corners, and a three-step story switcher sits above the composer. Mobile keeps a stable page and moves the canvas plane; it never captures the page's vertical scroll gesture. At 470px, the selected title narrows and the display size reduces while preserving its two-line composition.

The recurring spacing rhythm is 4, 8, 12, and 20px. The dotted grid repeats every 22px on the main canvas and every 8px in the minimap.

## Elevation & Depth

Depth is functional and inherited from the product. The canvas stays flat; floating controls use the production island shadow, while raster imagery supplies the only substantial physical volume.

### Shadow Vocabulary

- **Island Shadow** (`0 0 1px rgba(0,0,0,.17), 0 0 3px rgba(0,0,0,.08), 0 7px 14px rgba(0,0,0,.05)`): toolbar, minimap, composer, and compact mobile navigation.
- **Selection Edge:** Generated imagery stays flat and receives only the Excalidraw selection outline and handles.

### Named Rules

**The Flat Canvas Rule.** Shadows belong to viewport chrome and movable work, never to invented marketing cards.

## Shapes

Controls use the production 6px compact and 8px regular radii. Selection geometry stays sharper—thin violet strokes, 2px handle radii, and square corner handles—to preserve the Excalidraw editing character. Connectors are open paths with round line caps and arrow markers.

## Components

### Buttons

- **Primary:** CoreStudio violet, white interface label, 8px radius, and 40px height.
- **Hover / Focus:** Hover uses the production primary-hover value; keyboard focus uses the production 2px mixed violet ring.
- **Tool:** 36px square, transparent at rest, `surface-high` on hover, and violet icon when active.
- **Composer action:** 28px icon-only send button with a 9% primary tint, 20% mixed border, and the production disabled state.

### Chips

- **Style:** Text-first canvas annotations with a 7px outlined dot rather than filled pills.
- **State:** The dot fills violet on hover or when its camera target is active; supporting text disappears on narrow viewports.

### Cards / Containers

- **Corner Style:** Compact controls use 6px; regular controls and raster results use 8px.
- **Background:** White or translucent white against paper.
- **Shadow Strategy:** Only floating chrome and visual work lift from the plane.
- **Border:** Borders appear on selection geometry and minimap viewport, not around every surface.

### Inputs / Fields

- **Style:** The generation composer mirrors the production component: one white island containing a borderless prompt, 28px settings control, and 28px icon-only send action.
- **Focus:** The entire composer receives a soft violet two-pixel halo in addition to the focused element's accessible outline.
- **Disabled:** Only the action is disabled during generation; the live region reports progress and writeback.

### Navigation

Desktop navigation behaves like application chrome: brand and toolbar align left/center while language and download align right. Mobile keeps brand, language, and download visible, then adds a compact three-step camera switcher above the composer.

### Generation Status

Generation uses the same restrained feedback as CoreStudio status surfaces: a pulsing violet 6px dot, a short status label, slight result-image de-emphasis, and a temporary connector color shift. There is no glow, blur field, moving dash, or decorative color bloom.

### Minimap

The minimap uses the same paper grid and object topology as the canvas. Its viewport rectangle changes with camera position and zoom; object markers are interactive shortcuts rather than decorative thumbnails.

## Do's and Don'ts

### Do:

- **Do** let visible product operations explain the product before adding prose.
- **Do** keep the macOS download continuously available and visually dominant.
- **Do** use raster imagery for metal, light, and other physical material.
- **Do** preserve keyboard focus, live status updates, and reduced-motion behavior.
- **Do** keep violet rare and tied to state.

### Don't:

- **Don't** rebuild the site as stacked feature sections or a generic SaaS card grid.
- **Don't** imply that third-party model inference is local or free.
- **Don't** fake metal, glass, or dimensional objects with CSS bevels and decorative gradients.
- **Don't** expand the simulated canvas into a misleading full web editor.
- **Don't** add customer claims, performance figures, or badges without evidence.
