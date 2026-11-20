/* SnapNote product website — progressive enhancement only. */
(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Theme toggle (light / dark)
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const dark = document.documentElement.classList.toggle("dark");
      try {
        localStorage.setItem("snapnote-site-theme", dark ? "dark" : "light");
      } catch {
        // Ignore storage restrictions.
      }
    });
  }

  // Mobile navigation
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

  // Interactive Hero Real-App Preview Switcher
  const previews = {
    light: {
      src: "assets/workspace-light.png",
      width: 1180,
      height: 800,
      alt: "SnapNote clipboard manager and notes workspace on Windows in light theme",
      caption:
        "Real desktop screenshot — searchable clipboard cards, folders, snippets, and rich notes in one unified window.",
      quick: false,
    },
    dark: {
      src: "assets/workspace-dark.png",
      width: 1180,
      height: 800,
      alt: "SnapNote clipboard manager and notes workspace on Windows in dark theme",
      caption:
        "Dark mode — deep charcoal surfaces with warm amber highlights built for late-night focus.",
      quick: false,
    },
    quick: {
      src: "assets/quick-access.png",
      width: 560,
      height: 640,
      alt: "SnapNote floating Alt+X Quick Access window showing searchable recent clips",
      caption:
        "Alt+X Quick Access — compact floating window that appears above any app and tucks back into the system tray.",
      quick: true,
    },
  };

  const previewButtons = document.querySelectorAll("[data-preview]");
  const previewImg = document.getElementById("hero-preview-img");
  const previewCaption = document.getElementById("hero-preview-caption");
  const previewFrame = document.getElementById("hero-preview-frame");

  const setPreview = (key) => {
    const item = previews[key];
    if (!item || !(previewImg instanceof HTMLImageElement)) return;
    previewImg.src = item.src;
    previewImg.width = item.width;
    previewImg.height = item.height;
    previewImg.alt = item.alt;
    if (previewCaption) previewCaption.textContent = item.caption;
    if (previewFrame) previewFrame.classList.toggle("is-quick", item.quick);
    previewButtons.forEach((btn) => {
      const active = btn.dataset.preview === key;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
  };

  previewButtons.forEach((btn) => {
    btn.addEventListener("click", () => setPreview(btn.dataset.preview));
  });

  if (document.documentElement.classList.contains("dark")) {
    setPreview("dark");
  }

  // Copy SHA-256 verification command
  const copyBtn = document.getElementById("copy-verify-btn");
  const verifyCmd = document.getElementById("verify-cmd");
  if (copyBtn && verifyCmd) {
    copyBtn.addEventListener("click", async () => {
      const label = copyBtn.querySelector("span");
      try {
        await navigator.clipboard.writeText(verifyCmd.textContent || "");
        if (label) label.textContent = "Copied!";
        setTimeout(() => {
          if (label) label.textContent = "Copy";
        }, 1800);
      } catch {
        if (label) label.textContent = "Select & copy";
      }
    });
  }

  // Scroll reveal
  const revealables = document.querySelectorAll(
    ".bento-card, .gallery-card, .pledge-card, .quick-frame, .faq-item",
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
      { threshold: 0.1, rootMargin: "0px 0px -20px" },
    );
    revealables.forEach((el) => {
      el.classList.add("reveal");
      watcher.observe(el);
    });
  }
})();

// Display the latest published release version tag without rewriting download
// links — every download button intentionally redirects to GitHub /releases/latest.
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
    if (typeof release.tag_name === "string") {
      const heading = document.querySelector("[data-release-version]");
      if (heading) heading.textContent = `Download SnapNote ${release.tag_name}`;
      const pill = document.querySelector("[data-release-pill]");
      if (pill)
        pill.textContent = `${release.tag_name} · Windows 10 & 11 · Free & Local-First`;
    }
  } catch {
    // Fallback labels remain active if GitHub API is unreachable.
  } finally {
    clearTimeout(timeout);
  }
})();
