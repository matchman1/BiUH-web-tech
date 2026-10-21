// 离线验证 parts.js 的片段注入链路（不需要服务器）
//
// parts.js 用 load(file, target) 把两个片段注入两个空元素：
//   nav.html    -> #site-header
//   footer.html -> #site-footer
//
// 用 Node 原生读文件模拟 fetch，用极简 DOM 模拟浏览器 API。

import { readFile } from 'node:fs/promises';

const DIR = 'C:/Users/itx/Desktop/BiUH-web/';
const PAGES = ['index.html', 'slogans.html', 'cpus.html', 'contact.html'];

// ---------------------------------------------------------------------------
// 极简 DOM 模拟
// ---------------------------------------------------------------------------

function makeDom(elements, links, pill) {
  return {
    getElementById: (id) => elements[id] ?? null,
    querySelector: (sel) => (sel === 'nav .pill' ? pill : null),
    querySelectorAll: (sel) => {
      if (sel === 'nav .links a') {
        return links.map((l) => ({
          getAttribute: (n) => (n === 'href' ? l.href : null),
          classList: { add: (c) => l.classes.add(c) },
        }));
      }
      return [];
    },
  };
}

function parseNavLinks(navHtml) {
  const ul = navHtml.match(/<ul class="links">([\s\S]*?)<\/ul>/);
  if (!ul) return [];
  return [...ul[1].matchAll(/<a\s+href="([^"]+)"/g)].map((m) => ({
    href: m[1],
    classes: new Set(),
  }));
}

// ---------------------------------------------------------------------------
// 片段结构校验
// ---------------------------------------------------------------------------

function checkFragment(html, kind) {
  const problems = [];
  if (/<!DOCTYPE/i.test(html)) problems.push('片段不该有 DOCTYPE');
  if (/<html[\s>]/i.test(html)) problems.push('片段不该有 <html>');
  if (/<body[\s>]/i.test(html)) problems.push('片段不该有 <body>');

  if (kind === 'nav') {
    if (!/<nav[\s>]/.test(html)) problems.push('缺少 <nav>');
    if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(html))
      problems.push('SVG 的 xmlns 不是标准 http:// 值');
    if (!/class="logo"/.test(html)) problems.push('缺少 .logo');
    if (!/class="links"/.test(html)) problems.push('缺少 .links');
    if (!/class="pill"/.test(html)) problems.push('缺少 .pill');
    for (const f of ['index.html', 'slogans.html', 'cpus.html'])
      if (!html.includes(`href="${f}"`)) problems.push(`缺少指向 ${f} 的链接`);
    if (!/<li>\s*<a href="[^"]+">[^<]*<\/a>\s*<\/li>/.test(html))
      problems.push('<li> 没有正确包住 <a>');
  }

  if (kind === 'footer') {
    if (!/<p>/.test(html)) problems.push('缺少 <p>（署名行）');
    if (!/<address>/.test(html)) problems.push('缺少 <address>');
    if (!/mailto:/.test(html)) problems.push('<address> 里没有 mailto 链接');
    if (!/<address>[\s\S]*<\/address>/.test(html)) problems.push('<address> 未闭合');
  }

  return problems;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

