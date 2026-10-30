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
      { signal: controller.signal, headers: { Accept: "application/vnd.github+json" } },
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
      ) link.href = url.href;
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
