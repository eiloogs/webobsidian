#!/usr/bin/env bash
# 同步上游更新到汉化分支（在 zh-cn 分支上执行）
#
# 原理：汉化层只动了 Dockerfile（加2行）+ 新增 i18n/ 目录，
#       上游改的是 web/src/**。两边几乎不重叠，merge 通常无冲突。
#
# 用法：bash i18n/sync-upstream.sh
set -e

BRANCH="zh-cn"

echo "=== 0. 确认当前分支 ==="
cur=$(git branch --show-current)
[ "$cur" = "$BRANCH" ] || { echo "请先切到 $BRANCH 分支"; exit 1; }

echo "=== 1. 拉取上游 ==="
git fetch upstream

echo "=== 2. 合并上游到 $BRANCH ==="
# --no-edit 自动用默认提交信息；若有冲突会停下，见下方处理
git merge upstream/main --no-edit || {
  echo ""
  echo "!! 有冲突。汉化层冲突处理原则："
  echo "   - Dockerfile 冲突：保留含 'zh-cn 汉化补丁' 标记的两行 COPY/RUN"
  echo "   - 其余 web/src 冲突：上游也可能改了文案，先 'git checkout --theirs' 取新版，"
  echo "     然后运行 'node i18n/extract.mjs' 找出新增英文，补进 zh-cn.json 即可"
  echo "   解决后：git add -A && git commit"
  exit 1
}

echo "=== 3. 推送汉化分支 ==="
git push origin "$BRANCH"

echo "=== 4. 重建并验证汉化 ==="
docker compose up -d --build
echo "完成。打开 http://10.0.0.10:8787/ 检查界面。"
