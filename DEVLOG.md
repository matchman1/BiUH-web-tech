# 开发日志

`BiUH-web` 这个网站是怎么一步步做出来的：每个阶段在做什么、为什么那样决定、踩了哪些坑。

项目本身的结构和用法见 [`README.md`](README.md)，这份文档只记录**过程**。

---

## 时间线

| 日期 | 阶段 | 产出 |
|---|---|---|
| 09-16 | 起点 | `xlm.jpg`——项目里最早的文件 |
| 09-20 上午 | 设计系统 | 从黑底语录卡片改为极简浅色风格；抽出共用设计变量；首页与语录页统一样式 |
| 09-20 11:21 | 备份 | 把「两页分开两个 CSS」那一版留档到 `backup/`，随后合并回一个 `styles.css` |
| 09-20 16:34 | 学习材料 | 放入教程 `1.pdf`（22 页，导航与片段注入那几课） |
| 09-20 16:42 | 配图 | `bilibili.jpg` 替换 `w3.png` 作为首页大图 |
| 09-20 17:28 | 统一样式表 | `styles.css` 合并完成；`nav.css` 拆分出共用组件 |
| 09-20 17:29 | 导航系统 | `nav.html` + `parts.js` + `verify-parts.mjs` 全部就位 |
| 09-23 11:29 | 本地服务器 | `serve.bat` / `serve-hidden.vbs` / `stop-server.bat` / `stop-server.ps1` |
| 09-23 15:43 | 页脚 | `footer.html` 片段实现，四个页面接入 `parts.js` |
| 09-23 16:05 | 联系页 | `contact.html` 建成，导航药丸按钮指向它 |
| 09-23 16:34 | 整理 | `nav.html` 最后一轮调整 |
| 10-14 | 文档与项目书 | `README.md` 写成；放入期末项目说明 `yourpen.pdf` |

**首次提交：** 09-23 10:36（`daee146`）。也就是说 09-20 那一整天的开发成果，是在三天后一次性打包提交的——这件事的后果见最后一节。

---

## 阶段一：从「能看」到极简风格

**起点**是一个带 `.quote` 类的黑底语录卡片，`font-size: 30px`，加一圈 `#ccc` 边框。能显示，但不好看。

**目标**改成极简：近白纸底、墨黑文字、不用边框盒子而用 1px 发丝线做层级、字重放细。

**做法**：语录页用 CSS Grid 排布，靠 `gap: 1px` 加容器背景色造出「发丝分隔线」的效果——不用给每个卡片画边框，网格的缝隙本身就是线：

```css
.quotes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1px;
    background: #e6e6e6;     /* 透过 1px 缝隙露出来的就是分隔线 */
    border-top: 1px solid #e6e6e6;
    border-bottom: 1px solid #e6e6e6;
}
```

**中间走过一段弯路。** 起初把设计变量（`--ink` / `--rule` / `--paper`）定义在 `.quotes-page` 上，只有语录页能用。后来首页也要同一套风格时，只能再复制一份。最终**提升到 `:root`**，两个页面共用。教训：设计变量从一开始就该放在全局层，不然「加第二个页面」时会付代价。

**首页一度做得过头。** 我给它加了首屏两列布局、小标签、引导语、箭头入口链接——一套完整的落地页设计。用户反馈「改的太过了，居中一下就可以」，于是全部回退成简单结构，只保留居中（`max-width: 640px` + `margin: 0 auto` + `text-align: center`）。

> **教训：需求没说要做设计的地方，保持克制。** 用户当时要的只是「好看点、居中」，不是重新设计信息架构。

---

## 阶段二：CSS 该放哪

样式文件的组织方式改了三轮，每一轮都因为撞上了具体问题：

### 第一轮：一个 `styles.css`，按页面分段

加了清晰的注释标题，把首页和语录页的样式分成两部分。问题：`project.html` 当时用的是另一个文件 `styles-dd.css`，共享的导航样式写在任何一个里都会漏掉另一页。

### 第二轮：按「谁用」拆成两个文件

- `styles.css` —— 各页面自己的样式，按页面分五部分，类名前缀区分（`.index-*` / `.quotes-*` / `.project-*` / `.contact-*`）
- `nav.css` —— 四个页面**共用**的组件（导航栏 + 页脚）
- 每个页面的 `<body>` 带独立作用域类（`.index` / `.quotes-page` / …），保证四页类名不交叉

