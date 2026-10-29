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
| 09-20 17:29 | 导航系统 | `nav.html` + `parts.js` 就位，四个页面接入 |
| 09-23 11:29 | 本地服务器 | `serve.bat` / `serve-hidden.vbs` / `stop-server.bat` / `stop-server.ps1` |
| 09-23 15:43 | 页脚 | `footer.html` 片段实现，四个页面接入 `parts.js` |
| 09-23 16:05 | 联系页 | `contact.html` 建成，导航药丸按钮指向它 |
| 09-23 16:34 | 整理 | `nav.html` 最后一轮调整 |
| 10-14 | 文档与项目书 | `README.md` 写成；放入期末项目说明 `yourpen.pdf` |
| 10-21 10:47 | 内容转向 | 语录页换成硬件厂商标语；新增 CPU 页，导航改为 Home / Slogans / CPUs |
| 10-21 16:41 | 页面改名 | `project.html` → `cpus.html`，类名由 `.project-*` 改为 `.cpu-*` |
| 10-28 11:17 | CPU 页定稿 | 搜索、品牌筛选、最多三颗并排对比 |
| 10-28 | 交付整理 | 补齐 CPU 页的深色配色；删除开发脚本；`README.md` 重写 |
| 10-29 | GPU 页 | 新增 `gpu.html` + `gpu.js` + `data/gpus.js`；浏览组件的类名从 `.cpu-*` 改为 `.explorer-*` |

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

因为没有可用的浏览器渲染（沙箱里 headless Edge 起不来），整个过程主要靠离线脚本和文本检查。
这些脚本交付前都删掉了（见「阶段十」），所以下表第三列写的是**今天想复核同样的结论，该怎么做**。

| 当时的手段 | 检查什么 | 现在怎么复核 |
|---|---|---|
| `node verify-parts.mjs` | 离线跑 `parts.js`：片段结构、注入结果、当前页高亮、四页接入是否齐全 | 起本地服务器，四个页面各点一遍导航 |
| `node tools/test-cpu.mjs` | 搜索、品牌筛选、对比上限 3、再点一次取消、Clear、数值高亮 | 在 `cpus.html` 上手动操作一遍 |
| `node tools/test-theme.mjs` | 深色开关：覆盖系统、记住选择、`localStorage` 不可用时不报错 | 切一次深浅色，再刷新看是否记住 |
| `check-css.mjs` | 三个样式表的括号 / 分号配对、选择器是否存在 | 开发者工具的样式面板里看规则有没有生效 |
| 花括号配对计数 | CSS / JS 结构是否被改坏 | — |
| 类名交叉检查 | 四个页面的类名有没有互相污染 | — |
| 逐条 grep | 文档里提到的文件是否真实存在、说法是否属实 | — |
| `Invoke-WebRequest` | 服务器能不能取到每个文件 | — |
| Python 解析 PDF | `yourpen.pdf` 的文字是矢量曲线、没有字体对象，只能渲染成图再读 | — |

`verify-parts.mjs` 当时是最有价值的一个——**改完导航或页脚跑一下，比手动开浏览器点要快**，
而且它抓出过一个真实缺口：Contact 药丸最初永远不会高亮，因为它不在 `.links` 里，
而高亮循环只遍历 `nav .links a`。

它本身也修过一个 bug：统计调用次数时把注释里的示例代码算了进去，导致误报
「`nav.html` 被请求两次」。修法是统计前先剥掉注释。

---

## 待修问题（10-21 列的清单，附 10-28 现状）

这是 10-21 那天的实况清单，原样留着作对照；右列是 10-28 交付整理时的状态。

