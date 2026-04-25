export const shouldQuitWhenAllWindowsClosed = ({
  platform,
  quitRequested,
}: {
  platform: NodeJS.Platform | string;
  quitRequested: boolean;
}) => platform !== "darwin" || quitRequested;

export const createQuitState = () => {
  let quitRequested = false;

  return {
    markQuitRequested() {
      quitRequested = true;
    },
    clearQuitRequest() {
      quitRequested = false;
    },
    shouldQuitWhenAllWindowsClosed(platform: NodeJS.Platform | string) {
      return shouldQuitWhenAllWindowsClosed({
        platform,
        quitRequested,
      });
    },
  };
};
