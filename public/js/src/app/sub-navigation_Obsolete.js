/**
 * Article sub-navigation
 */
(() => {
    // On click 2nd level of the sub-navigation make the 3rd level collapse
    const actionOnLevel2 = (event) => {
        var isLevel3 = false;

        window.helper.getParents(event.target).forEach(item => {
            if (item && item.classList && item.classList.contains('sub-navigation--level-3')) {
                isLevel3 = true;
            }
        });

        if (!isLevel3) {
            event.preventDefault();

            if (event.target.classList.contains('sub-navigation__link--active')) {
                event.target.classList.remove('sub-navigation__link--active');
            } else {
                event.target.classList.add('sub-navigation__link--active');
            }
        }
    };

    const toggleLevel2 = () => {
        const level2 = document.querySelector('.sub-navigation--level-2');

        if (level2) {
            level2.addEventListener('click', event => {
                if (event.target && event.target.classList.contains('sub-navigation__link')) {
                    actionOnLevel2(event);
                }
            });
        }
    };

    toggleLevel2();
    window.helper.fixElem('.sub-navigation.sub-navigation--level-1', 'sub-navigation');

    window.addEventListener('scroll', () => {
        window.helper.fixElem('.sub-navigation.sub-navigation--level-1', 'sub-navigation');
    }, window.supportsPassive ? { passive: true } : false);
})();
