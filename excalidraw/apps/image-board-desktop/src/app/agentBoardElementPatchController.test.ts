import { describe, expect, it, vi } from "vitest";

import {
  applyAgentBoardExternalProjectSnapshot,
  buildAgentBoardElementPatches,
  runAgentBoardElementPatchScheduleAction,
  shouldScheduleAgentBoardElementPatch,
  writeAgentBoardElementPatchSnapshot,
} from "./agentBoardElementPatchController";

describe("agentBoardElementPatchController", () => {
  it("builds patches only for changed and newly created elements", () => {
    const unchanged = {
      id: "unchanged",
      type: "rectangle",
      version: 1,
      versionNonce: 11,
    };
    const changed = {
      id: "changed",
      type: "rectangle",
      x: 0,
      version: 2,
      versionNonce: 22,
    };

    expect(
      buildAgentBoardElementPatches({
        baselineElements: [unchanged, changed],
        nextElements: [
          unchanged,
          {
            ...changed,
            x: 40,
            version: 3,
            versionNonce: 33,
          },
          {
            id: "new",
            type: "arrow",
            version: 1,
            versionNonce: 44,
          },
        ],
      }),
    ).toEqual([
      {
        expectedVersion: 2,
        expectedVersionNonce: 22,
        element: expect.objectContaining({ id: "changed", x: 40 }),
      },
      {
        expectedVersion: null,
        expectedVersionNonce: null,
        element: expect.objectContaining({ id: "new" }),
      },
    ]);
  });

  it("does not schedule a patch when only selection or viewport state changed", () => {
    const persistedElement = {
      id: "unchanged",
      type: "rectangle",
      x: 20,
      version: 2,
      versionNonce: 22,
    };

    expect(
      shouldScheduleAgentBoardElementPatch({
        baselineElements: [persistedElement],
        nextElements: [{ ...persistedElement }],
      }),
    ).toBe(false);
    expect(
      shouldScheduleAgentBoardElementPatch({
        baselineElements: [persistedElement],
        nextElements: [{ ...persistedElement, x: 40, version: 3 }],
      }),
    ).toBe(true);
  });

  it("keeps save state idle for unchanged elements and schedules real edits", () => {
    const baselineElement = {
      id: "element",
      type: "rectangle",
      x: 20,
      version: 2,
      versionNonce: 22,
    };
    const cancelPending = vi.fn();
    const schedule = vi.fn();
    const setSaveStatus = vi.fn();

    expect(
      runAgentBoardElementPatchScheduleAction({
        baselineElements: [baselineElement],
        snapshot: {
          project: {} as never,
          elements: [{ ...baselineElement }],
        },
        cancelPending,
        schedule,
        setSaveStatus,
      }),
    ).toEqual({ status: "skipped", reason: "unchanged-elements" });
    expect(cancelPending).toHaveBeenCalledOnce();
    expect(schedule).not.toHaveBeenCalled();
    expect(setSaveStatus).toHaveBeenLastCalledWith("idle");

    expect(
      runAgentBoardElementPatchScheduleAction({
        baselineElements: [baselineElement],
        snapshot: {
          project: {} as never,
          elements: [{ ...baselineElement, x: 40, version: 3 }],
        },
        cancelPending,
        schedule,
        setSaveStatus,
      }),
    ).toEqual({ status: "scheduled" });
    expect(schedule).toHaveBeenCalledOnce();
    expect(setSaveStatus).toHaveBeenLastCalledWith("saving");
  });

  it("advances the persisted baseline before applying an external project snapshot", async () => {
    const previousElements = [
      {
        id: "old",
        type: "rectangle",
        version: 1,
        versionNonce: 11,
      },
    ];
    const nextElements = [
      {
        id: "external",
        type: "arrow",
        version: 1,
        versionNonce: 22,
      },
    ];
    let baselineElements = previousElements;
    const applyProjectSnapshot = vi.fn(async () => {
      expect(baselineElements).toEqual(nextElements);
    });

    await applyAgentBoardExternalProjectSnapshot({
      sceneJson: JSON.stringify({ elements: nextElements }),
      getBaselineElements: () => baselineElements,
      setBaselineElements: (elements) => {
        baselineElements = elements as typeof previousElements;
      },
      applyProjectSnapshot,
    });

    expect(applyProjectSnapshot).toHaveBeenCalledOnce();
    expect(baselineElements).toEqual(nextElements);
  });

  it("writes a patch and advances the baseline to the persisted scene", async () => {
    const setBaselineElements = vi.fn();
    const setSavedSceneHash = vi.fn();
    const updateProject = vi.fn();
    const persistedElements = [
      {
        id: "element",
        type: "rectangle",
        x: 40,
        version: 2,
        versionNonce: 22,
      },
    ];
    const applyProjectSceneElementPatches = vi.fn(async () => ({
      project: {
        updatedAt: "2026-07-23T01:00:00.000Z",
      } as never,
      sceneJson: JSON.stringify({ elements: persistedElements }),
      sceneHash: "next-hash",
      appliedElementIds: ["element"],
    }));

    await writeAgentBoardElementPatchSnapshot({
      snapshot: {
        project: {
          projectPath: "/tmp/project",
          project: { updatedAt: "2026-07-23T00:00:00.000Z" },
          sceneJson: "{}",
          imageRecords: {},
        } as never,
        elements: persistedElements,
      },
      baselineElements: [
        {
          id: "element",
          type: "rectangle",
          x: 0,
          version: 1,
          versionNonce: 11,
        },
      ],
      applyProjectSceneElementPatches,
      setBaselineElements,
      setSavedSceneHash,
      updateProject,
      createOperationId: () => "operation-id",
    });

    expect(applyProjectSceneElementPatches).toHaveBeenCalledWith({
      projectPath: "/tmp/project",
      operationId: "operation-id",
      patches: [
        {
          expectedVersion: 1,
          expectedVersionNonce: 11,
          element: persistedElements[0],
        },
      ],
    });
    expect(setBaselineElements).toHaveBeenCalledWith(persistedElements);
    expect(setSavedSceneHash).toHaveBeenCalledWith("next-hash");
    expect(updateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        sceneJson: JSON.stringify({ elements: persistedElements }),
      }),
    );
  });
});
