# Grupo MaxCompany — SEO + Conversão + Performance

Versão enxuta: a aba **Soluções** apresenta somente categorias. Cada categoria abre diretamente a página correspondente do catálogo digital.

## Conversão
- Formulário → WhatsApp com mensagem completa.
- Eventos GA4: `generate_lead`, `quote_request`, `whatsapp_click`, `phone_click`, `catalog_view`.
- CTA principal prioriza cotação e atendimento comercial.
- Botão flutuante de WhatsApp no desktop e mobile.

## SEO
- SEO concentrado nas páginas institucionais e em Soluções.
- Sitemap sem páginas artificiais de produto.
- JSON-LD Organization, WebSite, BreadcrumbList e CollectionPage.
- Keywords usadas de forma contextual, sem keyword stuffing.

## Performance
- Loading inicial da Home reduzido de 3s para 1,5s.
- Loading do catálogo reduzido de 4,2s para 2,1s.
- Catálogo carregado somente quando necessário.
- Apenas bibliotecas realmente necessárias no flipbook (jQuery + Turn.js).
- Imagens fora da primeira dobra em lazy-load.
- CSS `content-visibility` em seções pesadas.
- Google Analytics carregado após o evento `load`.
- Sem framework ou plugin pesado adicionado ao site principal.

## Estrutura
Home / O Grupo / Cases / Soluções / Indústrias / Contato / Catálogo.


Updated: solutions are category-only; each category scrolls to the embedded catalog and opens the mapped page without navigation. International specialist WhatsApp messages adapt to the selected language.


Final refinement: category cards keep visitors on /solucoes and command the embedded catalog without navigation; product pages are not generated.
