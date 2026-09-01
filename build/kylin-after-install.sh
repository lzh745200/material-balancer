#!/bin/bash
# deb 安装后脚本：确保 chrome-sandbox 为 root 所有且带 SUID 位（4755）。
# 麒麟 V10 等发行版内核默认关闭非特权 user namespace，
# 沙箱助手权限不对时 Electron 会直接拒绝启动（FATAL setuid_sandbox_host.cc）。
# 脚本对任何失败都宽容处理，绝不阻塞安装。
for d in "/opt/物资均衡分配工具" "/opt/material-balancer"; do
  if [ -f "$d/chrome-sandbox" ]; then
    chown root:root "$d/chrome-sandbox" 2>/dev/null || true
    chmod 4755 "$d/chrome-sandbox" 2>/dev/null || true
  fi
done
exit 0
