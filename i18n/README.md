# WebObsidian 中文汉化层（zh-cn 分支）

本目录是 `eiloogs/webobsidian` fork 的汉化层，目标：**不改上游源码，可持续同步上游更新**。

## 分支结构
- `main`：上游镜像（每次从 `upstream/main` 同步，保持纯净）
- `zh-cn`：汉化分支（= main + 本目录 + Dockerfile 两行）

## 汉化原理
上游 WebObsidian **没有 i18n**，UI 文案硬编码在 `web/src/**/*.tsx`，编译后原样进入 `server/public/assets/*.js`。

汉化做法是**构建后对编译产物做精确字符串替换**：
1. `zh-cn.json` — 英文→中文词条表
2. `apply.mjs` — **只处理 `index.html` 引用的主入口 chunk**（如 `index-CiWchfWP.js`），对完整字符串字面量做精确替换（`"New note"`→`"新建笔记"`），长 key 优先，纯字面量匹配（非正则，含 `() . ?` 的文案也安全），幂等。
   - ⚠️ **绝不遍历所有 `assets/*.js`**：通用词（`Delete`/`Clear`/`Commit`/`Copy`）在 react/codemirror/mermaid 等第三方 chunk 里是键码映射和语法解析器标识，全局替换会破坏删除键、Clear 键和 Mermaid 图表解析。主入口从 `index.html` 的 `<script src>` 动态解析，不靠文件名猜测。
3. `Dockerfile` — runtime 阶段加 2 行：`COPY i18n` + `RUN node i18n/apply.mjs`
4. 上游 `web/src` 一个字没改 → merge 上游几乎零冲突

## 日常维护
### 上游更新后同步
```bash
bash i18n/sync-upstream.sh
```
脚本会：fetch upstream → merge 到 zh-cn → push → 重建镜像。

### 上游新增了英文文案
```bash
node i18n/extract.mjs        # 列出未翻译词条
# 把新词补进 zh-cn.json
node i18n/apply.mjs /app/server/public   # 或重建镜像
```

### 冲突处理（极少）
- `Dockerfile` 冲突 → 保留带 `zh-cn 汉化补丁` 注释的 `COPY i18n` + `RUN node i18n/apply.mjs` 两行
- `web/src` 冲突 → 上游也改了文案，取上游新版（`git checkout --theirs`），再用 extract 补词条

## 回滚
删除 Dockerfile 里汉化两行即可回到纯英文上游版。

## 词表统计
438 条 UI 文案，覆盖设置/图谱/搜索/回收站/分享/快捷键/插件/Canvas/编辑器工具栏/应用简介等。已排除 SVG path、CSS 类名（含 `HyperMD-*`）、字体名、语言/语法格式专有名词（Common Lisp、VB.NET、ASN.1 等）、快捷键（Mod-*、Alt-*）、错误类名等技术标识符。

### 提取规则要点（血泪教训）
- **不要只扫双引号字面量**：漏掉单引号（`label: 'Bold'`）、无空格单词（`About`/`Paste`）、带标点长句、JSX 文本节点。
- **JSX 拆碎的句子**：形如 `Create a public link so <b>anyone with the URL</b> can read...` 在产物里是多个独立字面量（含首尾空格），需把**每个片段**单独作为词条，例如 `"Create a public link so "`、`" can read this note without login."`。片段的小写开头（`anyone with the URL`）也要纳入。
- **长度不设上限**：应用简介等长句达 110+ 字符，别用 70 字符截断。
- `extract.mjs` 已覆盖上述四种形态。
