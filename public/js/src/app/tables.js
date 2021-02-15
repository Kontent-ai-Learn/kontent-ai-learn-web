/**
 * Make tables spread reasonably it the page content
 */
(() => {
    const tables = document.querySelectorAll('table');
    const articleContent = document.querySelector('.article__content');

    // Set a wrapper to all tables
    const wrapTables = () => {
        if (tables.length > 0) {
            tables.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.classList.add('table__wrapper');
                item.parentNode.insertBefore(wrapper, item);
                wrapper.appendChild(item);

                const container = document.createElement('div');
                container.classList.add('table');
                wrapper.parentNode.insertBefore(container, wrapper);
                container.appendChild(wrapper);
            });
        }
    };

    // Force size of table to the very right of the viewport if number of cells if more than 5
    const setWrapperSize = window.helper.debounce(() => {
        if (tables.length > 0) {
            const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const websiteWidth = document.querySelector('main').offsetWidth;
            const contentWidth = articleContent.offsetWidth;
            const tableWidth = contentWidth + (viewportWidth - websiteWidth) / 2;

            tables.forEach(item => {
                const cellCount = item.querySelector('tr').childElementCount;

                if (cellCount >= 6) {
                    item.style.width = `${tableWidth}px`;
                }
            });
        }
    }, 250);

    // If cell count is lower than 6, set a max-size to them to prevent overflowing the table from the website container
    const setCellMaxWidth = () => {
        const contentWidth = articleContent.offsetWidth;

        if (tables.length > 0 && contentWidth > 768) {
            tables.forEach((item, index) => {
                const cellCount = item.querySelector('tr').childElementCount;

                if (cellCount < 6) {
                    const maxWidth = Math.floor(contentWidth / cellCount);
                    item.setAttribute('id', `table-${index}`);
                    item.insertAdjacentHTML('beforebegin', `<style>#table-${index} td{max-width:${maxWidth}px}</style>`);
                }
            });
        }
    };

    if (articleContent) {
        wrapTables();
        setWrapperSize();
        setCellMaxWidth();

        window.addEventListener('resize', setWrapperSize);
    }
})();
