interface LauncherLivenessGuardInput {
  launcherPid: number;
  isProcessAlive?: (pid: number) => boolean;
  onOrphaned: () => void;
}

const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export const createLauncherLivenessGuard = ({
  launcherPid,
  isProcessAlive: checkProcess = isProcessAlive,
  onOrphaned,
}: LauncherLivenessGuardInput) => {
  let orphanHandled = false;
  return {
    check: () => {
      const alive = checkProcess(launcherPid);
      if (!alive && !orphanHandled) {
        orphanHandled = true;
        onOrphaned();
      }
      return alive;
    },
  };
};
