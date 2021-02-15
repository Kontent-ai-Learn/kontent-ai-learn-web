(() => {
    const btn = document.querySelector('[data-click="support"]');
    if (btn) {
        btn.addEventListener('click', () => {
            if (window.Intercom) {
                window.Intercom('show');
            }
        });
    }
})();
