// ============================================================
// CONFIGURAÇÕES
// ============================================================

const TOTAL_PAGES = 68;

const CONFIG = {
    mobileBreakpoint: 760,

    zoom: {
        min: 0.75,
        max: 2.5,
        step: 0.1
    },

    book: {
        pageRatio: 842 / 1191,
        minWidth: 280,
        minHeight: 396,

        duration: 820,
        cornerSize: 190,
        elevation: 95
    },

    preload: {
        range: 1
    },

    loader: {
        duration: 2200
    }
};


// ============================================================
// ESTADO
// ============================================================

let currentPage = 1;
let zoomLevel = 1;
let bookReady = false;
let resizeTimer = null;
let suppressNextClick = false;

// Estado do zoom por pinça no mobile.
let pinchActive = false;
let pinchStartDistance = 0;
let pinchStartZoom = 1;
let pinchStartCenterX = 0;
let pinchStartCenterY = 0;
let pinchStartTranslateX = 0;
let pinchStartTranslateY = 0;

const preloadCache = new Map();


// ============================================================
// ELEMENTOS DO DOM
// ============================================================

const flipbook = document.getElementById('flipbook');
const thumbnails = document.getElementById('thumbs');


// ============================================================
// LOADING
// ============================================================

const loader = document.getElementById('catalog-loader');
const loaderPercentage = document.getElementById('loader-percentage');
const loaderProgressBar = document.getElementById('loader-progress-bar');


/**
 * Inicializa o loading.
 */
function initLoader() {
    if (!loader) return;

    // O loading precisa ser perceptível e só termina depois que
    // o flipbook estiver pronto + o tempo mínimo de exibição.
    const duration = CONFIG.loader.duration;
    const startTime = performance.now();

    const firstPages = Array.from(flipbook.querySelectorAll('img')).slice(0, 2);
    const imagesReady = Promise.all(firstPages.map(image => new Promise(resolve => {
        if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
        }
        const done = () => resolve();
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
    })));

    let animationFrame;
    const updateLoader = now => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const percentage = Math.round(progress * 100);

        if (loaderPercentage) loaderPercentage.textContent = String(percentage);
        if (loaderProgressBar) loaderProgressBar.style.width = `${percentage}%`;

        if (progress < 1) {
            animationFrame = requestAnimationFrame(updateLoader);
        }
    };

    animationFrame = requestAnimationFrame(updateLoader);
    const minimumVisibleTime = new Promise(resolve => setTimeout(resolve, duration));

    Promise.all([imagesReady, minimumVisibleTime]).then(() => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        if (loaderPercentage) loaderPercentage.textContent = '100';
        if (loaderProgressBar) loaderProgressBar.style.width = '100%';
        hideLoader();
    });
}



/**
 * Esconde o loading e remove do DOM após animação.
 */
function hideLoader() {
    if (!loader) {
        return;
    }

    loader.classList.add('is-hidden');
    setTimeout(() => loader.remove(), 280);
}


// ============================================================
// UTILITÁRIOS
// ============================================================

/**
 * Retorna o caminho da imagem de uma página.
 *
 * Exemplo:
 * pages/001.webp
 */
const getPageSource = (page) => {
    return `pages/${String(page).padStart(3, '0')}.webp`;
};


/**
 * Verifica se está em modo mobile.
 */
const isMobile = () => window.innerWidth <= CONFIG.mobileBreakpoint;


/**
 * Retorna o modo de exibição do flipbook.
 */
const getDisplayMode = () => {
    if (isMobile() && window.innerHeight > window.innerWidth) {
        return 'single';
    }
    return 'double';
};


// ============================================================
// CRIAÇÃO DAS PÁGINAS
// ============================================================

function createPages() {
    for (let pageNumber = 1; pageNumber <= TOTAL_PAGES; pageNumber++) {
        createCatalogPage(pageNumber);
        createThumbnail(pageNumber);
    }
}


/**
 * Determina o lado da página (esquerda ou direita).
 */
function getPageSide(pageNumber) {
    return pageNumber % 2 === 0 ? 'page-left' : 'page-right';
}

/**
 * Configura os atributos de carregamento da imagem.
 */
