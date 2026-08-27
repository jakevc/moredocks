/**
 * Edit line item properties (size, alteration notes) from the cart page.
 *
 * Two constraints shape this:
 *
 * 1. The cart page is already wrapped in <form id="cart">, and HTML forbids
 *    nested forms — so the editor is a <div> driven by buttons, not a form.
 *    Its fields render `disabled` and are only enabled while the editor is
 *    open, so they stay out of the cart form's validation and submission.
 *
 * 2. POST /cart/change.js REPLACES a line's properties rather than merging,
 *    and wants an explicit quantity. Omitting quantity makes Shopify fall
 *    back to quantity rules and fail with "increments of undefined", so the
 *    line's current quantity is always sent.
 */
(function () {
  'use strict';

  function fields(editor) {
    return editor.querySelectorAll('[name^="properties["]');
  }

  function setEnabled(editor, enabled) {
    fields(editor).forEach(function (el) {
      el.disabled = !enabled;
    });
  }

  function collect(editor) {
    var props = {};
    fields(editor).forEach(function (el) {
      var match = el.name.match(/^properties\[(.+)\]$/);
      if (match) props[match[1]] = el.value;
    });
    return props;
  }

  function currentQuantity(wrap) {
    var row = wrap.closest('.cart-item');
    var input = row && row.querySelector('input[name="updates[]"], .quantity__input');
    var value = input ? parseInt(input.value, 10) : NaN;
    return isNaN(value) || value < 1 ? 1 : value;
  }

  function validate(editor) {
    var ok = true;
    fields(editor).forEach(function (el) {
      if (!ok) return;
      if (!el.checkValidity()) {
        el.reportValidity();
        ok = false;
      }
    });
    return ok;
  }

  function setError(editor, message) {
    var el = editor.querySelector('.md-prop-edit__error');
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  function close(wrap) {
    var editor = wrap.querySelector('.md-prop-edit__form');
    editor.hidden = true;
    setEnabled(editor, false);
    setError(editor, '');
    var toggle = wrap.querySelector('.md-prop-edit__toggle');
    toggle.setAttribute('aria-expanded', 'false');
    return toggle;
  }

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('.md-prop-edit__toggle');
    if (toggle) {
      var wrap = toggle.closest('.md-prop-edit');
      var editor = wrap.querySelector('.md-prop-edit__form');
      if (editor.hidden) {
        editor.hidden = false;
        setEnabled(editor, true);
        toggle.setAttribute('aria-expanded', 'true');
        var first = editor.querySelector('select, textarea');
        if (first) first.focus();
      } else {
        close(wrap).focus();
      }
      return;
    }

    var cancel = event.target.closest('.md-prop-edit__cancel');
    if (cancel) {
      close(cancel.closest('.md-prop-edit')).focus();
      return;
    }

    var save = event.target.closest('.md-prop-edit__save');
    if (!save) return;

    var saveWrap = save.closest('.md-prop-edit');
    var saveEditor = saveWrap.querySelector('.md-prop-edit__form');
    if (!validate(saveEditor)) return;

    var payload = {
      line: Number(saveWrap.dataset.line),
      quantity: currentQuantity(saveWrap),
      properties: collect(saveEditor),
    };

    saveEditor.querySelectorAll('button').forEach(function (b) {
      b.disabled = true;
    });
    setError(saveEditor, '');

    fetch(window.Shopify.routes.root + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.description || body.message || 'Could not update this item');
          return body;
        });
      })
      .then(function () {
        // Reload rather than patch the DOM: changing properties can make Shopify
        // merge this line with an identical one, which reorders the cart.
        window.location.reload();
      })
      .catch(function (err) {
        saveEditor.querySelectorAll('button').forEach(function (b) {
          b.disabled = false;
        });
        setEnabled(saveEditor, true);
        setError(saveEditor, err.message + '. Please try again.');
      });
  });
})();
