(() => {
    window.helper.fixElem('.aside', 'aside');

    window.addEventListener('scroll', () => {
        window.helper.fixElem('.aside', 'aside');
    }, window.supportsPassive ? { passive: true } : false);

    const asideContainer = document.querySelector('.aside');
    const asideElems = document.querySelectorAll('[data-aside]');

    const moveToAside = () => {
        for (let i = 0; i < asideElems.length; i++) {
            asideContainer.appendChild(asideElems[i]);
        }
    };

    const moveFromAside = () => {
        if (asideContainer && !asideContainer.childNodes.length) {
            return;
        }

        for (let i = 0; i < asideElems.length; i++) {
            const codename = asideElems[i].getAttribute('data-aside');
            const wrapper = document.querySelector(`[data-aside-container="${codename}"]`);
            wrapper.appendChild(asideElems[i]);
        }
    };

    const enableDisableAside = (mql) => {
        if (mql.matches) {
            moveToAside();
        } else {
            moveFromAside();
        }
    };

    const mql = window.matchMedia('(min-width: 1280px)');
    mql.addListener(enableDisableAside);
    enableDisableAside(mql);
})();
