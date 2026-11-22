# WebObsidian 中文汉化层（zh-cn 分支）

本目录是 `eiloogs/webobsidian` fork 的汉化层，目标：**不改上游源码，可持续同步上游更新**。

## 分支结构
- `main`：上游镜像（每次从 `upstream/main` 同步，保持纯净）
- `zh-cn`：汉化分支（= main + 本目录 + Dockerfile 两行）

## 汉化原理
上游 WebObsidian **没有 i18n**，UI 文案硬编码在 `web/src/**/*.tsx`，编译后原样进入 `server/public/assets/*.js`。

汉化做法是**构建后对编译产物做精确字符串替换**：
1. `zh-cn.json` — 英文→中文词条表
2. `apply.mjs` — 遍历 `assets/*.js`，只替换完整字符串字面量（`"New note"`→`"新建笔记"`），长 key 优先，幂等
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
约 145 条 UI 文案，覆盖设置/图谱/搜索/回收站/快捷键/插件等。SVG 图标 path、字体名等已排除。
