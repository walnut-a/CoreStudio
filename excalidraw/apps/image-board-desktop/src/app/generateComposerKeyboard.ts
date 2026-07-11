export type GenerateComposerKeyboardAction = "none" | "select-all" | "submit";

interface GenerateComposerKeyboardActionInput {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
}

export const getGenerateComposerKeyboardAction = ({
  key,
  metaKey = false,
  ctrlKey = false,
  altKey = false,
  shiftKey = false,
  isComposing = false,
}: GenerateComposerKeyboardActionInput): GenerateComposerKeyboardAction => {
  if ((metaKey || ctrlKey) && !altKey && key.toLowerCase() === "a") {
    return "select-all";
  }

  if (key !== "Enter" || isComposing || shiftKey || altKey) {
    return "none";
  }

  return "submit";
};
