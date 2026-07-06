export type GenerationCanvasReadiness<TApi, TProject> =
  | {
      status: "ready";
      api: TApi;
      project: TProject;
    }
  | {
      status: "skip";
    };

export const GENERATION_CANVAS_NOT_READY_MESSAGE =
  "CoreStudio 画板还没有准备好。";

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
    throw new Error(GENERATION_CANVAS_NOT_READY_MESSAGE);
  }

  return { status: "skip" };
};
