window.initTerminology = () => {
    if (!window.termDefinitions || window.helper.getParameterByName('pdf')) return;

    let activeTooltip;
    let ticking = false;
    const visibleClassName = 'term-tooltip-container--visible';
    const wrapper = document.querySelector('.term-tooltip-container');
    if (!wrapper) return;
    const content = wrapper.querySelector('.term-tooltip-content');
    let termHovered = false;
    let activeTerm = '';
    const terminologyPath = (() => {
        for (let i = 0; i < window.urlMap.length; i++) {
            if (window.urlMap[i].codename === 'terminology') {
                return window.urlMap[i].url;
            }
        }
        return '';
    })();

    // Algorithm for automatic terms recognition and replace for html element
    /*
        const wrapWord = (el, word) => {
            const codename = word.codename;
            const expr = new RegExp(word.term, 'gi');
            const nodes = [].slice.call(el.childNodes, 0);
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                if (node.nodeType === 3) {
                    const matches = node.nodeValue.match(expr);
                    if (matches) {
                        const parts = node.nodeValue.split(expr);
                        for (let n = 0; n < parts.length; n++) {
                            if (n) {
                                const span = el.insertBefore(document.createElement('span'), node);
                                span.classList.add('term-tooltip');
                                span.setAttribute('data-term-codename', codename);
                                span.appendChild(document.createTextNode(matches[n - 1].replace(/\s/g, '\xa0')));
                            }
                            if (parts[n]) {
                                el.insertBefore(document.createTextNode(parts[n]), node);
                            }
                        }
                        el.removeChild(node);
                    }
                } else {
                    wrapWord(node, word);
                }
            }
        }

        const highightTerms = () => {
            const article = document.querySelector('.article__content');
            for (let i = 0; i < window.termDefinitions.length; i++) {
                wrapWord(article, window.termDefinitions[i]);
            }
        };
    */

    const generateAnchor = (text) => {
        return text.toLowerCase().replace(/(<([^>]+)>)/ig, '').replace(/&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});/ig, '').replace(/\W/g, '-').replace(/[-]+/g, '-');
    };

    const handleTooltipTerminologyLinks = (text) => {
        const htmlText = document.createElement('div');
        htmlText.innerHTML = text;
        const terms = htmlText.querySelectorAll('[href^="#term-definition-"]');

        for (let i = 0; i < terms.length; i++) {
            const codename = terms[i].getAttribute('href').replace('#term-definition-', '');
            let anchor = '';

            for (let i = 0; i < window.termDefinitions.length; i++) {
                if (codename === window.termDefinitions[i].codename) {
                    anchor = `#a-${generateAnchor(window.termDefinitions[i].term)}`
                }
            }

            if (anchor) {
                terms[i].setAttribute('href', `${terminologyPath}${anchor}`);
                terms[i].classList.add('term-definition');
            }
        }

        return htmlText.innerHTML;
    };

    const setTooltipContent = (wrapper, content) => {
        content.text = handleTooltipTerminologyLinks(content.text)
        wrapper.innerHTML = `
            <h3 class="term-tooltip__title">${content.term}</h3>
            ${content.text}
        `;
    };

    const setArrowPosition = (wrapper, textLeft, styleLeft, textHalfWidth) => {
        const arrow = wrapper.querySelector('.term-tooltip-arrow');
        arrow.style.left = `${textLeft - styleLeft + textHalfWidth}px`;
    };

    const setTooltipPosition = (text, wrapper, content) => {
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const textSizes = text.getBoundingClientRect();
        const textTop = textSizes.top;
        const textBottom = textSizes.bottom;
        const textLeft = textSizes.left;
        const textRight = vw - textSizes.left;
        const textHalfWidth = textSizes.width / 2;
        const wrapperHalfWidth = (vw > 360 ? 320 : 275) / 2;
        const wrapperHeight = 260;
        const gutterWidth = vw < 480 ? 14 : 16;

        // Horizontal position
        let styleLeft = 0;
        if (wrapperHalfWidth < textLeft && wrapperHalfWidth < textRight) {
            styleLeft = textLeft + textHalfWidth - wrapperHalfWidth;
        } else if (wrapperHalfWidth * 2 >= textRight) {
            styleLeft = vw - gutterWidth * 2 - wrapperHalfWidth * 2;
        } else {
            styleLeft = gutterWidth;
        }

        // Vertical position
        let styleTop = textTop;
        if (wrapperHeight > textTop) {
            styleTop = textBottom;
            wrapper.setAttribute('data-arrow-v', 'top');
        } else {
            styleTop = textTop - wrapperHeight;
            wrapper.setAttribute('data-arrow-v', 'bottom');
        }

        setArrowPosition(wrapper, textLeft, styleLeft, textHalfWidth);

        setTimeout(() => {
            content.scrollTop = 0;
            content.scrollLeft = 0;
        }, 0);

        wrapper.style.top = `${styleTop}px`;
        wrapper.style.left = `${styleLeft}px`;
    };

    const logHoveredTerm = (term) => {
        setTimeout(() => {
            if (window.dataLayer && activeTerm === term && termHovered) {
                window.dataLayer.push({
                    event: 'event',
                    eventCategory: 'term--hover',
                    eventAction: window.filterXSS(decodeURIComponent(term)),
                    eventLabel: window.helper.getAbsoluteUrl()
                });
            }
        }, 1000);
    };

    const initTooltips = () => {
        const terms = document.querySelectorAll('[href^="#term-definition-"]');
        const close = wrapper.querySelector('.term-tooltip-close');
        if (!wrapper && !terms.length) return;

        for (let i = 0; i < terms.length; i++) {
            terms[i].addEventListener('mouseenter', function (e) {
                for (let i = 0; i < window.termDefinitions.length; i++) {
                    if (e.target.getAttribute('href').replace('#term-definition-', '') === window.termDefinitions[i].codename) {
                        activeTooltip = e.target;
                        termHovered = true;
                        activeTerm = window.termDefinitions[i].term;
                        setTooltipContent(content, window.termDefinitions[i]);
                        setTooltipPosition(e.target, wrapper, content);
                        logHoveredTerm(window.termDefinitions[i].term)
                    }
                }
                wrapper.classList.add(visibleClassName);
            });
            terms[i].addEventListener('mouseleave', () => {
                termHovered = false;
                wrapper.classList.remove(visibleClassName);
            });
            terms[i].addEventListener('click', (e) => {
                e.preventDefault();
            });
        }

        close.addEventListener('click', function () {
            wrapper.classList.add('term-tooltip-container--closing');
            wrapper.classList.remove(visibleClassName);
            setTimeout(function() {
                wrapper.classList.remove('term-tooltip-container--closing');
            }, 200);
        })
    };

    const keepTooltipPosition = () => {
        window.addEventListener('scroll', function (e) {
            if (!ticking && activeTooltip) {
                window.requestAnimationFrame(function () {
                    setTooltipPosition(activeTooltip, wrapper, content);
                    ticking = false;
                });

                ticking = true;
            }
        });
    };

    // highightTerms();
    initTooltips();
    keepTooltipPosition();
};