function configureImageLoading(image, pageNumber) {
    image.src = getPageSource(pageNumber);
    image.alt = `Página ${pageNumber}`;
    image.draggable = false;
    image.decoding = 'async';

    if (pageNumber <= 2) {
        image.fetchPriority = 'high';
    } else {
        image.loading = 'lazy';
    }
}

/**
 * Cria uma página do catálogo.
 */
function createCatalogPage(pageNumber) {
    const page = document.createElement('div');
    page.className = `catalog-page ${getPageSide(pageNumber)}`;
    page.dataset.page = pageNumber;

    const image = document.createElement('img');
    configureImageLoading(image, pageNumber);
    page.appendChild(image);

    flipbook.appendChild(page);
}


/**
 * Cria uma miniatura.
 */
function createThumbnail(pageNumber) {
    const thumbnail = document.createElement('button');
    thumbnail.type = 'button';
    thumbnail.className = 'thumb';
    thumbnail.dataset.page = pageNumber;
    thumbnail.title = `Ir para a página ${pageNumber}`;

    const number = document.createElement('span');
    number.className = 'thumb-number';
    number.textContent = pageNumber;

    const image = document.createElement('img');
    image.src = getPageSource(pageNumber);
    image.alt = `Miniatura da página ${pageNumber}`;
    image.loading = 'lazy';
    image.draggable = false;

    thumbnail.append(number, image);
    thumbnail.addEventListener('click', () => goToPage(pageNumber));

    thumbnails.appendChild(thumbnail);
}


// ============================================================
// DIMENSIONAMENTO
// ============================================================

/**
 * Calcula o espaço disponível para o livro.
 */
function getAvailableSpace(reader) {
    const mobile = isMobile();

    return {
        width: mobile ? reader.clientWidth - 16 : reader.clientWidth - 90,
        height: mobile ? reader.clientHeight - 82 : reader.clientHeight - 28
    };
}

/**
 * Calcula as dimensões baseadas no espaço disponível e proporção.
 */
function calculateDimensions(availableSpace, pageRatio, singlePage) {
    let width, height;

    if (singlePage) {
        width = Math.min(availableSpace.width, availableSpace.height * pageRatio);
        height = width / pageRatio;
    } else {
        width = Math.min(availableSpace.width, availableSpace.height * pageRatio * 2);
        height = width / (pageRatio * 2);
    }

    return { width, height };
}

/**
 * Aplica os limites mínimos de dimensão.
 */
function applyMinimumDimensions(width, height) {
    return {
        width: Math.max(CONFIG.book.minWidth, Math.floor(width)),
        height: Math.max(CONFIG.book.minHeight, Math.floor(height))
    };
}

/**
 * Calcula o tamanho do livro baseado no espaço disponível.
 */
function getBookSize() {
    const reader = document.querySelector('.reader');
    const singlePage = getDisplayMode() === 'single';
    const pageRatio = CONFIG.book.pageRatio;

    const availableSpace = getAvailableSpace(reader);
    const dimensions = calculateDimensions(availableSpace, pageRatio, singlePage);

    return applyMinimumDimensions(dimensions.width, dimensions.height);
}


// ============================================================
// INICIALIZAÇÃO DO FLIPBOOK
// ============================================================

function initBook() {
    const size = getBookSize();

    $('#flipbook').turn({
        width: size.width,
        height: size.height,
        display: getDisplayMode(),
        // As páginas já foram criadas no DOM acima; o Turn.js deve contá-las sozinho.
        autoCenter: true,
        acceleration: true,
        gradients: true,
        hover: true,
        cornerSize: CONFIG.book.cornerSize,
        turnCorners: 'tl,tr,bl,br',
        elevation: CONFIG.book.elevation,
        duration: CONFIG.book.duration,
        direction: 'ltr',

        when: {
            turned(event, page) {
                currentPage = page;
                preloadAround(page);
                updateUI(page);
            },
            pressed() {
                suppressNextClick = true;
            },
            released() {
                suppressNextClick = true;
            }
        }
    });

    bookReady = true;
    preloadAround(1);
    updateUI(1);
}


// ============================================================
// PRÉ-CARREGAMENTO
// ============================================================

