// Brand personalisation from the link (?c=name). Nothing client-specific is stored in the repo.
(function () {
  var KEY = 'rc_brand';
  var raw = null;
  try { raw = new URLSearchParams(location.search).get('c'); } catch (e) {}
  if (raw) {
    raw = String(raw).replace(/[^a-zA-Z0-9 &-]/g, '').slice(0, 24).trim();
    try { sessionStorage.setItem(KEY, raw); } catch (e) {}
  } else {
    try { raw = sessionStorage.getItem(KEY); } catch (e) {}
  }
  var personal = !!raw;
  var name = personal ? raw.toUpperCase() : 'Retail Cloud';
  window.RC_BRAND = { name: name, personal: personal, param: personal ? 'c=' + encodeURIComponent(raw) : '' };
  document.documentElement.classList.toggle('is-personal', personal);

  function apply() {
    document.querySelectorAll('[data-brand]').forEach(function (n) { n.textContent = name; });
    if (personal) {
      document.querySelectorAll('a[href]').forEach(function (a) {
        var h = a.getAttribute('href');
        if (!h || /^(https?:|mailto:|#)/.test(h) || h.indexOf('c=') > -1) return;
        var parts = h.split('#');
        parts[0] += (parts[0].indexOf('?') > -1 ? '&' : '?') + window.RC_BRAND.param;
        a.setAttribute('href', parts.join('#'));
      });
    }
    document.title = document.title.replace('{brand}', name);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
