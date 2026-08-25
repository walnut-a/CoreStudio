import type { DesktopLocalePreference } from "../../shared/desktopLocale";
import {
  TRACKPAD_ZOOM_SPEEDS,
  type TrackpadZoomSpeed,
} from "../../shared/canvasInteractionSettings";
import { copy } from "../copy";

import "./AgentSettings.css";

export interface GeneralSettingsSectionProps {
  preference: DesktopLocalePreference;
  onPreferenceChange: (preference: DesktopLocalePreference) => void;
  trackpadZoomSpeed: TrackpadZoomSpeed;
  onTrackpadZoomSpeedChange: (speed: TrackpadZoomSpeed) => void;
}

export const GeneralSettingsSection = ({
  preference,
  onPreferenceChange,
  trackpadZoomSpeed,
  onTrackpadZoomSpeedChange,
}: GeneralSettingsSectionProps) => {
  const speedLabels: Record<TrackpadZoomSpeed, string> = {
    slowest: copy.applicationSettings.trackpadZoomSpeedSlowest,
    slow: copy.applicationSettings.trackpadZoomSpeedSlow,
    standard: copy.applicationSettings.trackpadZoomSpeedStandard,
    fast: copy.applicationSettings.trackpadZoomSpeedFast,
    fastest: copy.applicationSettings.trackpadZoomSpeedFastest,
  };
  const speedIndex = TRACKPAD_ZOOM_SPEEDS.indexOf(trackpadZoomSpeed);

  return (
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
            <option value="en">
              {copy.applicationSettings.languageEnglish}
            </option>
          </select>
        </div>
      </div>

      <div className="app-settings-section app-settings-section--stacked">
        <div className="app-settings-section__top">
          <div className="app-settings-section__copy">
            <span>{copy.applicationSettings.trackpadZoomSpeed}</span>
            <p>{copy.applicationSettings.trackpadZoomSpeedDescription}</p>
          </div>
          <div className="app-settings-section__range-control">
            <input
              className="app-settings-section__range"
              type="range"
              min="0"
              max={TRACKPAD_ZOOM_SPEEDS.length - 1}
              step="1"
              aria-label={copy.applicationSettings.trackpadZoomSpeed}
              aria-valuetext={speedLabels[trackpadZoomSpeed]}
              value={speedIndex}
              onChange={(event) => {
                const nextSpeed =
                  TRACKPAD_ZOOM_SPEEDS[Number(event.target.value)];
                if (nextSpeed) {
                  onTrackpadZoomSpeedChange(nextSpeed);
                }
              }}
            />
            <output aria-live="polite">{speedLabels[trackpadZoomSpeed]}</output>
          </div>
        </div>
      </div>
    </section>
  );
};
