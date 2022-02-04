(() => {
    const toggleLabel = (item) => {
        if (item.value.trim() !== '') {
            item.classList.add('form__input--value');
        } else {
            item.classList.remove('form__input--value');
        }
    };

    const handleLabels = () => {
        const inputs = document.querySelectorAll('.form__input');

        if (inputs.length) {
            inputs.forEach((item) => {
                toggleLabel(item);
                item.addEventListener('blur', () => {
                    toggleLabel(item);
                });
            });
        }
    };

    handleLabels();
})();
