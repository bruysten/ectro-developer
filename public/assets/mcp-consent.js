// Prevent duplicate submissions without changing the selected consent or requiring JavaScript.
for (const form of document.querySelectorAll('[data-mcp-consent]')) {
  let submitting = false;
  form.addEventListener('submit', event => {
    if (submitting) { event.preventDefault(); return; }
    if (!event.submitter) { event.preventDefault(); return; }
    submitting = true;
    const choice = document.createElement('input');
    choice.type = 'hidden'; choice.name = 'decision'; choice.value = event.submitter.value;
    form.append(choice); form.setAttribute('aria-busy', 'true');
    for (const button of form.querySelectorAll('button')) button.disabled = true;
    const status = document.createElement('p');
    status.setAttribute('role', 'status'); status.textContent = 'Freigabe wird gesendet …';
    form.append(status);
  });
  // Back/forward cache restores controls; the server remains responsible for replay protection.
  window.addEventListener('pageshow', () => {
    submitting = false; form.removeAttribute('aria-busy');
    form.querySelector('input[name="decision"][type="hidden"]')?.remove();
    form.querySelector('[role="status"]')?.remove();
    for (const button of form.querySelectorAll('button')) button.disabled = false;
  });
}
