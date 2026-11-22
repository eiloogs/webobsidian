#!/usr/bin/env node
/**
 * WebObsidian 汉化补丁 —— 构建后对编译产物做精确字符串替换。
 *
 * 设计原则：
 *   1. 不改任何上游源码，只改编译后的 server/public/assets/*.js
 *   2. 词条来自 zh-cn.json，按 key 长度降序替换（避免 "New note" 被 "New" 先截胡）
 *   3. 只替换完整 JS 字符串字面量（"xxx" / 'xxx' / `xxx`），不碰 import 路径、变量名
 *   4. 幂等：重复执行不会二次替换（中文目标不会被再次匹配）
 *
 * 用法（在容器内 build 之后）：
 *   node i18n/apply.mjs /app/server/public
 */
import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_DIR = process.argv[2] || 'server/public';
const DICT_PATH = path.resolve('i18n/zh-cn.json');

const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
// 长 key 优先，避免子串冲突
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

let totalReplaced = 0;
const perFile = [];

for (const file of walk(PUBLIC_DIR)) {
  let src = fs.readFileSync(file, 'utf-8');
  let count = 0;
  for (const [en, zh] of entries) {
    // 只匹配被引号完整包裹的字面量；转义的引号不处理（UI 文案里没有）
    const patterns = [
      new RegExp(`"${en}"`, 'g'),
      new RegExp(`'${en}'`, 'g'),
      new RegExp('`' + en + '`', 'g'),
    ];
    for (const re of patterns) {
      const hits = (src.match(re) || []).length;
      if (hits) {
        const quote = re.source[0];
        src = src.replace(re, `${quote}${zh}${quote}`);
        count += hits;
      }
    }
  }
  if (count) {
    fs.writeFileSync(file, src);
    totalReplaced += count;
    perFile.push(`${path.basename(file)}: ${count}`);
  }
}

console.log(`[i18n] 汉化完成：${totalReplaced} 处替换，涉及 ${perFile.length} 个文件`);
perFile.slice(0, 10).forEach((l) => console.log('  ' + l));
