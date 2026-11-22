#!/usr/bin/env node
/**
 * WebObsidian 汉化补丁 —— 构建后对编译产物做精确字符串替换。
 *
 * 设计原则：
 *   1. 不改任何上游源码，只改编译后的 server/public/assets/*.js
 *   2. 只处理主应用入口 chunk（index-*.js）——UI 文案全在这里；
 *      第三方库（react/codemirror/mermaid 等）是独立 chunk，一律不动，
 *      否则通用词（Delete/Clear/Commit）会破坏键码映射和语法解析器
 *   3. 词条来自 zh-cn.json，按 key 长度降序替换（避免 "New note" 被 "New" 截胡）
 *   4. 只替换完整 JS 字符串字面量（"xxx" / 'xxx' / `xxx`），不碰 import 路径、变量名
 *   5. 用纯字面量 split/join（非正则），含 ( ) . ? 等字符的文案也能正确替换
 *   6. 幂等：重复执行不会二次替换
 *
 * 用法（在容器内 build 之后）：
 *   node i18n/apply.mjs /app/server/public
 */
import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_DIR = process.argv[2] || 'server/public';
const DICT_PATH = path.resolve('i18n/zh-cn.json');

const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
const entries = Object.entries(dict).sort((a, b) => b[0].length - a[0].length);

function walk(dir) {
  let out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out = out.concat(walk(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

// 从 index.html 解析真正的主入口 chunk，而不是靠文件名猜测
// （第三方库也可能产出 index-XXXX.js 形式的 chunk）
const htmlPath = path.join(PUBLIC_DIR, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');
const entryMatch = html.match(/src="\/(assets\/index-[^"]+\.js)"/);
if (!entryMatch) {
  console.error('[i18n] 无法在 index.html 中定位主入口 chunk，跳过汉化');
  process.exit(0);
}
const entryFile = path.resolve(PUBLIC_DIR, entryMatch[1]);
console.log(`[i18n] 主入口：${path.basename(entryFile)}`);

let totalReplaced = 0;
const perFile = [];

{
  let src = fs.readFileSync(entryFile, 'utf-8');
  let count = 0;
  for (const [en, zh] of entries) {
    for (const q of ['"', "'", '`']) {
      const from = q + en + q;
      if (src.includes(from)) {
        count += src.split(from).length - 1;
        src = src.split(from).join(q + zh + q);
      }
    }
  }
  if (count) {
    fs.writeFileSync(entryFile, src);
    totalReplaced += count;
    perFile.push(`${path.basename(entryFile)}: ${count}`);
  }
}

console.log(`[i18n] 汉化完成：${totalReplaced} 处替换，涉及 ${perFile.length} 个文件`);
perFile.slice(0, 12).forEach((l) => console.log('  ' + l));