| # | 当时的问题 | 10-28 现状 |
|---|---|---|
| 1 | **Git 历史几乎看不出开发过程** | 仍是弱项（12 个提交，其中 6 个在 09-23 一天），见下一节 |
| 2 | 内容多为占位：`project.html` 里的 `AAAAAA`/`sdfygdyugf`、`footer.html` 的示例邮箱 | 已解决：`project.html` 已改写成 `cpus.html` 并填满真实数据；Location 写 `China, Hainan`、GitHub 指向仓库本身；**Email 一行直接删掉**（`contact.html` 与页脚都不再出现邮箱），宁可少一行也不留占位 |
| 3 | 缺 Open Graph 图片、方形 PNG favicon、app icon | 已解决：`og-image.jpg` 1200×630、`favicon-32.png`、`apple-touch-icon.png` |
| 4 | 没有真实上线地址 | **未解决**：GitHub Pages 还没开，仓库地址只有 GitHub |
| 5 | 缺一个「真正的交互」 | 已解决：深色开关 + CPU 搜索 / 品牌筛选 / 三颗并排对比 |
| 6 | 导航布局与教程第 44 页说明不符（教程要求居中） | 保持原样，属于有意的取舍，见 `README.md` |
| 7 | `styles.css` 里的全局 `nav a:hover { color: red; }` 会盖掉 `nav.css` 的悬停样式 | 已清理，全仓已无 `color: red` |
| 8 | `w3.png` 已无引用；`styles-dd.css` 已无页面引用 | 两个文件都已删除 |
| 9 | `p2/` 是另一个未完成的练习（`index.html` 为空） | 已删除（`3ef85ed`） |
| 10 | `.pdfwork/` 是从 PDF 渲染的临时图片（**实测 7.0 MB**） | 已从仓库删除（`3ef85ed`，42 个文件；旧提交里仍留有副本） |
| 11 | favicon 声明为 `type="image/png"` 但实际文件是 JPEG，且是 457×428 的**非方形** | 已解决：四个页面都指向 32×32 的 `images/favicon-32.png` |

还剩两件没做：**上线**、**交作业用的桌面 / 手机截图**。

---

## Git 历史的问题

这是这个项目最弱的一环。过程分看的就是它，而它偏偏是事后补不出来的，只能如实记下来。

### 实际提交记录

```
95248aa  09-23 15:43  footer
662f77f  09-23 14:50  no work
d7a0db3  09-23 11:16  ？
6d225b1  09-23 11:03  p1p2
06de12c  09-23 10:42  text
daee146  09-23 10:36  1        ← 首次提交
```

（只列到 09-23。之后 10-14 有 2 个、10-21 有 2 个、10-28 有 2 个，到收工时共 12 个提交。）

### 三个问题

**1. 提交信息没有信息量。** `1`、`text`、`p1p2`、`？`、`no work`——六个月后回看，无法知道任何一次改动是为什么。其中 `?` 那次提交实际做的是**把整个项目从子目录 `p1/` 移回根目录并删掉 99 行 `styles-dd.css`**，是一次不小的重构，但从信息里完全看不出来。

**2. 真正的开发过程没有进历史。** 09-20 那一整天做了：设计系统重写、CSS 文件拆分与合并、导航片段系统、`parts.js` 重构、校验脚本——**全部是一次性打包提交的**（`daee146` 单次提交塞进 30 个文件、2389 行）。历史里看不出「逐周生长」的过程。

**3. 最早的提交把临时文件也带进去了。** `daee146` 包含 `.pdfwork/pages/p038.png` 等 7 张从 PDF 渲染的图片，`06de12c` 又删掉了一个 `123.png`。仓库里混进了不该有的临时产物。

### 为什么这件事要紧

期末项目书 `yourpen.pdf` 把 **Git 历史列为硬性要求**（「a Git history that shows it grow, week by week」），并且**过程占 20%**，原文还专门强调：

> *The history is graded, and it cannot be written afterwards.*
> （历史是计分的，而且事后补不出来。）

也就是说，**这部分分数只能靠真实、持续的提交来挣，最后一天突击无法弥补。** 当时的实况是：6 个提交全挤在 09-23 一天，之后到 10-14 之间一个提交都没有。到 10-28 收工一共 12 个，10-14、10-21、10-28 各有一次「打包提交」，但整段过程依然看不出逐周生长——这是这个项目改不掉的短板。

### 建议

从下一次改动开始养成习惯：

- **每完成一小块就提交一次**，别攒着
- **提交信息写清「做了什么」**，用现在时祈使句。对比：
  - ❌ `1`
  - ✅ `Add footer fragment and inject it into all four pages`
- 提交前确认没有混进 `.pdfwork/` 之类的临时文件（应该写进 `.gitignore`）
- 保持 push 到 `origin`

---

## 仓库状态

截至 10-28 收工：

