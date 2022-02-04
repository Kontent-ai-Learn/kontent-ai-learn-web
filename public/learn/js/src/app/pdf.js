(() => {
    if (!window.helper.getParameterByName('pdf')) return;
    const headings = document.querySelectorAll('.article__content h2, .article__content h3, .article__content h4');

    for (let i = 0; i < headings.length; i++) {
        if (headings[i].parentNode.classList.contains('page-break-prevent')) continue;

        const nextElems = [];
        let sibling = headings[i];

        do {
            if (sibling) {
                sibling = sibling.nextSibling;
            }
            nextElems.push(sibling);
        } while (sibling && sibling.nodeType === 1 && sibling.tagName.startsWith('H') && sibling.tagName.length === 2)

        const div = document.createElement('div');
        div.style.pageBreakInside = 'avoid';
        div.classList.add('page-break-prevent');
        headings[i].insertAdjacentElement('afterend', div);
        div.appendChild(headings[i]);

        for (let j = 0; j < nextElems.length; j++) {
            if (nextElems[j]) {
                div.appendChild(nextElems[j]);
            }
        }
    }
})();
