import { Component, type ErrorInfo, type ReactNode } from "react";

import { DesktopButton } from "./DesktopButton";
import "./ProjectRenderBoundary.css";

interface ProjectRenderBoundaryProps {
  projectKey: string;
  children: ReactNode;
  onError: (error: Error, componentStack: string | null) => void;
  onReset: () => void;
}

interface ProjectRenderBoundaryState {
  error: Error | null;
}

export class ProjectRenderBoundary extends Component<
  ProjectRenderBoundaryProps,
  ProjectRenderBoundaryState
> {
  state: ProjectRenderBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ProjectRenderBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error, info.componentStack || null);
  }

  componentDidUpdate(prevProps: ProjectRenderBoundaryProps) {
    if (
      prevProps.projectKey !== this.props.projectKey &&
      this.state.error
    ) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="image-board-runtime-error" role="alert">
          <div className="image-board-runtime-error__card">
            <h2>项目界面加载失败</h2>
            <p>{this.state.error.message || "发生了未知错误。"}</p>
            <DesktopButton type="button" onClick={this.props.onReset}>
              返回项目列表
            </DesktopButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
