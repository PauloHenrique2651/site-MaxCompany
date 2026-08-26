document.addEventListener("DOMContentLoaded", () => {
  /* Home loading: brings the catalog loader identity into the first
     impression, but with a completely different editorial composition. */
  const homeLoader = document.getElementById("home-loader");
  const homeLoaderProgress = document.getElementById("home-loader-progress");
  const homeLoaderPercent = document.getElementById("home-loader-percent");

  if (homeLoader) {
    document.documentElement.classList.add("home-loading");
    document.body.classList.add("home-loading");

    const loaderDuration = 3000;
    const loaderStart = performance.now();

    const animateHomeLoader = now => {
      const progress = Math.min((now - loaderStart) / loaderDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);

      if (homeLoaderProgress) homeLoaderProgress.style.width = `${eased * 100}%`;
      if (homeLoaderPercent) homeLoaderPercent.textContent = String(Math.round(eased * 100)).padStart(2, "0");

      if (progress < 1) {
        requestAnimationFrame(animateHomeLoader);
      }
    };

    requestAnimationFrame(animateHomeLoader);

    window.setTimeout(() => {
      homeLoader.classList.add("is-hidden");
      document.documentElement.classList.remove("home-loading");
      document.body.classList.remove("home-loading");
      window.setTimeout(() => homeLoader.remove(), 900);
    }, loaderDuration);
  }

  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-button");

  /* Header: stays as a navigation bar, never as a section/landing animation. */
  function updateHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* Current section/page highlight. */
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const pageMap = {
    "empresa.html": "empresa.html",
    "cases.html": "cases.html",
    "produtos.html": "produtos.html",
    "segmentos.html": "segmentos.html",
    "contato.html": "contato.html"
  };
  document.querySelectorAll(".desktop-nav a, .mobile-nav a").forEach(link => {
    const href = (link.getAttribute("href") || "").split("#")[0].toLowerCase();
    if (pageMap[page] && href === pageMap[page]) {
      link.classList.add("is-current");
      link.setAttribute("aria-current", "page");
    }
  });

  if (header && menuButton) {
    menuButton.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      document.body.classList.toggle("menu-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });
    header.querySelectorAll(".mobile-panel a").forEach(a => a.addEventListener("click", () => {
      header.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      menuButton.setAttribute("aria-expanded", "false");
    }));
  }

  /* One shared 20-second WebM across the whole experience.
     The current playback position survives navigation between the static pages. */
  const heroVideos = [
    ...document.querySelectorAll("[data-hero-video]"),
    ...document.querySelectorAll(".section-hero-video")
  ];

  const STORAGE_KEY = "maxcompany-shared-hero-time";

  function saveHeroVideoTime() {
    const video = heroVideos[0];
    if (video && Number.isFinite(video.currentTime) && video.currentTime > 0.1) {
      sessionStorage.setItem(STORAGE_KEY, String(video.currentTime));
    }
  }

  heroVideos.forEach(video => {
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    const restore = () => {
      const savedTime = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
      if (Number.isFinite(savedTime) && savedTime > 0 && savedTime < (video.duration || Infinity)) {
        try { video.currentTime = savedTime; } catch (_) {}
      }
      video.play().catch(() => {});
    };

    if (video.readyState >= 1) restore();
    else video.addEventListener("loadedmetadata", restore, { once: true });

    video.addEventListener("timeupdate", () => {
      if (video.currentTime > 0.1) {
        sessionStorage.setItem(STORAGE_KEY, String(video.currentTime));
      }
    });

    /* Native looping already returns to the beginning when the video ends.
       Do not manually reset it here, so navigation never forces a restart. */
  });

  /* Integrated catalog: it is a section of the home page, not an external redirect. */
  const catalogLinks = document.querySelectorAll('a[href="#catalogo"], a[href="index.html#catalogo"]');
  const catalogSection = document.getElementById("catalogo");

  function setCatalogHighlight(active) {
    catalogLinks.forEach(link => {
      link.classList.toggle("is-catalog-current", active);
      if (active) link.setAttribute("aria-current", "location");
      else if (link.getAttribute("aria-current") === "location") link.removeAttribute("aria-current");
    });
  }

  catalogLinks.forEach(link => {
    link.addEventListener('click', event => {
      const target = document.getElementById('catalogo');
      if (target) {
        event.preventDefault();
        setCatalogHighlight(true);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#catalogo');
      }
    });
  });

  /* When the catalog is visible, keep its navigation item highlighted in white.
     The current page/section highlight remains untouched, creating the requested
     double indication: current section + catalog.

     IMPORTANT: the catalog iframe is intentionally NOT started on page load.
     Its src is assigned only when the catalog section actually enters the
     viewport, so the original catalog loader is shown only when the user
     reaches the catalog. */
  const catalogFrame = catalogSection ? catalogSection.querySelector(".catalog-frame[data-catalog-src]") : null;
  let catalogStarted = false;

  function startCatalog() {
    if (catalogStarted || !catalogFrame) return;
    const source = catalogFrame.getAttribute("data-catalog-src");
    if (!source) return;
    catalogStarted = true;
    catalogFrame.setAttribute("src", source);
  }

  if (catalogSection && "IntersectionObserver" in window) {
    const catalogObserver = new IntersectionObserver(entries => {
      const entry = entries[0];
      const visible = entry.isIntersecting && entry.intersectionRatio > 0.01;
      setCatalogHighlight(visible);
      if (visible) {
        startCatalog();
        catalogObserver.disconnect();
      }
    }, { threshold: [0, 0.01], rootMargin: "0px" });
    catalogObserver.observe(catalogSection);
  } else if (catalogSection) {
    const updateCatalogOnScroll = () => {
      const rect = catalogSection.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      setCatalogHighlight(visible);
      if (visible) {
        startCatalog();
        window.removeEventListener("scroll", updateCatalogOnScroll);
      }
    };
    updateCatalogOnScroll();
    window.addEventListener("scroll", updateCatalogOnScroll, { passive: true });
  }

  /* Save the exact position before any navigation triggered by a click. */
  document.querySelectorAll("a[href]").forEach(link => {
    link.addEventListener("click", saveHeroVideoTime, { capture: true });
  });

  window.addEventListener("pagehide", saveHeroVideoTime);

  /* Parallax only on the large home hero. Never moves the page itself. */
  const hero = document.querySelector(".home-hero");
  if (hero && window.matchMedia("(pointer:fine)").matches) {
    const activeVideo = hero.querySelector(".hero-video");
    hero.addEventListener("mousemove", e => {
      const r = hero.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - .5) * 12;
      const y = ((e.clientY - r.top) / r.height - .5) * 8;
      if (activeVideo) activeVideo.style.transform = `translate3d(${-x}px,${-y}px,0)`;
    });
    hero.addEventListener("mouseleave", () => {
      if (activeVideo) activeVideo.style.transform = "";
    });
  }

  /* Contact form: original mailto behavior preserved. */
  const form = document.querySelector("#contact-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const data = new FormData(form);
      const body = [
        `Nome: ${data.get("Nome") || ""}`,
        `Empresa: ${data.get("Empresa") || ""}`,
        `E-mail: ${data.get("E-mail") || ""}`,
        `Telefone: ${data.get("Telefone") || ""}`,
        `Mensagem: ${data.get("Mensagem") || ""}`
      ].join("\n");
      window.location.href =
        `mailto:comercial@grupomaxcompany.com.br?subject=Contato pelo site MaxCompany&body=${encodeURIComponent(body)}`;
    });
  }
});