| 项 | 状态 |
|---|---|
| 工作区 | 干净（`git status` 无输出；本节这几处文档修订是之后才提交的） |
| 提交数 | 12 个，写作时最新为 `3e24504 updatereadme` |
| 与远程 | 本地 `main` 与 `origin/main` 一致，已 push |
| 远程仓库 | `https://github.com/matchman1/BiUH-web-tech` |
| 线上站点 | **还没有**。GitHub Pages 未开启，`https://matchman1.github.io/BiUH-web-tech/` 目前返回 404 |

> 这一节早先记的是 10-14 的实况（`contact.html` 改了一行未提交、`README.md` 与 `yourpen.pdf`
> 未跟踪、本地领先 `origin/main` 一个提交 `95248aa`）。那些改动后来都已提交并 push，故按现状重写。


---

## 阶段七：内容转向硬件主题

### 选题变化

项目从「名人语录」转向**电脑硬件主题**：

| 页面 | 变化 |
|---|---|
| `quotes.html` → `slogans.html` | 8 条名人语录 → 16 条硬件厂商品牌标语 |
| `project.html` | 项目想法列表 → Intel / AMD / NVIDIA 历代架构对照 |

文件名、类名、导航文字全部同步更新（用 `git mv` 保留提交历史）。

### 标语的核实

标语素材最初由 AI 生成（两个 CSV）。**逐条核对官方来源后发现 25 条里有 10 条是编造的**，例如：

