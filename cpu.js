/* ==========================================================================
   cpu.js — CPU Explorer 的交互
   ==========================================================================

   把 window.CPUS（来自 data/cpus.js）变成可搜索、可对比的界面。
   这是桌面版 Tkinter 程序（cpu/cpu_viewer.py）的网页移植，三条行为对应：
     搜索框过滤列表 / 品牌筛选 / 选中若干颗并排对比

   数据从哪来
     cpu/cpus.db 里的数据已导出成 data/cpus.js
     只保留了 30 列里对比用得上的 14 列

   主要函数
     brandOf()       由型号名推断品牌（数据库没有品牌列）→ 筛选和表格首行都用它
     matches()       搜索与筛选的判定                    → 被 filtered() 调用
     renderList()    画结果列表（每次 80 条）             → 写入 #cpu-list
     renderCompare() 画对比表，数值列标出更高的一方       → 写入 #cpu-compare-body

   状态只有一个 state 对象：query / brand / shown / picked。
   所有改动都是「改 state → 重新渲染」，没有零散的 DOM 操作。

   对应的 HTML 骨架见 cpus.html，样式见 styles.css 第 [3] 部分。
   ========================================================================== */
(function () {
    'use strict';

    var DATA = window.CPUS || [];

    /* 一次渲染多少行；其余的藏在「再显示更多」后面 */
    var PAGE = 80;
    /* 三列是表格还能读的上限 */
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

    /* 没有这个浏览器的页面直接退出 */
    if (!el.list || !DATA.length) return;

    var state = {
        query: '',
        brand: 'all',
        shown: PAGE,
        picked: []
    };

    /* ---------------------------------------------------------------------
       小工具函数
       --------------------------------------------------------------------- */

    /* 和导出脚本用同一条规则：数据库没有品牌列，
       所以只能从型号名推断品牌。 */
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

    /* 数值行：这一列哪颗 CPU 更高 */
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
       筛选逻辑
       --------------------------------------------------------------------- */

    function matches(cpu) {
        if (state.brand !== 'all' && brandOf(cpu) !== state.brand) return false;
        if (!state.query) return true;

        var hay = (cpu.m + ' ' + (cpu.s || '') + ' ' + (cpu.a || '') + ' ' + (cpu.k || '')).toLowerCase();
        /* 每个词都要出现，所以输入 "ryzen 5800" 也能找到 5800X3D */
        return state.query.toLowerCase().split(/\s+/).every(function (word) {
            return hay.indexOf(word) !== -1;
        });
    }

    function filtered() {
        return DATA.filter(matches);
    }

    /* ---------------------------------------------------------------------
       渲染：结果列表
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
       渲染：对比表
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
       事件绑定
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

    /* 整个列表只挂一个监听器：行会被反复重绘，
       逐个绑定等于每次都要重绑一遍 */
    el.list.addEventListener('click', function (event) {
        var button = event.target.closest('.cpu-pick');
        if (!button) return;

        var cpu = DATA[Number(button.getAttribute('data-index'))];
        var at = state.picked.indexOf(cpu);

        if (at !== -1) {
            state.picked.splice(at, 1);
        } else {
            if (state.picked.length >= MAX_COMPARE) {
                /* 顶掉最早选的那个，保证点击永远有反馈 */
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
       启动
       --------------------------------------------------------------------- */

    renderList();
    renderCompare();
})();
