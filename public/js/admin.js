// Auto-fill slug from title on the new-post form, but stop auto-filling
// once the user has manually edited the slug field themselves.
(function () {
  const titleInput = document.getElementById('title-input');
  const slugInput = document.getElementById('slug-input');
  if (!titleInput || !slugInput) return;

  let slugManuallyEdited = slugInput.value.trim().length > 0;

  slugInput.addEventListener('input', () => {
    slugManuallyEdited = true;
  });

  function slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  titleInput.addEventListener('input', () => {
    if (!slugManuallyEdited) {
      slugInput.value = slugify(titleInput.value);
    }
  });
})();
