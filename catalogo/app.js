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
        range: 2
    },

    loader: {
        duration: 4200
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
    const duration = CONFIG.loader.duration;

    const startTime = performance.now();

    function updateLoader(currentTime) {
        const elapsed = currentTime - startTime;

        const progress = Math.min(
            elapsed / duration,
            1
        );

        const percentage = Math.floor(progress * 100);

        if (loaderPercentage) {
            loaderPercentage.textContent = percentage;
        }

        if (loaderProgressBar) {
            loaderProgressBar.style.width = `${percentage}%`;
        }

        if (progress < 1) {
            requestAnimationFrame(updateLoader);
        }
    }

    requestAnimationFrame(updateLoader);


    // Remove o loading depois da duração configurada.
    setTimeout(() => {
        hideLoader();
    }, duration);
}


/**
 * Esconde o loading.
 */
function hideLoader() {
    if (!loader) {
        return;
    }

    loader.classList.add('is-hidden');

    // Remove do DOM depois da animação.
    setTimeout(() => {
        loader.remove();
    }, 800);
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
const isMobile = () => {
    return window.innerWidth <= CONFIG.mobileBreakpoint;
};


/**
 * Retorna o modo de exibição do flipbook.
 */
const getDisplayMode = () => {
    // No celular em pé, uma página por vez.
    // No celular deitado, usa o mesmo spread do tablet/desktop.
    if (isMobile() && window.innerHeight > window.innerWidth) {
        return 'single';
    }

    return 'double';
};


// ============================================================
// CRIAÇÃO DAS PÁGINAS
// ============================================================

function createPages() {
    for (
        let pageNumber = 1;
        pageNumber <= TOTAL_PAGES;
        pageNumber++
    ) {
        createCatalogPage(pageNumber);
        createThumbnail(pageNumber);
    }
}


/**
 * Cria uma página do catálogo.
 */
function createCatalogPage(pageNumber) {
    const page = document.createElement('div');

    const pageSide =
        pageNumber % 2 === 0
            ? 'page-left'
            : 'page-right';

    page.className = `catalog-page ${pageSide}`;
    page.dataset.page = pageNumber;


    const image = document.createElement('img');

    image.src = getPageSource(pageNumber);
    image.alt = `Página ${pageNumber}`;

    image.draggable = false;
    image.decoding = 'async';


    // Primeiras páginas carregam com prioridade.
    if (pageNumber <= 4) {
        image.fetchPriority = 'high';
    } else {
        image.loading = 'lazy';
    }


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


    // Número da página.
    const number = document.createElement('span');

    number.className = 'thumb-number';

    number.textContent = pageNumber;


    // Imagem.
    const image = document.createElement('img');

    image.src = getPageSource(pageNumber);

    image.alt = `Miniatura da página ${pageNumber}`;

    image.loading = 'lazy';

    image.draggable = false;


    thumbnail.append(
        number,
        image
    );


    thumbnail.addEventListener('click', () => {
        goToPage(pageNumber);
    });


    thumbnails.appendChild(thumbnail);
}


// ============================================================
// DIMENSIONAMENTO
// ============================================================

function getBookSize() {
    const reader = document.querySelector('.reader');

    const mobile = isMobile();
    const singlePage = getDisplayMode() === 'single';

    // No celular as miniaturas ficam sobrepostas na extrema direita
    // e não consomem espaço estrutural do leitor — tanto em pé
    // quanto deitado.
    const availableWidth = mobile
        ? reader.clientWidth - 16
        : reader.clientWidth - 90;

    const availableHeight = mobile
        ? reader.clientHeight - 16
        : reader.clientHeight - 28;

    const pageRatio =
        CONFIG.book.pageRatio;


    let width;
    let height;


    if (singlePage) {

        width = Math.min(
            availableWidth,
            availableHeight * pageRatio
        );

        height =
            width / pageRatio;

    } else {

        width = Math.min(
            availableWidth,
            availableHeight * pageRatio * 2
        );

        height =
            width / (pageRatio * 2);
    }


    width = Math.max(
        CONFIG.book.minWidth,
        Math.floor(width)
    );

    height = Math.max(
        CONFIG.book.minHeight,
        Math.floor(height)
    );


    return {
        width,
        height
    };
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

        pages: TOTAL_PAGES,

        autoCenter: true,

        acceleration: true,

        gradients: true,

        hover: true,

        cornerSize:
            CONFIG.book.cornerSize,

        turnCorners: 'tl,tr,bl,br',

        elevation:
            CONFIG.book.elevation,

        duration:
            CONFIG.book.duration,

        direction: 'ltr',


        when: {

            turned(event, page) {

                currentPage = page;

                preloadAround(page);

                updateUI(page);
            },

            // O Turn.js já trata o arrasto/flip.
            // Marcamos a interação para impedir que o click
            // disparado pelo mouseup faça uma segunda virada.
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
    const range =
        CONFIG.preload.range;


    for (
        let pageNumber = page - range;
        pageNumber <= page + range;
        pageNumber++
    ) {

        if (
            pageNumber < 1 ||
            pageNumber > TOTAL_PAGES
        ) {
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

    image.src =
        getPageSource(pageNumber);


    preloadCache.set(
        pageNumber,
        image
    );
}


// ============================================================
// INTERFACE
// ============================================================

function updateUI(page) {

    currentPage = Math.max(
        1,
        Math.min(
            TOTAL_PAGES,
            Number(page) || 1
        )
    );


    updateActiveThumbnail();

    scrollToActiveThumbnail();
}


/**
 * Atualiza a miniatura ativa.
 */
function updateActiveThumbnail() {

    const allThumbnails =
        thumbnails.querySelectorAll('.thumb');


    allThumbnails.forEach(
        (thumbnail, index) => {

            const isActive =
                index + 1 === currentPage;


            thumbnail.classList.toggle(
                'active',
                isActive
            );
        }
    );
}


/**
 * Mantém a miniatura ativa visível.
 */
function scrollToActiveThumbnail() {

    const activeThumbnail =
        thumbnails.querySelector(
            '.thumb.active'
        );


    if (!activeThumbnail) {
        return;
    }


    const listRect =
        thumbnails.getBoundingClientRect();

    const itemRect =
        activeThumbnail.getBoundingClientRect();


    const isAbove =
        itemRect.top <
        listRect.top + 48;

    const isBelow =
        itemRect.bottom >
        listRect.bottom - 12;


    if (isAbove || isBelow) {

        activeThumbnail.scrollIntoView({
            behavior: 'auto',
            block: 'nearest'
        });
    }
}


// ============================================================
// NAVEGAÇÃO
// ============================================================

function goToPage(page) {

    const targetPage =
        Math.max(
            1,
            Math.min(
                TOTAL_PAGES,
                Number(page) || 1
            )
        );


    if (bookReady) {

        $('#flipbook').turn(
            'page',
            targetPage
        );

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

        if (!bookReady) {
            return;
        }

        // Se o clique veio logo depois de uma interação do Turn.js
        // (pressionar/arrastar/soltar), deixa o próprio flipbook
        // concluir a animação e não executa uma segunda navegação.
        if (suppressNextClick) {
            suppressNextClick = false;
            return;
        }


        // Não interfere no botão de download nem nas miniaturas.
        if (
            event.target.closest('.download') ||
            event.target.closest('.thumb')
        ) {
            return;
        }


        const flipbookElement =
            document.getElementById('flipbook');

        const clickedInsideBook =
            flipbookElement &&
            event.target.closest('#flipbook');


        let leftSide;


        if (clickedInsideBook) {

            // Quando o clique ocorre dentro do catálogo,
            // divide exatamente o livro ao meio.
            const bookRect =
                flipbookElement.getBoundingClientRect();

            const centerX =
                bookRect.left + (bookRect.width / 2);

            leftSide = event.clientX < centerX;


            // O Turn.js já trata os cantos inferiores.
            // Evita que um clique na "orelha" gere duas viradas.
            const localX =
                event.clientX - bookRect.left;

            const localY =
                event.clientY - bookRect.top;

            const corner = CONFIG.book.cornerSize;

            const inBottomLeftCorner =
                localX <= corner &&
                localY >= bookRect.height - corner;

            const inBottomRightCorner =
                localX >= bookRect.width - corner &&
                localY >= bookRect.height - corner;

            if (inBottomLeftCorner || inBottomRightCorner) {
                return;
            }

        } else {

            // Fora do livro, toda a área do leitor funciona como
            // uma grande área de navegação dividida ao meio.
            const readerRect =
                reader.getBoundingClientRect();

            const centerX =
                readerRect.left + (readerRect.width / 2);

            leftSide = event.clientX < centerX;
        }


        if (leftSide) {
            previousPage();
        } else {
            nextPage();
        }
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

    // As miniaturas só ficam disponíveis quando o catálogo voltou
    // ao tamanho normal (zoom 1x).
    reader.classList.toggle(
        'is-zoomed',
        zoomLevel > 1.001
    );

    reader.classList.toggle(
        'is-zooming',
        pinchActive
    );
}


function applyZoom(translateX = 0, translateY = 0) {

    flipbook.style.transform =
        `translate3d(${translateX}px, ${translateY}px, 0) scale(${zoomLevel})`;

    setZoomStateClasses();
}


function changeZoom(delta) {

    zoomLevel = Math.max(
        CONFIG.zoom.min,

        Math.min(
            CONFIG.zoom.max,

            +(
                zoomLevel + delta
            ).toFixed(2)
        )
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

    // Volta exatamente para 1x quando a pinça termina próxima
    // do tamanho original.
    if (zoomLevel <= 1.04) {
        zoomLevel = 1;
    }

    flipbook.style.transition = '';
    applyZoom();
}


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

            const touchA = event.touches[0];
            const touchB = event.touches[1];

            const currentDistance =
                getTouchDistance(touchA, touchB);

            if (!pinchStartDistance) {
                return;
            }

            const rawZoom =
                pinchStartZoom *
                (currentDistance / pinchStartDistance);

            zoomLevel = Math.max(
                1,
                Math.min(
                    CONFIG.zoom.max,
                    rawZoom
                )
            );

            const center = getTouchCenter(touchA, touchB);
            const rect = flipbook.getBoundingClientRect();

            // Mantém o ponto da pinça aproximadamente no mesmo lugar
            // enquanto o catálogo aumenta/diminui.
            const localX =
                pinchStartCenterX -
                (rect.left + rect.width / 2);

            const localY =
                pinchStartCenterY -
                (rect.top + rect.height / 2);

            const scaleDelta =
                zoomLevel - pinchStartZoom;

            const translateX =
                pinchStartTranslateX +
                (center.x - pinchStartCenterX) -
                (scaleDelta * localX / pinchStartZoom);

            const translateY =
                pinchStartTranslateY +
                (center.y - pinchStartCenterY) -
                (scaleDelta * localY / pinchStartZoom);

            applyZoom(translateX, translateY);

            event.preventDefault();
        },
        { passive: false }
    );


    const finishPinch = () => {

        if (!pinchActive) {
            return;
        }

        resetPinchZoom();
    };


    reader.addEventListener('touchend', finishPinch, { passive: false });
    reader.addEventListener('touchcancel', finishPinch, { passive: false });
}


// ============================================================
// TECLADO
// ============================================================

document.addEventListener(
    'keydown',
    (event) => {

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
);


// ============================================================
// RESPONSIVIDADE
// ============================================================

window.addEventListener(
    'resize',
    () => {

        clearTimeout(resizeTimer);


        resizeTimer = setTimeout(
            () => {

                if (!bookReady) {
                    return;
                }


                const size =
                    getBookSize();

                const displayMode =
                    getDisplayMode();


                try {

                    $('#flipbook').turn(
                        'size',
                        size.width,
                        size.height
                    );


                    $('#flipbook').turn(
                        'display',
                        displayMode
                    );

                } catch (error) {

                    // Evita quebrar o catálogo
                    // durante uma animação.
                }

            },
            120
        );
    }
);


// ============================================================
// INICIALIZAÇÃO
// ============================================================

function initializeCatalog() {

    createPages();

    applyZoom();

    initBook();

    initNavigationClickAreas();

    initPinchZoom();

    initLoader();
}


initializeCatalog();