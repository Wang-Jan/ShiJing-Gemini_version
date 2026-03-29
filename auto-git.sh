#!/bin/bash
cd /home/admin/shijing

if [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m "自动同步 $(date '+%Y-%m-%d %H:%M:%S')"
  git pull origin main --rebase
  git push origin main
fi
