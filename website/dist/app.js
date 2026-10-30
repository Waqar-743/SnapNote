/* SnapNote site — progressive enhancement only; the page works without it. */
(() => {
  // Current year in the footer.
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Mobile navigation.
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    const close = () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  // Gentle reveal for chapters, cards and figures.
  const revealables = document.querySelectorAll(
    ".chapter, .cell, .qa, .frame, .mentor-figure, .privacy-figure, .pledge",
  );
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    revealables.forEach((el) => el.classList.add("in"));
  } else {
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            watcher.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px" },
    );
    revealables.forEach((el) => {
      el.classList.add("reveal");
      watcher.observe(el);
    });
  }
})();

// Resolve assets from GitHub's latest published release. Every link already has
// a working /releases/latest fallback for offline/API-limited/JavaScript-free use.
(async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      "https://api.github.com/repos/Waqar-743/SnapNote/releases/latest",
      {
        signal: controller.signal,
        headers: { Accept: "application/vnd.github+json" },
      },
    );
    if (!response.ok) return;
    const release = await response.json();
    const patterns = {
      msi: /_x64_en-US\.msi$/i,
      exe: /_x64-setup\.exe$/i,
      checksums: /_SHA256SUMS\.txt$/i,
    };
    if (!Array.isArray(release.assets)) return;
    for (const link of document.querySelectorAll("[data-release-download]")) {
      const pattern = patterns[link.dataset.releaseDownload];
      const asset = release.assets.find((item) => pattern?.test(item.name));
      if (!asset || typeof asset.browser_download_url !== "string") continue;
      const url = new URL(asset.browser_download_url);
      if (
        url.origin === "https://github.com" &&
        url.pathname.startsWith("/Waqar-743/SnapNote/releases/download/")
      )
        link.href = url.href;
    }
    const label = document.querySelector("[data-release-version]");
    if (label && typeof release.tag_name === "string")
      label.textContent = `SnapNote ${release.tag_name}`;
  } catch {
    // The release page remains available when metadata cannot be fetched.
  } finally {
    clearTimeout(timeout);
  }
})();

// A deliberately small preview using sample content, independent of app storage.
(() => {
  const search = document.querySelector('[aria-label="Search sample clips"]');
  const filters = document.querySelectorAll("[data-demo-filter]");
  const cards = [...document.querySelectorAll("[data-demo-type]")];
  let activeFilter = "all";
  const update = () => {
    const query = search?.value.trim().toLowerCase() || "";
    let visible = 0;
    for (const card of cards) {
      card.hidden =
        (activeFilter !== "all" && card.dataset.demoType !== activeFilter) ||
        !card.dataset.demoSearch.includes(query);
      if (!card.hidden) visible++;
    }
    const empty = document.querySelector(".demo-empty");
    if (empty) empty.hidden = visible > 0;
  };
  search?.addEventListener("input", update);
  filters.forEach((button) =>
    button.addEventListener("click", () => {
      activeFilter = button.dataset.demoFilter;
      filters.forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
      update();
    }),
  );
  document.querySelectorAll("[data-demo-copy]").forEach((button) =>
    button.addEventListener("click", async () => {
      const feedback = document.querySelector(".demo-feedback");
      try {
        await navigator.clipboard.writeText(button.dataset.demoCopy);
        if (feedback)
          feedback.textContent = "Sample copied. Paste it anywhere.";
      } catch {
        if (feedback)
          feedback.textContent =
            "Select the sample text to copy it in this browser.";
      }
    }),
  );
  const quickToggle = document.querySelector("[data-quick-toggle]");
  quickToggle?.addEventListener("click", () => {
    const preview = document.getElementById("quick-preview");
    if (!preview) return;
    preview.hidden = !preview.hidden;
    quickToggle.setAttribute("aria-expanded", String(!preview.hidden));
    const hint = document.querySelector(".quick-hidden");
    if (hint) hint.hidden = !preview.hidden;
    const status = document.querySelector(".quick-demo-status");
    if (status)
      status.textContent = preview.hidden
        ? "Hidden. Press again to bring it back."
        : "Press to hide the preview.";
  });
})();
