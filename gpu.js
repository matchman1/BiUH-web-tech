/* ==========================================================================
   gpu.js — GPU Explorer 的交互
   ==========================================================================

   把 window.GPUS（来自 data/gpus.js）变成可搜索、可对比的界面。
   行为与 cpu.js 完全一致，只是字段不同：
     搜索框过滤列表 / 品牌筛选 / 选中若干张并排对比

   两个浏览页共用同一套样式（.explorer-*），所以外观规则只有一份，
   见 styles.css 第 [3] 部分。这个文件只负责「翻页、筛选、对比」这些行为。

   数据从哪来
     gpu/deepseek_csv_gpu.txt 已导出成 data/gpus.js（94 条）
     字段：系列、名称、架构、核心代号、核心数、加速频率、显存、显存类型、光追、TDP、发布日期

   主要函数
     brandOf()       由系列名推断厂商（数据里没有厂商列）→ 筛选和表格首行都用它
     matches()       搜索与筛选的判定                    → 被 filtered() 调用
     renderList()    画结果列表（每次 40 条）             → 写入 #gpu-list
     renderCompare() 画对比表，数值列标出更高的一方       → 写入 #gpu-compare-body

   状态只有一个 state 对象：query / brand / shown / picked。
   所有改动都是「改 state → 重新渲染」，没有零散的 DOM 操作。

   对应的 HTML 骨架见 gpu.html，样式见 styles.css 第 [3] 部分。
   ========================================================================== */
