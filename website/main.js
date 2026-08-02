const navToggle = document.querySelector("[data-nav-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
const siteHeader = document.querySelector(".site-header");
const mobileNavigation = window.matchMedia("(max-width: 820px)");
const openNavigationLabel =
  navToggle?.dataset.labelOpen ?? "打开导航菜单";
const closeNavigationLabel =
  navToggle?.dataset.labelClose ?? "关闭导航菜单";

const closeNavigation = () => {
  if (!navToggle || !siteNav) {
    return;
  }

  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", openNavigationLabel);
  siteNav.classList.remove("is-open");
};

navToggle?.addEventListener("click", () => {
  const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
  navToggle.setAttribute("aria-expanded", String(willOpen));
  navToggle.setAttribute(
    "aria-label",
    willOpen ? closeNavigationLabel : openNavigationLabel,
  );
  siteNav?.classList.toggle("is-open", willOpen);
});

siteNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    closeNavigation();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeNavigation();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (
    navToggle?.getAttribute("aria-expanded") === "true" &&
    siteHeader &&
    event.target instanceof Node &&
    !siteHeader.contains(event.target)
  ) {
    closeNavigation();
  }
});

mobileNavigation.addEventListener("change", (event) => {
  if (!event.matches) {
    closeNavigation();
  }
});
