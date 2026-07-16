import type { DesktopAppInfo } from "../../shared/desktopBridgeTypes";
import type { OpenSourceDependency } from "../aboutMetadata";
import { copy } from "../copy";

export interface AboutSettingsSectionProps {
  appInfo: DesktopAppInfo | null;
  repositoryUrl: string;
  dependencies: readonly OpenSourceDependency[];
  onOpenExternal: (url: string) => void;
}

export const AboutSettingsSection = ({
  appInfo,
  repositoryUrl,
  dependencies,
  onOpenExternal,
}: AboutSettingsSectionProps) => (
  <section className="settings-page settings-about-page">
    <header className="settings-page__header">
      <div>
        <h3>{copy.applicationSettings.about}</h3>
        <p>{copy.about.description}</p>
      </div>
    </header>

    <dl className="settings-about-summary">
      <div>
        <dt>{copy.applicationSettings.aboutPage.version}</dt>
        <dd>{appInfo?.version ?? copy.about.versionUnknown}</dd>
      </div>
      <div>
        <dt>{copy.applicationSettings.aboutPage.repository}</dt>
        <dd>
          <button
            type="button"
            className="settings-about-link"
            onClick={() => onOpenExternal(repositoryUrl)}
          >
            {repositoryUrl}
          </button>
        </dd>
      </div>
    </dl>

    <section className="settings-about-dependencies">
      <div className="settings-list-header">
        <div>
          <h4>{copy.applicationSettings.aboutPage.dependencies}</h4>
          <p>{copy.applicationSettings.aboutPage.dependenciesDescription}</p>
        </div>
      </div>
      <dl className="settings-about-dependency-list">
        {dependencies.map((dependency) => (
          <div key={dependency.name}>
            <dt>{dependency.name}</dt>
            <dd>{dependency.version}</dd>
          </div>
        ))}
      </dl>
    </section>
  </section>
);
