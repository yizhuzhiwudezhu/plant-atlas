'use strict';
window.FieldLanguagePreference = (() => {
  const supported = value => typeof value === 'string' && /^(zh|en)$/i.test(value.trim()) ? value.trim().toLowerCase() : null;
  const sitePath = new URL('.', document.currentScript?.src || location.href).pathname;
  const storageKey = 'plant-atlas:reading-language:' + sitePath;

  function resolve({urlLanguage, savedLanguage, languages, language} = {}) {
    const explicit = supported(urlLanguage), saved = supported(savedLanguage);
    if (explicit || saved) return explicit || saved;
    const tags = (Array.isArray(languages) ? languages : [])
      .filter(value => typeof value === 'string' && value.trim())
      .map(value => value.trim().toLowerCase().replaceAll('_', '-'));
    if (!tags.length && typeof language === 'string' && language.trim()) tags.push(language.trim().toLowerCase().replaceAll('_', '-'));
    const valid = tags.filter(value => /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/.test(value));
    for (const tag of valid) {
      const match = supported(tag.split('-')[0]);
      if (match) return match;
    }
    return valid.length ? 'en' : 'zh';
  }
  function remember(value) {
    const choice = supported(value);
    if (!choice) return;
    try { localStorage.setItem(storageKey, choice); } catch { /* Reading still works when browser storage is unavailable. */ }
  }
  function languageURL(value) {
    const url = new URL(location.href);
    const choice = supported(value);
    if (choice) url.searchParams.set('lang', choice);
    return url;
  }
  let savedLanguage, languages, language;
  try { savedLanguage = localStorage.getItem(storageKey); } catch {}
  try { languages = navigator.languages; language = navigator.language; } catch {}
  const current = resolve({urlLanguage:new URL(location.href).searchParams.get('lang'), savedLanguage, languages, language});
  // Only an explicit choice in a language switch changes future visits.
  document.addEventListener?.('click', event => {
    const link = event.target?.closest?.('a[data-lang]');
    if (link && !event.defaultPrevented) remember(link.dataset.lang);
  });
  return {current, resolve, remember, languageURL};
})();
