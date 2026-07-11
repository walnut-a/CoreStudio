const copyWithExecCommand = (text: string) => {
  const textarea = document.createElement("textarea");
  textarea.value = text || " ";
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";

  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  textarea.remove();
  return copied;
};

export const copyPlainTextToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  return copyWithExecCommand(text);
};

export const copyPlainTextWithFailureMessage = async ({
  text,
  failureMessage,
  copyText = copyPlainTextToClipboard,
  onError,
}: {
  text: string;
  failureMessage: string;
  copyText?: (text: string) => Promise<boolean>;
  onError: (message: string) => void;
}) => {
  const copied = await copyText(text);
  if (!copied) {
    onError(failureMessage);
  }
  return copied;
};

export const createPlainTextClipboardRendererActions = ({
  failureMessage,
  copyText,
  onError,
}: {
  failureMessage: string;
  copyText?: (text: string) => Promise<boolean>;
  onError: (message: string) => void;
}) => ({
  copy: (text: string) =>
    copyPlainTextWithFailureMessage({
      text,
      failureMessage,
      copyText,
      onError,
    }),
});
