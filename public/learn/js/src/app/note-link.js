(() => {
  const initSingleNoteLink = (noteLink) => {
    if (!noteLink) return;

    const close = document.createElement('DIV');
    close.setAttribute('data-note-link-close', '');
    close.addEventListener('click', () => {
      noteLink.setAttribute('data-note-link', '');
    });
    noteLink.appendChild(close);
    noteLink.setAttribute('data-note-link', 'active');
  };

  const initNoteLinks = () => {
    const noteLinks = document.querySelectorAll('[data-note-link]');

    for(let i = 0; i < noteLinks.length; i++) {
      initSingleNoteLink(noteLinks[i]);
    }
  };

  initNoteLinks();
})();