/**
 * Lazy loading
 */
(() => {
    let lazyloadElems = document.querySelectorAll('.lazy');

    const beLazyOnIntersectionObserver = (flag) => {
        if (flag === 'dnt-excluded') {
            lazyloadElems = document.querySelectorAll('.lazy.lazy--exclude-dnt');
        }

        var elemObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    var elem = entry.target;
                    if (elem.classList.contains('lazy') && elem.hasAttribute('data-src')) {
                        elem.src = elem.dataset.src;
                        elem.classList.remove('lazy');
                        elem.removeAttribute('data-src');
                        if (elem.classList.contains('article__image')) {
                            elem.removeAttribute('style');
                        }
                        elemObserver.unobserve(elem);
                    }
                }
            });
        });

        lazyloadElems.forEach((elem) => {
            elemObserver.observe(elem);
        });
    };

    const handleLazyFallback = (lazyloadElems, lazyload) => {
        var scrollTop = window.pageYOffset;
        lazyloadElems.forEach((el) => {
            const offsetTop = el.offsetTop === 0 ? el.offsetParent.offsetTop : el.offsetTop;

            if (offsetTop < (window.innerHeight + scrollTop)) {
                if (el.classList.contains('lazy') && el.hasAttribute('data-src')) {
                    el.src = el.dataset.src;
                    el.classList.remove('lazy');
                    el.removeAttribute('data-src');
                    if (el.tagName === 'IMG') {
                        el.removeAttribute('style');
                    }
                }
            }
        });
        if (lazyloadElems.length === 0) {
            document.removeEventListener('scroll', lazyload);
            window.removeEventListener('resize', lazyload);
            window.removeEventListener('orientationChange', lazyload);
        }
    };

    const beLazyFallback = (flag) => {
        var lazyloadThrottleTimeout;

        if (flag === 'dnt-excluded') {
            lazyloadElems = document.querySelectorAll('.lazy.lazy--exclude-dnt');
        }

        var lazyload = () => {
            if (lazyloadThrottleTimeout) {
                clearTimeout(lazyloadThrottleTimeout);
            }

            lazyloadThrottleTimeout = setTimeout(() => {
                handleLazyFallback(lazyloadElems, lazyload);
            }, 20);
        }

        lazyload();
        document.addEventListener('scroll', lazyload, window.supportsPassive ? { passive: true } : false);
        window.addEventListener('resize', lazyload);
        window.addEventListener('orientationChange', lazyload);
    };

    // On scroll, check elements with the "lazy" class name and transform their data-src attribute into src
    // Implementation uses IntersectionObserver if is available, otherwise fallbacks to using scroll, resize and orientationChange events
    const loadOnScroll = (flag) => {
        if ('IntersectionObserver' in window) {
            beLazyOnIntersectionObserver(flag);
        } else {
            beLazyFallback(flag);
        }
    };

    const handleLazyEmbed = (target) => {
        // If embed wrapper element child gets clicked, find the parent embed wrapper
        if (!target.classList.contains('embed__dnt-enable')) {
            target = window.helper.getParents(target).filter(item => {
                let isEmbedWrapper = false;
                if (item.classList) {
                    isEmbedWrapper = item.classList.contains('embed__dnt-enable');
                }
                return isEmbedWrapper;
            })[0];
        }

        const el = target.nextElementSibling;
        if (el.classList.contains('lazy') && el.hasAttribute('data-src')) {
            el.src = el.dataset.src;
            el.classList.remove('lazy');
            el.removeAttribute('data-src');
            target.parentNode.nextElementSibling.classList.remove('hidden');
            target.parentNode.removeChild(target);
        }
    };

    const loadOnClick = () => {
        const lazy = document.querySelectorAll('.lazy:not(.lazy--exclude-dnt)');
        const label = window.UIMessages ? window.UIMessages.dntLabel : '';

        lazy.forEach(item => {
            const wrapper = window.helper.getParents(item);
            wrapper[0].insertBefore(window.helper.createElementFromHTML(`<div class="embed__dnt-enable">${window.helper.decodeHTMLEntities(label)}</div>`), wrapper[0].firstChild);
            const btn = item.parentNode.nextElementSibling;

            if (btn.hasAttribute('data-lightbox')) {
                btn.classList.add('hidden');
            }
        });

        document.querySelector('body').addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target && (e.target.matches('div.embed__dnt-enable, div.embed__dnt-enable *'))) {
                e.preventDefault();
                handleLazyEmbed(e.target);
            }
        });
    };

    // Conditionally load stylesheets
    const loadFonts = () => {
        if (document.querySelector('code, pre')) {
            window.helper.addStylesheet('https://fonts.googleapis.com/css?family=Inconsolata');
        }
    };

    // Fire on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        loadFonts();

        // Check if "Do not flag" is enabled in the browser settings
        // If yes, make embeds load on click, otherwise lazyload on scroll
        if (window.doNotTrack || navigator.doNotTrack || navigator.msDoNotTrack) {
            if (window.doNotTrack === '1' || navigator.doNotTrack === 'yes' || navigator.doNotTrack === '1' || navigator.msDoNotTrack === '1') {
                loadOnClick();
                loadOnScroll('dnt-excluded');
            } else {
                loadOnScroll();
            }
        } else {
            loadOnScroll();
        }
    });
})();
