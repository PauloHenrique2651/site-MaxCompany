/* Runs immediately after the loader markup, before the asynchronous translator. */
(() => {
  const loader = document.getElementById("home-loader");
  if (!loader) return;
  const translations = {
    "pt-BR": ["Carregando experiência MaxCompany", "GRUPO MAXCOMPANY", "DESDE 2009", "À frente do seu tempo.", "PREPARANDO EXPERIÊNCIA", "SUPRIMENTOS · SOLUÇÕES · INDÚSTRIA", "RIO DE JANEIRO · BRASIL · MUNDO"],
    "pt-PT": ["A carregar a experiência MaxCompany", "GRUPO MAXCOMPANY", "DESDE 2009", "À frente do seu tempo.", "A PREPARAR A EXPERIÊNCIA", "FORNECIMENTOS · SOLUÇÕES · INDÚSTRIA", "RIO DE JANEIRO · BRASIL · MUNDO"],
    en: ["Loading the MaxCompany experience", "MAXCOMPANY GROUP", "SINCE 2009", "Ahead of its time.", "PREPARING YOUR EXPERIENCE", "SUPPLIES · SOLUTIONS · INDUSTRY", "RIO DE JANEIRO · BRAZIL · WORLDWIDE"],
    es: ["Cargando la experiencia MaxCompany", "GRUPO MAXCOMPANY", "DESDE 2009", "A la vanguardia de su tiempo.", "PREPARANDO LA EXPERIENCIA", "SUMINISTROS · SOLUCIONES · INDUSTRIA", "RÍO DE JANEIRO · BRASIL · TODO EL MUNDO"],
    de: ["MaxCompany-Erlebnis wird geladen", "MAXCOMPANY GRUPPE", "SEIT 2009", "Seiner Zeit voraus.", "ERLEBNIS WIRD VORBEREITET", "BEDARF · LÖSUNGEN · INDUSTRIE", "RIO DE JANEIRO · BRASILIEN · WELTWEIT"],
    fr: ["Chargement de l’expérience MaxCompany", "GROUPE MAXCOMPANY", "DEPUIS 2009", "En avance sur son temps.", "PRÉPARATION DE VOTRE EXPÉRIENCE", "FOURNITURES · SOLUTIONS · INDUSTRIE", "RIO DE JANEIRO · BRÉSIL · MONDE ENTIER"],
    it: ["Caricamento dell’esperienza MaxCompany", "GRUPPO MAXCOMPANY", "DAL 2009", "In anticipo sui tempi.", "PREPARAZIONE DELL’ESPERIENZA", "FORNITURE · SOLUZIONI · INDUSTRIA", "RIO DE JANEIRO · BRASILE · IN TUTTO IL MONDO"],
    nl: ["MaxCompany-ervaring wordt geladen", "MAXCOMPANY GROEP", "SINDS 2009", "Zijn tijd vooruit.", "ERVARING WORDT VOORBEREID", "BENODIGDHEDEN · OPLOSSINGEN · INDUSTRIE", "RIO DE JANEIRO · BRAZILIË · WERELDWIJD"],
    pl: ["Ładowanie strony MaxCompany", "GRUPA MAXCOMPANY", "OD 2009 ROKU", "Wyprzedzamy swój czas.", "PRZYGOTOWYWANIE STRONY", "ZAOPATRZENIE · ROZWIĄZANIA · PRZEMYSŁ", "RIO DE JANEIRO · BRAZYLIA · CAŁY ŚWIAT"],
    ja: ["MaxCompanyのサイトを読み込み中", "MAXCOMPANYグループ", "2009年創業", "時代の先へ。", "表示の準備中", "資材供給 · ソリューション · 産業", "リオデジャネイロ · ブラジル · 世界各地"],
    "zh-CN": ["正在加载MaxCompany网站", "MAXCOMPANY集团", "始于2009年", "引领时代。", "正在准备", "物资供应 · 解决方案 · 工业", "里约热内卢 · 巴西 · 全球"],
    ko: ["MaxCompany 사이트 로딩 중", "MAXCOMPANY 그룹", "2009년 설립", "시대를 앞서갑니다.", "화면 준비 중", "물자 공급 · 솔루션 · 산업", "리우데자네이루 · 브라질 · 전 세계"],
    ru: ["Загрузка сайта MaxCompany", "ГРУППА MAXCOMPANY", "С 2009 ГОДА", "Опережая своё время.", "ПОДГОТОВКА САЙТА", "СНАБЖЕНИЕ · РЕШЕНИЯ · ПРОМЫШЛЕННОСТЬ", "РИО-ДЕ-ЖАНЕЙРО · БРАЗИЛИЯ · ВЕСЬ МИР"],
    ar: ["جارٍ تحميل موقع MaxCompany", "مجموعة MAXCOMPANY", "منذ 2009", "نسبق عصرنا.", "جارٍ إعداد التجربة", "إمدادات · حلول · صناعة", "ريو دي جانيرو · البرازيل · حول العالم"]
  };
  let language = "pt-BR";
  try { language = window.localStorage.getItem("maxcompany-language") || language; } catch (_) {}
  if (language === "pt") language = "pt-PT";
  if (!Object.prototype.hasOwnProperty.call(translations, language)) language = "pt-BR";
  const copy = translations[language];
  loader.lang = language;
  loader.setAttribute("aria-label", copy[0]);
  [".home-loader__top span:first-child", ".home-loader__top span:last-child", ".home-loader__slogan-text", ".home-loader__status span", ".home-loader__meta span:first-child", ".home-loader__meta span:last-child"].forEach((selector, index) => {
    const element = loader.querySelector(selector);
    element.textContent = copy[index + 1];
    element.dir = "auto";
  });
  const portuguese = language === "pt-BR" || language === "pt-PT";
  loader.querySelector(".home-loader__slogan").hidden = !portuguese;
  loader.querySelector(".home-loader__slogan-text").hidden = portuguese;
  loader.style.visibility = "visible";
})();
