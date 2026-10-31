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

APP_DIR="/home/rocky/financial_management"
HEALTH_URL="http://127.0.0.1:3004/"
SWAPPED=0

# Build mới đã thay .next nhưng app không lên → trả lại bản cũ (.next-prev) để web không chết.
rollback() {
  echo "==> Rollback về bản build trước..."
  cd "$APP_DIR"
  if [ -d ".next-prev" ]; then
    rm -rf .next
    mv .next-prev .next
    pm2 delete ecosystem.config.js > /dev/null 2>&1 || true
    pm2 start ecosystem.config.js --update-env || true
  fi
}

on_failure() {
  local exit_code=$?
  local failed_line=$1
  local err_msg="❌ [Finance Management] Deploy thất bại! Lỗi tại dòng $failed_line (Mã lỗi: $exit_code)"

  if [ "$SWAPPED" = "1" ]; then
    rollback
    err_msg="$err_msg. Đã rollback về bản trước."
  else
    err_msg="$err_msg. Bản cũ vẫn đang chạy."
  fi

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

echo "==> Di chuyển đến thư mục project..."
cd "$APP_DIR"
mkdir -p logs

echo "==> Xóa lock files cũ..."
rm -f package-lock.json bun.lockb

echo "==> Lấy mới nhất code..."
git pull --rebase --autostash

# Từ đây tới bước đổi build, app cũ vẫn chạy bình thường: build lỗi thì web không bị gián đoạn.
echo "==> Cài đặt dependencies (theo bun.lock)..."
bun install --frozen-lockfile

echo "==> Build vào thư mục tạm .next-build..."
rm -rf .next-build
NEXT_DIST_DIR=.next-build bun run build

echo "==> Đổi sang bản build mới..."
rm -rf .next-prev
if [ -d ".next" ]; then
  mv .next .next-prev
fi
mv .next-build .next
SWAPPED=1

echo "==> Khởi động lại service..."
# delete + start (không dùng restart) để thay đổi trong ecosystem.config.js (exec_mode...) luôn được áp dụng.
pm2 delete ecosystem.config.js > /dev/null 2>&1 || true
pm2 start ecosystem.config.js --update-env

echo "==> Kiểm tra web đã lên..."
healthy=0
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "$HEALTH_URL"; then
    healthy=1
    break
  fi
  sleep 2
done
if [ "$healthy" != "1" ]; then
  echo "Web không phản hồi tại $HEALTH_URL"
  false
fi
pm2 save || true

# ==================== GỬI THÀNH CÔNG ====================
success_msg="🚀 [Finance Management] Deploy thành công"
echo "$success_msg"
send_zalo_msg "$success_msg"