import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import {
  $getHtmlContent,
  $insertDataTransferForPlainText,
} from "@lexical/clipboard";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import {
  createEmptyHistoryState,
  HistoryPlugin,
  type HistoryState,
} from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $addUpdateTag,
  $getSelection,
  $isRangeSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  COPY_COMMAND,
  CUT_COMMAND,
  HISTORIC_TAG,
  HISTORY_PUSH_TAG,
  INPUT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  REDO_COMMAND,
  SELECT_ALL_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  UNDO_COMMAND,
  type LexicalEditor,
} from "lexical";

import { PromptReferenceDecorationProvider } from "./PromptReferenceDecoration";
import {
  DESKTOP_EDIT_COMMAND_EVENT,
  forgetDesktopEditCommandTarget,
  rememberDesktopEditCommandTarget,
  type DesktopEditCommand,
} from "../desktopEditCommand";
import {
  $confirmPendingPromptReference,
  $getPromptParts,
  $getSelectedPromptParts,
  $insertPromptPartsAtSelection,
  $insertPendingPromptReferenceAtSelection,
  $insertPromptReferenceAtSelection,
  $removePendingPromptReference,
  $setPromptParts,
  PendingPromptReferenceNode,
  PromptReferenceNode,
} from "./promptEditorDocument";
import { createPromptReferenceId } from "../generatePromptRequest";
import {
  clonePromptEditorClipboardFragment,
  embedPromptEditorClipboardFragmentInHtml,
  parsePromptEditorClipboardFragment,
  parsePromptEditorClipboardFragmentFromHtml,
  PROMPT_EDITOR_CLIPBOARD_MIME,
  serializePromptEditorClipboardFragment,
} from "../promptEditorClipboard";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
} from "../../shared/providerTypes";

export interface InlinePromptEditorHandle {
  focus: () => void;
  getParts: () => GenerationPromptPart[];
  insertReference: (referenceId: string) => GenerationPromptPart[];
  confirmPendingReference: (referenceId: string) => GenerationPromptPart[];
}

interface InlinePromptEditorProps {
  ariaLabel: string;
  placeholder: string;
  parts: GenerationPromptPart[];
  references: GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
  resetKey: number;
  onChange: (parts: GenerationPromptPart[]) => void;
  onPasteReferences: (references: GenerationPromptReferencePayload[]) => void;
  onPendingReferenceDiscard?: () => void;
  onFocusIntent: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyPressCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onKeyUpCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const EXTERNAL_RESET_TAG = "prompt-editor-external-reset";
const PENDING_REFERENCE_SYNC_TAG = "prompt-editor-pending-reference-sync";
const PENDING_REFERENCE_CONFIRM_TAG = "prompt-editor-pending-reference-confirm";

const PendingReferencePlugin = ({
  pendingReference,
  resetKey,
}: {
  pendingReference: GenerationReferencePayload | null;
  resetKey: number;
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(
      () => {
        if (pendingReference) {
          $insertPendingPromptReferenceAtSelection();
        } else {
          $removePendingPromptReference();
        }
      },
      {
        tag: [PENDING_REFERENCE_SYNC_TAG, HISTORIC_TAG, SKIP_DOM_SELECTION_TAG],
      },
    );
  }, [editor, pendingReference, resetKey]);

  return null;
};

const PendingReferenceEditingPlugin = ({
  onDiscard,
}: {
  onDiscard?: () => void;
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!onDiscard) {
      return;
    }

    return editor.registerMutationListener(
      PendingPromptReferenceNode,
      (mutations, { updateTags }) => {
        if (
          updateTags.has(EXTERNAL_RESET_TAG) ||
          updateTags.has(PENDING_REFERENCE_SYNC_TAG) ||
          updateTags.has(PENDING_REFERENCE_CONFIRM_TAG)
        ) {
          return;
        }

        if ([...mutations.values()].includes("destroyed")) {
          queueMicrotask(onDiscard);
        }
      },
      { skipInitialization: true },
    );
  }, [editor, onDiscard]);

  return null;
};

