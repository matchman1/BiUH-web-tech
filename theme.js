/* ==========================================================================
   theme.js — 导航栏里的浅色 / 深色开关
   ==========================================================================

   分工
     颜色     在 theme.css 里；深色规则写了两组（跟随系统的、手动选择的）
     状态     在这里：给 <html> 设 data-theme 并记进 localStorage
     按钮外观 aria-pressed 决定显示月亮还是太阳       → nav .theme-toggle

   判断「现在是不是深色」的唯一入口是 resolved()：
     有 data-theme 就用它 → 否则问操作系统 → 都没有则按浅色。
     按钮标签与图标都由它推出，所以不会出现「显示太阳但页面是深色」。

   防白屏
     深色模式下如果等 JS 跑到最后才上色，页面会先闪一下白。
     四个页面的 <head> 里各有一小段内联脚本，在首次绘制前就把属性设好：
       这段内联脚本在 index.html 的 <head> 里   → savedTheme

   按钮在哪
     按钮本身在 nav.html 里                          → class="theme-toggle"
     注入完成后由 parts.js 调用 updateThemeButton()  → window.updateThemeButton
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
            /* 隐私模式，或者存储被禁用 */
            return null;
        }
    }

    /* 此刻屏幕上真正生效的模式 */
    function resolved() {
        var explicit = root.getAttribute('data-theme');
        if (explicit === 'dark' || explicit === 'light') return explicit;

        return window.matchMedia &&
               window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /* 按钮在 nav.html 里，由 parts.js 注入，本文件首次运行时
       它还不存在。parts.js 会在导航进页面后
       调用 updateThemeButton()。 */
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

    /* 不能一开始就给按钮绑事件：导航是后注入的。
       挂在 document 上的监听器则不受影响。 */
    document.addEventListener('click', function (event) {
        var button = event.target.closest('.theme-toggle');
        if (!button) return;

        apply(resolved() === 'dark' ? 'light' : 'dark');
    });

    /* 页面开着时如果系统主题变了、而用户
       从没手动选过，就跟着变 */
    if (window.matchMedia) {
        var query = window.matchMedia('(prefers-color-scheme: dark)');
        var onChange = function () {
            if (!stored()) updateThemeButton();
        };

        if (query.addEventListener) query.addEventListener('change', onChange);
        else if (query.addListener) query.addListener(onChange);
    }

    /* head 里的内联脚本已把保存的主题设到 <html> 上；
       这里再设一次，防止脚本顺序变动导致不一致 */
    var saved = stored();
    if (saved) root.setAttribute('data-theme', saved);

    window.updateThemeButton = updateThemeButton;
})();
