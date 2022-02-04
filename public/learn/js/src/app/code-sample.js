(function () {
    var allSamples = document.querySelectorAll('[data-platform-code]');

    var wrap = function (el) {
        var div = document.createElement('div');
        div.classList.add('code-sample-standalone');
        el.parentNode.insertBefore(div, el);
        div.appendChild(el);
    }

    for (var i = 0; i < allSamples.length; i++) {
        if (!allSamples[i].parentNode.classList.contains('code-samples')) {
            wrap(allSamples[i]);
        }
    }
})();
