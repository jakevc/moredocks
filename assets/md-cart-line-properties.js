/**
 * Edit line item properties (size, alteration notes) from the cart page.
 *
 * Shopify locks line item properties once an item is in the cart — the only
 * supported way to change them is POST /cart/change.js with the FULL property
 * set for that line. Sending a partial set silently drops the omitted ones,
 * so the form always submits every field it rendered.
 */
(function () {
  'use strict';

  function serialiseProperties(form) {
    var props = {};
    form.querySelectorAll('[name^="properties["]').forEach(function (field) {
      var match = field.name.match(/^properties\[(.+)\]$/);
      if (!match) return;
      props[match[1]] = field.value;
    });
    return props;
  }

  function setBusy(form, busy) {
    form.querySelectorAll('button, select, textarea').forEach(function (el) {
      el.disabled = busy;
    });
  }

  function showError(form, message) {
    var el = form.querySelector('.md-prop-edit__error');
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('.md-prop-edit__toggle');
    if (toggle) {
      var wrap = toggle.closest('.md-prop-edit');
      var form = wrap.querySelector('.md-prop-edit__form');
      var open = form.hidden;
      form.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        var first = form.querySelector('select, textarea');
        if (first) first.focus();
      }
      return;
    }

    var cancel = event.target.closest('.md-prop-edit__cancel');
    if (cancel) {
      var cWrap = cancel.closest('.md-prop-edit');
      var cForm = cWrap.querySelector('.md-prop-edit__form');
      cForm.hidden = true;
      showError(cForm, '');
      var cToggle = cWrap.querySelector('.md-prop-edit__toggle');
      cToggle.setAttribute('aria-expanded', 'false');
      cToggle.focus();
    }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target.closest('.md-prop-edit__form');
    if (!form) return;
    event.preventDefault();

    // Let the browser enforce `required` on the size selects first.
    if (!form.reportValidity()) return;

    var line = form.closest('.md-prop-edit').dataset.line;
    setBusy(form, true);
    showError(form, '');

    fetch(window.Shopify.routes.root + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: Number(line), properties: serialiseProperties(form) }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Cart update failed (' + res.status + ')');
        return res.json();
      })
      .then(function () {
        // Reload rather than patch the DOM: changing properties can make Shopify
        // merge this line with an identical one, which reorders the cart.
        window.location.reload();
      })
      .catch(function (err) {
        setBusy(form, false);
        showError(form, err.message + '. Please try again.');
      });
  });
})();
