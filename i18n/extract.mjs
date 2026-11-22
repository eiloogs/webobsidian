#!/usr/bin/env node
/**
 * 扫描 web/src 里的英文显示文案，列出尚未翻译的条目。
 * 上游更新后运行它，把新文案补进 zh-cn.json。
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
    else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const found = new Map();
for (const file of walk(SRC)) {
  const s = fs.readFileSync(file, 'utf-8');
  const candidates = [
    ...[...s.matchAll(/>\s*([A-Z][A-Za-z][A-Za-z0-9 ]{1,35})\s*</g)].map((m) => m[1].trim()),
    ...[...s.matchAll(/(?:title|placeholder|aria-label|label)="([A-Z][A-Za-z0-9 ]{1,35})"/g)].map((m) => m[1]),
    ...[...s.matchAll(/"([A-Z][A-Za-z0-9]+(?: [A-Za-z0-9]+){0,5})"/g)].map((m) => m[1]),
  ];
  for (const t of candidates) {
    // 过滤 SVG path / 字体名 / 已是 SVG 坐标的串
    if (!t.includes(' ')) continue;
    if (/^M\d/.test(t)) continue;
    if (/^(Segoe|Promise|WebObsidian)/.test(t)) continue;
    if (existing.has(t)) continue;
    if (!found.has(t)) found.set(t, file);
  }
}

console.log(`未翻译文案：${found.size} 条`);
for (const [text, file] of [...found].sort()) {
  console.log(`  [${file}] "${text}"`);
}
