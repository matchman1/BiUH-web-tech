/* ==========================================================================
   parts.js — 把 HTML 片段注入页面
   ==========================================================================

   问题  四个页面都有导航和页脚。每个页面复制一份 HTML，改一个链接就要改四处。
   做法  把公共部分抽成 nav.html / footer.html，每个页面只留两个空占位元素，
        由这里的 load() 填进去。

   注入目标
     nav.html    → #site-header    见 index.html / slogans.html / cpus.html / contact.html
     footer.html → #site-footer

   注入完成后还做两件事
     1 给当前页对应的链接加 .active                        → 见下方 navReady.then()
     2 调用 window.updateThemeButton()                     → updateThemeButton
       因为深色开关按钮就在刚注入的 nav.html 里，
       在它存在之前 theme.js 找不到按钮。

   注意 fetch 在 file:// 下会被浏览器的 CORS 规则拦掉，
        所以必须通过本地服务器打开 —— 见 README.md「快速开始」。
   ========================================================================== */

// ---------------------------------------------------------------------------
// 为什么写成一个函数，而不是写两遍 fetch
//
// 教程（1.pdf 第 41 页）演示过「重复自己」的写法：加载 nav.html 一段 fetch，
// 加载 footer.html 又一段 fetch，两块代码除了文件名和目标元素之外完全相同。
//
// 所以抽成函数 —— 描述一次要做的事，file 和 target 是会变的部分：
//     load('nav.html',    'site-header');
//     load('footer.html', 'site-footer');
// ---------------------------------------------------------------------------

function load(file, target) {
  // 返回 promise，外面的 .then 才能知道它加载完了
  return fetch(file)
    .then((r) => r.text())
    .then((html) => {
      document.getElementById(target).innerHTML = html;
      return html;
    });
}

// 两个空元素，两个片段，一个脚本。
// 注意：nav.html 只请求这一次 —— 下面直接用 navReady 复用同一个 promise，
//       高亮逻辑接在它后面，不会造成第二次 fetch
var navReady = load('nav.html', 'site-header');
load('footer.html', 'site-footer');

// ---------------------------------------------------------------------------
// 附加：给当前页的链接加高亮（教程之外多出来的一小段）
// 必须等 nav.html 注入完成后再跑，否则 nav .links 还不存在，会选不到元素
// ---------------------------------------------------------------------------

navReady.then(function () {
  // 取网址最后一段，例如 "slogans.html"；
  // 直接用 file:// 或 http:// 打开根目录时最后一段可能是空，兜底成 "index.html"
  var current = location.pathname.split('/').pop() || 'index.html';

  // 1) 中间的文字链接：命中就加 .active
  var links = document.querySelectorAll('nav .links a');
  for (var i = 0; i < links.length; i++) {
    if (links[i].getAttribute('href') === current) {
      links[i].classList.add('active');
    }
  }

  // 2) 最右边的 Contact 药丸：不在 .links 里，单独判一次
  var pill = document.querySelector('nav .pill');
  if (pill && pill.getAttribute('href') === current) {
    pill.classList.add('active');
  }

  // 3) 深色模式按钮也在 nav.html 里，同样要等注入完成才存在。
  //    theme.js 定义了 window.updateThemeButton，这里调用它把图标和标签
  //    同步成当前真正的主题（跟随系统 或 用户上次的选择）。
  if (window.updateThemeButton) {
    window.updateThemeButton();
  }
});
