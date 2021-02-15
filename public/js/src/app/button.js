(function () {
    var body = document.querySelector('body');

    var setHoverPosition = function (e) {
        if (e.target && (e.target.matches('.feedback__button') || e.target.matches('.form__button') || e.target.matches('.button') || e.target.matches('.call-to-action'))) {
            var rect = e.target.getBoundingClientRect();
            var top = e.clientY - rect.top;
            var left = e.clientX - rect.left;
            var span = e.target.querySelector('span:last-child');

            if (span) {
                span.style.top = top + 'px';
                span.style.left = left + 'px';
            }
        }
    };

    body.addEventListener('mouseover', function (e) {
        setHoverPosition(e);
    });

    body.addEventListener('mouseout', function (e) {
        setHoverPosition(e);
    });
})();
