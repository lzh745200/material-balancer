#!/bin/bash
# 物资均衡分配工具 · 一键安装/卸载脚本（麒麟 V10 / Debian 系）
#
# 背景：麒麟 V10 自带的 deb 图形安装器（Python 实现）解析第三方 deb 时
# 可能报 "local variable 'deb' referenced before assignment" 而无法安装。
# 本脚本完全不依赖系统安装器：解压 tar.gz 后执行一次即可完成安装。
#
# 用法：
#   sudo bash install.sh             # 系统级安装到 /opt（含桌面菜单）
#   bash install.sh                  # 无 root 时安装到 ~/.local/opt（仅当前用户）
#   sudo bash install.sh uninstall   # 卸载（清掉程序与桌面快捷方式，不动用户数据）
set -e

uninstall() {
  for DEST in "/opt/物资均衡分配工具" "$HOME/.local/opt/物资均衡分配工具"; do
    if [ -d "$DEST" ]; then
      echo "移除 $DEST"
      rm -rf "$DEST"
    fi
  done
  for D in "/usr/share/applications" "$HOME/.local/share/applications"; do
    rm -f "$D/material-balancer.desktop" 2>/dev/null || true
  done
  echo "卸载完成。用户数据（草稿 / 最近文件）保留在 ~/.config，可手动删除。"
  exit 0
}

[ "$1" = "uninstall" ] && uninstall

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="/opt/物资均衡分配工具"

if [ "$(id -u)" = "0" ]; then
  DESKTOP_DIR="/usr/share/applications"
else
  DEST="$HOME/.local/opt/物资均衡分配工具"
  DESKTOP_DIR="$HOME/.local/share/applications"
fi

echo "安装目录：$DEST"
mkdir -p "$DEST"
# 升级安装：先清掉旧文件，避免不同版本残留混杂
rm -rf "$DEST"/*
cp -rf "$SRC/." "$DEST/"

# 沙箱助手必须为 root 所有且带 SUID 位（4755）；失败不影响启动（应用会自动降级）
chown root:root "$DEST/chrome-sandbox" 2>/dev/null || true
chmod 4755 "$DEST/chrome-sandbox" 2>/dev/null || true
chmod +x "$DEST/material-balancer" 2>/dev/null || true

# 桌面菜单快捷方式
mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_DIR/material-balancer.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=物资均衡分配工具
Name[zh_CN]=物资均衡分配工具
Comment=将物资清单公平分配给人员并生成 A4 签字表格（完全离线）
Exec=$DEST/material-balancer
Icon=$DEST/resources/icon.png
Terminal=false
Categories=Utility;
StartupWMClass=material-balancer
EOF

update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

echo "安装完成。"
echo "  - 从桌面/开始菜单打开「物资均衡分配工具」"
echo "  - 或直接运行：$DEST/material-balancer"
echo "  - 卸载：sudo bash $DEST/install.sh uninstall"
