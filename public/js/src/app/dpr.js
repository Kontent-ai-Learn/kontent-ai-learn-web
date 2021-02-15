(() => {
    const dpr = Math.round((parseFloat(window.devicePixelRatio) || 1) * 100) / 100;
    const dprImages = document.querySelectorAll('[data-dpr][data-src]');
    const dprIcons = document.querySelectorAll('[data-dpr][data-icon]');

    for (let i = 0; i < dprImages.length; i++) {
        const src = dprImages[i].getAttribute('data-src');

        if (src.indexOf('.gif') > -1) continue;

        const qsSeparator = src.indexOf('?') > -1 ? '&' : '?';
        dprImages[i].setAttribute('data-src', `${src}${qsSeparator}dpr=${dpr}`);
    }

    for (let i = 0; i < dprIcons.length; i++) {
        const src = dprIcons[i].getAttribute('data-icon');
        const qsSeparator = src.indexOf('?') > -1 ? '&' : '?';
        dprIcons[i].setAttribute('data-icon', `${src}${qsSeparator}dpr=${dpr}`);
    }
})();