- Intel 的「What's Wonderful?」——查无此句，真实的 2025 年新句式是 `That's the power of Intel Inside®`
- ASRock 的「Motherboard, We Master It!」——虚构
- MSI 的「Dragon Spirit, Gaming Spirit」——把中文品牌概念拼成了英文标语

另有两处品牌名张冠李戴：**金百达是 KINGBANK**（不是 KingSpec），**雅浚的英文名是 ProArtist**（不是 YAJUN）。

处理方式：**查不到官方出处的一律不上页面**。最终收录 16 条可核实的，并单独做了一个「No short slogan published」板块，如实说明 Noctua、G.SKILL、Lian Li 等 5 家确实没有一句话标语——而不是替它们编一句。

完整记录见 [`slogans.md`](slogans.md)。

### 新增的验证工具

- `check-css.mjs` —— 解析 CSS，检查括号/分号配对、选择器是否存在。用来回答「为什么样式没生效」这类问题。这次它就证明了 CSS 语法完全正常，问题出在浏览器缓存。

### 又踩的坑

**浏览器缓存。** 改完 CSS 立刻刷新，浏览器仍用旧的 `styles.css`（里面没有新的类名），页面只剩纯文字。正确做法是 `Ctrl+F5` 强刷。这个现象看起来很像「CSS 写错了」，实际不是。

**`styles.css` 里混进了 nav 样式。** 文件里有一段早期试验留下的 `nav { ... }` 和 `nav a:hover{color: red;}`。它们和 `nav.css` 冲突（`styles.css` 后加载，同优先级下会盖掉），且全局的红色悬停会破坏导航外观。已删除——导航样式只应存在于 `nav.css`。

---

## 阶段八：真实交互与 CPU 数据

### 首页重做

原来是居中的小图 + 两行「Here are some…」占位链接。改成：

- 顶部一张主板大图，底部用 `mask-image` 渐变成透明，接上主标题
- 主标题左对齐（页面是「索引」性质，左对齐比居中更贴它的性格）
- 两个通栏按钮：文字在左、照片在右，照片左边缘渐变消失
- 删掉了指向 bilibili 的链接、两处占位句、两个重复的小图

**顺手解决的问题**：三张照片原始尺寸 4624px 宽、合计 8.1 MB，手机加载会很吃力。另存了 1800px / 1200px 的压缩版（合计 676 KB），原图保留不动。

### 深色模式开关

新增导航栏右侧的切换按钮。难点是：原来的深色样式写在
`@media (prefers-color-scheme: dark)` 里，而媒体查询**无法被点击覆盖**。

做法是把那些规则搬进新的 `theme.css`，每条重复两次：

```css
@media (prefers-color-scheme: dark) {
    html:not([data-theme]) .index { ... }   /* 跟随系统，但仅在访客没手动选过时 */
}
html[data-theme="dark"] .index { ... }      /* 手动选择，双向覆盖系统 */
```

`html:not([data-theme])` 是关键：一旦访客手动选了浅色，媒体查询里的写法就不再匹配，
系统即使是深色也不会拉回去。这样「默认跟随系统」和「手动覆盖」可以共存，不用复制一整套浅色规则。

`theme.js` 只管一件事：给 `<html>` 设 `data-theme` 并记进 `localStorage`。
为了让页面不在深色模式下闪一下白屏，四个页面 `<head>` 里各有一小段内联脚本，
在首次绘制前就把属性设好。

### CPU Explorer（替代原来的 project 页）

把桌面版程序（`cpu/` 里的 Tkinter + sqlite3 应用）的核心交互搬到网页：

| 桌面版 | 网页版 |
|---|---|
| 搜索框过滤列表 | 同 |
| 「对比列表」加入 / 移除 / 前后移动 | 点击加入对比，最多 3 个，第 4 个替换最早的 |
| 「开始对比」生成对比表 | 实时并排表格，数值列自动标出更高的一方 |

数据从 `cpu/cpus.db` 导出：30 列精简成 14 个对比真正用得到的字段，
去除 `™`、`Products formerly ` 这类噪音，3551 条压到 508 KB（gzip 后约 40 KB）。

页面原来的静态架构列表被这个可交互的版本取代，文件名从 `project.html` 改成 `cpus.html`。

### 又踩的坑

**1. `nav.css` 会给所有 `<nav>` 加吸顶样式。** 首页那两个按钮最初用 `<nav class="index-cards">` 包着，
结果整块被套上了吸顶 + 毛玻璃 —— 因为 `nav.css` 里的选择器是裸的 `nav`。改用 `<div>`。

**2. 用 `LastIndexOf` 插入 CSS 踩空。** 生成 `theme.css` 时想插到媒体查询闭合括号前，
但同一个标记出现了两次，`LastIndexOf` 拿到的是后面那个，规则被插到媒体查询外面 ——
那样深色下按钮颜色会在浅色模式下也生效。改用「先找到媒体块的真实闭合括号」再插入。

**3. 校验脚本的沙箱缺 `window`。** `parts.js` 加了 `window.updateThemeButton` 之后，
`verify-parts.mjs` 里的 `new Function` 少传一个参数直接报错。补上 `window` 桩即可。

**4. 测试脚本自己也会错。** CPU 对比测试一度报「3 列变成 4 列」，
查下来是统计列数的正则把表头左上角那个「Spec」单元格也算进去了 —— 代码没问题，是测试错了。
这类误报同样要当真去查，否则会去改本来正确的代码。

---

## 阶段九：清理仓库与补 Open Graph

### 数据管线搬进 tools/

`.tmp/` 里那些一次性脚本删掉之前，把真正有价值的部分挪到了 `tools/`：

- `export_cpus.py` —— 从 `cpu/cpus.db` 生成 `data/cpus.js`
- `check_data.py` —— 比对 CSV 与数据库，判断某个源文件是否冗余
- `test-cpu.mjs` / `test-theme.mjs` —— 两个不依赖浏览器的逻辑测试
- `README.md` —— 说明管线怎么用

顺手把脚本里硬编码的绝对路径改成从脚本位置推导，现在从任意目录都能跑。
**验证过可复现性：重新导出的 `data/cpus.js` 与之前字节完全一致。**

### 删掉的东西

| 目标 | 大小 | 原因 |
|---|---|---|
| `.pdfwork/` | 8.9 MB | 从 PDF 渲染的页面图片，随时能重新生成 |
| `images/og-image.png` | 4.2 MB | 已被压缩过的 `og-image.jpg`（67 KB）取代 |
| `p2/` | 0 | 两个空文件 |
| `.tmp/` | 0.6 MB | 一次性脚本与备份，有用的已移入 `tools/` |
| `1.pdf` | 2.2 MB | 教程原文，需要的内容已全部提取并落地 |

原始大图（8.1 MB）和 `cpu/`（3.7 MB）保留在本地。

### 从 git 索引移出

`.pdfwork/` 曾被提交进仓库（42 个文件），执行了 `git rm -r --cached .pdfwork`。
索引里已不再出现；历史里的旧提交仍保留，不影响使用。

### Open Graph 标签

四个页面的 `<head>` 各加 6 行（`og:title` / `og:description` / `og:image` /
`og:url` / `og:type` + `twitter:card`），由 `tools/add_og.py` 统一写入。

两个容易踩的点写进了注释：

- **`og:image` 必须是完整网址**，相对路径部分应用读不到
- **Open Graph 用 `property`，Twitter 用 `name`**，不能互换

`images/og-image.jpg` 实测 1200×630、66.7 KB，符合项目书要求（严格 1200×630、100 KB 以内）。

---

---

## 阶段十一：加上 GPU 页

### 为什么不是复制一份 CPU 页

`gpu.html` 要做的事和 `cpus.html` 一模一样：搜索、按厂商筛选、选三张并排对比。
唯一不同的是数据字段。

如果直接复制，`styles.css` 里那 578 行「浏览器」样式就要再来一份，
以后改一次布局得改两处，迟早会走形。

所以先把第 `[3]` 段改名：类名前缀从 `.cpu-*` 换成 `.explorer-*`，
两页共用同一套外观；**id 仍然各自独立**（`#cpu-list` / `#gpu-list`），
因为 id 是页面自己的入口，JS 靠它找元素。

