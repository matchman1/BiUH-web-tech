# BiUH-web

一个手写的静态网站练习项目：四个页面，加一套由 JavaScript 注入的共享导航与页脚。

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

改完 CSS 或 JS 后请在浏览器里按 **Ctrl + F5** 强制刷新，否则可能看到的是旧文件（这个坑实际踩过，现象很像「样式写坏了」）。

如果嫌每次开机都要手动点，可以把 `serve-hidden.vbs` 的快捷方式放进启动文件夹（`Win+R` 输入 `shell:startup`）。

---

## 目录结构

```
BiUH-web/
├── index.html         首页：大图 + 主标题 + 两个通栏入口
├── slogans.html       标语页（16 条硬件厂商标语，注明出处）
├── cpus.html          CPU Explorer（可搜索、可对比）
├── contact.html       联系页
│
├── nav.html           导航片段    ← 不含 DOCTYPE/html/head/body
├── footer.html        页脚片段    ← 同上
├── parts.js           把上面两个片段注入到四个页面里
│
├── styles.css         四个页面各自的样式（按页面分成四段，见下）
├── nav.css            导航 + 页脚的样式（四页共用的组件）
├── theme.css          深色模式的颜色（可被导航里的开关覆盖）
├── theme.js           浅色 / 深色开关的逻辑
├── cpu.js             CPU Explorer 的搜索与对比
│
├── data/cpus.js       3551 条 CPU 数据，由 cpu/cpus.db 导出
├── images/            图片（`-web.jpg` 是网页实际使用的压缩版）
├── cpu/               原始数据库与桌面版程序（网站不直接读取）
│
├── serve.bat          启动本地服务器（有窗口）
├── serve-hidden.vbs   启动本地服务器（无窗口）
├── stop-server.bat    停止服务器
├── stop-server.ps1    停止服务器的实际逻辑
│
├── README.md          本文档
├── DEVLOG.md          开发过程记录
├── slogans.md         标语调研与校对
└── yourpen.pdf        期末项目说明
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
        <li><a href="slogans.html">Slogans</a></li>
        <li><a href="cpus.html">CPUs</a></li>
    </ul>
    <a class="pill" href="contact.html" target="_blank" rel="noopener">Contact</a>
    <button class="theme-toggle" type="button" aria-pressed="false">…</button>
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

### 注入之后还做两件事

`parts.js` 在后面多了一小段（教程之外的附加功能）：

1. **当前页高亮**：读取网址的最后一段，和链接的 `href` 比对，命中的加 `.active` 类，由 CSS 渲染成常驻下划线。Contact 药丸不在 `.links` 里，所以单独判一次。
2. **同步深浅开关**：导航里那个按钮是刚注入的，`theme.js` 首次运行时它还不存在。所以注入完成后调用 `window.updateThemeButton()`，把图标和文字设成当前真正的主题。

这两件事都接在 `navReady` 这个 promise 后面执行 —— 必须等导航注入完成，否则选不到元素。这样写也保证 `nav.html` 只被请求一次。

---

## 样式怎么组织

三个文件，划分标准是**「谁用」**：

| 文件 | 放什么 | 谁用 |
|---|---|---|
| `styles.css` | 各个页面自己的布局与外观 | 按页分段，互不干扰 |
| `nav.css` | 导航栏 + 页脚 | 四个页面共用 |
| `theme.css` | 深色模式的颜色 | 四个页面共用 |

### `styles.css` —— 页面自己的样式

按页面分成四段，每段开头有一条大标题分隔线：

| 段落 | 负责 | 类名前缀 |
|---|---|---|
| `[1]` | index.html 首页 | `.index-*` |
| `[2]` | slogans.html 标语页 | `.slogans-*` / `.slogan-*` |
| `[3]` | cpus.html CPU 浏览器 | `.cpu-*` |
| `[4]` | contact.html 联系页 | `.contact-*` |

四个页面的类名**完全不交叉**，每个页面的 `<body>` 带一个独立的作用域类：

```html
<body class="index">          <!-- 首页 -->
<body class="slogans-page">   <!-- 标语页 -->
<body class="cpu-page">       <!-- CPU 页 -->
<body class="contact-page">   <!-- 联系页 -->
```

所以改首页样式时只看 `[1]` 段，不会影响别的页面。

### `nav.css` —— 四个页面共用的组件

放导航栏和页脚的样式，因为四个页面都要用同一份。改这里，四页同时变。

判断标准很简单：**一个页面用 → `styles.css` 对应段落；多页共用 → `nav.css`。**

导航栏的布局要点：`.links` 用 `margin-left: auto` 吃掉 logo 之后的全部空余空间，把链接、Contact 药丸和开关一起推到右边；`nav` 容器上**故意不写** `gap` 和 `justify-content`，避免空间被切成两块、导致链接停在中间。

---

## 深色模式

深浅切换涉及三个文件，分工明确：

| 文件 | 负责 |
|---|---|
| `theme.css` | 所有深色下的颜色 |
| `theme.js` | 判断当前该用哪种模式、给 `<html>` 设 `data-theme`、记住访客的选择 |
| 四个页面的 `<head>` | 一小段内联脚本，在首次绘制前就把主题设好 |

### 颜色为什么要单独一个文件

深色配色原本写在 `styles.css` / `nav.css` 的 `@media (prefers-color-scheme: dark)` 里，而**媒体查询无法被点击覆盖**——访客想手动切回浅色就做不到。

所以把它们搬进 `theme.css`，每条规则写两遍：

```css
/* 跟随操作系统，但只在访客还没手动选过时生效 */
@media (prefers-color-scheme: dark) {
    html:not([data-theme]) .index-card { … }
}

