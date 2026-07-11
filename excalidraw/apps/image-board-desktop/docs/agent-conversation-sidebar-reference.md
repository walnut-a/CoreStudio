# Agent Conversation Sidebar Reference

## Mode Boundary

CoreStudio has two different generation interaction modes:

- Direct input is a single-run generation mode. It is not a chat thread, and consecutive runs do not inherit context from each other.
- ACP Agent is a continuous thread mode. A thread owns multiple user messages, assistant messages, tool calls, write-backs, and task runs.

The left sidebar must therefore switch surfaces instead of forcing both modes into one chat UI:

- Direct input shows a compact generation record list. It does not show a continuation composer.
- ACP Agent shows sessions and a chronological conversation. It includes a continuation composer.

The bottom floating composer remains the fast entry point for both modes: direct mode starts a new independent generation; ACP Agent mode sends into the current thread or creates one.

## Reference

The Agent conversation sidebar follows two mature open-source UI references:

- assistant-ui Thread primitives: use a thread viewport as the stable conversation surface, with each run-log item mapped into a message.
- Vercel AI Elements conversation and tool components: keep user messages, assistant text, tool calls, and tool results in one chronological thread, while giving tool steps a quieter inline presentation.

Reference URLs:

- https://github.com/assistant-ui/assistant-ui
- https://www.assistant-ui.com/docs/ui/thread
- https://elements.ai-sdk.dev/components/message
- https://elements.ai-sdk.dev/components/conversation
- https://elements.ai-sdk.dev/components/tool

## CoreStudio Adaptation

CoreStudio still uses its Excalidraw-native design system:

- Sidebars use the shared `SideDock` shell, white island surface, 1px borders, and small-radius controls.
- User and assistant entries render as compact message bubbles.
- Tool calls, status updates, errors, and protocol events stay interleaved with the chat content and render as inline tool cards. They should read like steps inside the same Agent process, not as a separate debug log.
- Raw JSON and manual refresh controls do not belong in the conversation sidebar. They live in application settings under recent Agent task records.
- Empty state stays low-emphasis and should not apologize for being empty. It should simply indicate that conversation content will appear here.
- The sidebar footer is a continuation composer. The bottom floating composer remains a shortcut for quickly starting a task; the left sidebar owns the complete conversation surface.
- Continuous Agent work is modeled as a thread over time. The sidebar keeps interleaved messages across follow-up tasks, and the desktop run-log store persists a thread index where individual ACP task logs are evidence inside that thread; task-log debugging remains a settings concern, not the primary chat UI.
- Direct generation records should read as a task list, not as messages. The first implementation may derive records from generated image metadata, but the long-term model should promote generation tasks to first-class records with result image IDs.

## Agent Integration Design System Notes

These notes keep the Agent surfaces aligned with the current Excalidraw-native CoreStudio design system. The visual reference is assistant-ui for conversation structure and Vercel AI Elements for inline tool/result patterns, but the final UI must reuse CoreStudio tokens and component shells rather than importing a separate chat product style.

### Sidebar width

Left Agent conversation and right detail sidebars share the same dock contract: `--corestudio-side-panel-width` is the source of truth and is currently `300px`. Feature CSS should not invent another default width. Narrow screens may collapse or hide secondary content, but the opened dock width should still come from the shared token.

### Type scale

Sidebar text stays compact and work-focused. Section labels use the small label scale, conversation body copy uses the normal body scale, and no Agent surface should introduce hero-sized headings, decorative oversized empty states, or marketing-style cards. Long message text should prefer readable line-height and paragraph rhythm over larger font size.

### Font weights

Use the shared font-weight tokens only: `--font-weight-regular`, `--font-weight-medium`, `--font-weight-semibold`, and `--font-weight-bold`. Default body and metadata text should stay regular. Thread titles, tool action labels, and compact card titles may use medium. Panel headings may use semibold. Bold is reserved for rare high-emphasis labels already established by the surrounding CoreStudio UI.

### Tool call row

Tool calls render inline in the chronological thread, not in a separate debug column. The collapsed row title should say what happened, for example `读取文件`, `搜索资料`, `写入图片`, or `定位结果`, followed by a short target when available. Status belongs on the right edge. Expanded details may show arguments, output, and errors, with JSON/code using the same neutral code-block surface as markdown content.

### Image result card

Generated or written image results render as result cards inside the same thread. Each card needs a thumbnail, source label, prompt or task summary when known, reference image relationship when known, and a locate action. Missing links should show a repairable reason instead of pretending the result can be located.

### Status dock

The right-bottom Agent status dock is a monitor and shortcut, not a settings panel. Its button size, hover state, z-index, and gap must match the neighboring help button and use the shared footer button tokens. The popover may show Bridge, project, CLI, Agent Board, and ACP readiness plus copy shortcuts, but configuration forms and raw task logs stay in settings.

### Composer

The bottom composer is a fast task launcher. The left Agent sidebar composer is the full continuation composer for ACP threads. Direct input mode starts independent single-run generations and does not show a continuation composer in the sidebar. Debug controls, raw JSON toggles, and manual log refresh controls do not belong in either composer.

## Non-goals

- Do not introduce a separate chat product visual language.
- Do not show raw ACP protocol traffic by default.
- Do not use large cards, decorative avatars, gradients, or marketing-style empty states.