这轮定下的判断标准一直用到最后：**一个页面用 → `styles.css` 对应部分；多页共用 → `nav.css`。**

### 第三轮：合并回一个

用户要求「都要写在 styles.css 里，但现有的可以做个备份」。于是：

1. 先把拆分状态备份到 `backup/`，并按时间戳命名（`styles.quotes.20260920-112108.css`），避免互相覆盖
2. HTML 也一起备份——因为拆分版的 `index.html` 引用的是 `styles-index.css`，**只恢复 CSS 不恢复 HTML 会导致首页样式全失效**
3. `backup/README.txt` 写清文件对照和回退步骤
4. 合并后删掉 `styles-index.css`

但共享组件的样式**仍然留在 `nav.css`**——那是合并后的例外，因为它是「谁用」标准的直接推论。

---

## 阶段三：导航与片段注入

这是项目的核心机制，来自教程 `1.pdf` 第 27-44 页。

### 需求（教程三步）

1. **`nav.html`** 只放 `<nav>` 片段，**不含** `DOCTYPE`/`html`/`head`/`body`
2. 每个页面加一个**空的** `<header id="site-header">`，`</body>` 前放 `<script src="…">`
3. 六行 JS：`fetch('nav.html')` → `.text()` → `getElementById('site-header').innerHTML`

### 为什么必须起本地服务器

**这是整个项目最容易踩的坑。** `fetch` 在 `file://` 协议下会被浏览器的 CORS 规则拦掉——从磁盘打开的页面不允许读取磁盘上的其他文件。**直接双击 `index.html`，导航和页脚都会是空的**，控制台报错。

所以必须走 HTTP：`http://127.0.0.1:8000/…`。教程第 31 页专门用一整页讲这件事。

### 从 `nav.js` 到 `parts.js`

教程第 41-42 页演示了「重复自己」这个错误：加载导航和加载页脚要写两遍 `fetch`，两块代码除了两个词之外完全相同。正确做法是抽成函数：

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

文件名也从 `nav.js` 改成 `parts.js`——它不再只管导航了。**改名带来的连带影响要一并处理**：`nav.html`、`nav.css`、`parts.js` 里注释提到 `nav.js` 的地方全部更新，否则以后会被误导。`nav.js` 已删除。

### 当前页高亮

教程之外附加的功能：读取 `location.pathname` 的最后一段，和链接的 `href` 比对，命中的加 `.active`。

**关键点**：这段必须等导航**注入完成后**再执行，否则 `nav .links` 还不存在，`querySelectorAll` 返回空数组，静默失效。接在 `navReady` 这个 promise 后面就同时解决了两件事——时序正确，且 `nav.html` 只被请求一次。

### 导航栏布局

要求是药丸形状的 Contact 按钮 + 右侧链接组。中间调试了两次：

- **第一次**：药丸最初放在最左边（`order: -1` + `margin-right: auto`），后按要求改到最右
- **第二次**：改到最右后发现 `Home/Quotes/Project` 停在中间而不是靠右

原因在 `nav` 容器上同时写了 `justify-content: space-between` **和** `gap: 24px`，药丸又有 `margin-left: auto`。三者叠加后空余空间被**切成两块**：一块把 `.links` 推到中途，一块把药丸推到最右。

**改法**：`nav` 上删掉 `justify-content` 和 `gap`；空余空间统一归 `.links` 的 `margin-left: auto` 管；`.pill` 用固定 `margin-left: 40px` 只负责它和链接之间的间距。**每个间距只有一个来源，不再互相打架。**

药丸形状用 `border-radius: 999px` 而不是固定值——半径大于等于高度一半时浏览器会自动收敛成半圆，高度怎么变都不会走形。

### 遗留的不一致

教程第 44 页的复习要点写的是 `logo left, nav centred, action right`（logo 左、**导航居中**、按钮右），但用户明确要求链接靠右，所以**当前实现与教程说明相反**。已记在 `README.md` 的待办里。

---

## 阶段四：页脚

教程第 39-43 页是导航那一课的续集，思路完全一样：

| 步骤 | 内容 |
|---|---|
| 一 | 建 `footer.html` 片段：`<p>Built by …</p>` + `<address><a href="mailto:…">` |
| 二 | 每页加空的 `<footer id="site-footer"></footer>` |
| 三 | 用同一个 `load()` 函数加载——**两个空元素，两个片段，一个脚本** |

