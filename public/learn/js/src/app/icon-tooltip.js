(() => {
    var positionTooltips = () => {
        document.querySelectorAll('.icon').forEach((item) => {
            var tooltip = item.querySelector('.icon__tooltip');
            var offsetRight = window.innerWidth - item.getBoundingClientRect().right;

            if (tooltip) {
                tooltip.classList.remove('icon__tooltip--right');
            }

            if (tooltip && offsetRight < 200) {
                tooltip.classList.add('icon__tooltip--right');
            }
        });
    };

    positionTooltips();
    window.addEventListener('resize', positionTooltips);
})();