(async () => {
  const navHtml = await readFile(DIR + 'nav.html', 'utf8');
  const footerHtml = await readFile(DIR + 'footer.html', 'utf8');
  const partsJs = await readFile(DIR + 'parts.js', 'utf8');
  console.log(`读入 nav.html ${navHtml.length}B / footer.html ${footerHtml.length}B / parts.js ${partsJs.length}B\n`);

  console.log('=== 片段结构校验 ===');
  let problems = 0;
  for (const [name, html, kind] of [
    ['nav.html', navHtml, 'nav'],
    ['footer.html', footerHtml, 'footer'],
  ]) {
    const p = checkFragment(html, kind);
    problems += p.length;
    console.log(`${name}: ${p.length === 0 ? '✅ 结构正确（无骨架标签）' : '❌ ' + p.join('; ')}`);
  }

  // Contact 药丸属性
  console.log('\n=== Contact 药丸属性 ===');
  const pillHtml = navHtml.match(/<a class="pill"([^>]*)>/);
  if (pillHtml) {
    const a = pillHtml[1];
    console.log(`  ${a.includes('href="contact.html"') ? '✅' : '❌'} 指向 contact.html`);
    console.log(`  ${a.includes('target="_blank"') ? '✅' : '❌'} 新标签页打开`);
    console.log(`  ${a.includes('rel="noopener"') ? '✅' : '❌'} 带 noopener`);
  } else {
    console.log('  ❌ 没找到药丸按钮');
    problems++;
  }

  // parts.js 是否写成了函数、是否调用了两次
  console.log('\n=== parts.js 结构（教程第 42 页要求）===');
  const hasFn = /function\s+load\s*\(\s*file\s*,\s*target\s*\)/.test(partsJs);
  const callNav = /load\(\s*['"]nav\.html['"]\s*,\s*['"]site-header['"]\s*\)/.test(partsJs);
  const callFooter = /load\(\s*['"]footer\.html['"]\s*,\s*['"]site-footer['"]\s*\)/.test(partsJs);
  // 统计调用次数时必须先去掉注释，否则注释里的示例代码会被算进去
  const code = partsJs
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
  const navCalls = (code.match(/load\(\s*['"]nav\.html['"]/g) || []).length;
  const footerCalls = (code.match(/load\(\s*['"]footer\.html['"]/g) || []).length;
  console.log(`  ${hasFn ? '✅' : '❌'} 定义了 load(file, target) 函数`);
  console.log(`  ${callNav ? '✅' : '❌'} 代码里有 load('nav.html', 'site-header')`);
  console.log(`  ${callFooter ? '✅' : '❌'} 代码里有 load('footer.html', 'site-footer')`);
  console.log(`  ${navCalls === 1 ? '✅' : '❌'} nav.html 在代码里只调用一次（实际 ${navCalls} 次，注释不计）`);
  console.log(`  ${footerCalls === 1 ? '✅' : '❌'} footer.html 在代码里只调用一次（实际 ${footerCalls} 次，注释不计）`);
  if (!hasFn || !callNav || !callFooter || navCalls !== 1 || footerCalls !== 1) problems++;

  // 逐个页面执行 parts.js
  const links = parseNavLinks(navHtml);
  console.log('\n=== 逐页执行 parts.js ===');
  let allOk = true;

  for (const page of PAGES) {
    links.forEach((l) => l.classes.clear());

    const elements = { 'site-header': { innerHTML: '' }, 'site-footer': { innerHTML: '' } };
    const pill = { classes: new Set() };
    const document = makeDom(elements, links, {
      getAttribute: (n) => (n === 'href' ? 'contact.html' : null),
      classList: { add: (c) => pill.classes.add(c) },
    });
    const location = { pathname: '/' + page };

    const fetchShim = async (file) => ({
      text: async () => (file === 'nav.html' ? navHtml : footerHtml),
    });

    // parts.js calls window.updateThemeButton() after the nav is injected, so the
    // shim needs a window to look at. The real one is defined by theme.js.
    const windowShim = {
      updateThemeButton: () => { themeSynced = true; },
    };
    let themeSynced = false;

    const fn = new Function('fetch', 'document', 'location', 'window',
      `"use strict";\n${partsJs}`);
    await fn(fetchShim, document, location, windowShim);
    // 等 promise 链跑完
    await new Promise((r) => setTimeout(r, 20));

    const navInjected = elements['site-header'].innerHTML;
    const footInjected = elements['site-footer'].innerHTML;
    const navOk = navInjected.includes('<nav') && navInjected.includes('class="links"');
    const footOk = footInjected.includes('<address') && footInjected.includes('mailto:');

    const active = links.filter((l) => l.classes.has('active')).map((l) => l.href);
    const pillActive = pill.classes.has('active');
    const expectPill = page === 'contact.html';
    const activeOk = expectPill
      ? active.length === 0 && pillActive
      : active.length === 1 && active[0] === page && !pillActive;

    if (!navOk || !footOk || !activeOk) allOk = false;

    console.log(`\n${page}:`);
    console.log(`  #site-header 注入: ${navOk ? '✅' : '❌'}  (${navInjected.length}B)`);
    console.log(`  #site-footer 注入: ${footOk ? '✅' : '❌'}  (${footInjected.length}B)`);
    console.log(`  当前页高亮: ${activeOk ? '✅' : '❌'}  链接[${active.join(', ')}]  药丸${pillActive ? '高亮' : '未高亮'}`);
  }

  // 页面接入检查
  console.log('\n=== 四页接入检查 ===');
  for (const page of PAGES) {
    const html = await readFile(DIR + page, 'utf8');
    const h = /<header id="site-header"><\/header>/.test(html);
    const f = /<footer id="site-footer"><\/footer>/.test(html);
    const s = /<script src="parts\.js"><\/script>/.test(html);
    const order = html.indexOf('parts.js') < html.indexOf('</body>');
    const okAll = h && f && s && order;
    if (!okAll) allOk = false;
    console.log(`  ${page.padEnd(14)} header:${h ? '✅' : '❌'} footer:${f ? '✅' : '❌'} parts.js:${s ? '✅' : '❌'} ${order ? '✅在body前' : '❌位置错'}`);
  }

  console.log('\n=== 结论 ===');
  const pass = allOk && problems === 0;
  console.log(pass
    ? '✅ 全部通过：两个片段结构正确，四页导航与页脚注入、高亮均正常'
    : '❌ 有问题，见上方 ❌ 项');
  process.exit(pass ? 0 : 1);
})();