function preloadAround(page) {
    const range = CONFIG.preload.range;

    for (let pageNumber = page - range; pageNumber <= page + range; pageNumber++) {
        if (pageNumber < 1 || pageNumber > TOTAL_PAGES) {
            continue;
        }
        preloadPage(pageNumber);
    }
}


/**
 * Pré-carrega uma página específica.
 */
function preloadPage(pageNumber) {
    if (preloadCache.has(pageNumber)) {
        return;
    }

    const image = new Image();
    image.decoding = 'async';
    image.src = getPageSource(pageNumber);

    preloadCache.set(pageNumber, image);
}


// ============================================================
// INTERFACE
// ============================================================

/**
 * Valida e normaliza um número de página.
 */
function validatePageNumber(page) {
    return Math.max(1, Math.min(TOTAL_PAGES, Number(page) || 1));
}

function updateUI(page) {
    currentPage = validatePageNumber(page);
    updateActiveThumbnail();
    scrollToActiveThumbnail();
}


/**
 * Atualiza a miniatura ativa.
 */
function updateActiveThumbnail() {
    const allThumbnails = thumbnails.querySelectorAll('.thumb');

    allThumbnails.forEach((thumbnail, index) => {
        const isActive = index + 1 === currentPage;
        thumbnail.classList.toggle('active', isActive);
    });
}


/**
 * Mantém a miniatura ativa visível.
 */
