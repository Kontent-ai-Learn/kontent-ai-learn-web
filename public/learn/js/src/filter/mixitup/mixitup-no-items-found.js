(() => {
  const addNoItemsFound = () => {
    const body = document.querySelector('body');
    const div = document.createElement('div');
    div.classList.add('mixitup-container-noitems');
    div.innerHTML = window.UIMessages.noItemsFound;
    const mixitups = document.querySelectorAll('[id^="MixItUp"]');
    for(let i = 0; i < mixitups.length; i++) {
      mixitups[i].appendChild(div);
    }
    
  };

  addNoItemsFound();
})();