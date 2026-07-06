import { Suspense, lazy } from "react";

import { copy } from "../copy";

import "./WelcomePane.css";

const LazyAgentBoard = lazy(async () => {
  const { AgentBoard } = await import("./AgentBoard");
  return { default: AgentBoard };
});

interface AppBridgeUnavailableProps {
  isAgentBrowserRoute: boolean;
}

export const AppBridgeUnavailable = ({
  isAgentBrowserRoute,
}: AppBridgeUnavailableProps) => {
  if (isAgentBrowserRoute) {
    return (
      <Suspense
        fallback={
          <div className="image-board-app">
            <div className="welcome-pane">
              <div className="welcome-pane__card welcome-pane__diagnostic">
                <span className="welcome-pane__eyebrow">Agent Board</span>
                <h1>正在载入内置画板</h1>
                <p>请稍等，CoreStudio 正在准备 Agent Board。</p>
              </div>
            </div>
          </div>
        }
      >
        <LazyAgentBoard />
      </Suspense>
    );
  }

  return (
    <div className="image-board-app">
      <div className="welcome-pane">
        <div className="welcome-pane__card welcome-pane__diagnostic">
          <span className="welcome-pane__eyebrow">{copy.startup.eyebrow}</span>
          <h1>{copy.startup.heading}</h1>
          <p>{copy.startup.description}</p>
          <div className="dialog-card__error welcome-pane__error">
            {copy.startup.retryInstruction}
          </div>
        </div>
      </div>
    </div>
  );
};
