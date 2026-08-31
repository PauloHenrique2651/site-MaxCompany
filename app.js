document.addEventListener("DOMContentLoaded", () => {
  /* Safe storage: some visitors open these files directly (file://) or have
     storage blocked/full. Raw localStorage calls throw in those cases and,
     since this whole file runs inside one listener, an uncaught error here
     stops every handler declared below it from ever being attached — menu,
     WhatsApp CTAs, filters, everything. Route all storage through this. */
  const safeStorage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (_) {
        /* ignore: storage unavailable */
      }
    },
    sessionGet(key) {
      try {
        return window.sessionStorage.getItem(key);
      } catch (_) {
        return null;
      }
    },
    sessionSet(key, value) {
      try {
        window.sessionStorage.setItem(key, value);
      } catch (_) {
        /* ignore: session storage unavailable */
      }
    }
  };

  /* Home loading: brings the catalog loader identity into the first
     impression, but with a completely different editorial composition. */
  const homeLoader = document.getElementById("home-loader");
  const homeLoaderProgress = document.getElementById("home-loader-progress");
  const homeLoaderPercent = document.getElementById("home-loader-percent");
  if (homeLoader) {
    document.documentElement.classList.add("home-loading");
    document.body.classList.add("home-loading");

    const loaderDuration = 900;
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
      window.setTimeout(() => homeLoader.remove(), 320);
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
  const page = (location.pathname.replace(/\/+$/, "").split("/").pop() || "").toLowerCase().replace(/\.html$/, "");
  const pageMap = { empresa: "empresa", cases: "cases", solucoes: "solucoes", industrias: "industrias", contato: "contato" };
  document.querySelectorAll(".desktop-nav a, .mobile-nav a").forEach(link => {
    const href = (link.getAttribute("href") || "").split("#")[0].replace(/\/+$/, "").split("/").pop().toLowerCase();
    if (pageMap[page] && href === pageMap[page]) {
      link.classList.add("is-current");
      link.setAttribute("aria-current", "page");
    }
  });

  if (header && menuButton) {
    const mobilePanel = header.querySelector(".mobile-panel");

    if (mobilePanel) {
      if (!mobilePanel.id) mobilePanel.id = "mobile-navigation";
      menuButton.setAttribute("aria-controls", mobilePanel.id);
    }

    const closeMobileMenu = () => {
      header.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Abrir menu");
    };

    menuButton.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      document.body.classList.toggle("menu-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });

    header.querySelectorAll(".mobile-panel a").forEach(a => {
      a.addEventListener("click", closeMobileMenu);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && header.classList.contains("is-open")) {
        closeMobileMenu();
        menuButton.focus({ preventScroll: true });
      }
    });

    document.addEventListener("click", event => {
      if (!header.classList.contains("is-open")) return;
      if (!header.contains(event.target)) closeMobileMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1000 && header.classList.contains("is-open")) {
        closeMobileMenu();
      }
    }, { passive: true });
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
      safeStorage.sessionSet(STORAGE_KEY, String(video.currentTime));
    }
  }

  heroVideos.forEach(video => {
    const deferredSource = video.querySelector('source[data-src]');
    if (deferredSource) {
      const activateVideo = () => {
        if (deferredSource.src) return;
        deferredSource.src = deferredSource.dataset.src;
        video.load();
      };
      if ('requestIdleCallback' in window) requestIdleCallback(activateVideo, { timeout: 900 });
      else window.setTimeout(activateVideo, 250);
    }
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.classList.add("video-handoff");

    const reveal = () => {
      video.classList.add("video-ready");
      document.documentElement.classList.add("video-ready");
          };

    const restore = () => {
      const savedTime = Number(safeStorage.sessionGet(STORAGE_KEY) || 0);
      try { video.pause(); } catch (_) {}

      if (Number.isFinite(savedTime) && savedTime > 0 && savedTime < (video.duration || Infinity)) {
        try {
          video.currentTime = savedTime;
        } catch (_) {}
      }

      const start = () => {
        video.play().catch(() => {});
        window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));
      };

      if (video.readyState >= 3) start();
      else video.addEventListener("canplay", start, { once: true });
    };

    if (video.readyState >= 1) restore();
    else video.addEventListener("loadedmetadata", restore, { once: true });

    video.addEventListener("timeupdate", () => {
      if (video.currentTime > 0.1) {
        safeStorage.sessionSet(STORAGE_KEY, String(video.currentTime));
      }
    });

    /* Native looping already returns to the beginning when the video ends.
       Do not manually reset it here, so navigation never forces a restart. */
  });

  /* Resolve internal routes without relying on server rewrites. */
  const resolveLocalRoute = route => {
    const value = String(route || "").trim();
    if (value === "/catalogo" || value === "/catalogo/" || value === "catalogo" || value === "catalogo/") return "catalogo/";
    if (value.startsWith("/")) return value;
    return value;
  };

  /* Integrated catalog: it is a section of the home page, not an external redirect. */
  const catalogLinks = document.querySelectorAll('a[href="#catalogo"], a[href$="#catalogo"]');
  const catalogSection = document.getElementById("catalogo");
  const catalogFrame = catalogSection ? catalogSection.querySelector(".catalog-frame[data-catalog-src]") : null;

  function setCatalogHighlight(active) {
    catalogLinks.forEach(link => {
      link.classList.toggle("is-catalog-current", active);
      if (active) link.setAttribute("aria-current", "location");
      else if (link.getAttribute("aria-current") === "location") link.removeAttribute("aria-current");
    });
  }

  function scrollToCatalog(behavior = 'smooth') {
    const target = document.getElementById('catalogo');
    if (!target) return false;
    setCatalogHighlight(true);
    target.scrollIntoView({ behavior, block: 'start' });
    return true;
  }

  catalogLinks.forEach(link => {
    link.addEventListener('click', event => {
      if (link.classList.contains('solution-category-card')) return;
      const target = document.getElementById('catalogo');
      if (target) {
        event.preventDefault();
        scrollToCatalog('smooth');
        history.replaceState(null, '', '#catalogo');
        if (catalogFrame) startCatalog();
      }
    });
  });

  /* Deep-link support: every page already contains the integrated catalog. */
  if (window.location.hash === '#catalogo' && catalogSection) {
    window.setTimeout(() => { startCatalog(); scrollToCatalog('auto'); }, 80);
  }

  /* When the catalog is visible, keep its navigation item highlighted in white.
     The current page/section highlight remains untouched, creating the requested
     double indication: current section + catalog.

     The embedded flipbook is lazy-started only when the catalog section enters
     the viewport, preserving the premium loader without loading it on page load. */
  let catalogStarted = false;
  let catalogFrameLoaded = false;
  let catalogLoaderStartedAt = 0;

  function finishCatalogLoading() {
    const loadingState = catalogSection?.querySelector("[data-catalog-loading]");
    const elapsed = performance.now() - catalogLoaderStartedAt;
    const remaining = Math.max(0, 650 - elapsed);
    window.setTimeout(() => {
      loadingState?.classList.add("is-hidden");
      catalogFrame?.classList.add("is-loaded");
    }, remaining);
  }

  function startCatalog() {
    if (catalogStarted || !catalogFrame) return;
    const source = resolveLocalRoute(catalogFrame.getAttribute("data-catalog-src") || "/catalogo");
    if (!source) return;
    catalogStarted = true;
    const loadingState = catalogSection?.querySelector("[data-catalog-loading]");
    catalogLoaderStartedAt = performance.now();
    loadingState?.classList.remove("is-hidden");
    loadingState?.classList.add("is-visible");
    // The iframe has a real src in the HTML for zero-JS/static-server reliability.
    // Only set it here when a legacy page omitted it.
    if (!catalogFrame.getAttribute("src")) {
      catalogFrame.setAttribute("src", source);
    } else if (catalogFrameLoaded) {
      finishCatalogLoading();
    }
  }

  if (catalogFrame) {
    catalogFrame.addEventListener("load", () => {
      catalogFrameLoaded = true;
      if (catalogStarted) finishCatalogLoading();
    });
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

  window.addEventListener("pagehide", saveHeroVideoTime);

  // The solutions page owns the catalog: start its iframe shortly after the page
  // becomes interactive, while the home page remains lazy for performance.
  if (catalogSection && catalogFrame && document.querySelector(".solutions-categories")) {
    const bootCatalog = () => startCatalog();
    if ("requestIdleCallback" in window) requestIdleCallback(bootCatalog, { timeout: 500 });
    else window.setTimeout(bootCatalog, 350);
  }

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

  /* Group specialty cards: only the clicked card stays open. */
  const specialtyCards = Array.from(document.querySelectorAll(".group-specialty"));
  specialtyCards.forEach(card => {
    const summary = card.querySelector("summary");
    if (!summary) return;
    summary.addEventListener("click", () => {
      specialtyCards.forEach(other => {
        if (other !== card) other.removeAttribute("open");
      });
    });
  });

  /* Footer brand deep-links: return to O Grupo with the exact specialty open. */
  const specialtyParam = new URLSearchParams(window.location.search).get("marca");
  if (specialtyParam && specialtyCards.length) {
    const targetCard = document.querySelector(`.group-specialty[data-marca="${CSS.escape(specialtyParam)}"]`);
    if (targetCard) {
      specialtyCards.forEach(card => card.removeAttribute("open"));
      targetCard.setAttribute("open", "");
      window.setTimeout(() => {
        const header = document.getElementById("site-header");
        const offset = (header ? header.getBoundingClientRect().height : 0) + 24;
        const rect = targetCard.getBoundingClientRect();
        const top = rect.top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        targetCard.classList.add("is-targeted");
        window.setTimeout(() => targetCard.classList.remove("is-targeted"), 1800);
      }, 100);
    }
  }

  /* Deep-link from Home/footer to a specific Solutions category. */
  const categoryHash = window.location.hash.replace(/^#/, "");
  if (categoryHash.startsWith("categoria-") && document.getElementById(categoryHash)) {
    window.setTimeout(() => {
      const target = document.getElementById(categoryHash);
      if (!target) return;
      const headerEl = document.getElementById("site-header");
      const offset = (headerEl ? headerEl.getBoundingClientRect().height : 0) + 24;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      target.classList.add("is-targeted");
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      window.setTimeout(() => target.classList.remove("is-targeted"), 1800);
    }, 120);
  }

  /* Client logo deep-links: open the matching client case and focus it. */
  const clientParam = new URLSearchParams(window.location.search).get("cliente");
  if (clientParam) {
    const clientCard = document.querySelector(`[data-client="${CSS.escape(clientParam)}"]`);
    if (clientCard) {
      window.setTimeout(() => {
        clientCard.scrollIntoView({ behavior: "smooth", block: "center" });
        clientCard.classList.add("is-targeted");
        window.setTimeout(() => clientCard.classList.remove("is-targeted"), 1800);
      }, 450);
    }
  }

  /* Contact form: validates every field, records the lead in GA4 and opens a
     complete, ready-to-send WhatsApp message for the commercial team. */
  const form = document.querySelector("#contact-form");
  if (form) {
    const status = document.querySelector("#contact-form-status");
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", e => {
      e.preventDefault();

      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const name = String(data.get("Nome") || "").trim();
      const company = String(data.get("Empresa") || "").trim();
      const email = String(data.get("E-mail") || "").trim();
      const phone = String(data.get("Telefone") || "").trim();
      const message = String(data.get("Mensagem") || "").trim();
      const pageUrl = window.location.href;

      const whatsappMessage = [
        "Olá! Gostaria de solicitar uma cotação com o Grupo MaxCompany.",
        "",
        "DADOS DO CONTATO",
        `Nome: ${name}`,
        `Empresa: ${company}`,
        `E-mail: ${email}`,
        `Telefone: ${phone}`,
        "",
        "SOLICITAÇÃO",
        message,
        "",
        "ORIGEM",
        "Formulário do site Grupo MaxCompany",
        `Página: ${pageUrl}`
      ].join("\n");

      const whatsappUrl = `https://wa.me/5521998657426?text=${encodeURIComponent(whatsappMessage)}`;

      const trackLead = () => {
        if (typeof window.gtag !== "function") return;
        window.gtag("event", "contact_form_submit", {
          form_name: "contato_maxcompany",
          lead_type: "cotacao",
          page_location: pageUrl
        });
        window.gtag("event", "generate_lead", {
          currency: "BRL",
          value: 1,
          lead_source: "website_contact_form",
          lead_type: "cotacao"
        });
        window.gtag("event", "quote_request", {
          method: "whatsapp",
          page_location: pageUrl
        });
      };

      trackLead();
      if (submitButton) submitButton.disabled = true;
      if (status) {
        status.className = "form-status is-success";
        status.textContent = "Dados enviados para o WhatsApp. Abrindo a conversa com nossa equipe comercial…";
      }

      /* Open immediately inside the submit gesture so mobile browsers do not
         block WhatsApp as a popup. */
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (submitButton) {
        window.setTimeout(() => { submitButton.disabled = false; }, 800);
      }
    });
  }


  /* GA4 conversion tracking: one consistent event layer across the static site. */
  const trackEvent = (name, params = {}) => {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push(["event", name, params]);
  };

  /* International specialist CTA: keep the existing number, but adapt the
     opening message to the visitor's selected language. */
  (() => {
    const messages = {
      "pt-BR": "Olá! Gostaria de falar com um especialista do Grupo MaxCompany. Tenho uma demanda e preciso de atendimento comercial.",
      pt: "Olá! Gostaria de falar com um especialista do Grupo MaxCompany. Tenho uma demanda e preciso de atendimento comercial.",
      en: "Hello! I would like to speak with a Grupo MaxCompany specialist. I have a business request and need commercial assistance.",
      es: "¡Hola! Me gustaría hablar con un especialista de Grupo MaxCompany. Tengo una solicitud comercial y necesito atención.",
      de: "Hallo! Ich möchte mit einem Spezialisten von Grupo MaxCompany sprechen. Ich habe eine geschäftliche Anfrage und benötige Unterstützung.",
      fr: "Bonjour ! Je souhaite parler à un spécialiste de Grupo MaxCompany. J’ai une demande commerciale et j’ai besoin d’assistance.",
      it: "Salve! Vorrei parlare con uno specialista di Grupo MaxCompany. Ho una richiesta commerciale e ho bisogno di assistenza.",
      nl: "Hallo! Ik wil graag met een specialist van Grupo MaxCompany spreken. Ik heb een zakelijke aanvraag en heb commerciële ondersteuning nodig.",
      pl: "Dzień dobry! Chciałbym porozmawiać ze specjalistą Grupo MaxCompany. Mam zapytanie biznesowe i potrzebuję obsługi handlowej.",
      ja: "こんにちは。Grupo MaxCompanyの専門担当者と話したいです。商談のご相談があり、営業サポートを希望しています。",
      "zh-CN": "您好！我想与 Grupo MaxCompany 的专业顾问沟通。我有采购需求，希望获得商务支持。",
      ko: "안녕하세요. Grupo MaxCompany의 전문 담당자와 상담하고 싶습니다. 구매 문의가 있어 영업 지원을 받고 싶습니다.",
      ru: "Здравствуйте! Я хотел бы связаться со специалистом Grupo MaxCompany. У меня есть коммерческий запрос, и мне нужна помощь.",
      ar: "مرحبًا! أود التحدث مع أحد المتخصصين في Grupo MaxCompany. لدي طلب تجاري وأحتاج إلى المساعدة."
    };
    const phone = "5521998657426";
    const apply = lang => {
      const message = messages[lang] || messages["pt-BR"];
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      document.querySelectorAll("[data-specialist-whatsapp]").forEach(link => link.setAttribute("href", url));
    };
    apply(safeStorage.get("maxcompany-language") || "pt-BR");
    document.addEventListener("click", event => {
      const option = event.target.closest("[data-language-switcher] [data-lang]");
      if (option) {
        window.setTimeout(() => apply(option.dataset.lang || "pt-BR"), 300);
      }
    });
  })();

  /* WhatsApp, phone and quote CTAs. */
  document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
    link.addEventListener("click", () => {
      const label = (link.textContent || "").trim();
      const isQuote = /cota[cç][aã]o|especialista|or[cç]amento/i.test(label);
      trackEvent("whatsapp_click", {
        link_text: label.slice(0, 100),
        page_location: window.location.href,
        lead_type: isQuote ? "cotacao" : "whatsapp"
      });
      if (isQuote) trackEvent("quote_cta_click", { method: "whatsapp", page_location: window.location.href });
    });
  });

  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener("click", () => {
      trackEvent("phone_click", {
        phone_number: link.getAttribute("href") || "",
        page_location: window.location.href
      });
    });
  });

  /* Integrated solutions -> catalog navigation.
     Category clicks stay on /solucoes, scroll to the embedded reader and
     command the existing catalog instance to the exact category page. */
  (() => {
    const catalogSection = document.getElementById("catalogo");
    const catalogFrame = catalogSection ? catalogSection.querySelector("iframe.catalog-frame") : null;
    const categoryLinks = document.querySelectorAll(".solution-category-card[data-catalog-page]");
    if (!catalogSection || !catalogFrame || !categoryLinks.length) return;

    let frameReady = false;
    let queuedPage = null;

    const postCatalogPage = page => {
      const target = Math.max(1, Math.min(68, Number(page) || 1));
      if (!frameReady) {
        queuedPage = target;
        return;
      }
      const targetOrigin = window.location.protocol === "file:" ? "*" : window.location.origin;
      catalogFrame.contentWindow?.postMessage({ type: "maxcompany:catalog-page", page: target }, targetOrigin);
      trackEvent("catalog_category_open", { catalog_page: target });
    };

    const ensureCatalog = page => {
      catalogSection.classList.add("is-requested");
      const requestedPage = Math.max(1, Math.min(68, Number(page) || 1));
      postCatalogPage(requestedPage);

      if (!catalogFrame.getAttribute("src")) {
        frameReady = false;
        catalogFrame.setAttribute("src", resolveLocalRoute(catalogFrame.dataset.catalogSrc || "/catalogo"));
      }

      // Scroll only after requesting the frame so the destination section is
      // guaranteed to exist as a live, interactive catalog, not a blank box.
      requestAnimationFrame(() => {
        catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };

    catalogFrame.addEventListener("load", () => {
      frameReady = true;
      if (queuedPage) {
        postCatalogPage(queuedPage);
        queuedPage = null;
      }
    });

    categoryLinks.forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        ensureCatalog(link.dataset.catalogPage);
        if (link.dataset.catalogPage) {
          catalogSection.classList.add("is-requested");
        }
      });
    });
  })();

  /* Catalog: count a meaningful view when the catalog section enters the viewport. */
  const catalogSectionForAnalytics = document.querySelector("#catalogo, .catalog-section");
  if (catalogSectionForAnalytics && "IntersectionObserver" in window) {
    let catalogTracked = false;
    const observer = new IntersectionObserver(entries => {
      if (catalogTracked || !entries.some(entry => entry.isIntersecting)) return;
      catalogTracked = true;
      trackEvent("catalog_view", { page_location: window.location.href });
      observer.disconnect();
    }, { threshold: 0.25 });
    observer.observe(catalogSectionForAnalytics);
  }

  /* Product detail pages: send a GA4-style view_item event using the Product schema. */
  const productSchema = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map(script => {
      try { return JSON.parse(script.textContent); } catch (_) { return null; }
    })
    .flatMap(data => Array.isArray(data?.["@graph"]) ? data["@graph"] : [data])
    .find(item => item && item["@type"] === "Product");

  if (productSchema?.name) {
    trackEvent("view_item", {
      currency: "BRL",
      items: [{
        item_name: productSchema.name,
        item_category: productSchema.category || "Suprimentos industriais"
      }],
      page_location: window.location.href
    });
  }

  /* Deterministic multilingual controller ----------------------------------
     - PT-BR is the immutable source language.
     - PT-PT has its own explicit identifier and is handled locally.
     - Google Translate is used ONLY for non-Portuguese target languages.
     - One delegated interaction path serves desktop and mobile.
     - Language controls themselves are marked notranslate so Google cannot
       rewrite the selector labels or collapse PT-BR/PT-PT visually.
     - Switching language always changes the persisted state first, closes the
       UI, and then applies exactly one language transformation. */
  (() => {
    const LANGUAGE_KEY = "maxcompany-language";
    const GOOGLE_COOKIE = "googtrans";

    const LANGUAGE_NAMES = Object.freeze({
      "pt-BR": "PT-BR",
      "pt-PT": "PT-PT",
      en: "EN",
      es: "ES",
      de: "DE",
      fr: "FR",
      it: "IT",
      nl: "NL",
      pl: "PL",
      ja: "JA",
      "zh-CN": "ZH",
      ko: "KO",
      ru: "RU",
      ar: "AR"
    });

    const GOOGLE_LANGUAGES = new Set([
      "en", "es", "de", "fr", "it", "nl", "pl", "ja", "zh-CN", "ko", "ru", "ar"
    ]);

    const LEGACY_LANGUAGE_MAP = Object.freeze({ pt: "pt-PT" });
    let googleLoading = false;
    let googleReadyTimer = 0;
    let googleTarget = null;

    const normalizeLanguage = value => {
      const raw = String(value || "").trim();
      if (raw === "pt") return "pt-PT";
      return Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, raw) ? raw : "pt-BR";
    };

    const getLanguage = () => normalizeLanguage(safeStorage.get(LANGUAGE_KEY));

    const setCookie = (name, value, maxAge = 31536000) => {
      const encoded = encodeURIComponent(value);
      const attrs = `path=/;max-age=${maxAge};SameSite=Lax`;
      document.cookie = `${name}=${encoded};${attrs}`;
      if (location.hostname && location.hostname.includes(".")) {
        document.cookie = `${name}=${encoded};domain=${location.hostname};${attrs}`;
      }
    };

    const clearGoogleCookie = () => {
      const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = `${GOOGLE_COOKIE}=;path=/;expires=${expires};max-age=0;SameSite=Lax`;
      if (location.hostname && location.hostname.includes(".")) {
        document.cookie = `${GOOGLE_COOKIE}=;domain=${location.hostname};path=/;expires=${expires};max-age=0;SameSite=Lax`;
      }
    };

    const setGoogleCookie = lang => setCookie(GOOGLE_COOKIE, `/pt/${lang}`);

    const closeLanguageMenus = () => {
      document.querySelectorAll("[data-language-switcher] .language-menu").forEach(menu => {
        menu.hidden = true;
      });
      document.querySelectorAll("[data-language-switcher] .language-toggle").forEach(toggle => {
        toggle.setAttribute("aria-expanded", "false");
      });
    };

    const closeMobileMenu = () => {
      const header = document.querySelector(".site-header");
      const button = document.querySelector(".menu-button");
      if (!header || !button) return;
      header.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Abrir menu");
    };

    const applyLanguageChrome = lang => {
      const normalized = normalizeLanguage(lang);
      document.documentElement.lang = normalized;
      document.documentElement.dir = normalized === "ar" ? "rtl" : "ltr";
      document.documentElement.classList.toggle("lang-rtl", normalized === "ar");
      document.documentElement.classList.toggle("lang-ptpt", normalized === "pt-PT");
      document.querySelectorAll("[data-current-language]").forEach(el => {
        el.textContent = LANGUAGE_NAMES[normalized];
        el.setAttribute("translate", "no");
        el.classList.add("notranslate");
      });
      document.querySelectorAll("[data-language-switcher]").forEach(el => {
        el.setAttribute("translate", "no");
        el.classList.add("notranslate");
      });
    };

    // Brazilian Portuguese -> European Portuguese. This is intentionally local:
    // Google has no separate PT-PT target code and must never receive this state.
    const PT_PT_REPLACEMENTS = [
      ["Cases de sucesso", "Casos de sucesso"],
      ["case de sucesso", "caso de sucesso"],
      ["Falar com especialista", "Falar com um especialista"],
      ["Solicitar cotação", "Solicitar orçamento"],
      ["solicitar uma cotação", "solicitar um orçamento"],
      ["solicitação comercial", "pedido comercial"],
      ["solicitações comerciais", "pedidos comerciais"],
      ["equipe comercial", "equipa comercial"],
      ["Equipe comercial", "Equipa comercial"],
      ["Nossa equipe", "A nossa equipa"],
      ["nossa equipe", "a nossa equipa"],
      ["Nossa Equipe", "A nossa Equipa"],
      ["Equipe", "Equipa"],
      ["equipe", "equipa"],
      ["Contato", "Contacto"],
      ["CONTATO", "CONTACTO"],
      ["contato", "contacto"],
      ["celular", "telemóvel"],
      ["Celular", "Telemóvel"],
      ["telefone celular", "telemóvel"],
      ["Telefone celular", "Telemóvel"],
      ["endereço", "morada"],
      ["Endereço", "Morada"],
      ["cadastro", "registo"],
      ["Cadastro", "Registo"],
      ["arquivo", "ficheiro"],
      ["Arquivo", "Ficheiro"],
      ["usuário", "utilizador"],
      ["Usuário", "Utilizador"],
      ["usuários", "utilizadores"],
      ["Usuários", "Utilizadores"],
      ["atendimento nacional", "atendimento a nível nacional"],
      ["atendimento personalizado", "atendimento personalizado"],
      ["frete", "transporte"],
      ["pedido de cotação", "pedido de orçamento"],
      ["pedidos de cotação", "pedidos de orçamento"],
      ["orçamento", "orçamento"],
      ["Orçamento", "Orçamento"]
    ];

    const ptPtText = value => {
      let result = value;
      for (const [from, to] of PT_PT_REPLACEMENTS) result = result.split(from).join(to);
      return result;
    };

    const applyPtPt = () => {
      document.title = ptPtText(document.title);
      document.querySelectorAll('meta[name="description"]').forEach(meta => {
        if (meta.content) meta.content = ptPtText(meta.content);
      });

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (parent.closest('script,style,noscript,textarea,input,select,option,[data-no-translate],[translate="no"],.notranslate')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        node.nodeValue = ptPtText(node.nodeValue);
      });

      document.querySelectorAll("[aria-label],[title],[placeholder]").forEach(el => {
        if (el.closest("[data-language-switcher]")) return;
        ["aria-label", "title", "placeholder"].forEach(attr => {
          if (el.hasAttribute(attr)) el.setAttribute(attr, ptPtText(el.getAttribute(attr)));
        });
      });
    };

    const cleanupGoogleArtifacts = () => {
      document.querySelectorAll(".goog-te-banner-frame, .skiptranslate > iframe").forEach(frame => {
        if (!frame.closest("#google_translate_element")) frame.style.display = "none";
      });
      document.body.style.top = "0px";
      document.querySelectorAll("[data-language-switcher]").forEach(el => {
        el.style.removeProperty("transform");
        el.style.removeProperty("top");
      });
    };

    const selectGoogleLanguage = lang => {
      const select = document.querySelector("select.goog-te-combo");
      if (!select) return false;
      const target = normalizeLanguage(lang);
      if (!GOOGLE_LANGUAGES.has(target)) return false;
      if (select.value !== target) select.value = target;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      window.setTimeout(cleanupGoogleArtifacts, 40);
      return true;
    };

    const stopGoogle = () => {
      window.clearInterval(googleReadyTimer);
      googleReadyTimer = 0;
      googleTarget = null;
      clearGoogleCookie();
      cleanupGoogleArtifacts();
    };

    window.googleTranslateElementInit = () => {
      try {
        new google.translate.TranslateElement({
          pageLanguage: "pt",
          autoDisplay: false,
          includedLanguages: Array.from(GOOGLE_LANGUAGES).join(","),
          multilanguagePage: false
        }, "google_translate_element");
      } catch (_) {
        googleLoading = false;
        return;
      }

      googleLoading = false;
      window.clearInterval(googleReadyTimer);
      let attempts = 0;
      googleReadyTimer = window.setInterval(() => {
        attempts += 1;
        if (googleTarget && selectGoogleLanguage(googleTarget)) {
          window.clearInterval(googleReadyTimer);
          googleReadyTimer = 0;
          googleTarget = null;
          cleanupGoogleArtifacts();
        } else if (attempts > 100) {
          window.clearInterval(googleReadyTimer);
          googleReadyTimer = 0;
          googleTarget = null;
        }
      }, 100);
    };

    const loadGoogle = lang => {
      const target = normalizeLanguage(lang);
      if (!GOOGLE_LANGUAGES.has(target)) return;
      googleTarget = target;

      if (selectGoogleLanguage(target)) return;
      if (googleLoading) return;

      const existing = document.querySelector('script[src*="translate.google.com/translate_a/element.js"]');
      if (existing) {
        // Script may already exist but callback/widget is not ready yet.
        return;
      }

      googleLoading = true;
      const script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.onerror = () => {
        googleLoading = false;
        googleTarget = null;
      };
      document.head.appendChild(script);
    };

    const applySavedLanguage = () => {
      const saved = getLanguage();
      safeStorage.set(LANGUAGE_KEY, saved);
      applyLanguageChrome(saved);

      // Never let the Google Translate cookie determine PT-BR/PT-PT.
      if (saved === "pt-BR") {
        stopGoogle();
        return;
      }

      if (saved === "pt-PT") {
        stopGoogle();
        window.setTimeout(applyPtPt, 0);
        return;
      }

      if (GOOGLE_LANGUAGES.has(saved)) {
        setGoogleCookie(saved);
        loadGoogle(saved);
      }
    };

    const switchLanguage = value => {
      const lang = normalizeLanguage(value);
      const current = getLanguage();
      if (lang === current) {
        closeLanguageMenus();
        return;
      }

      safeStorage.set(LANGUAGE_KEY, lang);
      closeLanguageMenus();
      closeMobileMenu();
      applyLanguageChrome(lang);

      if (lang === "pt-BR" || lang === "pt-PT") {
        // Reload from the immutable Portuguese source. Google is NOT loaded on
        // either Portuguese state, so PT-BR/PT-PT cannot become ambiguous.
        stopGoogle();
        location.reload();
        return;
      }

      setGoogleCookie(lang);
      googleTarget = lang;
      if (location.protocol !== "file:") {
        location.reload();
      } else {
        stopGoogle();
        loadGoogle(lang);
      }
    };

    document.querySelectorAll("[data-language-switcher]").forEach(switcher => {
      const toggle = switcher.querySelector(".language-toggle");
      const menu = switcher.querySelector(".language-menu");
      if (!toggle || !menu) return;

      toggle.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = !menu.hidden;
        closeLanguageMenus();
        if (!isOpen) {
          menu.hidden = false;
          toggle.setAttribute("aria-expanded", "true");
        }
      });
    });

    // One and only one selection handler for desktop + mobile. Use pointerup
    // so touch devices do not depend on a delayed synthetic click.
    document.addEventListener("pointerup", event => {
      const option = event.target.closest("[data-language-switcher] [data-lang]");
      if (!option) return;
      event.preventDefault();
      event.stopPropagation();
      switchLanguage(option.dataset.lang);
    });

    document.addEventListener("click", event => {
      if (!event.target.closest("[data-language-switcher]")) closeLanguageMenus();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeLanguageMenus();
    });

    // Expose a tiny diagnostic hook for debugging without adding another
    // controller or listener: window.maxCompanyLanguage() -> current code.
    window.maxCompanyLanguage = () => getLanguage();

    applySavedLanguage();
  })();

});
