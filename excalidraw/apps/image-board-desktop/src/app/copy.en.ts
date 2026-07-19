import type { DesktopCopy } from "./copy";

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }
  return `${(kilobytes / 1024).toFixed(1)} MB`;
};

export const enCopy: DesktopCopy = {
  welcome: {
    eyebrow: "Local projects",
    title: "Choose a project to begin",
    description:
      "Create a local project or open an existing one. Boards, images, prompts, and generation history stay in the project folder.",
    recentTitle: "Projects",
    recentEmpty: "No projects yet. Create or open one to get started.",
    lastOpenedAt: "Last opened",
    continueLastProject: "Continue recent project",
    deleteProject: "Remove project",
    deleteProjectRecordOnly: "Remove from list",
    revealProjectForManualDelete: "Show in file manager",
    cancelDeleteProject: "Cancel",
    deleteProjectRecordHint:
      "This only removes the project from the list. It does not delete the local project folder.",
    deleteProjectManualHint:
      "To delete the data itself, remove the project folder manually in the file manager.",
    creating: "Creating...",
    newProject: "New project",
    opening: "Opening...",
    openProject: "Open project",
    removeProjectFailed: "Could not remove this project from the project list.",
  },
  toolbar: {
    generateImage: "Generate image",
  },
  generateDialog: {
    eyebrow: "Generate image",
    title: "Generate directly onto the board",
    close: "Close",
    promptPlaceholder: "Describe what you want to generate",
    expandedPromptLabel: "Expand prompt input",
    promptInputHint: "Enter to send, Shift+Enter for a new line",
    expandPrompt: "Expand input",
    collapsePrompt: "Collapse input",
    expandSettings: "Expand settings",
    collapseSettings: "Collapse settings",
    providerWarning: "No image generation service is configured.",
    openApplicationSettings: "Open Application Settings",
    provider: "Model service",
    model: "Model",
    prompt: "Prompt",
    negativePrompt: "Negative prompt",
    aspectRatio: "Aspect ratio",
    aspectRatioAuto: "Auto (not specified)",
    width: "Width",
    height: "Height",
    seed: "Seed",
    imageCount: "Image count",
    customModel: (label: string) => `Custom: ${label}`,
    referenceThumbnail: (label: string) => `${label} thumbnail`,
    pendingReference: (index: number, label: string) =>
      `${index} ${label}, pending confirmation`,
    pendingReferenceThumbnail: (index: number, label: string) =>
      `${index} ${label} pending confirmation thumbnail`,
    pendingImage: "Image",
    pendingAnnotatedImage: "Annotated image",
    pendingCanvasLabel: "Generating",
    failedCanvasLabel: "Generation failed",
    referenceTitle: "References",
    referenceToggle: "Use the current selection as a reference",
    referenceRemove: "Remove reference",
    referenceLimitReached: "This model accepts up to {count} reference images.",
    referenceLimitExceeded:
      "This model supports up to {count} reference images. Remove the extras first.",
    referenceUnsupportedWithInlineReferences:
      "This model does not support reference images. Remove the inserted references first.",
    referenceAutoStatus: "Current selection added automatically",
    referenceEmpty: "Nothing is currently selected.",
    referenceUnsupported: "This model does not support reference images yet.",
    referenceTextTitle: "Selected text",
    keepOpen: "Keep this dialog open after generation",
    cancel: "Cancel",
    cancelGeneration: "Stop generation",
    generating: "Generating...",
    generate: "Generate",
    generateCompact: "Generate",
  },
  providersDialog: {
    eyebrow: "Model services",
    title: "Configure your API key",
    close: "Close",
    currentProvider: "Current service",
    status: "Status",
    apiKey: "API Key",
    keepCurrentKey: "Leave blank to keep the current key",
    pasteApiKey: "Paste API Key",
    defaultModel: "Default model",
    saving: "Saving...",
    save: "Save",
    saved: "Saved locally. The key will not be displayed again.",
    saveFailed: "Save failed",
  },
  inspector: {
    title: "Image details",
    sidebarTitle: "Details",
    selectElementHint: "Select an element to adjust its style here.",
    sidebarToggle: "Sidebar",
    empty:
      "Select an AI-generated image or generation placeholder to inspect its prompt, model, size, and task status.",
    generatedImageTitle: "AI-generated image",
    importedImageTitle: "Imported image",
    taskTitle: "Generation task",
    taskPending: "Generating",
    taskFailed: "Generation failed",
    taskStatus: "Status",
    taskStartedAt: "Started",
    taskMessage: "Current message",
    taskRawError: "Raw error",
    taskStack: "Call stack",
    source: "Source",
    imageId: "Image ID",
    parentImage: "Source image",
    chainTitle: "Edit chain",
    currentImage: "Current image",
    descendantImages: "Later versions",
    locateImage: "Locate image",
    locateGenerationRecord: "Show in generation history",
    locateReference: (label: string) => `Locate ${label}`,
    locatedReferencingResult:
      "This image is a reference for a later result. Located the board image that uses it.",
    missingBoardElement:
      "This image record has no matching board element. Run project data repair to restore it to the canvas.",
    provider: "Model service",
    importedProvider: "Imported",
    agentProvider: "Agent",
    unrecordedProvider: "Not recorded",
    detailsTitle: "Generation parameters",
    model: "Model",
    prompt: "Prompt",
    promptReferences: "Reference images",
    negativePrompt: "Negative prompt",
    seed: "Seed",
    size: "Size",
    autoAspectRatio: "Auto aspect ratio",
    createdAt: "Created",
    emptyValue: "None",
    copyPrompt: "Copy prompt",
    copyTaskError: "Copy error details",
  },
  elementActions: {
    title: "Element editing",
  },
  clipboard: {
    writeFailed: "Copy failed. Check the system clipboard permission.",
  },
  startup: {
    eyebrow: "Startup diagnostics",
    heading: "Desktop app not connected",
    description:
      "This page is not connected to the local desktop capabilities, so it cannot create or open projects. Launch it from the CoreStudio desktop app.",
    retryInstruction:
      "In development, run `corepack yarn start:desktop`. For a packaged app, quit and reopen CoreStudio.",
    editorLoading: "Loading board...",
    providerLoadFailed:
      "The desktop connection is unavailable, so model service settings could not be loaded.",
    createProjectFailed: "Could not create the project.",
    openProjectFailed: "Could not open the project.",
    importImagesFailed: "Could not import images.",
    revealProjectFailed: "Could not show the project folder.",
    saveProjectFailed: "Could not save the project.",
    saveBeforeOpenFailed:
      "The previous project could not be saved, so opening the new project was stopped.",
    staleProjectSnapshot:
      "This project was updated in another session. Autosave is paused until you load the latest version.",
    loadLatestProject: "Load latest version",
    loadingLatestProject: "Loading...",
    generateFailed: "Image generation failed.",
  },
  debugError: {
    eyebrow: "Debug information",
    title: "Error details",
    view: "View error details",
    close: "Close",
    copy: "Copy error details",
    copied: "Copied",
    provider: "Model service",
    model: "Model",
    occurredAt: "Occurred at",
    message: "Current message",
    raw: "Raw error",
    payload: "Request payload",
    stack: "Call stack",
  },
  generationError: {
    canvasNotReady: "The CoreStudio board is not ready yet.",
    missingSelectionReference:
      "No usable selection reference is available. Select the elements again and retry.",
    geminiInvalidKey:
      "The Gemini API Key is invalid. Generate a new key in Google AI Studio and save it.",
    geminiNotConfigured:
      "The Gemini API Key is not configured. Complete the setup in Application Settings.",
    zenmuxInsufficientBalance:
      "Your ZenMux balance is too low. This model requires a positive account balance.",
    zenmuxInvalidKey:
      "The ZenMux API Key is invalid. Check the API Key and account status in ZenMux.",
    zenmuxNotConfigured:
      "The ZenMux API Key is not configured. Complete the setup in Application Settings.",
    falInvalidKey: "The fal API Key is invalid. Check it and save again.",
    providerInvalidKey: (provider: string) =>
      `The ${provider} API Key is invalid. Check it in Application Settings and save again.`,
    providerNetwork: (provider: string) =>
      `Could not connect to ${provider}. Check the service URL and network connection.`,
    modelNotFound: (provider: string) =>
      `${provider} could not find the current model. Check the model ID in Application Settings.`,
    unsupportedParameters:
      "The current model does not support these generation parameters. Adjust the size, count, or reference images and try again.",
  },
  about: {
    title: "About CoreStudio",
    close: "Close",
    closeLabel: "Close About",
    versionLabel: "Version",
    versionUnknown: "Unknown",
    description:
      "A local-first AI board for industrial design, built to organize references, generate concepts, and preserve the design process.",
  },
  menu: {
    projectGroup: "CoreStudio Project",
    currentProject: (name: string) => `Current project: ${name}`,
    file: "File",
    newProject: "New Project",
    openProject: "Open Project",
    switchProject: "Switch Project...",
    openProjectSafe: "Open Project in Safe Mode",
    recentProjects: "Recent Projects",
    version: "Version",
    projectMaintenance: "Project Maintenance",
    inspectProjectHealth: "Check Current Project Health",
    repairProjectThumbnails: "Repair Current Project Data",
    cleanProjectCache: "Clean Current Project Cache",
    importImages: "Import Images",
    revealProject: "Show Project Folder",
    generate: "Generate",
    generateImage: "Generate Image",
    providers: "Model Services",
    edit: "Edit",
    settings: "Settings",
    appSettings: "Application Settings",
    quit: "Quit CoreStudio",
    help: "Help",
    viewUpdates: "View Updates",
    about: "About CoreStudio",
  },
  applicationSettings: {
    title: "Application Settings",
    close: "Close",
    categoriesLabel: "Settings categories",
    general: "General",
    imageGeneration: "Image Generation",
    codexIntegration: "Codex Integration",
    experimental: "Experimental Features",
    about: "About",
    language: "Language",
    languageDescription:
      "Choose the language used by CoreStudio and the board interface.",
    languageSystem: "Use system language",
    languageChinese: "简体中文",
    languageEnglish: "English",
    discardTitle: "Discard unsaved changes?",
    discardDescription: "Changes on this page have not been saved.",
    continueEditing: "Continue editing",
    discardChanges: "Discard changes",
    aboutPage: {
      version: "Version",
      repository: "Repository",
      dependencies: "Key Open Source Dependencies",
      dependenciesDescription:
        "These versions come from the current build configuration and update with the application.",
    },
    imageGenerationPage: {
      description:
        "Manage the image generation services available on the board.",
      addService: "Add Service",
      back: "← Back to Image Generation",
      selectProvider: "Choose a Provider",
      selectProviderDescription:
        "Choose a provider, then enter the settings it requires.",
      addProvider: (label: string) => `Add ${label}`,
      compatibleProviderDescription:
        "Connect a service compatible with OpenAI Images",
      builtInProviderDescription: "Use CoreStudio's built-in integration",
      editProvider: (label: string) => `Edit ${label}`,
      defaultStatus: "Default",
      configuredStatus: "Configured",
      emptyTitle: "No image generation service configured",
      emptyDescription:
        "Add a service to generate images directly from the board.",
    },
    providerEditor: {
      description:
        "Configure credentials and the models available on the board.",
      serviceName: "Service Name",
      keepCurrentKey: "Leave blank to keep the current key",
      pasteApiKey: "Paste API Key",
      modelId: "Model ID",
      modelCapability: "Model Capability",
      defaultModel: "Default Model",
      customModels: "Custom Models",
      remove: "Remove",
      displayName: "Display Name",
      adapterType: "API Type",
      addCustomModel: "Add Custom Model",
      saved: "Saved",
      saveFailed: "Save failed",
      deleteConfirmation: (name: string) =>
        `Delete the ${name} configuration? It will no longer appear in the board's provider list.`,
      deleteService: "Delete Service",
      saving: "Saving...",
      save: "Save",
      capabilityTemplates: {
        "image-editing-aspect-ratio": "Reference images and editing",
        "text-to-image-aspect-ratio": "Text to image with aspect ratio",
        "text-to-image-exact": "Text to image with exact dimensions",
        "seeded-exact": "Advanced image generation",
      },
      adapters: {
        "gemini-generate-content": "Gemini official API",
        "zenmux-vertex-generate-content": "ZenMux Vertex: Gemini / Nano Banana",
        "zenmux-vertex-gpt-image": "ZenMux Vertex: Image API",
        "fal-image": "fal.ai image API",
        "jimeng-image": "Jimeng / Seedream API",
        "openai-images": "OpenAI Images API",
        "openrouter-chat-image": "OpenRouter Chat image API",
      },
    },
    codexPage: {
      description:
        "Install once so Codex can discover and work with local CoreStudio projects.",
      refresh: "Check Again",
      loading: "Checking Codex integration...",
      detectionFailed: "Unable to complete the check",
      readStatusFailed: "Could not read the local integration status.",
      installOnDevice: "Install on this Mac",
      repairWithCodex: "Hand off to Codex if needed",
      stateTitle: {
        install: "Install Codex Integration",
        update: "Update Codex Integration",
        repair: "Repair Codex Integration",
        ready: "Environment ready",
        error: "Unable to complete the check",
      },
      copyToCodex: "Copy for Codex",
      installAction: {
        install: "Install Codex Integration",
        update: "Update Codex Integration",
        repair: "Repair Codex Integration",
        ready: "Reinstall",
        error: "Reinstall",
      },
      installing: "Installing...",
      installFailed: "Codex integration installation failed",
      readyDescription:
        "All dependencies are available. You can reinstall from the current app bundle if needed.",
      actionDescription:
        "CoreStudio will run the fixed installer included in the current app bundle.",
      copied: "Copied",
      environmentChecks: "Environment Checks",
      environmentChecksDescription:
        "Each check is shown separately so missing dependencies are easy to identify.",
      checkStatus: {
        ready: "Ready",
        missing: "Missing",
        outdated: "Update needed",
        broken: "Repair needed",
      },
      checkLabel: {
        cli: "CoreStudio CLI",
        skill: "CoreStudio Skill",
        compatibility: "Integration compatibility",
      },
      checkDetail: {
        cliReady: (executablePath: string) => `Executable: ${executablePath}`,
        cliMissing: (executablePath: string) =>
          `Executable not found: ${executablePath}`,
        skillReady: "Codex can discover the CoreStudio usage guide.",
        skillMissing: "The CoreStudio Skill is not installed for Codex.",
        compatibilityReady: (integrationVersion: string) =>
          `Integration ${integrationVersion}; local CoreStudio session discovery is available.`,
        compatibilityOutdated: (
          installedVersion: string,
          integrationVersion: string,
        ) =>
          `Integration ${installedVersion} is installed; ${integrationVersion} is required.`,
        compatibilityBroken:
          "The integration record is incomplete or could not be read.",
        compatibilityMissing: "No integration installation record was found.",
        unknownVersion: "unknown version",
      },
      startInCodex: "Start in Codex",
      openCurrentProject: "Open the current CoreStudio project",
      startDescription: "Copy this instruction into any Codex conversation.",
      copyInstructions: "Copy Instructions",
      installPrompt: (appVersion: string, guideUrl: string) =>
        `Repair the Codex integration using the zero-argument installer bundled with the installed production CoreStudio ${appVersion}. Do not download or rewrite an installer. Then verify only the CLI, Skill, and compatibility record. Reference guide: ${guideUrl}`,
    },
  },
  agentUi: {
    conversationTitle: "Agent Conversation",
    currentConversation: "Current conversation",
    generationRecordsTitle: "Generation History",
    generationRecordsList: "Generation tasks",
    generationRecord: {
      untitled: "Untitled generation",
      referenceChainIntermediate: "Reference-chain intermediate",
      onBoard: "On board",
      notOnBoard: "Not on board",
    },
    integration: {
      status: {
        disabled: "Agent integration off",
        connected: "Agent connected",
        waitingProject: "Agent integration on",
        unready: "Agent not ready",
      },
      badge: {
        disabled: "Off",
        connected: "Online",
        waitingProject: "Waiting for project",
        unready: "Disconnected",
      },
      collaboration: {
        disabledStatus: "Not enabled",
        disabledDescription:
          "Once enabled, Codex can view the current canvas and safely write back results.",
        readyStatus: "Available",
        readyDescription: "Codex can access the current project.",
        waitingProjectStatus: "Open a project first",
        waitingProjectDescription:
          "The connection is enabled. Open a project to use it in Codex.",
        unavailableStatus: "Temporarily unavailable",
        unavailableDescription:
          "The connection is not ready. Try again shortly or view connection details.",
      },
      bridgeNotStarted: "Not started",
      bridgeStarted: "Local bridge started",
      cliDiscoverable: "Can auto-discover the current session",
      cliEnableToDiscover: "Enable the connection for discovery",
      boardLinkReady: "Copy Board link",
      boardLinkWaiting: "Waiting for Board link",
      boardLinkNotReady: "Agent Board link is not ready.",
      boardLinkCopied: "Agent Board link copied.",
      cliEnvironmentNotReady:
        "CLI environment variables are not ready. Enable Agent integration and open a project first.",
      cliEnvironmentCopied: "CLI environment variables copied.",
      startup: {
        connecting: "Connecting to desktop app",
        disconnected: "Desktop app disconnected",
        connectionDescription:
          "Make sure the CoreStudio desktop app is still running, then refresh the connection status.",
        refresh: "Refresh connection status",
        openingProject: "Opening the current desktop project",
        currentProject: (name: string) => `Current project: ${name}`,
        loadingProject:
          "The local bridge is connected. Loading the current desktop project.",
        reloadBoard: "Reload current board",
      },
      composer: {
        unavailable: "Agent unavailable",
        enableFirst: "Agent unavailable",
        taskRunning: "Current task is in progress",
        unavailableSentence: "Agent unavailable.",
        enableFirstSentence: "Agent unavailable.",
      },
    },
  },
  agentBoard: {
    errors: {
      missingConfig: "The Agent Board link is missing bridge or projectToken.",
      unrecognizedBridgeData: "Agent Bridge returned unrecognized data.",
      refreshFailed: "Could not refresh Agent Board.",
    },
    missingConnectionTitle: "Connection information missing",
    missingConnectionDescription:
      "Copy the Agent Board link from the CoreStudio desktop app, then open it in Codex's built-in browser.",
    defaultTitle: "CoreStudio Agent Board",
    description:
      "View the current CoreStudio board in Codex's built-in browser. Write-back uses the local project token.",
    loadingBuiltInTitle: "Loading built-in board",
    loadingBuiltInDescription:
      "Please wait while CoreStudio prepares Agent Board.",
    refreshing: "Refreshing",
    refresh: "Refresh",
    loadingBoard: "Loading board",
    waitingForBoard: "Waiting for the current project board",
    boardStatus: "Board status",
    currentProject: "Current project",
    noProject: "No project open",
    boardSyncedAt: (time: string) => `Board synced at ${time}`,
    boardSummary: "Board summary",
    elements: "Elements",
    images: "Images",
    text: "Text",
    selection: "Selection",
    selectedCount: (count: number) => `${count} selected`,
    noSelection: "None",
    imageLoading: "Image loading",
    missingImages: (count: number) =>
      `${count} ${count === 1 ? "image" : "images"} failed to load`,
    missingImagesDescription:
      "Refresh the status, or check the project assets in the desktop app.",
  },
  sideDock: {
    close: (title: string) => `Close ${title}`,
  },
  selectionReference: {
    text: "Text",
    textLabel: (text: string) => `Text: ${text}`,
    image: "Image",
    element: "Element",
    shapes: {
      rectangle: "Rectangle",
      diamond: "Diamond",
      ellipse: "Ellipse",
      arrow: "Arrow",
      line: "Line",
      freedraw: "Drawing",
      frame: "Frame",
      embeddable: "Embed",
    },
  },
  helpers: {
    referenceSummary: (elementCount: number, textCount: number) =>
      textCount
        ? `${elementCount} elements selected, including ${textCount} text element${
            textCount === 1 ? "" : "s"
          }.`
        : `${elementCount} elements selected.`,
    referenceInlineStatus: (enabled: boolean, elementCount: number) =>
      enabled ? `Referenced: ${elementCount}` : `Selected: ${elementCount}`,
    customModelPlaceholder: {
      gemini: "For example, gemini-next-image-preview",
      zenmux: "For example, google/gemini-next-image-preview",
      fal: "For example, fal-ai/flux-pro-next",
      jimeng: "For example, doubao-seedream-next",
      openai: "For example, gpt-image-next",
      openrouter: "For example, google/gemini-next-image-preview",
      "openai-compatible": "For example, vendor/image-model",
    },
    imageSource: {
      generated: "AI-generated",
      imported: "Imported",
    },
    imageGenerationOrigin: {
      corestudio: "Generated by CoreStudio",
      "agent-board": "Codex",
    },
    providerStatus: {
      success: "Connected",
      error: "Connection failed",
      unknown: "Saved, awaiting validation",
      notConfigured: "Not configured",
    },
  },
  projectDataReport: {
    eyebrow: "Project data",
    title: {
      checkAndRepair: "Data check and repair details",
      repair: "Data repair details",
      check: "Data check details",
    },
    close: "Close",
    severity: {
      error: "Error",
      warning: "Warning",
      info: "Info",
    },
    resolution: {
      repairable: "Repairable",
      manual: "Manual action",
      info: "Information",
    },
    summary: {
      repairable: "Repairable items",
      projectCounts: (
        imageRecordCount: number,
        generatedImageRecordCount: number,
        sceneImageFileCount: number,
      ) =>
        `This project has ${imageRecordCount} image records, including ${generatedImageRecordCount} generation records, with ${sceneImageFileCount} images referenced on the board.`,
    },
    recordState: {
      title: "Image status",
      description:
        "Image status is based on the relationship between project assets, board elements, and generation records.",
      onBoard: "On board",
      repairable: "Repairable",
      manual: "Needs manual review",
    },
    repairResult: {
      title: "Last repair result",
      description:
        "Specific reasons appear only in the details so the completion message stays concise.",
      rebuiltCache: "Rebuilt cache",
      skipped: "Skipped",
      failed: "Failed",
      restoredToBoard: "Restored to board",
      repairedSources: (count: number) => `Restored sources: ${count}`,
      notRestoredToBoard: (count: number) => `Not restored to board: ${count}`,
      backup: (path: string) => `Backup: ${path}`,
      failedDetails: "Repair failures",
      skippedDetails: "Skipped items",
      detailDescription:
        "Images that need attention during project data repair are listed here.",
    },
    count: {
      items: (count: number) => `${count} ${count === 1 ? "item" : "items"}`,
      repairable: (count: number) => `${count} repairable`,
      manual: (count: number) => `${count} manual`,
      info: (count: number) => `${count} informational`,
    },
    fields: {
      type: (value: string) => `Type: ${value}`,
      path: (value: string) => `Path: ${value}`,
      reason: (value: string) => `Reason: ${value}`,
      nextStep: (value: string) => `Next step: ${value}`,
      resolution: (label: string, summary: string) => `${label}: ${summary}`,
    },
    fallbackResolution: {
      repairable: "Repairable: Project data repair will attempt to fix this.",
      manual: "Manual action: Review the suggestion above.",
    },
    healthy: "No issues need attention.",
    issueMeta: {
      "scene-parse-failed": {
        title: "Board file cannot be parsed",
        description: "scene.excalidraw.json does not contain valid board data.",
        suggestion:
          "Restore the board file from a backup or an earlier version.",
      },
      "missing-image-record": {
        title: "Board image is missing an index record",
        description:
          "The board contains an image element with no matching entry in image-records.json.",
        suggestion: "Recreate the index entry or import the image again.",
      },
      "missing-asset-file": {
        title: "Missing original image file",
        description:
          "The index entry still exists, but the original image file is missing from assets.",
        suggestion:
          "Restore the original image from a backup or remove its record.",
      },
      "missing-thumbnail-cache": {
        title: "Image cache needs rebuilding",
        description:
          "The original image exists, but the display cache used to open the project quickly is incomplete.",
        suggestion: "Run project data repair to rebuild this cache.",
      },
      "missing-preview-cache": {
        title: "Preview cache has not been generated",
        description:
          "The high-resolution preview cache has not been generated. Project data is still intact.",
        suggestion: "No manual action is usually needed.",
      },
      "orphan-image-record": {
        title: "Project image is not on the board",
        description:
          "The image record and asset file exist, but the current board has no matching image element.",
        suggestion:
          "Run project data repair to restore readable images to the board.",
      },
      "orphan-generated-record": {
        title: "Generated image is not on the board",
        description:
          "The generated asset and record exist, but the current board has no matching image element, so the generation list may not be able to locate it.",
        suggestion:
          "Run project data repair to restore readable generated images to the board.",
      },
      "incomplete-generation-record": {
        title: "Incomplete generation record metadata",
        description:
          "The generated image is missing its origin. Prompts may be empty, but the origin is required to distinguish CoreStudio from Agent output.",
        suggestion:
          "Repair assigns legacy records a CoreStudio origin. New writes are validated and rejected when required data is missing.",
      },
      "broken-parent-link": {
        title: "Previous image in edit chain is missing",
        description:
          "An image record points to a parent image that does not exist.",
        suggestion:
          "Restore the parent image record or remove the broken link.",
      },
      "broken-prompt-reference": {
        title: "Prompt reference is missing an index record",
        description:
          "A reference image used by a generation record does not exist in image-records.json.",
        suggestion:
          "Restore the reference image index or remove the reference.",
      },
    },
    groups: {
      "project-file": {
        title: "Project board file issue",
        description:
          "The project board file cannot be parsed correctly, so some board content may be unreadable.",
        suggestion:
          "Restore the board file from a backup or earlier version, then check the project data again.",
      },
      "missing-file": {
        title: "Missing image files",
        description:
          "Project records still exist, but the local image files cannot be found.",
        suggestion:
          "Restore the original images from a backup or remove the records after confirming they are no longer needed.",
      },
      "missing-board-element": {
        title: "Missing board image elements",
        description:
          "Image assets and records exist, but the current board has no matching image elements, so list items may not be locatable.",
        suggestion:
          "Run project data repair to restore readable images to the board.",
      },
      "record-metadata": {
        title: "Incomplete record metadata",
        description:
          "Image records, generation records, or references are missing required information, which can obscure their origin or context.",
        suggestion:
          "Project data repair handles legacy records that can be completed automatically. Unclear relationships need manual review.",
      },
      "display-cache": {
        title: "Display cache needs attention",
        description:
          "The original images still exist, but thumbnail or preview caches are incomplete.",
        suggestion:
          "Run project data repair to rebuild recoverable display caches.",
      },
    },
    repairReasons: {
      "record-missing": "Missing image record",
      "thumbnail-not-needed": "No action needed",
      "thumbnail-cache-exists": "Cache already exists",
      "thumbnail-rebuild-failed": "Cache rebuild failed",
      "board-restore-failed": "Board restore failed",
    },
    repairNextActions: {
      "record-missing":
        "This image has no project index record. Confirm whether the original file should be kept and import it again if needed.",
      "thumbnail-not-needed":
        "No action is needed because this image does not require an additional display cache.",
      "thumbnail-cache-exists":
        "No action is needed because the display cache already exists.",
      "thumbnail-rebuild-failed":
        "Confirm that the original image file can be read, then run project data repair again.",
      "board-restore-failed":
        "Confirm that the original image is still in the project's assets folder, restore it if needed, then run project data repair again.",
    },
  },
  projectRepair: {
    viewDetails: "View details",
    thumbnailRepairing: (count: number) =>
      `Repairing ${count} image ${count === 1 ? "asset" : "assets"}`,
    thumbnailUnavailable: (count: number) =>
      `${count} image ${
        count === 1 ? "asset is" : "assets are"
      } temporarily unavailable`,
    noProject: "Open a project first.",
    noImages: "This project has no image assets to process.",
    healthCheckFailed: "The project health check failed.",
    healthChecking: "Checking project data",
    healthHealthy: (imageCount: number, generationRecordCount = 0) =>
      generationRecordCount
        ? `Project check complete: ${imageCount} image assets and ${generationRecordCount} generation records match the board.`
        : `Project check complete: ${imageCount} image assets match the board.`,
    healthHasInfo: (infoCount: number) =>
      `Project check complete with no errors or warnings. ${infoCount} informational items are available.`,
    healthNeedsRepair: (
      errorCount: number,
      warningCount: number,
      repairableCount: number,
    ) =>
      `Project check complete: ${errorCount} errors and ${warningCount} warnings found; ${repairableCount} can be handled by project data repair.`,
    thumbnailsFailed: "Project data repair did not complete.",
    cacheCleanFailed: "The project cache could not be cleaned.",
    cacheCleaned: (removedCount: number, removedBytes: number) =>
      removedCount
        ? `Project cache cleaned: removed ${removedCount} cache files and freed ${formatFileSize(
            removedBytes,
          )}.`
        : "Project cache cleaned. There were no cache files to remove.",
    safeModeOpened:
      "Project opened in safe mode. Cache loading and background data repair are paused.",
    thumbnailsRepaired: (
      _generatedCount: number,
      _skippedCount: number,
      failedCount: number,
      _backupPath?: string | null,
      _repairedGenerationRecordCount = 0,
      _restoredImageRecordCount = 0,
      skippedImageRecordCount = 0,
    ) =>
      failedCount || skippedImageRecordCount
        ? "Project data repair complete. Some images still need review."
        : "Project data repair complete.",
  },
  projectRenderBoundary: {
    title: "Project interface failed to load",
    unknownError: "An unknown error occurred.",
    backToProjectList: "Back to project list",
  },
};
