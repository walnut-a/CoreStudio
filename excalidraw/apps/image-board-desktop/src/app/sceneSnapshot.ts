export interface SceneSnapshot<
  Elements = unknown,
  AppStateValue = unknown,
  Files = unknown,
> {
  elements: Elements;
  appState: AppStateValue;
  files: Files;
}
