import { copy } from "./copy";

export type GenerationCanvasReadiness<TApi, TProject> =
  | {
      status: "ready";
      api: TApi;
      project: TProject;
    }
  | {
      status: "skip";
    };

export const getGenerationCanvasNotReadyMessage = () =>
  copy.generationError.canvasNotReady;

export const resolveGenerationCanvasReadiness = <TApi, TProject>({
  api,
  project,
  requireReady,
}: {
  api: TApi | null | undefined;
  project: TProject | null | undefined;
  requireReady?: boolean;
}): GenerationCanvasReadiness<TApi, TProject> => {
  if (api && project) {
    return {
      status: "ready",
      api,
      project,
    };
  }

  if (requireReady) {
    throw new Error(getGenerationCanvasNotReadyMessage());
  }

  return { status: "skip" };
};
