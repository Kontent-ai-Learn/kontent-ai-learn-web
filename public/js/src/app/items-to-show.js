(() => {
    const addMoreLessButton = (list) => {
        const node = document.createElement('LI');
        node.classList.add('selection__item');
        node.setAttribute('data-items-more', `${window.UIMessages ? window.UIMessages.showMore : ''}`);
        node.setAttribute('data-items-less', `${window.UIMessages ? window.UIMessages.showLess : ''}`);
        node.setAttribute('data-items-expanded', 'false');
        node.innerHTML = node.getAttribute('data-items-more');
        list.appendChild(node);
    }

    const limitList = (list, elemsToShow) => {
        const children = list.children;

        for (let i = elemsToShow; i < children.length; i++) {
            children[i].setAttribute('data-items-hidden', 'true');
        }

        addMoreLessButton(list);
    };

    const init = () => {
        const lists = document.querySelectorAll('[data-items-to-show]');

        for (let i = 0; i < lists.length; i++) {
            const list = lists[i];
            const elemsToShow = parseInt(list.getAttribute('data-items-to-show'));
            const listChildCount = list.children.length;
            if (isNaN(elemsToShow) || elemsToShow < 0 || listChildCount <= elemsToShow) {
                continue;
            }
            limitList(list, elemsToShow);
        }

        document.querySelector('body').addEventListener('click', (e) => {
            if (e.target && e.target.matches('[data-items-expanded]')) {
                const moreLessButton = e.target;
                const expanded = moreLessButton.getAttribute('data-items-expanded') === 'true';
                const itemsToShow = moreLessButton.parentNode.querySelectorAll('[data-items-hidden]');
                for (let i = 0; i < itemsToShow.length; i++) {
                    itemsToShow[i].setAttribute('data-items-hidden', expanded.toString());
                }
                const btnTextAttr = expanded ? 'more' : 'less';
                moreLessButton.innerHTML = moreLessButton.getAttribute(`data-items-${btnTextAttr}`);
                moreLessButton.setAttribute('data-items-expanded', (!expanded).toString());
            }
        });
    };

    init();
})();
