# BiUH-web

一个手写的静态网站练习项目：四个页面 + 一个由 JavaScript 注入的共享导航与页脚。

风格是极简：近白底色、墨黑文字、只用 1px 发丝线做分隔，没有圆角卡片和阴影。带深色模式。

---

## 快速开始

### 必须先起本地服务器

**不能直接双击 `index.html` 打开。**

页面里的导航和页脚是用 `fetch()` 从 `nav.html` / `footer.html` 取回来再插进去的，而浏览器出于安全规则**禁止 `file://` 页面用 `fetch` 读取磁盘上的其他文件**（CORS 跨源限制）。直接双击打开的话，页面能显示，但**导航和页脚会是空的**，控制台报错。

所以必须通过 HTTP 访问：

| 方式 | 操作 | 停止 |
|---|---|---|
| **`serve.bat`**（日常推荐） | 双击，会弹出一个黑窗口 | 关掉那个窗口 |
| **`serve-hidden.vbs`** | 双击，完全后台运行，无窗口 | 双击 `stop-server.bat` |

两种方式都会在本机 `8000` 端口提供服务，打开地址：

```
http://127.0.0.1:8000/index.html
```

> `serve.bat` 的窗口就是服务器本身，**浏览期间要保持开着**。
> 只监听 `127.0.0.1`，局域网内其他设备访问不到，这是有意的。

如果嫌每次开机都要手动点，可以把 `serve-hidden.vbs` 的快捷方式放进启动文件夹（`Win+R` 输入 `shell:startup`）。

---

## 目录结构

```
BiUH-web/
├── index.html         首页
├── quotes.html        语录页（8 条语录）
├── project.html       项目想法页
├── contact.html       联系页
│
├── nav.html           导航片段   ← 不含 DOCTYPE/html/head/body
├── footer.html        页脚片段   ← 同上
├── parts.js           把上面两个片段注入到四个页面里
│
├── styles.css         四个页面的样式（按页面分成五部分，见下）
├── nav.css            导航 + 页脚样式（四页共用的组件）
│
├── serve.bat          启动本地服务器（有窗口）
├── serve-hidden.vbs   启动本地服务器（无窗口）
├── stop-server.bat    停止服务器
├── stop-server.ps1    停止服务器的实际逻辑
│
├── verify-parts.mjs   校验片段注入链路（Node 脚本，见下）
│
├── bilibili.jpg       首页配图
├── xlm.jpg            网站图标 / 行内小图
├── w3.png             （目前未被引用）
│
├── backup/            历史版本备份
├── .pdfwork/          PDF 渲染出的临时图片
└── 1.pdf              教程原文
```

---

## 核心机制：片段注入

这是整个项目的关键设计，也是它需要一个 HTTP 服务器的唯一原因。

### 问题

四个页面有相同的导航栏和页脚。如果每个页面都复制一份 HTML，那么「改一个链接」就要改四个文件。

### 做法

**第一步 —— 把公共部分抽成独立片段。** `nav.html` 和 `footer.html` **故意不带** `DOCTYPE` / `html` / `head` / `body`，因为它们不是完整页面，而是被嵌入的「零件」：

```html
<!-- nav.html -->
<nav>
    <a class="logo" href="index.html">…</a>
    <ul class="links">
        <li><a href="index.html">Home</a></li>
        <li><a href="quotes.html">Quotes</a></li>
        <li><a href="project.html">Project</a></li>
    </ul>
    <a class="pill" href="contact.html" target="_blank" rel="noopener">Contact</a>
</nav>
```

**第二步 —— 每个页面留一个空的占位元素。**

```html
<header id="site-header"></header>
…页面正文…
<footer id="site-footer"></footer>
<script src="parts.js"></script>
```

脚本放在 `</body>` 之前，这样运行时两个占位元素已经存在了。

**第三步 —— 一个函数加载两种片段。**

`parts.js` 的核心是一个函数，用不同的参数调用两次：

```js
function load(file, target) {
  return fetch(file)
    .then((r) => r.text())
    .then((html) => {
      document.getElementById(target).innerHTML = html;
      return html;
    });
}

var navReady = load('nav.html', 'site-header');
load('footer.html', 'site-footer');
```

