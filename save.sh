#!/bin/bash
# 暗域摸金 - 一键保存脚本
# 用法: bash save.sh "提交说明"

cd "$(dirname "$0")"

MSG="${1:-更新代码}"
git add -A
git commit -m "$MSG"
echo ""
echo "✅ 已提交: $MSG"
echo "📁 提交数: $(git rev-list --count HEAD)"
echo "📄 文件数: $(git ls-files | wc -l)"
echo ""
echo "💡 想备份到 GitHub？执行："
echo "   git remote add origin https://github.com/你的用户名/暗域摸金.git"
echo "   git push -u origin main"
