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

## Non-goals

- Do not introduce a separate chat product visual language.
- Do not show raw ACP protocol traffic by default.
- Do not use large cards, decorative avatars, gradients, or marketing-style empty states.