不用把它写成两遍 `fetch` —— 两段代码除了两个词以外完全相同，那就是重复。

### 好处

**加一个新页面时，只需要在它里面写两行占位元素 + 一行 script，导航和页脚自动就有。** 改导航也只用改 `nav.html` 一个文件。

### 当前页高亮

`parts.js` 在后面多了一小段（教程之外的附加功能）：读取当前网址的最后一段，和链接的 `href` 比对，命中的链接加上 `.active` 类，由 CSS 渲染成常驻下划线。

它接在 `navReady` 这个 promise 后面执行 —— 必须等导航注入完成，否则 `nav .links` 还不存在，会选不到元素。这样写也保证 `nav.html` 只被请求一次。

---

## CSS 的组织方式

样式分成两个文件，划分标准是**「谁用」**：

### `styles.css` —— 页面自己的样式

按页面分成五部分，每部分开头有大标题：

| 部分 | 负责 | 类名前缀 |
|---|---|---|
| 第一部分 | index.html 首页 | `.index-*` |
| 第二部分 | quotes.html 语录页 | `.quotes-*` 和 `.q` |
| 第三部分 | project.html 项目页 | `.project-*` |
| 第四部分 | contact.html 联系页 | `.contact-*` |
| 第五部分 | 深色模式 | 四页共用 |

四个页面的类名**完全不交叉**，每个页面的 `<body>` 带一个独立的作用域类：

```html
<body class="index">          <!-- 首页 -->
<body class="quotes-page">    <!-- 语录页 -->
<body class="project-page">   <!-- 项目页 -->
<body class="contact-page">   <!-- 联系页 -->
```

所以改首页样式时只看第一部分，不会影响别的页面。

### `nav.css` —— 四个页面共用的组件

放导航栏和页脚的样式。

**为什么不写进 `styles.css`？** 因为它们要被四个页面共享。曾经 `project.html` 用的是另一个 CSS 文件（`styles-dd.css`），把共享样式写进任何一个页面自己的文件里，都会漏掉另一个页面。所以单独一个文件，四个页面都 `<link>` 它。

导航栏的布局要点：`.links` 用 `margin-left: auto` 吃掉 logo 之后的全部空余空间，把链接和 Contact 按钮一起推到右边；`nav` 容器上**故意不写** `gap` 和 `justify-content`，避免空间被切成两块导致链接停在中间。

---

## 校验脚本

`verify-parts.mjs` 是一个离线校验脚本，用 Node 原生读文件模拟 `fetch`、用轻量 DOM 模拟浏览器 API，逐页执行 `parts.js` 并检查结果。**不需要服务器**。

```bash
node verify-parts.mjs
```

它检查：

- 两个片段是否只含 `<nav>` / 内容，没有混进 `DOCTYPE`、`<html>`、`<body>`
- `nav.html` 的 SVG `xmlns` 是否是标准 `http://` 值（写成 `https://` 会导致不渲染）
- `<li>` 是否正确地包住了 `<a>`
- `parts.js` 是否写成了 `load(file, target)` 函数、两个片段是否各只请求一次
- 四个页面是否各自注入了导航和页脚
- 当前页高亮的判定是否正确（含 `contact.html` 时药丸高亮、链接不高亮）
- 四个页面的占位元素和 `<script>` 是否齐全、位置是否在 `</body>` 前

改完导航或页脚后跑一下，比手动开浏览器点要快。

---

## 开发时踩过的坑

这些都是实际调试中遇到的，记下来避免重复。

### 1. HTML 的 `width` 属性会盖掉 CSS

`<img src="x.jpg" width="200">` 里的 `width` 属性在层叠里的优先级**高于外部 CSS**，所以 CSS 里怎么改 `.index-hero { width: … }` 都不生效。图片尺寸只在一个地方定义：CSS。HTML 里不要写 `width`。

### 2. 图片不转 `display: block` 就不能用 `margin: auto` 居中

`<img>` 默认是 `inline` 元素，`margin: 0 auto` 对它无效。

### 3. PowerShell 5.1 读取非 ASCII 脚本会出错

