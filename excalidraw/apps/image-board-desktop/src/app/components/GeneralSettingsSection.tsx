import type { DesktopLocalePreference } from "../../shared/desktopLocale";
import { copy } from "../copy";

import "./AgentSettings.css";

export interface GeneralSettingsSectionProps {
  preference: DesktopLocalePreference;
  onPreferenceChange: (preference: DesktopLocalePreference) => void;
}

export const GeneralSettingsSection = ({
  preference,
  onPreferenceChange,
}: GeneralSettingsSectionProps) => (
  <section className="settings-page">
    <header className="settings-page__header">
      <div>
        <h3>{copy.applicationSettings.general}</h3>
      </div>
    </header>

    <div className="app-settings-section app-settings-section--stacked">
      <div className="app-settings-section__top">
        <div className="app-settings-section__copy">
          <span>{copy.applicationSettings.language}</span>
          <p>{copy.applicationSettings.languageDescription}</p>
        </div>
        <select
          className="app-settings-section__select"
          aria-label={copy.applicationSettings.language}
          value={preference}
          onChange={(event) =>
            onPreferenceChange(event.target.value as DesktopLocalePreference)
          }
        >
          <option value="system">
            {copy.applicationSettings.languageSystem}
          </option>
          <option value="zh-CN">
            {copy.applicationSettings.languageChinese}
          </option>
          <option value="en">{copy.applicationSettings.languageEnglish}</option>
        </select>
      </div>
    </div>
  </section>
);