/* 手动选择，双向覆盖系统 */
html[data-theme="dark"] .index-card { … }
```

`html:not([data-theme])` 是关键：访客一旦手选了浅色，媒体查询那组就不再匹配，系统即使是深色也拉不回来。

### 为什么要有内联脚本

如果等 `theme.js` 跑到最后才上色，深色模式下页面会先闪一下白再变黑。所以四个页面的 `<head>` 里各有一小段脚本，在首次绘制前就把 `data-theme` 设好。

### 状态怎么记

访客的选择存在 `localStorage` 的 `theme` 键里。判断「现在是不是深色」的唯一入口是 `theme.js` 里的 `resolved()`：有 `data-theme` 就用它 → 否则问操作系统 → 都没有则按浅色。按钮的图标和文字都由它推出，所以不会出现「显示太阳但页面是深色」。

---

## CPU Explorer 的数据从哪来

`data/cpus.js` 是 3551 条处理器数据（约 508 KB），来自 `cpu/cpus.db` 这个 SQLite 数据库（3585 行 × 30 列）。

数据库里 30 列，页面只用到 14 列：型号、品牌线索、核心数、线程数、频率、缓存、TDP、平台、插槽、发布日期等。其余的列（PCIe 通道、ECC、内存类型、晶体管数…）仍留在 `cpu/` 里，网页没有展示。

页面端做的事：

- 按名称搜索，多个关键词要同时命中（`ryzen 5800` 能找到 `Ryzen 7 5800X3D`）
- 按品牌筛选（All / Intel / AMD），品牌从型号名推断，因为数据库没有品牌列
- 结果分页显示，一次 80 条，剩下的点「再显示更多」
- 最多选 3 颗并排对比，第 4 颗会顶掉最早选的那颗，数值更高的单元格会标出来

`cpu/` 里还有最初的桌面版程序（Tkinter + sqlite3），网站**不依赖**它，只是数据来源。

---

## 开发时踩过的坑

这些都是实际调试中遇到的，记下来避免重复。

### 1. HTML 的 `width` 属性会盖掉 CSS

`<img src="x.jpg" width="200">` 里的 `width` 属性在层叠里的优先级**高于外部 CSS**，所以 CSS 里怎么改都不生效。图片尺寸只在一个地方定义：CSS。HTML 里不要写 `width`。

### 2. 图片不转 `display: block` 就不能用 `margin: auto` 居中

`<img>` 默认是 `inline` 元素，`margin: 0 auto` 对它无效。

### 3. PowerShell 5.1 读取非 ASCII 脚本会出错

`.ps1` 文件如果是 UTF-8 但**不带 BOM**，且里面有中文，PowerShell 5.1 会按 ANSI 解析，导致莫名其妙的语法错误（`Unexpected token '}'`）。解决办法：脚本保持纯 ASCII，或者存成带 BOM 的 UTF-8。

### 4. 批处理的 `for /f` 不要用来解析 netstat

在 `for /f "..."` 的**引号内部**，转义后的 `^|` 不按预期工作，结果是静默失败。`stop-server.bat` 第一版就是这样：服务器明明在跑，它却报「Nothing was listening」。所以解析改由 PowerShell 做。

### 5. `Get-NetTCPConnection` 有时查不到正在监听的端口

在这台机器上遇到过它返回空值且不报错的情况。`stop-server.ps1` 改成解析 `netstat -ano` 的文本，稳定可靠。

### 6. JS 不要写进 CSS 文件

`styles.css` 里一度混进了一段 `fetch(...)` 调用。CSS 解析器遇到这种语法会在那里断掉，**该位置之后的所有规则全部失效**（包括深色模式）。现象很像浏览器缓存，实际是文件写坏了。JS 归 `.js`，CSS 归 `.css`。

### 7. 裸选择器会波及所有同名元素

`nav.css` 里的 `nav { … }` 会命中页面里**每一个** `<nav>`。首页那两个通栏按钮本来想用 `<nav>`，结果被套上了吸顶导航的样式，只好改成 `<div class="index-cards">`。

### 8. 共享组件的样式不要写进单个页面的 CSS

`#site-footer` 的样式一度被写进 `styles.css`，结果只对部分页面生效。页脚是四个页面共用的组件，应该放 `nav.css`。

