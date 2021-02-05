/**
 * Table of contents, heading anchros, copy anchor URL to clipboard
 */

(() => {
    const articleContent = document.querySelector('.article__content');
    const tableOfContentsWrapper = document.querySelector('.table-of-contents__list');
    const tableOfContentsElem = document.querySelector('.table-of-contents');
    const anchorsOnly = document.querySelector('.article__content--anchors-only');
    let affixHeadings;
    let activeHeadingID = '';

    // Scroll to anchor on page load. Init all lazy loading elements to be able to scroll to the correct position
    const requestOnLoad = () => {
        const hash = window.location.href.split('#')[1];

        // Load all lazy elements
        const lazyloadElems = document.querySelectorAll('.lazy');
        lazyloadElems.forEach((elem) => {
            const onload = elem.hasAttribute('data-lazy-onload');
            if (onload || hash) {
                const parent = window.helper.findAncestor(elem, '.embed');
                let dnt;

                if (parent) {
                    dnt = parent.querySelector('.embed__dnt-enable');
                }

                if (!dnt) {
                    elem.src = elem.dataset.src;
                    elem.classList.remove('lazy');
                    elem.removeAttribute('data-src');
                    if (elem.classList.contains('article__image')) {
                        elem.removeAttribute('style');
                    }
                }
            }
        });
    };

    // For all sub-headings create a list cascade representing table of contents and append it to the appropriate element
    const createTableOfContents = () => {
        let headingsSelector = 'h2:not(.table-of-contents__heading):not(.table-of-contents__whatsnext):not(.feedback__heading)';

        if (document.querySelector('[data-display-mode="step-by-step"]')) {
            headingsSelector = 'h2:not(.table-of-contents__heading):not(.feedback__heading)';
        }

        const headings = articleContent.querySelectorAll(headingsSelector);
        let tableOfContents = '';
        let prevHeadingLevel = 2;
        headings.forEach(item => {
            const headingLevel = parseInt(item.tagName.replace('H', ''));

            if (prevHeadingLevel > headingLevel) {
                tableOfContents += '</ul>';
            }

            if (prevHeadingLevel < headingLevel) {
                tableOfContents += '<ul>';
            }

            tableOfContents += `<li><a href="#${item.getAttribute('id')}">${window.helper.encodeHTMLEntities(item.textContent)}</a></li>`;

            prevHeadingLevel = headingLevel;
        });

        tableOfContentsWrapper.innerHTML = tableOfContents;

        if (tableOfContentsWrapper.innerHTML) {
            tableOfContentsElem.classList.add('table-of-contents--render');
        }

        affixHeadings = headings;
    };

    // Scroll to appropriate anchor when a table of content items gets clicked
    const bindSmothScroll = () => {
        const tocs = document.querySelectorAll('.table-of-contents__list');
        for (let i = 0; i < tocs.length; i++) {
            tocs[i].addEventListener('click', (event) => {
                if (event.target && event.target.nodeName === 'A') {
                    event.preventDefault();
                    document.querySelector(event.target.getAttribute('href')).scrollIntoView({
                        block: 'start',
                        behavior: 'smooth'
                    });
                    history.replaceState(undefined, undefined, `${event.target.getAttribute('href')}`);
                }
            });
        }
    };

    const scrollToLinkInSubNavigation = () => {
        const subNavigation = document.querySelector('.sub-navigation');
        const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

        if (!subNavigation || vw < 768) return;

        const currentPath = window.location.pathname;
        const scrollItem = subNavigation.querySelector(`.sub-navigation__link--active[href*="${currentPath}"]`);

        if (!scrollItem) return;

        scrollItem.scrollIntoView({
            block: 'start',
            behavior: 'smooth'
        });
    };

    const toggleItemsFromWithinContentChunks = () => {
        const run = () => {
            let chunks = document.querySelectorAll('[data-platform-chunk]');

            chunks = Array.prototype.slice.call(chunks).filter((chunk) => {
                return chunk.classList.contains('hidden');
            });

            const ids = [];

            chunks.forEach((chunk) => {
                const headings = chunk.querySelectorAll('h2[id]');
                headings.forEach((heading) => {
                    ids.push(heading.getAttribute('id'));
                });
            });

            const tocItems = document.querySelectorAll('.table-of-contents__list li a');
            tocItems.forEach((item) => {
                if (ids.indexOf(item.getAttribute('href').replace('#', '')) > -1) {
                    item.classList.add('hidden');
                } else {
                    item.classList.remove('hidden');
                }
            });
        };

        run();

        document.querySelector('body').addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('language-selector__link')) {
                run();
            }
        });
    };

    const arrayMin = (arr) => {
        let len = arr.length;
        let min = Infinity;
        let minIndex = 0;

        while (len--) {
            if (arr[len][0] < min) {
                min = arr[len][0];
                minIndex = len;
            }
        }

        return arr[minIndex];
    };

    const filterNonHiddenHeadings = (headings) => {
        const nonHidden = [];

        for (let i = 0; i < headings.length; i++) {
            if (!headings[i].parentElement.classList.contains('hidden')) {
                nonHidden.push(headings[i]);
            }
        }

        return nonHidden;
    };

    const getNextHeadingPosition = (nextHeading) => {
        let position;

        if (nextHeading) {
            position = Math.floor(nextHeading.getBoundingClientRect().top);
        } else {
            const body = document.body;
                const html = document.documentElement;
            position = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
        }

        return position;
    };

    const affix = () => {
        let headingsPosition = [];
        if (!(affixHeadings && tableOfContentsElem)) return;

        const affixHeadingsLocal = filterNonHiddenHeadings(affixHeadings);

        for (let i = 0; i < affixHeadingsLocal.length; i++) {
            const nextHeading = affixHeadingsLocal[i + 1];
            const position = getNextHeadingPosition(nextHeading);

            headingsPosition.push([position, affixHeadingsLocal[i].id]);
        }

        const contentOffset = 128; // how many pixels before the heading is right on the top of viewport should the affix nav item get active
        headingsPosition = headingsPosition.filter((item) => item[0] >= contentOffset);
        const topHeading = arrayMin(headingsPosition);

        if (!topHeading) return;

        const active = tableOfContentsElem.querySelector('.active');
        const futureActive = tableOfContentsElem.querySelector(`[href="#${topHeading[1]}"]`);

        if (active) {
            active.classList.remove('active');
        }

        if (futureActive) {
            futureActive.classList.add('active');

            setTimeout(() => {
                if (futureActive.classList.contains('active')) {
                    if (activeHeadingID !== futureActive.getAttribute('href')) {
                        activeHeadingID = futureActive.getAttribute('href');
                        helper.logAnchorUpdate(activeHeadingID);
                    }
                }
            }, 500);
        }
    };

    if (tableOfContentsElem) {
        setTimeout(() => {
            createTableOfContents();
            bindSmothScroll();
            requestOnLoad();
            toggleItemsFromWithinContentChunks();
            scrollToLinkInSubNavigation();
            if (!document.querySelector('[data-display-mode="step-by-step"]')) {
                affix();
                window.addEventListener('scroll', affix, window.supportsPassive ? {
                    passive: true
                } : false);
            }
        }, 0);
    } else if (anchorsOnly) {
        scrollToLinkInSubNavigation();
        requestOnLoad();
    }
})();
