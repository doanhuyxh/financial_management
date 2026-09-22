#!/bin/bash
set -e

# 1. Hàm gửi tin nhắn qua Zalo webhook
send_zalo_msg() {
  local message="$1"
  local escaped_msg
  escaped_msg=$(printf '%s' "$message" | sed 's/"/\\"/g')
  curl -s --location 'https://back-end-google.lokid.me/api/webhook/zalo-personal/6989c984e35a43c3a14202ca/send-message' \
    --header 'x-user-api-key: 5i29e6j6770ddfaz95kxxnkfawubni8g' \
    --header 'Content-Type: application/json' \
    --data "{
      \"text\": \"$escaped_msg\",
      \"threadId\": \"6351187366489398959\",
      \"threadType\": 0
    }" > /dev/null 2>&1 || true
}

on_failure() {
  local exit_code=$?
  local failed_line=$1
  local err_msg="❌ Deploy THẤT BẠI! Lỗi tại dòng $failed_line (Mã lỗi: $exit_code)"
  
  echo "$err_msg"
  send_zalo_msg "$err_msg"
}

trap 'on_failure $LINENO' ERR

# ==================== NỘI DUNG DEPLOY ====================

export NODE_VERSION="22"
export NVM_DIR="/root/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  nvm use "${NODE_VERSION}"
fi

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "==> Đang pull code..."
git pull --rebase --autostash

echo "==> Cài đặt dependencies..."
bun i

echo "==> Build dự án..."
bun run build

echo "==> Khởi động lại service..."
pm2 restart ecosystem.config.js --update-env

# ==================== GỬI THÀNH CÔNG ====================
success_msg="🚀 Deploy THÀNH CÔNG trên server!"
echo "$success_msg"
send_zalo_msg "$success_msg"