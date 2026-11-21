PKGDIR:=$(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

include $(TOPDIR)/rules.mk
include $(INCLUDE_DIR)/kernel.mk

PKG_NAME:=mtk-wifi-prebuilt
PKG_VERSION:=2025.06.13~415824
PKG_RELEASE:=1
PKG_LICENSE:=Proprietary

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

KO:=$(PKGDIR)/ko

define Build/Compile
	true
endef

# ---------------------------------------------------------------- mt_wifi7
define KernelPackage/mt_wifi7
  CATEGORY:=MTK Properties
  SUBMENU:=Drivers
  TITLE:=MTK wifi7 AP driver (prebuilt)
  DEPENDS:=+wifi-profile +kmod-mt_wifi_osal +blkid +kmod-cfg80211 +nand-utils \
	+@DRIVER_11BE_SUPPORT +@DRIVER_11AX_SUPPORT +@DRIVER_11AC_SUPPORT \
	+kmod-mediatek_hnat
  FILES:=$(KO)/mt_wifi.ko
endef

define KernelPackage/mt_wifi7/config
	source "$(PKGDIR)/config-mt_wifi7.in"
endef

define KernelPackage/mt_wifi7/install
	$(CP) -a $(PKGDIR)/extra/kmod-mt_wifi7/. $(1)/
	$(INSTALL_DIR) $(1)/$(MODULES_SUBDIR)
	$(INSTALL_BIN) $(KO)/mt_wifi.ko $(1)/$(MODULES_SUBDIR)/
endef

# ---------------------------------------------------------------- mt_hwifi
define KernelPackage/mt_hwifi
  CATEGORY:=MTK Properties
  SUBMENU:=Drivers
  TITLE:=MediaTek HW abstraction layer driver (prebuilt)
  DEPENDS:=+kmod-mt_wifi7 +kmod-mt_wifi_osal
  FILES:=$(KO)/mtk_hwifi.ko
endef

define KernelPackage/mt_hwifi/config
	source "$(PKGDIR)/config-mt_hwifi.in"
endef

define KernelPackage/mt_hwifi/install
	$(CP) -a $(PKGDIR)/extra/kmod-mt_hwifi/. $(1)/
	$(INSTALL_DIR) $(1)/$(MODULES_SUBDIR)
	$(INSTALL_BIN) $(KO)/mtk_hwifi.ko $(1)/$(MODULES_SUBDIR)/
endef

# ---------------------------------------------------------------- mt7992
define KernelPackage/mt7992
  CATEGORY:=MTK Properties
  SUBMENU:=Drivers
  TITLE:=MediaTek HWIFI MT7992 driver (prebuilt)
  DEPENDS:=kmod-mt_hwifi
  FILES:=$(KO)/mt7992.ko
endef

define KernelPackage/mt7992/install
	$(CP) -a $(PKGDIR)/extra/kmod-mt7992/. $(1)/
	$(INSTALL_DIR) $(1)/$(MODULES_SUBDIR)
	$(INSTALL_BIN) $(KO)/mt7992.ko $(1)/$(MODULES_SUBDIR)/
endef

# ---------------------------------------------------------------- mtk_pci
define KernelPackage/mtk_pci
  CATEGORY:=MTK Properties
  SUBMENU:=Drivers
  TITLE:=MediaTek HWIFI PCI driver (prebuilt)
  DEPENDS:=kmod-mt_hwifi +kmod-mt_wifi_osal
  FILES:=$(KO)/mtk_pci.ko
endef

define KernelPackage/mtk_pci/install
	$(CP) -a $(PKGDIR)/extra/kmod-mtk_pci/. $(1)/
	$(INSTALL_DIR) $(1)/$(MODULES_SUBDIR)
	$(INSTALL_BIN) $(KO)/mtk_pci.ko $(1)/$(MODULES_SUBDIR)/
endef

# ---------------------------------------------------------------- mtk_wed
define KernelPackage/mtk_wed
  CATEGORY:=MTK Properties
  SUBMENU:=Drivers
  TITLE:=MediaTek HWIFI WED driver (prebuilt)
  DEPENDS:=kmod-mt_hwifi kmod-warp kmod-mtk_pci
  FILES:=$(KO)/mtk_wed.ko
endef

define KernelPackage/mtk_wed/install
	$(CP) -a $(PKGDIR)/extra/kmod-mtk_wed/. $(1)/
	$(INSTALL_DIR) $(1)/$(MODULES_SUBDIR)
	$(INSTALL_BIN) $(KO)/mtk_wed.ko $(1)/$(MODULES_SUBDIR)/
endef

# ---------------------------------------------------------------- connac_if
define KernelPackage/connac_if
  CATEGORY:=MTK Properties
  SUBMENU:=Drivers
  TITLE:=MediaTek HWIFI CONNAC3/5 interface layer driver (prebuilt)
  DEPENDS:=kmod-mt_hwifi
  FILES:=$(KO)/connac_if.ko
endef

define KernelPackage/connac_if/install
	$(CP) -a $(PKGDIR)/extra/kmod-connac_if/. $(1)/
	$(INSTALL_DIR) $(1)/$(MODULES_SUBDIR)
	$(INSTALL_BIN) $(KO)/connac_if.ko $(1)/$(MODULES_SUBDIR)/
endef

# ---------------------------------------------------------------- warp
define KernelPackage/warp
  CATEGORY:=MTK Properties
  SUBMENU:=Drivers
  TITLE:=MTK warp driver (prebuilt)
  DEPENDS:=@TARGET_mediatek +kmod-mediatek_hnat
  FILES:=$(KO)/mtk_warp.ko
	VERSION:=$(LINUX_VERSION).2025.06.13~433271-r$(PKG_RELEASE)
endef

define KernelPackage/warp/install
	$(CP) -a $(PKGDIR)/extra/kmod-warp/. $(1)/
	$(INSTALL_DIR) $(1)/$(MODULES_SUBDIR)
	$(INSTALL_BIN) $(KO)/mtk_warp.ko $(1)/$(MODULES_SUBDIR)/
endef

# ---------------------------------------------------------------- osal
define KernelPackage/mt_wifi_osal
  CATEGORY:=MTK Properties
  SUBMENU:=Drivers
  TITLE:=MediaTek WiFi OS Abstraction Layer (prebuilt)
  DEPENDS:=+kmod-cfg80211
  FILES:=$(KO)/mt_wifi_osal.ko
  VERSION:=$(LINUX_VERSION)-r$(PKG_RELEASE)
endef

define KernelPackage/mt_wifi_osal/install
	$(CP) -a $(PKGDIR)/extra/kmod-mt_wifi_osal/. $(1)/
	$(INSTALL_DIR) $(1)/$(MODULES_SUBDIR)
	$(INSTALL_BIN) $(KO)/mt_wifi_osal.ko $(1)/$(MODULES_SUBDIR)/
endef

$(eval $(call KernelPackage,mt_wifi7))
$(eval $(call KernelPackage,mt_hwifi))
$(eval $(call KernelPackage,mt7992))
$(eval $(call KernelPackage,mtk_pci))
$(eval $(call KernelPackage,mtk_wed))
$(eval $(call KernelPackage,connac_if))
$(eval $(call KernelPackage,warp))
$(eval $(call KernelPackage,mt_wifi_osal))
