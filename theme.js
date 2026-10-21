/* ==========================================================================
   theme.js - the light / dark switch in the navigation bar

   How it fits together:
     - The colours for both themes already exist in styles.css and nav.css as
       @media (prefers-color-scheme: dark) blocks.
     - theme.css takes those same rules and repeats them under
       html[data-theme="dark"], so a click can overrule the operating system.
     - This file only decides which attribute <html> carries and remembers the
       choice in localStorage.

   With no attribute set, the site follows the operating system. Once the user
   clicks the switch, their choice wins until they clear site data.
   ========================================================================== */

(function () {
    'use strict';

    var KEY = 'theme';
    var root = document.documentElement;

    function stored() {
        try {
            var value = localStorage.getItem(KEY);
            return value === 'dark' || value === 'light' ? value : null;
        } catch (e) {
            /* private mode, or storage switched off */
            return null;
        }
    }

    /* the mode actually on screen right now */
    function resolved() {
        var explicit = root.getAttribute('data-theme');
        if (explicit === 'dark' || explicit === 'light') return explicit;

        return window.matchMedia &&
               window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /* the button lives inside nav.html, which parts.js injects, so it does not
       exist yet when this file first runs. parts.js calls updateThemeButton()
       once the nav is in the page. */
    function updateThemeButton() {
        var buttons = document.querySelectorAll('.theme-toggle');

        for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i];
            var dark = resolved() === 'dark';

            button.setAttribute('aria-pressed', String(dark));
            button.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');

            var label = button.querySelector('.theme-toggle-label');
            if (label) label.textContent = dark ? 'Light' : 'Dark';
        }
    }

    function apply(mode) {
        root.setAttribute('data-theme', mode);
        try {
            localStorage.setItem(KEY, mode);
        } catch (e) {}
        updateThemeButton();
    }

    /* the address of the button is unsafe to bind to early: the nav is injected
       later. A document-level listener keeps working whatever arrives. */
    document.addEventListener('click', function (event) {
        var button = event.target.closest('.theme-toggle');
        if (!button) return;

        apply(resolved() === 'dark' ? 'light' : 'dark');
    });

    /* if the operating system theme changes while the page is open and the user
       has never made a choice, follow it */
    if (window.matchMedia) {
        var query = window.matchMedia('(prefers-color-scheme: dark)');
        var onChange = function () {
            if (!stored()) updateThemeButton();
        };

        if (query.addEventListener) query.addEventListener('change', onChange);
        else if (query.addListener) query.addListener(onChange);
    }

    /* the head script already put the saved theme on <html>; this keeps the
       attribute honest if the script order ever changes */
    var saved = stored();
    if (saved) root.setAttribute('data-theme', saved);

    window.updateThemeButton = updateThemeButton;
})();