---

## 页面内容

| 页面 | 内容 |
|---|---|
| **index.html** | 主板大图、主标题「The hardware behind the machine」、两个通栏入口分别指向 Slogans 和 CPUs（各自配一张显卡照片） |
| **slogans.html** | 16 条硬件厂商标语（ASUS、AMD、Intel、ROG、Corsair 等），每条注明出处；另有「没有短标语」板块 5 条 |
| **cpus.html** | CPU Explorer：3551 条处理器，可按名称搜索、按品牌筛选，并选最多 3 颗并排对比规格 |
| **contact.html** | 联系方式列表（Email / GitHub / Location），从导航的药丸按钮以新标签页打开 |

图片说明：

- `images/zhuban-web.jpg`、`rtx2080-web.jpg`、`gtx780-web.jpg` 是网页实际使用的压缩版（合计约 676 KB）
- 同名的 `zhuban.jpg`、`rtx2080.jpg`、`gtx780.jpg` 是原始照片，保留但网页不引用（合计约 8 MB）
- `images/og-image.jpg` 是社交分享用的预览图，1200×630、67 KB，项目书要求 100 KB 以内

---

## 还没做的 / 可以再改

- **页脚邮箱是占位符** `123456@example.com`，应换成真实地址。
- **页脚的年份是硬编码的** `2026`，跨年后需要手动改，也可以改成用 JS 自动取当前年份。
- **导航栏布局与教程说明不一致**：教程复习要点写的是 `logo 左、导航居中、按钮右`，当前是 logo 左、**导航右**。若要改成居中，需要调整 `nav.css` 里 `.links` 的 `margin-left: auto`。
- **几张图没被引用**：`images/xlm.jpg`、`images/itx.jpg`、`images/favicon-192.png`，可以删掉，也可以留着备用。
- **`backup/`、`.vscode/`** 是开发过程中的备份与编辑器配置，不属于网站内容，交付前可以删掉。

已知特性（不算问题）：

- 网站必须通过 HTTP 打开，见「快速开始」。
- `cpu/` 与原始大图合计约 11 MB，不影响网页体积，但会让仓库变大。

---

## 环境要求

| 用途 | 需要 |
|---|---|
| 浏览网站 | 任意现代浏览器 |
| 本地服务器 | Python 3（`python -m http.server`） |

网站本身是纯静态的 HTML / CSS / JavaScript，**没有构建步骤**，也不需要安装任何依赖。

服务器脚本假定 `python` 命令在 PATH 中可用。如果提示找不到 python，把 `serve.bat` 里的 `python` 换成 python 的完整路径即可。
