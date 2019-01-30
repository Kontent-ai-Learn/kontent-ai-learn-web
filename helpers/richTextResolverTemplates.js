const richTextResolverTemplates = {
    embeddedContent: (item) => {
        const templates = {
            youtube: `
                <div class="embed">
                    <iframe class="lazy" width="560" height="315" data-src="https://www.youtube-nocookie.com/embed/${item.id.value}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="">
                    <noscript>
                        <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${item.id.value}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="">
                    </noscript>
                </div>
                <p class="print-only"> 
                    <i>Play video on <a href="https://www.youtube.com/watch?v=${item.id.value}"> https://www.youtube.com/watch?v=${item.id.value}</a></i>
                </p>
                `,
            codepen: `
                <div class="embed">
                    <iframe class="lazy" height="265" scrolling="no" data-src="https://codepen.io/milanlund/embed/${item.id.value}/?height=265&amp;theme-id=0&amp;default-tab=js,result" frameborder="no" allowtransparency="true" allowfullscreen="true"></iframe>
                    <noscript>
                        <iframe height="265" scrolling="no" src="https://codepen.io/milanlund/embed/${item.id.value}/?height=265&amp;theme-id=0&amp;default-tab=js,result" frameborder="no" allowtransparency="true" allowfullscreen="true"></iframe>
                    </noscript>
                </div>
                <p class="print-only"> 
                    <i>See the code example on <a href="https://codepen.io/nathantaylor/pen/${item.id.value}">https://codepen.io/nathantaylor/pen/${item.id.value}</a></i>
                </p>
                `,
            stackblitz: `
                <div class="embed">
                    <iframe class="lazy" data-src="https://stackblitz.com/edit/${item.id.value}?embed=1"></iframe>
                    <noscript>
                        <iframe src="https://stackblitz.com/edit/${item.id.value}?embed=1"></iframe>
                    </noscript>
                </div>
                <p class="print-only"> 
                    <i>See the code example on <a href="https://stackblitz.com/edit/${item.id.value}">https://stackblitz.com/edit/${item.id.value}</a></i>
                </p>
                `
        };

        return templates[item.provider.value[0].codename];
    },
    signpost: (item) => {
        let type = '';
        let listClass = '';

        if (item.type.value[0]) type = item.type.value[0].codename;
        if (type === 'platform_selection') listClass = ' selection--platforms';

        return `
            <section class="presentation__section">
                <h2 class="presentation__heading">${item.title.value}</h2>
                ${item.description.value && item.description.value !== '<p><br></p>' ? '<h3 class="presentation__sub-heading">'+ item.description.value +'</h3>' : ''}
                <ul class="selection${listClass}">
                    ${item.content.value}
                </ul>
            </section>
        `;
    },
    homeLinkToContentItem: (item, urlMap) => {
        let resolvedUrl = '';

        if (item.linked_item[0]) {
            resolvedUrl = urlMap.filter(elem => elem.codename === item.linked_item[0].system.codename)[0].url;
        }

        return `
            <li class="selection__item">
                ${resolvedUrl ? '<a class="selection__link" href="'+ resolvedUrl + '">' : '<div class="selection__link">'}
                    <img class="selection__img" src="${item.image.value[0] ? item.image.value[0].url : 'https://plchldr.co/i/290x168?&amp;bg=ededed&amp;text=Image'}">
                    <div class="selection__title">${item.title.value}</div>
                ${resolvedUrl ? '</a>' : '</div>'}
            </li>
        `;
    },
    callout: (item) => {
        return `
            <div class="callout callout--${item.type.value[0].codename}">
                ${item.content.value}
            </div>`;
    }
};

module.exports = richTextResolverTemplates;