const PromptEditingContractPlugin = ({
  references,
  onPasteReferences,
}: {
  references: readonly GenerationPromptReferencePayload[];
  onPasteReferences: (references: GenerationPromptReferencePayload[]) => void;
}) => {
  const [editor] = useLexicalComposerContext();
  const needsHistoryBoundaryRef = useRef(false);

  useEffect(() => {
    const writeReferenceFragment = (
      event: ClipboardEvent | null,
      removeSelection: boolean,
    ) => {
      const clipboardData = event?.clipboardData;
      const selection = $getSelection();
      if (!clipboardData || !$isRangeSelection(selection)) {
        return false;
      }

      const parts = $getSelectedPromptParts(editor);
      const selectedReferenceIds = new Set(
        parts
          .filter(
            (
              part,
            ): part is Extract<GenerationPromptPart, { type: "reference" }> =>
              part.type === "reference",
          )
          .map((part) => part.referenceId),
      );
      if (selectedReferenceIds.size === 0) {
        return false;
      }

      const selectedReferences = references.filter((reference) =>
        selectedReferenceIds.has(reference.id),
      );
      if (selectedReferences.length !== selectedReferenceIds.size) {
        return false;
      }

      const serializedFragment = serializePromptEditorClipboardFragment({
        parts,
        references: selectedReferences,
      });
      const html = $getHtmlContent(editor);

      event.preventDefault();
      clipboardData.setData(PROMPT_EDITOR_CLIPBOARD_MIME, serializedFragment);
      clipboardData.setData("text/plain", selection.getTextContent());
      if (html) {
        clipboardData.setData(
          "text/html",
          embedPromptEditorClipboardFragmentInHtml(html, serializedFragment),
        );
      }
      if (removeSelection) {
        $addUpdateTag(HISTORY_PUSH_TAG);
        needsHistoryBoundaryRef.current = false;
        selection.removeText();
      }
      return true;
    };

    return mergeRegister(
      editor.registerMutationListener(
        PromptReferenceNode,
        (mutations, { updateTags }) => {
          if (!updateTags.has(EXTERNAL_RESET_TAG) && mutations.size > 0) {
            needsHistoryBoundaryRef.current = true;
          }
        },
        { skipInitialization: true },
      ),
      editor.registerCommand(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        () => {
          if (needsHistoryBoundaryRef.current) {
            $addUpdateTag(HISTORY_PUSH_TAG);
            needsHistoryBoundaryRef.current = false;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        INPUT_COMMAND,
        () => {
          if (needsHistoryBoundaryRef.current) {
            $addUpdateTag(HISTORY_PUSH_TAG);
            needsHistoryBoundaryRef.current = false;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        INSERT_LINE_BREAK_COMMAND,
        () => {
          if (needsHistoryBoundaryRef.current) {
            $addUpdateTag(HISTORY_PUSH_TAG);
            needsHistoryBoundaryRef.current = false;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        COPY_COMMAND,
        (event) =>
          writeReferenceFragment(
            event && "clipboardData" in event ? event : null,
            false,
          ),
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        CUT_COMMAND,
        (event) =>
          writeReferenceFragment(
            event && "clipboardData" in event ? event : null,
            true,
          ),
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const selection = $getSelection();
          const clipboardData =
            "clipboardData" in event ? event.clipboardData : null;
          if (!$isRangeSelection(selection) || !clipboardData) {
            return false;
          }

          event.preventDefault();
          $addUpdateTag(HISTORY_PUSH_TAG);
          needsHistoryBoundaryRef.current = false;
          const fragment =
            parsePromptEditorClipboardFragment(
              clipboardData.getData(PROMPT_EDITOR_CLIPBOARD_MIME),
            ) ||
            parsePromptEditorClipboardFragmentFromHtml(
              clipboardData.getData("text/html"),
            );
          if (fragment) {
            const pastedFragment = clonePromptEditorClipboardFragment(
              fragment,
              createPromptReferenceId,
            );
            onPasteReferences(pastedFragment.references);
            $insertPromptPartsAtSelection(pastedFragment.parts);
            return true;
          }
          $insertDataTransferForPlainText(clipboardData, selection);
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (
            event === null ||
            event.shiftKey ||
            event.altKey ||
            event.isComposing
          ) {
            return false;
          }

          event.preventDefault();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, onPasteReferences, references]);

  return null;
};

const PromptHistoryPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const historyStateRef = useRef<HistoryState | null>(null);

  if (!historyStateRef.current) {
    historyStateRef.current = createEmptyHistoryState();
  }
  useEffect(() => {
    const historyState = historyStateRef.current;
    if (!historyState) {
      return;
    }

    const baselineEditorState = editor.getEditorState();
    if (!historyState.current) {
      historyState.current = {
        editor,
        editorState: baselineEditorState,
      };
    }

    const unregisterUpdate = editor.registerUpdateListener(
      ({ editorState, tags }) => {
        if (tags.has(EXTERNAL_RESET_TAG)) {
          historyState.current = {
            editor,
            editorState,
          };
        }
      },
    );

    return () => {
      unregisterUpdate();
    };
  }, [editor]);

  return <HistoryPlugin externalHistoryState={historyStateRef.current} />;
};

const ExternalResetPlugin = ({
  parts,
  resetKey,
}: {
  parts: readonly GenerationPromptPart[];
  resetKey: number;
}) => {
  const [editor] = useLexicalComposerContext();
  const observedResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (observedResetKeyRef.current === resetKey) {
      return;
    }

    observedResetKeyRef.current = resetKey;
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
    editor.update(() => $setPromptParts(parts), {
      tag: EXTERNAL_RESET_TAG,
    });
  }, [editor, parts, resetKey]);

  return null;
};

const PromptChangePlugin = ({
  onChange,
}: {
  onChange: (parts: GenerationPromptPart[]) => void;
}) => (
  <OnChangePlugin
    ignoreHistoryMergeTagChange
    onChange={(editorState, _editor, tags) => {
      if (tags.has(EXTERNAL_RESET_TAG)) {
        return;
      }
      if (tags.has(PENDING_REFERENCE_SYNC_TAG)) {
        return;
      }
      onChange(editorState.read($getPromptParts));
    }}
  />
);

const DesktopEditCommandPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleDesktopEditCommand = (event: Event) => {
      const command = (event as CustomEvent<{ command?: DesktopEditCommand }>)
        .detail?.command;
      if (command !== "undo" && command !== "redo") {
        return;
      }

      event.preventDefault();
      editor.dispatchCommand(
        command === "redo" ? REDO_COMMAND : UNDO_COMMAND,
        undefined,
      );
    };

    return editor.registerRootListener((rootElement, previousRootElement) => {
      previousRootElement?.removeEventListener(
        DESKTOP_EDIT_COMMAND_EVENT,
        handleDesktopEditCommand,
      );
      rootElement?.addEventListener(
        DESKTOP_EDIT_COMMAND_EVENT,
        handleDesktopEditCommand,
      );
    });
  }, [editor]);

  return null;
};

export const InlinePromptEditor = forwardRef<
  InlinePromptEditorHandle,
  InlinePromptEditorProps
>(
  (
    {
      ariaLabel,
      placeholder,
      parts,
      references,
      pendingReference,
      resetKey,
      onChange,
      onPasteReferences,
      onPendingReferenceDiscard,
      onFocusIntent,
      onKeyDown,
      onMouseDown,
      onKeyPressCapture,
      onKeyUpCapture,
    },
    ref,
  ) => {
    const editorRef = useRef<LexicalEditor | null>(null);
    const handleFocusIntent = () => {
      const rootElement = editorRef.current?.getRootElement();
      if (rootElement) {
        rememberDesktopEditCommandTarget(rootElement);
      }
      onFocusIntent();
    };

    useEffect(
      () => () => {
        const rootElement = editorRef.current?.getRootElement();
        if (rootElement) {
          forgetDesktopEditCommandTarget(rootElement);
        }
      },
      [],
    );

    const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "a"
      ) {
        event.preventDefault();
        editorRef.current?.dispatchCommand(
          SELECT_ALL_COMMAND,
          event.nativeEvent,
        );
      }
      onKeyDown(event);
    };

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      getParts: () =>
        editorRef.current?.getEditorState().read($getPromptParts) ?? [],
      insertReference: (referenceId: string) => {
        const editor = editorRef.current;
        if (!editor) {
          return [...parts, { type: "reference", referenceId }];
        }

        editor.update(() => $insertPromptReferenceAtSelection(referenceId), {
          discrete: true,
        });
        return editor.getEditorState().read($getPromptParts);
      },
      confirmPendingReference: (referenceId: string) => {
        const editor = editorRef.current;
        if (!editor) {
          return [...parts, { type: "reference", referenceId }];
        }

        editor.update(() => $confirmPendingPromptReference(referenceId), {
          discrete: true,
          tag: PENDING_REFERENCE_CONFIRM_TAG,
        });
        return editor.getEditorState().read($getPromptParts);
      },
    }));

    return (
      <PromptReferenceDecorationProvider
        references={references}
        pendingReference={pendingReference}
      >
        <LexicalComposer
          initialConfig={{
            namespace: "CoreStudioPromptEditor",
            nodes: [PromptReferenceNode, PendingPromptReferenceNode],
            editorState: () => $setPromptParts(parts),
            onError: (error) => {
              throw error;
            },
          }}
        >
          <div
            className="generate-composer__prompt-editor"
            onMouseDown={onMouseDown}
            onClick={handleFocusIntent}
          >
            <PlainTextPlugin
              contentEditable={
                <ContentEditable
                  className="generate-composer__prompt-editor-content"
                  role="textbox"
                  aria-label={ariaLabel}
                  data-placeholder={placeholder}
                  {...(pendingReference
                    ? { placeholder: null }
                    : {
                        "aria-placeholder": placeholder,
                        placeholder: (
                          <span className="generate-composer__prompt-placeholder">
                            {placeholder}
                          </span>
                        ),
                      })}
                  onFocus={handleFocusIntent}
                  onKeyPressCapture={onKeyPressCapture}
                  onKeyUpCapture={onKeyUpCapture}
                  onKeyDown={handleEditorKeyDown}
                />
              }
              placeholder={null}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
          <PromptHistoryPlugin />
          <PromptEditingContractPlugin
            references={references}
            onPasteReferences={onPasteReferences}
          />
          <EditorRefPlugin editorRef={editorRef} />
          <DesktopEditCommandPlugin />
          <ExternalResetPlugin parts={parts} resetKey={resetKey} />
          <PendingReferencePlugin
            pendingReference={pendingReference}
            resetKey={resetKey}
          />
          <PendingReferenceEditingPlugin
            onDiscard={onPendingReferenceDiscard}
          />
          <PromptChangePlugin onChange={onChange} />
        </LexicalComposer>
      </PromptReferenceDecorationProvider>
    );
  },
);

InlinePromptEditor.displayName = "InlinePromptEditor";