**`<address>` 的语义**：表示「本页或本文的联络方式」，是少数语义明确归属的元素，**不用于**正文里碰巧出现的任何邮政地址。

**踩到的坑**：写这段时 `styles.css` 里混进了一段 `fetch(...)` 调用（应该是从别处误粘的）。CSS 解析器遇到这种语法会在那里断掉，**该位置之后的所有规则全部失效**，包括深色模式。而且那段 JS 本身正是教程第 41 页演示的「重复自己」写法。**JS 归 `.js`，CSS 归 `.css`。**

页脚样式同样放进 `nav.css`（共用组件），并补了深色模式。

---

## 阶段五：本地服务器与工具脚本

重启电脑后服务器消失，于是做了四个启动/停止脚本。**这块踩的坑最多，而且是我自己造成的。**

### 坑一：批处理 `for /f` 解析 netstat 会静默失败

第一版 `stop-server.bat` 是纯批处理，用 `for /f "tokens=5" ... findstr ... ^|` 取 PID。结果**服务器明明在跑，它却报「Nothing was listening」**——静默失败，还给出错误的结论。

原因：在 `for /f "..."` 的**引号内部**，转义后的 `^|` 不按预期工作。改成让 PowerShell 解析。

### 坑二：`Get-NetTCPConnection` 查不到正在监听的端口

改用 PowerShell 后仍然失败。诊断发现 `Get-NetTCPConnection -LocalPort 8000 -State Listen` 在服务器确实监听时**返回空值且不报错**。改用解析 `netstat -ano` 的文本，稳定可靠。

### 坑三：多行 `^` 续行会破坏命令

