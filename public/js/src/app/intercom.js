(() => {
    const btn = document.querySelector('[data-click="support"]');
    if (btn) {
        btn.addEventListener('click', (e) => {
            if (window.Intercom) {
                e.preventDefault();
                window.Intercom('show');
            }
        });
    }
})();
