import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  getDefaultModel,
  getProviderCapabilities,
  getProviderDefinition,
  getVisibleGenerationFields,
  normalizeGenerationRequest,
  PROVIDER_IDS,
} from "../../shared/providerCatalog";
import type { PublicProviderSettings } from "../../shared/desktopBridgeTypes";
import type { GenerationRequest, ProviderId } from "../../shared/providerTypes";
import {
  copy,
  getReferenceInlineStatusText,
  getReferenceSummaryText,
} from "../copy";
import { DesktopButton } from "./DesktopButton";

interface GenerateImageDialogProps {
  open: boolean;
  persistent?: boolean;
  focusToken?: number;
  initialRequest: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  loading: boolean;
  error: string | null;
  onOpenErrorDetails?: () => void;
  onClose: () => void;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
}

export const GenerateImageDialog = ({
  open,
  persistent = false,
  focusToken = 0,
  initialRequest,
  providerSettings,
  loading: _loading,
  error,
  onOpenErrorDetails,
  onClose,
  onSubmit,
}: GenerateImageDialogProps) => {
  const [request, setRequest] = useState(initialRequest);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const handleTextInputKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    if (
      !(event.metaKey || event.ctrlKey) ||
      event.altKey ||
      event.key.toLowerCase() !== "a"
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
  };

  useEffect(() => {
    setRequest(normalizeGenerationRequest(initialRequest));
  }, [initialRequest, open]);
  const isConfigured = providerSettings?.[request.provider]?.isConfigured ?? false;

  const hasReferenceSelection = Boolean(request.reference?.elementCount);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (error || !isConfigured) {
      setAdvancedOpen(true);
    }
  }, [error, isConfigured, open]);

  useEffect(() => {
    if (!open || focusToken === 0) {
      return;
    }

    promptRef.current?.focus();
  }, [focusToken, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        if (persistent) {
          setAdvancedOpen(false);
          return;
        }
        onClose();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      if (persistent) {
        setAdvancedOpen(false);
        return;
      }

      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose, open, persistent]);

  if (!open) {
    return null;
  }

  const providerDefinition = getProviderDefinition(request.provider);
  const capabilities = getProviderCapabilities(request);
  const visibleFields = getVisibleGenerationFields(request);
  const referenceEnabled = request.reference?.enabled ?? false;
  const referenceStatusText = hasReferenceSelection
    ? getReferenceInlineStatusText(
        referenceEnabled,
        request.reference!.elementCount,
      )
    : null;

  const submitRequest = () => {
    onSubmit(normalizeGenerationRequest(request), false);
  };

  return (
    <div className="floating-panel-layer">
      <section
        ref={panelRef}
        className={[
          "generate-panel",
          advancedOpen ? "generate-panel--expanded" : "generate-panel--compact",
        ].join(" ")}
        role="dialog"
        aria-modal="false"
        aria-label={copy.generateDialog.title}
      >
        <div className="generate-composer">
          <DesktopButton
            type="button"
            variant="primary"
            className="generate-composer__action"
            aria-label={copy.generateDialog.generate}
            title={copy.generateDialog.generate}
            disabled={!request.prompt.trim() || !isConfigured}
            onClick={submitRequest}
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </DesktopButton>
          <span className="generate-composer__divider" aria-hidden="true" />
          <div className="generate-composer__field">
            {referenceStatusText ? (
              <button
                type="button"
                className={[
                  "generate-composer__reference-pill",
                  referenceEnabled
                    ? "generate-composer__reference-pill--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={`引用状态：${referenceStatusText}`}
                title={copy.generateDialog.referenceToggle}
                disabled={!capabilities.supportsReferenceImages}
                onClick={() =>
                  setRequest((current) => ({
                    ...current,
                    reference: current.reference
                      ? {
                          ...current.reference,
                          enabled: !referenceEnabled,
                        }
                      : null,
                  }))
                }
              >
                {referenceStatusText}
              </button>
            ) : null}
            <textarea
              ref={promptRef}
              className="generate-composer__prompt"
              rows={1}
              wrap="off"
              aria-label={copy.generateDialog.prompt}
              placeholder={copy.generateDialog.promptPlaceholder}
              value={request.prompt}
              onKeyDown={handleTextInputKeyDown}
              onChange={(event) =>
                setRequest((current) => ({
                  ...current,
                  prompt: event.target.value,
                }))
              }
            />
          </div>
          <span className="generate-composer__divider" aria-hidden="true" />
          <DesktopButton
            type="button"
            className="generate-composer__icon"
            aria-label={
              advancedOpen
                ? copy.generateDialog.collapseSettings
                : copy.generateDialog.expandSettings
            }
            title={
              advancedOpen
                ? copy.generateDialog.collapseSettings
                : copy.generateDialog.expandSettings
            }
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
            </svg>
          </DesktopButton>
        </div>

        {advancedOpen && (
          <div className="generate-panel__body">
            {!isConfigured && (
              <div className="dialog-card__warning">
                {copy.generateDialog.providerWarning}
              </div>
            )}

            {error && (
              <div
                className={[
                  "dialog-card__error",
                  onOpenErrorDetails ? "dialog-card__error--actionable" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="dialog-card__error-copy">{error}</div>
                {onOpenErrorDetails && (
                  <DesktopButton
                    type="button"
                    className="dialog-card__error-action"
                    onClick={onOpenErrorDetails}
                  >
                    {copy.debugError.view}
                  </DesktopButton>
                )}
              </div>
            )}

            <div className="dialog-form-grid">
              <label>
                {copy.generateDialog.provider}
                <select
                  value={request.provider}
                  onChange={(event) => {
                    const provider = event.target.value as ProviderId;
                    setRequest((current) =>
                      normalizeGenerationRequest({
                        ...current,
                        provider,
                        model:
                          providerSettings?.[provider]?.defaultModel ||
                          getDefaultModel(provider),
                      }),
                    );
                  }}
                >
                  {PROVIDER_IDS.map((providerId) => (
                    <option key={providerId} value={providerId}>
                      {getProviderDefinition(providerId).label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {copy.generateDialog.model}
                <select
                  value={request.model}
                  onChange={(event) =>
                    setRequest((current) =>
                      normalizeGenerationRequest({
                        ...current,
                        model: event.target.value,
                      }),
                    )
                  }
                >
                  {Object.values(providerDefinition.models).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>

              {visibleFields.negativePrompt && (
                <label className="dialog-form-grid__full">
                  {copy.generateDialog.negativePrompt}
                  <textarea
                    rows={3}
                    value={request.negativePrompt || ""}
                    onKeyDown={handleTextInputKeyDown}
                    onChange={(event) =>
                      setRequest((current) => ({
                        ...current,
                        negativePrompt: event.target.value,
                      }))
                    }
                  />
                </label>
              )}

              {visibleFields.width && (
                <label>
                  {copy.generateDialog.width}
                  <input
                    type="number"
                    min={256}
                    step={64}
                    value={request.width}
                    onChange={(event) =>
                      setRequest((current) => ({
                        ...current,
                        width: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              )}

              {visibleFields.height && (
                <label>
                  {copy.generateDialog.height}
                  <input
                    type="number"
                    min={256}
                    step={64}
                    value={request.height}
                    onChange={(event) =>
                      setRequest((current) => ({
                        ...current,
                        height: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              )}

              {visibleFields.seed && (
                <label>
                  {copy.generateDialog.seed}
                  <input
                    type="number"
                    value={request.seed ?? ""}
                    onChange={(event) =>
                      setRequest((current) => ({
                        ...current,
                        seed: event.target.value ? Number(event.target.value) : null,
                      }))
                    }
                  />
                </label>
              )}

              {visibleFields.imageCount && (
                <label>
                  {copy.generateDialog.imageCount}
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={request.imageCount}
                    onChange={(event) =>
                      setRequest((current) => ({
                        ...current,
                        imageCount: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              )}

              <div className="dialog-form-grid__full dialog-reference-card">
                <div className="dialog-reference-card__header">
                  <div>
                    <strong>{copy.generateDialog.referenceTitle}</strong>
                    <p>
                      {hasReferenceSelection
                        ? getReferenceSummaryText(
                            request.reference!.elementCount,
                            request.reference!.textCount,
                          )
                        : copy.generateDialog.referenceEmpty}
                    </p>
                  </div>

                  <label className="dialog-checkbox dialog-checkbox--compact">
                    <input
                      type="checkbox"
                      checked={referenceEnabled}
                      disabled={
                        !hasReferenceSelection ||
                        !capabilities.supportsReferenceImages
                      }
                      onChange={(event) =>
                        setRequest((current) => ({
                          ...current,
                          reference: current.reference
                            ? {
                                ...current.reference,
                                enabled: event.target.checked,
                              }
                            : null,
                        }))
                      }
                    />
                    {copy.generateDialog.referenceToggle}
                  </label>
                </div>

                {hasReferenceSelection && request.reference?.textCount ? (
                  <div className="dialog-reference-card__notes">
                    <span>{copy.generateDialog.referenceTextTitle}</span>
                    <p>{request.reference.textNotes?.join(" / ")}</p>
                  </div>
                ) : null}

                {hasReferenceSelection && !capabilities.supportsReferenceImages ? (
                  <div className="dialog-card__warning dialog-card__warning--compact">
                    {copy.generateDialog.referenceUnsupported}
                  </div>
                ) : null}
              </div>
            </div>

          </div>
        )}
      </section>
    </div>
  );
};
