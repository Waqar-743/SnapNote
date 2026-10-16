document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#main-navigation");
menuButton.hidden = false;
function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
}
menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  navigation.classList.toggle("is-open", !isOpen);
});
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuButton.getAttribute("aria-expanded") === "true"
  ) {
    closeMenu();
    menuButton.focus();
  }
});

const tabs = [...document.querySelectorAll('[role="tab"]')];
const image = document.querySelector("#workspace-image");
const panel = document.querySelector("#screenshot-panel");
const screenshotButton = document.querySelector(".screenshot-button");
const dialog = document.querySelector(".screenshot-dialog");
const zoomImage = document.querySelector("#zoom-image");
function setTheme(tab, focus = false) {
  const theme = tab.dataset.theme;
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  image.src = `/assets/workspace-${theme}.png`;
  image.alt = `SnapNote’s ${theme} desktop workspace with text, image and snippet cards, search, favorites, folders and sessions.`;
  panel.setAttribute("aria-labelledby", tab.id);
  screenshotButton.setAttribute(
    "aria-label",
    `Enlarge the ${theme} workspace screenshot`,
  );
  if (focus) tab.focus();
}
tabs.forEach((tab) => {
  tab.addEventListener("click", () => setTheme(tab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (tabs.indexOf(tab) +
              (event.key === "ArrowRight" ? 1 : -1) +
              tabs.length) %
            tabs.length;
    setTheme(tabs[index], true);
  });
});
screenshotButton.addEventListener("click", () => {
  zoomImage.src = image.src;
  zoomImage.alt = `Enlarged ${image.alt}`;
  dialog.showModal();
});
document
  .querySelector(".dialog-close")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    dialog.close();
});
dialog.addEventListener("close", () => screenshotButton.focus());

function revealLinkedAnswer() {
  if (location.hash === "#ocr-question")
    document.querySelector("#ocr-question").open = true;
}
window.addEventListener("hashchange", revealLinkedAnswer);
document.querySelectorAll('a[href="#ocr-question"]').forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector("#ocr-question").open = true;
  });
});
revealLinkedAnswer();