改名涉及四个文件，一共 200 多处：

| 文件 | 改的是什么 |
|---|---|
| `styles.css` | 选择器与「作用对象」说明里的类名 |
| `theme.css` | 深色规则里的类名（两个半份各一份） |
| `cpus.html` | `class="cpu-*"` → `class="explorer-*"`，id 不动 |
| `cpu.js` | `querySelectorAll('.cpu-brand')`、拼进 `innerHTML` 的类名 |

改完立刻检查了三件事：`cpu.js` 语法、每个页面用到的类名是否都有样式、
以及一次模拟点击的冒烟测试（后文）。

### 新增的三个文件

**`data/gpus.js`** —— 从 `gpu/deepseek_csv_gpu.txt` 转出来的 94 条数据。
字段名压短（`s`=系列、`m`=名称、`a`=架构、`d`=核心代号、`c`=核心数、`f`=加速频率、
`v`=显存、`t`=显存类型、`r`=光追、`w`=TDP、`y`=发布日期），体积 13 KB。

**`gpu.js`** —— 照 `cpu.js` 改的，逻辑一字不差，换掉的是：元素 id、
`window.GPUS`、筛选用的品牌（NVIDIA / AMD / Intel）、对比表的行（11 行而不是 14 行）。

显存容量在原始数据里是 `16 GB` 或 `8 GB / 16 GB` 这种字符串，
对比表要判断谁更大，所以写了个 `vramNum()` 取第一个数字，展示仍然用原文。

**`gpu.html`** —— 结构和 `cpus.html` 一致，脚注多写了两个容易误读的点：
Intel Arc 的「核心数」是 Xe 核心而不是着色器数量；TDP 是非公版也会变的值。

### 首页与导航

- 导航从 3 个链接变成 4 个（Home / Slogans / CPUs / GPUs）。
  手机上 4 个链接挤在一行会溢出，所以补了 `@media (max-width: 400px)` 一档，
  把间距和字号再收紧一次。
- 首页从两张通栏卡片变成三张：标语、CPU、GPU。
  三张配图分别换成 `cx-web.jpg`、`g1620t-web.jpg`、`rtx2080-web.jpg`。
  前两张原图是 3.4 MB 和 5.5 MB、4624 像素宽，直接放上去等于让访客等十秒，
  所以和之前一样压成 1400px 宽的 `-web.jpg`（214 KB / 221 KB）。

### 验证方式

没有浏览器可用，所以写了个 Node 冒烟测试：用最小的 DOM 桩跑真实的 `cpu.js` 和 `gpu.js`，
断言数据条数、首屏行数、搜索命中、无结果空状态、品牌筛选、三次点选后对比表只有三列、
清空后回到空状态。CPU 和 GPU 各 10 项，共 20 项全部通过。

这一步是必要的：改名改了 200 多处，光看语法只能证明「不是语法错误」，
不能证明「点下去还有反应」。

---

### 修掉「Show more」的负数

列表全部展开后按钮还在，点下去文字变成「Show -26 more」。

JS 里明明写了 `el.more.hidden = rows.length <= state.shown`，
问题出在样式：`.explorer-more` 定的是 `display: block`，
而浏览器对 `[hidden]` 的默认规则是 `display: none`。
两者优先级相同，**作者样式赢过浏览器默认样式**，所以 `hidden` 根本没生效。

两处一起改才彻底：

