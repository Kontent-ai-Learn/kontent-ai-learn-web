/**
 * Article sub-navigation
 */
(() => {
    const actionOnToggleNavItem = (event) => {
        event.preventDefault();

        if (event.target.classList.contains('sub-navigation__link--active')) {
            event.target.classList.remove('sub-navigation__link--active');
        } else {
            event.target.classList.add('sub-navigation__link--active');
        }
    };

    const toggleNavItem = () => {
        const item = document.querySelector('.sub-navigation');

        if (item) {
            item.addEventListener('click', event => {
                if (event.target && event.target.classList.contains('sub-navigation__link--collapse')) {
                    actionOnToggleNavItem(event);
                }
            });
        }
    };

    toggleNavItem();
    window.helper.fixElem('.sub-navigation.sub-navigation--parent', 'sub-navigation');

    window.addEventListener('scroll', () => {
        window.helper.fixElem('.sub-navigation.sub-navigation--parent', 'sub-navigation');
    }, window.supportsPassive ? { passive: true } : false);
})();
