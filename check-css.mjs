// 基础 CSS 语法检查：能否被正确解析、选择器是否合法、括号/分号是否配对
// 不依赖任何第三方库

import { readFile } from 'node:fs/promises';

const files = ['styles.css', 'nav.css', 'theme.css'];

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
}

function checkCss(css) {
  const clean = stripComments(css);
  const problems = [];
  const rules = [];

  let depth = 0;
  let i = 0;
  let selectorStart = 0;
  let blockStart = -1;

  while (i < clean.length) {
    const ch = clean[i];

    if (ch === '{') {
      const sel = clean.slice(selectorStart, i).trim();
      if (!sel) problems.push(`第 ${clean.slice(0, i).split('\n').length} 行：出现空选择器（多余的 {）`);
      rules.push({ selector: sel, line: clean.slice(0, i).split('\n').length, depth });
      if (depth === 0) blockStart = i;
      depth++;
      selectorStart = i + 1;
    } else if (ch === '}') {
      depth--;
      if (depth < 0) {
        problems.push(`第 ${clean.slice(0, i).split('\n').length} 行：多余的 }`);
        depth = 0;
      }
      const body = blockStart >= 0 ? clean.slice(blockStart, i) : '';
      if (rules.length) rules[rules.length - 1].bodyLen = body.length;
      selectorStart = i + 1;
    } else if (ch === ';' || ch === '\n') {
      if (depth === 0 && ch === ';') {
        // 顶层出现分号：可能是残缺的声明
        const line = clean.slice(0, i).split('\n').length;
        problems.push(`第 ${line} 行：顶层出现孤立的 ;`);
      }
      if (depth === 0) selectorStart = i + 1;
    }
    i++;
  }

  if (depth !== 0) problems.push(`大括号未闭合：还差 ${depth} 个 }`);

  return { problems, rules };
}

for (const f of files) {
  const css = await readFile(f, 'utf8');
  const { problems, rules } = checkCss(css);

  console.log(`\n=== ${f} ===`);
  console.log(`规则数（含 @media 内的）: ${rules.length}`);

  // 检查是否存在我们关心的选择器。
  // 用「包含」而不是「完全相等」：同一个类在不同文件里可能是带前缀的，
  // 例如 theme.css 里写的是 html[data-theme="dark"] .pill，
  // 完全相等会误报成「样式丢了」。
  const want = {
    'styles.css': ['.slogans-wrap', '.slogans-grid', '.slogan', '.slogan-brand',
                   '.slogan-line', '.blanks', '.slogans-page',
                   '.index-card', '.index-hero-img', '.index-title',
                   '.cpu-wrap', '.cpu-list', '.cpu-table', '.cpu-brand',
                   '.contact-list'],
    'nav.css': ['nav', '.pill', '.theme-toggle', '#site-footer'],
    'theme.css': ['html[data-theme="dark"]', 'html:not([data-theme])'],
  }[f] || [];

  for (const w of want) {
    const found = rules.some((r) => r.selector.includes(w));
    console.log(`  ${found ? '✅' : '❌'} 选择器 ${w}`);
  }

  if (problems.length === 0) {
    console.log('  ✅ 语法检查通过，无括号/分号问题');
  } else {
    console.log('  ❌ 发现问题：');
    problems.forEach((p) => console.log('     ' + p));
  }

  // 列出 @media 块
  const medias = [...stripComments(css).matchAll(/@media[^{]*\{/g)];
  console.log(`  @media 块: ${medias.length} 个`);
}