`.ps1` 文件如果是 UTF-8 但**不带 BOM**，且里面有中文，PowerShell 5.1 会按 ANSI 解析，导致莫名其妙的语法错误（`Unexpected token '}'`）。解决办法：脚本保持纯 ASCII，或者存成带 BOM 的 UTF-8。

### 4. 批处理的 `for /f` 不要用来解析 netstat

在 `for /f "..."` 的**引号内部**，转义后的 `^|` 不按预期工作，结果是静默失败。`stop-server.bat` 第一版就是这样：服务器明明在跑，它却报「Nothing was listening」。所以解析改由 PowerShell 做。

### 5. `Get-NetTCPConnection` 有时查不到正在监听的端口

在这台机器上遇到过它返回空值且不报错的情况。`stop-server.ps1` 改成解析 `netstat -ano` 的文本，稳定可靠。

### 6. JS 不要写进 CSS 文件

`styles.css` 里一度混进了一段 `fetch(...)` 调用。CSS 解析器遇到这种语法会在那里断掉，**该位置之后的所有规则全部失效**（包括深色模式）。JS 归 `.js`，CSS 归 `.css`。

### 7. 共享组件的样式不要写进单个页面的 CSS

`#site-footer` 的样式一度被写进 `styles.css`。但页脚是四个页面共用的组件，而曾经 `project.html` 用的是另一个 CSS 文件（`styles-dd.css`），写在 `styles.css` 里就漏掉了那一页。**判断标准是「谁用」：一个页面用 → `styles.css` 对应部分；多页共用 → `nav.css`。**

---

## 页面内容

| 页面 | 内容 |
|---|---|
| **index.html** | 标题、`bilibili.jpg` 配图（链接到 bilibili）、两个入口链接分别指向 quotes 和 project |
| **quotes.html** | 8 条名人语录（Žižek、中本聪、Tolle、McLuhan ×2、Virilio、Eatock、Engelbart），用 `auto-fit` 网格 + 1px 发丝线排布 |
| **project.html** | 项目想法列表（Catastagram、Teethbrush、Vegasushi、ChatGrandma、Where's Bike?）和一个 `<dl>` 名词解释 |
| **contact.html** | 联系方式列表（Email / GitHub / Location），从导航的药丸按钮以新标签页打开 |

### `project.html` 里还是占位文字

`<dl>` 里的 `AAAAAA` / `sdfygdyugf` 之类是占位内容，需要替换成真实描述。

---

## 待办 / 可讨论的地方

- **导航栏布局与教程说明不一致。** `1.pdf` 第 44 页的复习要点写的是 `logo left, nav centred, action right`（logo 左、**导航居中**、按钮右），但当前实现是 logo 左、**导航右**。若要改成居中，需要调整 `nav.css` 里 `.links` 的 `margin-left: auto`。
- **`w3.png` 未被引用。** 首页配图已经从它换成了 `bilibili.jpg`。
- **`styles.css` 末尾有一条 `nav a:hover { color: red; }`。** 它是全局的，会盖掉 `nav.css` 里导航链接的悬停变色。如果是试验代码，建议删掉。
- **`footer.html` 里的邮箱是占位符** `liwei@example.com`，应换成真实邮箱。
- **favicon 不符合期末要求。** 四个页面现在是 `<link rel="icon" href="xlm.jpg" type="image/png">`，但 `xlm.jpg` 实际是 **JPEG** 格式、尺寸 **457×428（非方形）**。期末项目书要求 32×32 的方形 PNG。
- **页脚的年份是硬编码的** `2026`，跨年后需要手动改，也可以改成用 JS 自动取当前年份。
- **`p2/` 目录** 里有另一个空的练习（`index.html` 为空、`project.html` 有 467 字节），与本项目无关，尚未整理。
- **`.pdfwork/pages/`** 是从 `1.pdf` 渲染出来的教程页面图片，属于临时文件，可以随时删除。

---

## 环境要求

| 用途 | 需要 |
|---|---|
| 浏览网站 | 任意现代浏览器 |
| 本地服务器 | Python 3（`python -m http.server`） |
| 运行校验脚本 | Node.js 18+（用到原生 `fetch`） |

服务器脚本假定 `python` 命令在 PATH 中可用。如果提示找不到 python，把 `serve.bat` 里的 `python` 换成 python 的完整路径即可。
