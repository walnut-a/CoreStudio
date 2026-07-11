import { describe, expect, it, vi } from "vitest";

import {
  applyAcpSubmittedPromptClear,
  applyAcpTaskStartUiState,
  createAcpActiveTaskIdRendererActions,
} from "./acpTaskApplyController";
import { buildAcpTaskStartUiState } from "./acpTaskUiState";

import type { GenerationRequest } from "../../shared/providerTypes";

describe("applyAcpTaskStartUiState", () => {
  it("applies task start state to active task refs and conversation surface", () => {
    const state = buildAcpTaskStartUiState({
      taskId: "task-1",
      threadId: "thread-1",
      createId: () => "event-1",
    });
    const setActiveTaskId = vi.fn();
    const setActiveThreadId = vi.fn();
    const setRunLogTaskId = vi.fn();
    const setRunLogSurface = vi.fn();
    const setChatDockOpen = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogError = vi.fn();
    const setRunLogRawOpen = vi.fn();
    const setAgentTask = vi.fn();

    expect(
      applyAcpTaskStartUiState({
        state,
        setActiveTaskId,
        setActiveThreadId,
        setRunLogTaskId,
        setRunLogSurface,
        setChatDockOpen,
        setRunLogDetail,
        setRunLogError,
        setRunLogRawOpen,
        setAgentTask,
      }),
    ).toBe(state);

    expect(setActiveTaskId).toHaveBeenCalledWith("task-1");
    expect(setActiveThreadId).toHaveBeenCalledWith("thread-1");
    expect(setRunLogTaskId).toHaveBeenCalledWith("task-1");
    expect(setRunLogSurface).toHaveBeenCalledWith("conversation");
    expect(setChatDockOpen).toHaveBeenCalledWith(true);
    expect(setRunLogDetail).toHaveBeenCalledWith(null);
    expect(setRunLogError).toHaveBeenCalledWith(null);
    expect(setRunLogRawOpen).toHaveBeenCalledWith(false);
    expect(setAgentTask).toHaveBeenCalledWith(state.agentTask);
  });
});

describe("applyAcpSubmittedPromptClear", () => {
  it("clears submitted prompt fields while keeping the selected reference", () => {
    const request: GenerationRequest = {
      generationSource: "agent",
      provider: "gemini",
      model: "gemini-image",
      prompt: "继续优化这台机器",
      promptParts: [{ type: "text", text: "继续优化这台机器" }],
      promptReferences: [
        {
          id: "ref-1",
          label: "图片",
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      ],
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
      },
      width: 1024,
      height: 1024,
      imageCount: 1,
    };
    const setGenerateRequest = vi.fn();

    applyAcpSubmittedPromptClear({ setGenerateRequest });

    expect(setGenerateRequest).toHaveBeenCalledTimes(1);
    const updateRequest = setGenerateRequest.mock.calls[0]?.[0] as
      | ((current: GenerationRequest) => GenerationRequest)
      | undefined;
    expect(updateRequest).toEqual(expect.any(Function));
    expect(updateRequest?.(request)).toMatchObject({
      prompt: "",
      promptParts: [],
      promptReferences: [],
      reference: request.reference,
    });
  });
});

describe("createAcpActiveTaskIdRendererActions", () => {
  it("keeps active task ref updates behind a reusable renderer action", () => {
    let activeTaskId: string | null = null;

    const actions = createAcpActiveTaskIdRendererActions({
      setActiveTaskIdRef: (taskId) => {
        activeTaskId = taskId;
      },
    });

    actions.set("task-1");

    expect(activeTaskId).toBe("task-1");

    actions.set(null);

    expect(activeTaskId).toBeNull();
  });
});
