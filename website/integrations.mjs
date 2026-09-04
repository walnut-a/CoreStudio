import {
  CLI_TASK_IDS,
  TROUBLESHOOTING_IDS,
  getCliExample,
  getHostContent,
  getLocalizedContent,
  getTroubleshootingGuide,
  normalizeHost,
} from "./integrations-content.mjs?v=20260904-1";

const locale = document.body.dataset.locale ?? "en";
const content = getLocalizedContent(locale);
const hostTabs = [...document.querySelectorAll("[data-host-tab]")];
const copyStatus = document.querySelector("[data-copy-status]");

let activeHost = normalizeHost(
  new URLSearchParams(window.location.search).get("host")
);

const setText = (selector, value) => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
};

const renderTroubleshooting = (host) => {
  const container = document.querySelector("[data-troubleshooting-list]");
  if (!container) {
    return;
  }

  container.replaceChildren();
  TROUBLESHOOTING_IDS.forEach((symptom) => {
    const guide = getTroubleshootingGuide({ host, symptom, locale });
    const item = document.createElement("details");
    item.className = "troubleshooting-item";

    const summary = document.createElement("summary");
    summary.textContent = guide.diagnosis;
    item.append(summary);

    const body = document.createElement("div");
    body.className = "troubleshooting-body";

    const appendList = (label, values, className = "") => {
      const heading = document.createElement("h3");
      heading.textContent = label;
      const list = document.createElement("ul");
      list.className = className;
      values.forEach((value) => {
        const row = document.createElement("li");
        row.textContent = value;
        list.append(row);
      });
      body.append(heading, list);
    };

    appendList(content.labels.action, guide.actions);
    appendList(content.labels.doNot, guide.doNot, "do-not-list");

    const verifyHeading = document.createElement("h3");
    verifyHeading.textContent = content.labels.verify;
    const verification = document.createElement("p");
    verification.textContent = guide.verification;
    body.append(verifyHeading, verification);

    item.append(body);
    container.append(item);
  });
};

const renderCliSessionRequirements = (host) => {
  document.querySelectorAll("[data-cli-task]").forEach((element) => {
    const task = element.dataset.cliTask;
    if (!CLI_TASK_IDS.includes(task)) {
      return;
    }
    const example = getCliExample({ task, host, locale });
    const session = element.querySelector("[data-session-requirement]");
    if (session) {
      session.hidden = !example.requiresAgentSession;
    }
  });
};

const updateUrl = (host) => {
  const url = new URL(window.location.href);
  url.searchParams.set("host", host);
  window.history.replaceState({}, "", url);
};

const renderHost = (host, { updateHistory = true, announce = false } = {}) => {
  activeHost = normalizeHost(host);
  const selected = getHostContent({ host: activeHost, locale });
  document.documentElement.dataset.host = activeHost;

  hostTabs.forEach((tab) => {
    const isSelected = tab.dataset.hostTab === activeHost;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  });

  setText("[data-host-name]", selected.name);
  setText("[data-skill-path]", selected.skillPath);
  setText("[data-first-prompt]", selected.prompt);
  setText("[data-host-note]", selected.note);
  renderTroubleshooting(activeHost);
  renderCliSessionRequirements(activeHost);

  if (updateHistory) {
    updateUrl(activeHost);
  }

  if (announce && copyStatus) {
    copyStatus.textContent = `${selected.name}: ${content.navigation.sections.install}`;
  }
};

hostTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    renderHost(tab.dataset.hostTab, { announce: true });
  });

  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + hostTabs.length) % hostTabs.length;
    } else if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % hostTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = hostTabs.length - 1;
    }
    hostTabs[nextIndex].focus();
    renderHost(hostTabs[nextIndex].dataset.hostTab, { announce: true });
  });
});

const copyText = async (value) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Some embedded browsers expose the Clipboard API but deny writes.
      // Continue with the same-page fallback instead of leaving the button inert.
    }
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) {
    throw new Error("Clipboard write was rejected.");
  }
};

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.querySelector(button.dataset.copyTarget);
    if (!target) {
      return;
    }
    const original = button.textContent;
    try {
      await copyText(target.textContent.trim());
      button.textContent = content.labels.copied;
      if (copyStatus) {
        copyStatus.textContent = content.labels.copied;
      }
      window.setTimeout(() => {
        button.textContent = original;
      }, 1600);
    } catch {
      button.focus();
    }
  });
});

const sectionLinks = [...document.querySelectorAll("[data-section-link]")];
const sections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) {
        return;
      }
      sectionLinks.forEach((link) => {
        const isCurrent = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("is-current", isCurrent);
        if (isCurrent) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    { rootMargin: "-20% 0px -68%", threshold: [0, 0.25, 0.6] }
  );
  sections.forEach((section) => observer.observe(section));
}

renderHost(activeHost, { updateHistory: false });