- `styles.css` 补 `.explorer-more[hidden], .explorer-clear[hidden] { display: none; }`
- `cpu.js` / `gpu.js` 里算 `remaining`，小于等于 0 时不再拼文字；点击时也把
  `state.shown` 夹在总数以内，不让它无限增长

这类 bug 的特点是「逻辑看起来没错，错在它和样式的关系」。
所以验证时不能只跑 JS 断言，还得确认 CSS 里那条 `[hidden]` 规则在不在 ——
测试里专门加了一项去读 `styles.css`。

---

## 阶段十：交付前的整理

### 补上 CPU 页缺失的深色配色

页面从「语录 + 项目」改成「标语 + CPU」之后，`theme.css` 里仍然留着上一版的深色规则：
`.project-page`、`.arch-brand`、`.chip*` 共 16 条，而 `.cpu-*` **一条都没有**。

结果就是：切到深色模式后，其它三个页面都正常，只有 CPU 页仍是白底黑字。

修法是先删掉那 16 条指向已不存在元素的规则，再照 `styles.css` 里 CPU 段的浅色值配一套深色值。
配色的对应关系：

| 用途 | 浅色 | 深色 |
|---|---|---|
| 页面底色 / 正文 | `#fdfdfc` / `#1a1a1a` | `#0e0e0e` / `#ededed` |
| 卡片、输入框底色 | `#ffffff` | `#161616` |
| 分隔线 | `#e6e6e3` | `#262626` |
| 次要文字 | `#8a8a86` | `#9a9a96` |
| 更淡的说明文字 | `#a8a8a4` | `#6f6f6c` |

因为 `theme.css` 每条规则要写两遍（跟随系统一份、手动选择一份），所以这套规则一共 62 条。
改完用 `check-css` 确认规则数从 89 变成 135（删 16、加 62），括号依然配对。

### 删除开发脚本

网站运行时只加载 3 个 CSS、4 个 JS 和 `data/cpus.js`。其余脚本都是开发期用的，交付前全部删除：

| 删除 | 原本的用途 |
|---|---|
| `verify-parts.mjs` | 离线跑 `parts.js`，检查片段结构与四页接入 |
| `check-css.mjs` | 检查三个样式表的括号 / 分号配对 |
| `tools/export_cpus.py` | 从 `cpu/cpus.db` 生成 `data/cpus.js` |
| `tools/check_data.py` | 比对 CSV 与数据库，判断源文件是否冗余 |
| `tools/add_og.py` | 给四个页面批量写 Open Graph 标签 |
| `tools/test-cpu.mjs` / `tools/test-theme.mjs` | 不依赖浏览器的逻辑测试 |

数据已经导出成 `data/cpus.js`（508 KB、3551 条），所以删掉导出脚本不影响运行；
只是以后若要改「展示哪些字段」，需要重写这个脚本。

有一个代价要记住：`tools/` 当时只存在于本地、从来没提交过，删掉之后 git 里也捞不回来。
相比之下 `verify-parts.mjs` 和 `check-css.mjs` 进过历史，真要用还能从旧提交里恢复。

删文件之后，文件里指向它们的说法也会变成死链接，所以一并改了：

- 四个页面的 OG 说明：由「改 `tools/add_og.py` 里的 BASE」改为「四个页面里的这几行要一起改」
- `cpus.html` 与 `cpu.js` 的数据来源：由「`cpus.db → tools/export_cpus.py → data/cpus.js`」
  改为「`cpu/cpus.db` 导出为 `data/cpus.js`」
- `poster.html` 里的说明：改为「六行 meta 直接写在四个页面的 head 里」

### 重写 README

`README.md` 是给第一次打开这个项目的人看的，但里面还留着好几处上一版的事实：
`project.html`、`bilibili.jpg`、`styles-dd.css`、五个部分的样式划分、旧邮箱地址，
以及已经不存在的校验脚本。这些比「没写」更糟——照着做会找不到文件。

所以整篇按当前状态重写：目录结构、三个样式表的分工、深色模式的实现方式、
CPU 数据从哪来、已知问题清单，都对着实际文件核对过一遍。

### 其他

- `poster.html`（制作 OG 图的模板）已从项目里移除，`images/og-image.jpg` 保留。
- 四个页面的 favicon 已是 32×32 的 PNG（`images/favicon-32.png`），补了 `apple-touch-icon`。
