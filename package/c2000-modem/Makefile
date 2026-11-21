#
# c2000-modem —— NRadio C2000 Ultra 的 5G 模组（TDTECH MT5700M-CN）支持
#
# 这个包负责：
#   * 认出 USB 侧冒出来的 NCM/RNDIS 网卡，自动建/复位 wwan 接口（DHCP 拨号）
#   * 探测 AT 口，采集信号/注网/温度，写 /tmp/c2000-modem/status.json
#   * 按信号强度点亮面板上的 sig1/sig2/sig3 三颗指示灯
#   * 通过 rpcd 暴露给 LuCI（luci-app-c2000-modem）
#   * 附带 fw_env.config，让 uboot-envtools 能改 NOR 里的 u-boot 环境
#     （切换 SD 双系统就靠它）
#
include $(TOPDIR)/rules.mk

PKG_NAME:=c2000-modem
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0

include $(INCLUDE_DIR)/package.mk

define Package/c2000-modem
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=NRadio C2000 Ultra 5G module (MT5700M-CN) support
  DEPENDS:=+kmod-usb-net-cdc-ncm +kmod-usb-net-rndis +kmod-usb-net +kmod-usb-serial-option \
	+uboot-envtools
endef

define Package/c2000-modem/description
 5G module helper for the NRadio C2000 Ultra (HC-WT9500).
 Detects the MT5700M-CN USB network interface, brings up a DHCP based
 "wwan" interface, polls the AT port for signal/operator information,
 drives the signal LEDs and exposes everything over rpcd for LuCI.
 Also ships /etc/fw_env.config so that fw_setenv can switch the
 u-boot boot medium between the SD card system and the vendor NOR system.
endef

define Build/Compile
endef

define Package/c2000-modem/conffiles
/etc/fw_env.config
/etc/config/c2000-modem
endef

define Package/c2000-modem/install
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/c2000-modem $(1)/usr/sbin/c2000-modem

	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./files/usr/libexec/rpcd/c2000-modem $(1)/usr/libexec/rpcd/c2000-modem

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/c2000-modem $(1)/etc/init.d/c2000-modem

	$(INSTALL_DIR) $(1)/etc/hotplug.d/net
	$(INSTALL_BIN) ./files/etc/hotplug.d/net/25-c2000-modem $(1)/etc/hotplug.d/net/25-c2000-modem

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/90_c2000-modem $(1)/etc/uci-defaults/90_c2000-modem

	$(INSTALL_DIR) $(1)/etc
	$(INSTALL_CONF) ./files/etc/fw_env.config $(1)/etc/fw_env.config
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/c2000-modem $(1)/etc/config/c2000-modem
endef

$(eval $(call BuildPackage,c2000-modem))