function scrollToActiveThumbnail() {
    const activeThumbnail = thumbnails.querySelector('.thumb.active');

    if (!activeThumbnail) {
        return;
    }

    const listRect = thumbnails.getBoundingClientRect();
    const itemRect = activeThumbnail.getBoundingClientRect();

    const isAbove = itemRect.top < listRect.top + 48;
    const isBelow = itemRect.bottom > listRect.bottom - 12;

    if (isAbove || isBelow) {
        activeThumbnail.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
}


// ============================================================
// NAVEGAÇÃO
// ============================================================

function ensurePageReady(pageNumber) {
    const page = validatePageNumber(pageNumber);
    const node = flipbook?.querySelector(`[data-page="${page}"] img`);
    if (!node) return;
    if (!node.getAttribute('src')) node.src = getPageSource(page);
    node.loading = 'eager';
    node.fetchPriority = 'high';
    node.decoding = 'async';
    preloadPage(page - 1);
    preloadPage(page + 1);
}

function goToPage(page) {
    const targetPage = validatePageNumber(page);
    ensurePageReady(targetPage);

    if (bookReady) {
        $('#flipbook').turn('page', targetPage);
    } else {
        updateUI(targetPage);
    }
}


/**
 * Próxima página.
 */
function nextPage() {
    if (!bookReady) {
        return;
    }
    $('#flipbook').turn('next');
}

/**
 * Página anterior.
 */
function previousPage() {
    if (!bookReady) {
        return;
    }
    $('#flipbook').turn('previous');
}


// ============================================================
// ÁREAS CLICÁVEIS DE NAVEGAÇÃO
// ============================================================

/**
 * Verifica se o clique deve ser ignorado (devido a interações recentes ou elementos específicos).
 */
function shouldIgnoreClick(event) {
    if (!bookReady) {
        return true;
    }

    if (suppressNextClick) {
        suppressNextClick = false;
        return true;
    }

    if (
        event.target.closest('.download') ||
        event.target.closest('.thumb')
    ) {
        return true;
    }

    return false;
}

/**
 * Verifica se o clique está nos cantos inferiores do livro (áreas controladas pelo Turn.js).
 */
function isInBottomCorner(event, flipbookElement) {
    const bookRect = flipbookElement.getBoundingClientRect();
    const localX = event.clientX - bookRect.left;
    const localY = event.clientY - bookRect.top;
    const corner = CONFIG.book.cornerSize;

    const inBottomLeftCorner =
        localX <= corner &&
        localY >= bookRect.height - corner;

    const inBottomRightCorner =
        localX >= bookRect.width - corner &&
        localY >= bookRect.height - corner;

    return inBottomLeftCorner || inBottomRightCorner;
}

/**
 * Determina se o clique foi no lado esquerdo do elemento.
 */
function isClickOnLeftSide(event, element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    return event.clientX < centerX;
}

/**
 * Determina o lado do clique e executa a navegação apropriada.
 */
function handleNavigationClick(event) {
    const flipbookElement = document.getElementById('flipbook');
    const clickedInsideBook = flipbookElement && event.target.closest('#flipbook');

    let leftSide;

    if (clickedInsideBook) {
        if (isInBottomCorner(event, flipbookElement)) {
            return;
        }
        leftSide = isClickOnLeftSide(event, flipbookElement);
    } else {
        const reader = document.querySelector('.reader');
        leftSide = isClickOnLeftSide(event, reader);
    }

    if (leftSide) {
        previousPage();
    } else {
        nextPage();
    }
}

/**
 * Permite avançar/voltar clicando em praticamente qualquer área
 * livre do leitor, inclusive em cima das páginas do catálogo.
 *
 * Os cantos inferiores continuam sendo controlados pelo Turn.js,
 * preservando o efeito de "orelha" já existente.
 */
function initNavigationClickAreas() {
    const reader = document.querySelector('.reader');

    if (!reader) {
        return;
    }

    reader.addEventListener('click', (event) => {
        if (shouldIgnoreClick(event)) {
            return;
        }
        handleNavigationClick(event);
    });
}


// ============================================================
// ZOOM
// ============================================================

const reader = document.querySelector('.reader');

function setZoomStateClasses() {
    if (!reader) {
        return;
    }

    reader.classList.toggle('is-zoomed', zoomLevel > 1.001);
    reader.classList.toggle('is-zooming', pinchActive);
}


function applyZoom(translateX = 0, translateY = 0) {
    flipbook.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${zoomLevel})`;
    setZoomStateClasses();
}


function changeZoom(delta) {
    zoomLevel = Math.max(
        CONFIG.zoom.min,
        Math.min(CONFIG.zoom.max, +(zoomLevel + delta).toFixed(2))
    );

    if (zoomLevel <= 1) {
        zoomLevel = 1;
    }

    applyZoom();
}


function getTouchDistance(touchA, touchB) {

    const dx = touchB.clientX - touchA.clientX;
    const dy = touchB.clientY - touchA.clientY;

    return Math.hypot(dx, dy);
}


function getTouchCenter(touchA, touchB) {

    return {
        x: (touchA.clientX + touchB.clientX) / 2,
        y: (touchA.clientY + touchB.clientY) / 2
    };
}


function resetPinchZoom() {
    pinchActive = false;
    pinchStartDistance = 0;

    if (zoomLevel <= 1.04) {
        zoomLevel = 1;
    }

    flipbook.style.transition = '';
    applyZoom();
}


/**
 * Inicia o estado de zoom por pinça.
 */
function startPinchZoom(event) {
    const touchA = event.touches[0];
    const touchB = event.touches[1];

    pinchActive = true;
    pinchStartDistance = getTouchDistance(touchA, touchB);
    pinchStartZoom = zoomLevel;

    const center = getTouchCenter(touchA, touchB);
    pinchStartCenterX = center.x;
    pinchStartCenterY = center.y;

    const transform = getComputedStyle(flipbook).transform;
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(transform);
        pinchStartTranslateX = matrix.m41;
        pinchStartTranslateY = matrix.m42;
    } else {
        pinchStartTranslateX = 0;
        pinchStartTranslateY = 0;
    }

    flipbook.style.transition = 'none';
    suppressNextClick = true;
    setZoomStateClasses();
}

/**
 * Calcula a nova posição de zoom durante o movimento de pinça.
 */
function calculatePinchZoomPosition(event) {
    const touchA = event.touches[0];
    const touchB = event.touches[1];
    const currentDistance = getTouchDistance(touchA, touchB);

    if (!pinchStartDistance) {
        return null;
    }

    const rawZoom = pinchStartZoom * (currentDistance / pinchStartDistance);
    zoomLevel = Math.max(1, Math.min(CONFIG.zoom.max, rawZoom));

    const center = getTouchCenter(touchA, touchB);
    const rect = flipbook.getBoundingClientRect();

    const localX = pinchStartCenterX - (rect.left + rect.width / 2);
    const localY = pinchStartCenterY - (rect.top + rect.height / 2);
    const scaleDelta = zoomLevel - pinchStartZoom;

    const translateX =
        pinchStartTranslateX +
        (center.x - pinchStartCenterX) -
        (scaleDelta * localX / pinchStartZoom);

    const translateY =
        pinchStartTranslateY +
        (center.y - pinchStartCenterY) -
        (scaleDelta * localY / pinchStartZoom);

    return { translateX, translateY };
}

/**
 * Manipula o movimento de pinça para zoom.
 */
function handlePinchMove(event) {
    const position = calculatePinchZoomPosition(event);
    if (position) {
        applyZoom(position.translateX, position.translateY);
    }
}

/**
 * Finaliza o zoom por pinça.
 */
function finishPinch() {
    if (!pinchActive) {
        return;
    }
    resetPinchZoom();
}

/**
 * Configura os eventos de toque para zoom por pinça.
 */
function initPinchZoom() {
    if (!reader || !flipbook) {
        return;
    }

    reader.addEventListener(
        'touchstart',
        (event) => {
            if (!isMobile() || event.touches.length !== 2) {
                return;
            }
            startPinchZoom(event);
            event.preventDefault();
        },
        { passive: false }
    );

    reader.addEventListener(
        'touchmove',
        (event) => {
            if (!pinchActive || event.touches.length !== 2) {
                return;
            }
            handlePinchMove(event);
            event.preventDefault();
        },
        { passive: false }
    );

    reader.addEventListener('touchend', finishPinch, { passive: false });
    reader.addEventListener('touchcancel', finishPinch, { passive: false });
}


// ============================================================
// TECLADO
// ============================================================

function handleKeyboardNavigation(event) {
    switch (event.key) {
        case 'ArrowRight':
            nextPage();
            break;
        case 'ArrowLeft':
            previousPage();
            break;
        case 'Home':
            goToPage(1);
            break;
        case 'End':
            goToPage(TOTAL_PAGES);
            break;
    }
}

document.addEventListener('keydown', handleKeyboardNavigation);


// ============================================================
// RESPONSIVIDADE
// ============================================================

/**
 * Executa uma operação do Turn.js com tratamento de erro.
 */
function safeTurnOperation(operation, ...args) {
    try {
        $('#flipbook').turn(operation, ...args);
    } catch (error) {
        // Evita quebrar o catálogo durante uma animação.
    }
}

/**
 * Atualiza o tamanho do livro.
 */
function updateBookSize() {
    const size = getBookSize();
    safeTurnOperation('size', size.width, size.height);
}

/**
 * Atualiza o modo de exibição do livro.
 */
function updateBookDisplayMode() {
    const displayMode = getDisplayMode();
    safeTurnOperation('display', displayMode);
}

/**
 * Manipula o redimensionamento da janela.
 */
function handleResize() {
    if (!bookReady) {
        return;
    }

    updateBookSize();
    updateBookDisplayMode();
}

/**
 * Configura o listener de redimensionamento com debounce.
 */
function initResizeHandler() {
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 120);
    });
}


// ============================================================
// CONTROLE EXTERNO — CATEGORIAS DO SITE
// ============================================================
window.addEventListener("message", event => {
    if (window.location.protocol !== "file:" && event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type !== "maxcompany:catalog-page") return;
    const page = validatePageNumber(data.page);
    if (!bookReady) {
        window.setTimeout(() => goToPage(page), 120);
        return;
    }
    goToPage(page);
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================

function initializeCatalog() {
    createPages();
    applyZoom();
    initBook();

    // Deep-link support: product/category pages can open the exact catalog page.
    const requestedPage = Number(new URLSearchParams(window.location.search).get("page"));
    if (Number.isFinite(requestedPage) && requestedPage >= 1 && requestedPage <= TOTAL_PAGES) {
        window.setTimeout(() => goToPage(requestedPage), 120);
    }

    const productName = new URLSearchParams(window.location.search).get("produto");
    if (productName && typeof window.gtag === "function") {
        window.gtag("event", "catalog_product_open", {
            product_slug: productName,
            catalog_page: Number.isFinite(requestedPage) ? requestedPage : 1
        });
    }
    initNavigationClickAreas();
    initPinchZoom();
    initLoader();
    initResizeHandler();
}


initializeCatalog();
