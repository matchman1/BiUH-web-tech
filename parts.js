// parts.js — 把 HTML 片段插进对应页面里
//
// 原名 nav.js。因为现在要加载两个片段（导航 + 页脚），
// 按教程第 42 页的要求重命名为 parts.js —— 它不再只管 nav 了。
// 改名后记得三个页面的 <script src> 也要跟着改。
//
// ---------------------------------------------------------------------------
// 教程第 42 页的核心：不要写两遍 fetch
//
// 写两遍是这样（第 41 页演示的「重复自己」）：
//   fetch('nav.html').then(...).then(html => {
//     document.getElementById('site-header').innerHTML = html;
//   });
//   fetch('footer.html').then(...).then(html => {
//     document.getElementById('site-footer').innerHTML = html;
//   });
// 两块代码除了两个词之外完全相同。
//
// 所以写成一个函数，用不同的值调用两次：
//   function 描述一次要做的事，file 和 target 是会变的部分。
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
  // 取当前网址的最后一段，例如 "quotes.html"；
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
});
