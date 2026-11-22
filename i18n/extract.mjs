#!/usr/bin/env node
/**
 * 扫描 web/src 里的英文显示文案，列出尚未翻译的条目。
 * 上游更新后运行它，把新文案补进 zh-cn.json。
 *
 * 覆盖形态：JSX 文本节点、title/placeholder/aria-label/label 属性、
 *          单/双引号字符串字面量（含对象属性、数组项、JSX 表达式内字符串）。
 * 过滤：SVG path、快捷键、字体名、技术标识符、异常/类型名、CSS 值。
 *
 * 用法：node i18n/extract.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'web/src';
const DICT = JSON.parse(fs.readFileSync('i18n/zh-cn.json', 'utf-8'));
const existing = new Set(Object.keys(DICT));

function walk(dir) {
  let out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (/\.tsx?$/.test(name) && !p.includes('/i18n/')) out.push(p);
  }
  return out;
}

// 明显不是用户文案的技术噪音
const NOISE = [
  /^M\d/,                                   // SVG path 坐标
  /^(Mod|Alt|Ctrl|Shift|Cmd|Meta)-/,        // 快捷键组合
  /^(Content-Type|POST|GET|PUT|DELETE)$/,
  /^HyperMD/,                               // CodeMirror 内部 class
  /^(Segoe UI|Arial|monospace|sans-serif)$/,// 字体
  /(Error|Exception|Warning|Assertion|Error$)/, // 异常/类型名
  /^(on|is|has|get|set|use|render|handle)[A-Z]/, // 代码标识符
  /^(application|text)\//,                  // MIME
  /^Variable /,                             // CodeMirror 模式名
];
function isNoise(t) {
  if (NOISE.some((r) => r.test(t))) return true;
  // 无空格且无点/连字符/括号的单个驼峰词 —— 多为标识符
  if (!/[\s.\-!?()]/.test(t)) return true;
  return false;
}

const found = new Map();
for (const file of walk(SRC)) {
  const s = fs.readFileSync(file, 'utf-8');
  const candidates = [
    ...[...s.matchAll(/>\s*([A-Z][A-Za-z][A-Za-z0-9 ]{1,40})\s*</g)].map((m) => m[1].trim()),
    ...[...s.matchAll(/(?:title|placeholder|aria-label|label|name|desc)="([A-Z][A-Za-z0-9 ,.:!?'()\-/]{1,80})"/g)].map((m) => m[1].trim()),
    ...[...s.matchAll(/['"]([A-Z][A-Za-z0-9][A-Za-z0-9 ,.:\-!?()/_']{2,80})['"]/g)].map((m) => m[1].trim(" '")),
  ];
  for (const t of candidates) {
    if (isNoise(t) || existing.has(t)) continue;
    // 粘连了代码语法的残片（逗号后跟 icon:/dt:/hint: 等，或三元/对象边界）
    if (/',\s*(icon|dt|hint|onClick):|'\s*:\s*'|\s\?\s|'\s*\{/.test(s.slice(s.indexOf(t), s.indexOf(t) + t.length + 20))) continue;
    if (!found.has(t)) found.set(t, file);
  }
}

console.log(`未翻译文案：${found.size} 条`);
for (const [text, file] of [...found].sort()) {
  console.log(`  [${file}] "${text}"`);
}
