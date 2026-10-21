/* ==========================================================================
   cpu.js - the CPU Explorer interaction

   Turns window.CPUS (data/cpus.js) into a searchable list with a side-by-side
   comparison. This is the browser version of a small desktop app that read the
   same database with Tkinter and sqlite3.

   Three behaviours, all from that app:
     1. filter the list by typing         (a search box)
     2. filter by brand                   (chips)
     3. pick a few CPUs and compare them  (a compare table)
   ========================================================================== */

(function () {
    'use strict';

    var DATA = window.CPUS || [];

    /* how many rows to render at a time; the rest wait behind "Show more" */
    var PAGE = 80;
    /* three columns is as many as fit before the table stops being readable */
    var MAX_COMPARE = 3;

    var el = {
        search: document.getElementById('cpu-search'),
        list: document.getElementById('cpu-list'),
        count: document.getElementById('cpu-count'),
        more: document.getElementById('cpu-more'),
        compareBody: document.getElementById('cpu-compare-body'),
        clear: document.getElementById('cpu-clear'),
        brands: document.querySelectorAll('.cpu-brand')
    };

    /* nothing to do on pages that do not have the explorer */
    if (!el.list || !DATA.length) return;

    var state = {
        query: '',
        brand: 'all',
        shown: PAGE,
        picked: []
    };

    /* ---------------------------------------------------------------------
       helpers
       --------------------------------------------------------------------- */

    /* Same rule as the export script: work the brand out from the name, since
       the database has no brand column of its own. */
    function brandOf(cpu) {
        var text = (cpu.m || '') + ' ' + (cpu.s || '');

        if (/\bIntel\b|Core\b|Xeon|Pentium|Celeron|\bAtom\b|Itanium/i.test(text)) return 'Intel';
        if (/\bAMD\b|Ryzen|Athlon|Threadripper|EPYC|Sempron|Opteron|Turion|Phenom|Duron/i.test(text)) return 'AMD';
        return 'Other';
    }

    function dashes(value) {
        return value === undefined || value === null || value === '' ? '\u2014' : value;
    }

    function withUnit(value, unit) {
        if (value === undefined || value === null || value === '') return '\u2014';
        return value + ' ' + unit;
    }

    /* numeric rows: which CPU wins this column */
    var SPECS = [
        { label: 'Brand',        text: function (c) { return brandOf(c); } },
        { label: 'Series',       text: function (c) { return dashes(c.s); } },
        { label: 'Platform',     text: function (c) { return dashes(c.p); } },
        { label: 'Architecture', text: function (c) { return dashes(c.a); } },
        { label: 'Process',      text: function (c) { return withUnit(c.n, 'nm'); } },
        { label: 'Cores',        text: function (c) { return dashes(c.c); },  num: function (c) { return c.c; } },
        { label: 'Threads',      text: function (c) { return dashes(c.t); },  num: function (c) { return c.t; } },
        { label: 'Base clock',   text: function (c) { return withUnit(c.b, 'GHz'); }, num: function (c) { return c.b; } },
        { label: 'Boost clock',  text: function (c) { return withUnit(c.f, 'GHz'); }, num: function (c) { return c.f; } },
        { label: 'L3 cache',     text: function (c) { return withUnit(c.l, 'MB'); },  num: function (c) { return c.l; } },
        { label: 'TDP',          text: function (c) { return withUnit(c.w, 'W'); } },
        { label: 'Socket',       text: function (c) { return dashes(c.k); } },
        { label: 'Released',     text: function (c) { return dashes(c.r); } },
        { label: 'Graphics',     text: function (c) { return dashes(c.g); } }
    ];

    /* ---------------------------------------------------------------------
       filtering
       --------------------------------------------------------------------- */

    function matches(cpu) {
        if (state.brand !== 'all' && brandOf(cpu) !== state.brand) return false;
        if (!state.query) return true;

        var hay = (cpu.m + ' ' + (cpu.s || '') + ' ' + (cpu.a || '') + ' ' + (cpu.k || '')).toLowerCase();
        /* every word must appear somewhere, so "ryzen 5800" finds 5800X3D */
        return state.query.toLowerCase().split(/\s+/).every(function (word) {
            return hay.indexOf(word) !== -1;
        });
    }

    function filtered() {
        return DATA.filter(matches);
    }

    /* ---------------------------------------------------------------------
       rendering: the list
       --------------------------------------------------------------------- */

    function renderList() {
        var rows = filtered();
        var slice = rows.slice(0, state.shown);

        el.count.textContent = rows.length === DATA.length
            ? DATA.length.toLocaleString() + ' processors'
            : rows.length.toLocaleString() + ' of ' + DATA.length.toLocaleString();

        if (!rows.length) {
            el.list.innerHTML = '<li class="cpu-empty">No processor matches that. ' +
                                'Try a shorter term, or clear the brand filter.</li>';
            el.more.hidden = true;
            return;
        }

        var html = '';
        for (var i = 0; i < slice.length; i++) {
            var cpu = slice[i];
            var picked = state.picked.indexOf(cpu) !== -1;

            html += '<li class="cpu-row">' +
                '<button type="button" class="cpu-pick' + (picked ? ' is-picked' : '') + '"' +
                    ' data-index="' + DATA.indexOf(cpu) + '"' +
                    ' aria-pressed="' + picked + '">' +
                    '<span class="cpu-row-main">' +
                        '<span class="cpu-row-model">' + escapeHtml(cpu.m) + '</span>' +
                        '<span class="cpu-row-meta">' +
                            escapeHtml(brandOf(cpu)) +
                            (cpu.s ? ' \u00b7 ' + escapeHtml(cpu.s) : '') +
                            (cpu.p ? ' \u00b7 ' + escapeHtml(cpu.p) : '') +
                        '</span>' +
                    '</span>' +
                    '<span class="cpu-row-specs">' +
                        (cpu.c ? cpu.c + 'C' : '') +
                        (cpu.t ? '/' + cpu.t + 'T' : '') +
                        (cpu.b ? ' \u00b7 ' + cpu.b + ' GHz' : '') +
                    '</span>' +
                '</button>' +
            '</li>';
        }

        el.list.innerHTML = html;
        el.more.hidden = rows.length <= state.shown;
        el.more.textContent = 'Show ' + Math.min(PAGE, rows.length - state.shown) + ' more';
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ---------------------------------------------------------------------
       rendering: the comparison table
       --------------------------------------------------------------------- */

    function renderCompare() {
        var picked = state.picked;

        el.clear.hidden = picked.length === 0;

        if (!picked.length) {
            el.compareBody.innerHTML =
                '<p class="cpu-compare-empty">Pick a processor on the left to start. ' +
                'You can compare up to ' + MAX_COMPARE + ' at once.</p>';
            return;
        }

        var html = '<div class="cpu-table-scroll"><table class="cpu-table"><thead><tr>' +
                   '<th scope="col" class="cpu-table-corner">Spec</th>';

        for (var i = 0; i < picked.length; i++) {
            html += '<th scope="col">' +
                        '<span class="cpu-table-model">' + escapeHtml(picked[i].m) + '</span>' +
                        '<button type="button" class="cpu-table-remove" data-remove="' + i + '"' +
                            ' aria-label="Remove ' + escapeHtml(picked[i].m) + '">\u00d7</button>' +
                    '</th>';
        }
        html += '</tr></thead><tbody>';

        for (var s = 0; s < SPECS.length; s++) {
            var spec = SPECS[s];
            var best = null;

            if (spec.num) {
                var values = picked.map(spec.num).filter(function (v) {
                    return typeof v === 'number';
                });
                if (values.length > 1) best = Math.max.apply(null, values);
            }

            html += '<tr><th scope="row">' + spec.label + '</th>';
            for (var p = 0; p < picked.length; p++) {
                var raw = spec.text(picked[p]);
                var isBest = best !== null && spec.num(picked[p]) === best;
                html += '<td' + (isBest ? ' class="is-best"' : '') + '>' + raw + '</td>';
            }
            html += '</tr>';
        }

        html += '</tbody></table></div>';
        el.compareBody.innerHTML = html;
    }

    /* ---------------------------------------------------------------------
       events
       --------------------------------------------------------------------- */

    el.search.addEventListener('input', function () {
        state.query = el.search.value.trim();
        state.shown = PAGE;
        renderList();
    });

    for (var b = 0; b < el.brands.length; b++) {
        el.brands[b].addEventListener('click', function (event) {
            for (var i = 0; i < el.brands.length; i++) {
                el.brands[i].classList.remove('is-active');
            }
            event.currentTarget.classList.add('is-active');
            state.brand = event.currentTarget.getAttribute('data-brand');
            state.shown = PAGE;
            renderList();
        });
    }

    el.more.addEventListener('click', function () {
        state.shown += PAGE;
        renderList();
    });

    /* one listener for the whole list: the rows are re-rendered constantly,
       so binding to each button would mean re-binding every time */
    el.list.addEventListener('click', function (event) {
        var button = event.target.closest('.cpu-pick');
        if (!button) return;

        var cpu = DATA[Number(button.getAttribute('data-index'))];
        var at = state.picked.indexOf(cpu);

        if (at !== -1) {
            state.picked.splice(at, 1);
        } else {
            if (state.picked.length >= MAX_COMPARE) {
                /* replace the oldest pick so the click is never a dead end */
                state.picked.shift();
            }
            state.picked.push(cpu);
        }

        renderList();
        renderCompare();
    });

    el.compareBody.addEventListener('click', function (event) {
        var remove = event.target.closest('[data-remove]');
        if (!remove) return;

        state.picked.splice(Number(remove.getAttribute('data-remove')), 1);
        renderList();
        renderCompare();
    });

    el.clear.addEventListener('click', function () {
        state.picked = [];
        renderList();
        renderCompare();
    });

    /* ---------------------------------------------------------------------
       start
       --------------------------------------------------------------------- */

    renderList();
    renderCompare();
})();