(function () {
    'use strict';

    var DATA = window.GPUS || [];

    /* 一次渲染多少行；GPU 一共 94 条，40 条一屏正好 */
    var PAGE = 40;
    /* 三列是表格还能读的上限 */
    var MAX_COMPARE = 3;

    var el = {
        search: document.getElementById('gpu-search'),
        list: document.getElementById('gpu-list'),
        count: document.getElementById('gpu-count'),
        more: document.getElementById('gpu-more'),
        compareBody: document.getElementById('gpu-compare-body'),
        clear: document.getElementById('gpu-clear'),
        brands: document.querySelectorAll('.explorer-brand')
    };

    /* 没有这个浏览器的页面直接退出（例如 CPU 页也引了这个文件时） */
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

    /* 数据里没有厂商列，只能从系列名推断：
       RTX / GTX 是 NVIDIA，RX 是 AMD，Arc 是 Intel。 */
    function brandOf(gpu) {
        var text = (gpu.s || '') + ' ' + (gpu.m || '') + ' ' + (gpu.a || '');

        if (/RTX|GTX|GeForce|Quadro/i.test(text)) return 'NVIDIA';
        if (/RX\b|Radeon/i.test(text)) return 'AMD';
        if (/Arc|Iris|Xe/i.test(text)) return 'Intel';
        return 'Other';
    }

    function dashes(value) {
        return value === undefined || value === null || value === '' ? '\u2014' : value;
    }

    function withUnit(value, unit) {
        if (value === undefined || value === null || value === '') return '\u2014';
        return value + ' ' + unit;
    }

    /* 显存容量是 "16 GB" 或 "8 GB / 16 GB" 这种字符串，
       取第一个数字用来判断大小；展示仍然用原文。 */
    function vramNum(gpu) {
        if (!gpu.v) return null;
        var m = /(\d+(?:\.\d+)?)/.exec(gpu.v);
        return m ? parseFloat(m[1]) : null;
    }

    /* 数值行：这一列哪张卡更高 */
    var SPECS = [
        { label: 'Brand',        text: function (g) { return brandOf(g); } },
        { label: 'Series',       text: function (g) { return dashes(g.s); } },
        { label: 'Architecture', text: function (g) { return dashes(g.a); } },
        { label: 'Die',          text: function (g) { return dashes(g.d); } },
        { label: 'Cores',        text: function (g) { return dashes(g.c); }, num: function (g) { return g.c; } },
        { label: 'Boost clock',  text: function (g) { return withUnit(g.f, 'GHz'); }, num: function (g) { return g.f; } },
        { label: 'VRAM',         text: function (g) { return dashes(g.v); }, num: vramNum },
        { label: 'Memory type',  text: function (g) { return dashes(g.t); } },
        { label: 'Ray tracing',  text: function (g) { return dashes(g.r); } },
        { label: 'TDP',          text: function (g) { return withUnit(g.w, 'W'); } },
        { label: 'Released',     text: function (g) { return dashes(g.y); } }
    ];

    /* ---------------------------------------------------------------------
       筛选逻辑
       --------------------------------------------------------------------- */

    function matches(gpu) {
        if (state.brand !== 'all' && brandOf(gpu) !== state.brand) return false;
        if (!state.query) return true;

        var hay = (gpu.m + ' ' + (gpu.s || '') + ' ' + (gpu.a || '') + ' ' + (gpu.d || '')).toLowerCase();
        /* 每个词都要出现，所以输入 "rtx 4070" 也能找到 4070 Ti */
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
            ? DATA.length.toLocaleString() + ' cards'
            : rows.length.toLocaleString() + ' of ' + DATA.length.toLocaleString();

        if (!rows.length) {
            el.list.innerHTML = '<li class="explorer-empty">No graphics card matches that. ' +
                                'Try a shorter term, or clear the brand filter.</li>';
            el.more.hidden = true;
            return;
        }

        var html = '';
        for (var i = 0; i < slice.length; i++) {
            var gpu = slice[i];
            var picked = state.picked.indexOf(gpu) !== -1;

            html += '<li class="explorer-row">' +
                '<button type="button" class="explorer-pick' + (picked ? ' is-picked' : '') + '"' +
                    ' data-index="' + DATA.indexOf(gpu) + '"' +
                    ' aria-pressed="' + picked + '">' +
                    '<span class="explorer-row-main">' +
                        '<span class="explorer-row-model">' + escapeHtml(gpu.m) + '</span>' +
                        '<span class="explorer-row-meta">' +
                            escapeHtml(brandOf(gpu)) +
                            (gpu.s ? ' \u00b7 ' + escapeHtml(gpu.s) : '') +
                            (gpu.a ? ' \u00b7 ' + escapeHtml(gpu.a) : '') +
                        '</span>' +
                    '</span>' +
                    '<span class="explorer-row-specs">' +
                        (gpu.c ? gpu.c + ' cores' : '') +
                        (gpu.v ? ' \u00b7 ' + escapeHtml(gpu.v) : '') +
                        (gpu.f ? ' \u00b7 ' + gpu.f + ' GHz' : '') +
                    '</span>' +
                '</button>' +
            '</li>';
        }

        el.list.innerHTML = html;
        /* 还剩多少条没显示；到 0 就把按钮彻底藏起来，
           否则会拼出「Show -26 more」这种东西 */
        var remaining = rows.length - state.shown;
        el.more.hidden = remaining <= 0;
        if (remaining > 0) {
            el.more.textContent = 'Show ' + Math.min(PAGE, remaining) + ' more';
        }
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
                '<p class="explorer-compare-empty">Pick a graphics card on the left to start. ' +
                'You can compare up to ' + MAX_COMPARE + ' at once.</p>';
            return;
        }

        var html = '<div class="explorer-table-scroll"><table class="explorer-table"><thead><tr>' +
                   '<th scope="col" class="explorer-table-corner">Spec</th>';

        for (var i = 0; i < picked.length; i++) {
            html += '<th scope="col">' +
                        '<span class="explorer-table-model">' + escapeHtml(picked[i].m) + '</span>' +
                        '<button type="button" class="explorer-table-remove" data-remove="' + i + '"' +
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
        /* 不要越过总数：否则 state.shown 会一直涨，越点越离谱 */
        state.shown = Math.min(state.shown + PAGE, filtered().length);
        renderList();
    });

    /* 整个列表只挂一个监听器：行会被反复重绘，
       逐个绑定等于每次都要重绑一遍 */
    el.list.addEventListener('click', function (event) {
        var button = event.target.closest('.explorer-pick');
        if (!button) return;

        var gpu = DATA[Number(button.getAttribute('data-index'))];
        var at = state.picked.indexOf(gpu);

        if (at !== -1) {
            state.picked.splice(at, 1);
        } else {
            if (state.picked.length >= MAX_COMPARE) {
                /* 顶掉最早选的那个，保证点击永远有反馈 */
                state.picked.shift();
            }
            state.picked.push(gpu);
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
