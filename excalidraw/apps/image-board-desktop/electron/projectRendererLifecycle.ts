interface CreateProjectRendererLifecycleInput {
  webContentsId: number;
  releaseSessions(webContentsId: number): void;
  markCrashed(webContentsId: number): void;
}

export const createProjectRendererLifecycle = ({
  webContentsId,
  releaseSessions,
  markCrashed,
}: CreateProjectRendererLifecycleInput) => ({
  markUnavailable: () => {
    releaseSessions(webContentsId);
    markCrashed(webContentsId);
  },
  release: () => {
    releaseSessions(webContentsId);
  },
});
