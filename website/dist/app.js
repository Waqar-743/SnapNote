document.documentElement.classList.add("js");

const progressBar = document.querySelector(".scroll-progress");
if (progressBar) {
  let ticking = false;
  const paint = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
    ticking = false;
  };
  addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(paint);
    }
  });
  addEventListener("resize", paint);
  paint();
}

const navLinks = [...document.querySelectorAll(".site-nav a")];
if ("IntersectionObserver" in window && navLinks.length) {
  const sections = navLinks
    .map((link) =>
      document.querySelector(
        new URL(link.href, location.href).hash ||
          `#${link.getAttribute("href").slice(1)}`,
      ),
    )
    .filter(Boolean);
  const mark = (id) =>
    navLinks.forEach((link) =>
      link.classList.toggle(
        "here",
        link.getAttribute("href") === `#${id}` ||
          new URL(link.href, location.href).hash === `#${id}`,
      ),
    );
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) mark(entry.target.id);
      }),
    { rootMargin: "-45% 0px -50% 0px" },
  );
  sections.forEach((section) => observer.observe(section));
}

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");
menuButton.hidden = false;
function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
}
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  navigation.classList.toggle("is-open", open);
});
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
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

const moments = {
  morning: {
    kicker: "A LINE WORTH A SECOND LOOK",
    title: ["Follow the thought.", "Keep the spark."],
    description:
      "You’re reading, something resonates, and you copy it. Turn on clipboard history and let SnapNote hold the line while you follow the next idea.",
    type: "TEXT CLIP / JUST NOW",
    content: [
      "“Pay attention.",
      "The ordinary things",
      "are where ideas begin.”",
    ],
    tag: "a little inspiration",
  },
  afternoon: {
    kicker: "A FEW TOO MANY OPEN THREADS",
    title: ["A busy afternoon.", "A place for the pieces."],
    description:
      "A project link, a useful detail, a reply to send later. Give the keepers a folder, add a tag, and turn a collection of fragments into something you can come back to.",
    type: "PROJECT NOTE / THIS AFTERNOON",
    content: [
      "The next little launch",
      "01 / Gather references",
      "02 / Make room for an idea",
    ],
    tag: "a work in progress",
  },
  evening: {
    kicker: "THAT THOUGHT FROM THIS MORNING",
    title: ["Find your way back.", "Pick up the thread."],
    description:
      "You remember a few words, so you search. There it is: the line you saved before the day got busy. Copy it again and give that first spark a second life.",
    type: "FOUND IN YOUR COLLECTION / 09:14 AM",
    content: [
      "“Pay attention.",
      "The ordinary things",
      "are where ideas begin.”",
    ],
    tag: "ready for what’s next",
  },
};
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panel = document.querySelector("#day-panel");
function setLines(element, lines) {
  element.replaceChildren();
  lines.forEach((line, index) => {
    if (index) element.append(document.createElement("br"));
    element.append(document.createTextNode(line));
  });
}
function selectMoment(tab, focus = false) {
  const moment = moments[tab.dataset.moment];
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  panel.setAttribute("aria-labelledby", tab.id);
  document.querySelector("#moment-kicker").textContent = moment.kicker;
  setLines(document.querySelector("#moment-title"), moment.title);
  document.querySelector("#moment-description").textContent =
    moment.description;
  document.querySelector("#note-type").textContent = moment.type;
  setLines(document.querySelector("#note-content"), moment.content);
  document.querySelector("#note-tag").textContent = moment.tag;
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectMoment(tab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    selectMoment(tabs[next], true);
  });
});
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
