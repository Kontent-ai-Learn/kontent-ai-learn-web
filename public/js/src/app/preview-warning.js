(() => {
    const warning = document.querySelector('.preview-warning');

    if (warning) {
        const links = warning.querySelectorAll('a');

        for (let i = 0; i < links.length; i++) {
            if (links[i].innerHTML === 'live version') {
                const loc = window.location;
                let href = links[i].getAttribute('href');

                if (href.endsWith('/')) {
                    href = href.slice(0, -1);
                }

                links[i].setAttribute('href', href + loc.pathname + loc.search + loc.hash);
            }
        }
    }
})();
