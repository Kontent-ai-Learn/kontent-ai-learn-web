
/**
 * Shows/hides element with animation when a trigger element is clicked
 * */
(() => {
    // Bind click event to all triggers
    document.querySelectorAll('[data-toggle-trigger]').forEach((item) => {
        item.addEventListener('click', (event) => {
            event.preventDefault();

            // Find target element according to the trigger name
            const toToggle = item.getAttribute('data-toggle-trigger');
            const elemToToggle = document.querySelector(`[data-toggle-target="${toToggle}"]`);

            // Add/remove class names that show/hide target elements
            if (elemToToggle.classList.contains('toggle-active')) {
                item.classList.remove('trigger-active');
                elemToToggle.classList.remove('toggle-active');
            } else {
                item.classList.add('trigger-active');
                elemToToggle.classList.add('toggle-active');

                // In case target contains input, set focus on it
                const input = elemToToggle.querySelector('#nav-search');

                if (input) {
                    setTimeout(() => {
                        input.focus();
                    }, 50);
                }
            }
        });
    });
})();
