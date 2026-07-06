import {
  buildNewAcpThreadPlan,
  type NewAcpThreadState,
} from "./acpThreadState";

export type AcpNewThreadResult =
  | { status: "ignored" }
  | { status: "started" };

export interface AcpNewThreadControllerInput {
  getTaskRunning: () => boolean;
  applyNewThreadState: (state: NewAcpThreadState) => void;
}

export const runAcpNewThread = ({
  getTaskRunning,
  applyNewThreadState,
}: AcpNewThreadControllerInput): AcpNewThreadResult => {
  const state = buildNewAcpThreadPlan({ taskRunning: getTaskRunning() });

  if (state.action === "ignore") {
    return { status: "ignored" };
  }

  const { action: _action, ...newThreadState } = state;
  applyNewThreadState(newThreadState);
  return { status: "started" };
};