把长命令用 `^` 拆成多行写在 bat 里，生成的命令被破坏。最终把逻辑放进独立的 `stop-server.ps1`，bat 只负责调用：

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-server.ps1"
```

### 坑四：PowerShell 5.1 读取非 ASCII 脚本会出错

`.ps1` 若是**不带 BOM 的 UTF-8** 且含中文，PowerShell 5.1 会按 ANSI 解析，报出莫名其妙的语法错误（`Unexpected token '}'`）。解决办法：脚本保持**纯 ASCII**。

### 最终验证

在**单次命令调用内**跑完整循环，模拟真实使用：

```
起 → HTTP 200 → 停（正确识别 PID）→ 确认端口释放   ✅ 全通过
```

> 中途遇到过「起一个、下一个命令就没了」的现象——那是沙箱会在命令结束后回收子进程。用户自己双击 `serve-hidden.vbs` 不会有这个问题。

---

## 阶段六：文档

### `README.md`

写实际用得上的东西，重点讲**为什么**而不只是**是什么**。第一段就警告不能双击打开（这是最容易踩的坑），片段注入那一节按「问题 → 做法 → 好处」展开。

CSS 那一节把划分标准写成一条**可判断的规则**（谁用），而不是罗列文件清单——这样以后加新样式时能自己判断该放哪。

### 图片改不动的问题

用户反馈过「在 index.html 中怎么改不了 w3 和 xlm 在网页中的大小」。原因是 **HTML 属性 `width="200"` 的优先级高于外部 CSS**。它在层叠里相当于作者样式表最前面的一层，所以 CSS 里怎么改都会被盖掉，而且 `width` 属性不接受小数、不响应屏幕宽度。

**修法**：尺寸只留一个地方说了算——HTML 里所有 `width` 属性全部删除，改由 CSS 控制，并在 CSS 和 HTML 里都写了注释提醒。

---

## 验证方法

因为没有可用的浏览器渲染（沙箱里 headless Edge 起不来），主要靠这些手段：

| 手段 | 检查什么 |
|---|---|
| `node verify-parts.mjs` | 离线跑 `parts.js`：片段结构、注入结果、当前页高亮、四页接入是否齐全 |
| 花括号配对计数 | CSS/JS 结构是否被改坏 |
| 类名交叉检查 | 四个页面的类名有没有互相污染 |
| 逐条 grep | 文档里提到的文件是否真实存在、说法是否属实 |
| `Invoke-WebRequest` | 服务器能不能取到每个文件 |
| Python 解析 PDF | `1.pdf` / `yourpen.pdf` 的文字是矢量曲线，无字体对象，只能渲染成图再读 |

`verify-parts.mjs` 是这里面最有价值的一个——**改完导航或页脚跑一下，比手动开浏览器点要快**，而且它抓出过一个真实缺口：Contact 药丸最初永远不会高亮，因为它不在 `.links` 里，而高亮循环只遍历 `nav .links a`。

它本身也修过一个 bug：统计调用次数时把注释里的示例代码算了进去，导致误报「nav.html 被请求两次」。修法是统计前先剥掉注释。

---

## 待修问题

按优先级排列：

| # | 问题 | 影响 |
|---|---|---|
| 1 | **Git 历史几乎看不出开发过程** | **计分项，且事后无法补** |
| 2 | 内容多为占位：`project.html` 里的 `AAAAAA`/`sdfygdyugf`、`footer.html` 的示例邮箱 | 期末要求「无占位内容」 |
| 3 | 缺 Open Graph 图片、方形 PNG favicon、app icon | 期末硬性要求 |
| 4 | 没有真实上线地址 | 期末硬性要求 |
| 5 | 缺一个「真正的交互」 | 期末硬性要求 |
| 6 | 导航布局与教程第 44 页说明不符（教程要求居中） | 一致性 |
| 7 | `styles.css` 里的全局 `nav a:hover { color: red; }` 会盖掉 `nav.css` 的悬停样式 | 小 |
| 8 | `w3.png` 已无引用；`styles-dd.css` 已无页面引用 | 清理 |
| 9 | `p2/` 是另一个未完成的练习（`index.html` 为空） | 整理 |
| 10 | `.pdfwork/` 是从 PDF 渲染的临时图片（**实测 7.0 MB**） | 不该提交进仓库 |
| 11 | favicon 声明为 `type="image/png"` 但实际文件是 JPEG，且是 457×428 的**非方形** | 期末要求 32×32 PNG |

---

## Git 历史的问题

这是目前最需要处理的一件事。

### 实际提交记录

```
95248aa  09-23 15:43  footer
662f77f  09-23 14:50  no work
d7a0db3  09-23 11:16  ？
6d225b1  09-23 11:03  p1p2
06de12c  09-23 10:42  text
daee146  09-23 10:36  1        ← 首次提交
```

### 三个问题

**1. 提交信息没有信息量。** `1`、`text`、`p1p2`、`？`、`no work`——六个月后回看，无法知道任何一次改动是为什么。其中 `?` 那次提交实际做的是**把整个项目从子目录 `p1/` 移回根目录并删掉 99 行 `styles-dd.css`**，是一次不小的重构，但从信息里完全看不出来。

**2. 真正的开发过程没有进历史。** 09-20 那一整天做了：设计系统重写、CSS 文件拆分与合并、导航片段系统、`parts.js` 重构、校验脚本——**全部是一次性打包提交的**（`daee146` 单次提交塞进 30 个文件、2389 行）。历史里看不出「逐周生长」的过程。

**3. 最早的提交把临时文件也带进去了。** `daee146` 包含 `.pdfwork/pages/p038.png` 等 7 张从 PDF 渲染的图片，`06de12c` 又删掉了一个 `123.png`。仓库里混进了不该有的临时产物。

### 为什么这件事要紧

期末项目书 `yourpen.pdf` 把 **Git 历史列为硬性要求**（「a Git history that shows it grow, week by week」），并且**过程占 20%**，原文还专门强调：

> *The history is graded, and it cannot be written afterwards.*
> （历史是计分的，而且事后补不出来。）

也就是说，**这部分分数只能靠真实、持续的提交来挣，最后一天突击无法弥补。** 目前 6 个提交集中在 09-23 一天，之后到 10-14 之间没有任何提交。

### 建议

从下一次改动开始养成习惯：

- **每完成一小块就提交一次**，别攒着
- **提交信息写清「做了什么」**，用现在时祈使句。对比：
  - ❌ `1`
  - ✅ `Add footer fragment and inject it into all four pages`
- 提交前确认没有混进 `.pdfwork/` 之类的临时文件（应该写进 `.gitignore`）
- 保持 push 到 `origin`

---

## 未提交的改动

截至本次记录：

| 文件 | 状态 |
|---|---|
| `contact.html` | 已修改未提交（1 行） |
| `README.md` | 未跟踪 |
| `yourpen.pdf` | 未跟踪 |
| `.pdfwork/density.py`、`.pdfwork/probe2.py`、`.pdfwork/yp/` | 未跟踪（临时文件，不应提交） |
| 本地 `main` | 领先 `origin/main` **1 个提交**（`95248aa` 未 push） |

远程仓库：`https://github.com/matchman1/BiUH-web-tech.git`
