备份说明
========

备份时间：2026-09-20 11:21:08

这批文件是「首页样式与语录页样式分开成两个 CSS 文件」那一版的状态。
后来按需求把它们合并回了 styles.css 一个文件，所以这里留档。

文件对照
--------

styles.quotes.20260920-112108.css
    当时的 styles.css —— 只含 quotes.html（语录页）的样式，160 行

styles.index.20260920-112108.css
    当时的 styles-index.css —— 只含 index.html（首页）的样式，167 行

index.20260920-112108.html
    当时的 index.html，引用的是 styles-index.css

quotes.20260920-112108.html
    当时的 quotes.html，引用的是 styles.css


如何回退到这一版
----------------

1. 复制回主目录并改名：

       copy backup\styles.quotes.20260920-112108.css styles.css
       copy backup\styles.index.20260920-112108.css  styles-index.css
       copy backup\index.20260920-112108.html        index.html
       copy backup\quotes.20260920-112108.html       quotes.html

2. 注意：那两个 HTML 里引用的样式表文件名和现在不同
   （index.html 引用 styles-index.css），必须一起复制回来，
   只换 CSS 不换 HTML 会导致首页样式全部失效。


更早的版本
----------

同目录下的 styles.css.bak 系列（如果存在）是更早的备份。
