define Build/tenda-mkdualimageheader
	printf '%b' "\x47\x6f\x64\x31\x00\x00\x00\x00" >"$@.new"
	gzip -c "$@" | tail -c8 >>"$@.new"
	cat "$@" >>"$@.new"
	mv "$@.new" "$@"
endef

define Device/clx_s20-common
  DEVICE_VENDOR := CLX
  DEVICE_DTS_DIR := ../dts-ext
  DEVICE_PACKAGES := kmod-usb3 kmod-mmc kmod-nvme \
    kmod-fs-f2fs kmod-fs-ext4 kmod-fs-vfat \
    mkf2fs f2fsck e2fsprogs blkid blockdev losetup automount
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef

define Device/clx_s20l
  $(call Device/clx_s20-common)
  DEVICE_MODEL := S20L
  DEVICE_DTS := mt7986a-clx-s20l
endef
TARGET_DEVICES += clx_s20l

define Device/clx_s20m
  $(call Device/clx_s20-common)
  DEVICE_MODEL := S20M
  DEVICE_DTS := mt7986a-clx-s20m
  DEVICE_PACKAGES += -wpad-openssl -kmod-mt_wifi -kmod-conninfra -kmod-warp \
    -wifi-dats -wifi-profile -mtwifi-cfg -mtwifi-cfg-ucode \
    -luci-app-mtwifi-cfg -luci-i18n-mtwifi-cfg-zh-cn \
    -kmod-mt76 -kmod-mt76-connac -kmod-mt76-core -kmod-mt7915e \
    -kmod-mt7915-firmware -kmod-mt7916-firmware -kmod-mt7986-firmware \
    -mt7986-wo-firmware
endef
TARGET_DEVICES += clx_s20m

define Device/clx_s20p
  $(call Device/clx_s20-common)
  DEVICE_MODEL := S20P
  DEVICE_DTS := mt7986a-clx-s20p
endef
TARGET_DEVICES += clx_s20p

define Device/cmcc_xr30-nand-mtkuboot
  DEVICE_VENDOR := CMCC
  DEVICE_MODEL := XR30 NAND
  DEVICE_VARIANT := (MTK U-Boot layout)
  DEVICE_DTS := mt7981b-cmcc-xr30-nand-mtkuboot
  DEVICE_DTS_DIR := ../dts-ext
  DEVICE_PACKAGES := kmod-usb3 automount
  SUPPORTED_DEVICES := cmcc,xr30-mtkuboot
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 116736k
  KERNEL_IN_UBI := 1
  IMAGES += factory.bin
  IMAGE/factory.bin := append-ubi | check-size $$$$(IMAGE_SIZE)
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += cmcc_xr30-nand-mtkuboot

define Device/cudy_tr3000-v1-mtkuboot
  DEVICE_VENDOR := Cudy
  DEVICE_MODEL := TR3000
  DEVICE_VARIANT := v1 (MTK U-Boot layout)
  DEVICE_DTS := mt7981b-cudy-tr3000-v1-mtkuboot
  DEVICE_DTS_DIR := ../dts-ext
  SUPPORTED_DEVICES += R47
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 114688k
  KERNEL_IN_UBI := 1
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
  DEVICE_PACKAGES := kmod-usb3 automount
endef
TARGET_DEVICES += cudy_tr3000-v1-mtkuboot

define Device/h3c_magic-nx30-pro-mtkuboot
  DEVICE_VENDOR := H3C
  DEVICE_MODEL := Magic NX30 Pro
  DEVICE_VARIANT := (MTK U-Boot layout)
  DEVICE_DTS := mt7981b-h3c-magic-nx30-pro-mtkuboot
  DEVICE_DTS_DIR := ../dts-ext
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 65536k
  KERNEL_IN_UBI := 1
  IMAGES += factory.bin
  IMAGE/factory.bin := append-ubi | check-size $$$$(IMAGE_SIZE)
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += h3c_magic-nx30-pro-mtkuboot

define Device/netcore_n60-pro-mtkuboot
  DEVICE_VENDOR := Netcore
  DEVICE_MODEL := N60 Pro
  DEVICE_VARIANT := (MTK U-Boot layout)
  DEVICE_DTS := mt7986a-netcore-n60-pro-mtkuboot
  DEVICE_DTS_DIR := ../dts-ext
  DEVICE_PACKAGES := kmod-usb3 automount kmod-usb-ledtrig-usbport 
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 117248k
  KERNEL_IN_UBI := 1
  IMAGES += factory.bin
  IMAGE/factory.bin := append-ubi | check-size $$$$(IMAGE_SIZE)
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += netcore_n60-pro-mtkuboot

define Device/ruijie_rg-x30e-pro
  DEVICE_VENDOR := Ruijie
  DEVICE_MODEL := RG-X30E Pro
  DEVICE_DTS := mt7981b-ruijie-rg-x30e-pro
  DEVICE_DTS_DIR := ../dts-ext
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 114688k
  KERNEL_IN_UBI := 1
  IMAGES += factory.bin
  IMAGE/factory.bin := append-ubi | check-size $$$$(IMAGE_SIZE)
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += ruijie_rg-x30e-pro

define Device/ruijie_rg-x60-new-mtkuboot
  DEVICE_VENDOR := Ruijie
  DEVICE_MODEL := RG-X60 New
  DEVICE_VARIANT := (MTK U-Boot layout)
  DEVICE_DTS := mt7986a-ruijie-rg-x60-new-mtkuboot
  DEVICE_DTS_DIR := ../dts-ext
  DEVICE_PACKAGES := kmod-phy-airoha-en8811h kmod-mtd-rw
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += ruijie_rg-x60-new-mtkuboot

define Device/ruijie_rg-x60-new-ubi
  DEVICE_VENDOR := Ruijie
  DEVICE_MODEL := RG-X60 New
  DEVICE_VARIANT := (UBI)
  DEVICE_DTS := mt7986a-ruijie-rg-x60-new-ubi
  DEVICE_DTS_DIR := ../dts-ext
  DEVICE_PACKAGES := kmod-phy-airoha-en8811h kmod-mtd-rw
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  KERNEL_IN_UBI := 1
  UBOOTENV_IN_UBI := 1
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | \
  fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  IMAGES := sysupgrade.itb
  IMAGE/sysupgrade.itb := append-kernel | \
  fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb \
  external-with-rootfs | pad-rootfs | append-metadata
  ARTIFACTS := preloader.bin bl31-uboot.fip
  ARTIFACT/bl31-uboot.fip := mt7986-bl31-uboot ruijie_rg-x60-new-ubi
  ARTIFACT/preloader.bin := mt7986-bl2 spim-nand-ubi-ddr3
endef
TARGET_DEVICES += ruijie_rg-x60-new-ubi

define Device/sl_3000-emmc
  DEVICE_VENDOR := SL
  DEVICE_MODEL := 3000 eMMC
  DEVICE_DTS := mt7981b-sl-3000-emmc
  DEVICE_DTS_DIR := ../dts-ext
  DEVICE_PACKAGES := e2fsprogs f2fsck mkf2fs
  KERNEL := kernel-bin | lzma | fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 64k
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += sl_3000-emmc

define Device/tenda_be12-pro
  DEVICE_VENDOR := Tenda
  DEVICE_MODEL := BE12 Pro
  DEVICE_DTS := mt7987a-tenda-be12-pro
  DEVICE_DTS_DIR := ../dts-ext
  DEVICE_PACKAGES := kmod-mt798x-2p5g-phy airoha-en8811h-firmware kmod-phy-airoha-en8811h
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  KERNEL_LOADADDR := 0x40000000
  KERNEL_INITRAMFS := kernel-bin | lzma | \
        fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 64k
  IMAGE/sysupgrade.bin := append-kernel | tenda-mkdualimageheader | sysupgrade-tar kernel=$$$$@ | append-metadata
endef
TARGET_DEVICES += tenda_be12-pro

define Device/viettel_32x6
  DEVICE_VENDOR := Viettel
  DEVICE_MODEL := 32X6
  DEVICE_DTS := mt7981b-viettel-32x6
  DEVICE_DTS_DIR := ../dts-ext
  SUPPORTED_DEVICES := viettel,32x6
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 114688k
  KERNEL_IN_UBI := 1
  UBOOTENV_IN_UBI := 1
  IMAGES := sysupgrade.itb
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 64k
  IMAGE/sysupgrade.itb := append-kernel | \
	fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | \
	append-metadata
  ARTIFACTS := preloader.bin bl31-uboot.fip
  ARTIFACT/preloader.bin := mt7981-bl2 spim-nand-ddr3
  ARTIFACT/bl31-uboot.fip := mt7981-bl31-uboot viettel_32x6
endef
TARGET_DEVICES += viettel_32x6

define Device/viettel_nr3053
  DEVICE_VENDOR := Viettel
  DEVICE_MODEL := NR3053
  DEVICE_DTS := mt7981b-viettel-nr3053
  DEVICE_DTS_DIR := ../dts-ext
  SUPPORTED_DEVICES := viettel,nr3053
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 229376k
  KERNEL_IN_UBI := 1
  UBOOTENV_IN_UBI := 1
  IMAGES := sysupgrade.itb
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 64k
  IMAGE/sysupgrade.itb := append-kernel | \
	fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | \
	append-metadata
  ARTIFACTS := preloader.bin bl31-uboot.fip
  ARTIFACT/preloader.bin := mt7981-bl2 spim-nand-ddr3
  ARTIFACT/bl31-uboot.fip := mt7981-bl31-uboot viettel_nr3053
endef
TARGET_DEVICES += viettel_nr3053

define Device/wirelesstag_zx7981pd-ubootmod
  DEVICE_VENDOR := Wireless-Tag
  DEVICE_MODEL := ZX7981PD
  DEVICE_VARIANT := (OpenWrt U-Boot layout)
  DEVICE_DTS := mt7981b-wirelesstag-zx7981pd-ubootmod
  DEVICE_DTS_DIR := ../dts-ext
  DEVICE_PACKAGES := kmod-usb3
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  IMAGES := sysupgrade.itb
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  KERNEL_IN_UBI := 1
  UBOOTENV_IN_UBI := 1
  KERNEL := kernel-bin | lzma
  KERNEL_INITRAMFS := kernel-bin | lzma | \
        fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 64k
  IMAGE/sysupgrade.itb := append-kernel | \
        fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | append-metadata
  ARTIFACTS := preloader.bin bl31-uboot.fip
  ARTIFACT/preloader.bin := mt7981-bl2 spim-nand-ddr3
  ARTIFACT/bl31-uboot.fip := mt7981-bl31-uboot wirelesstag_zx7981pd
ifneq ($(CONFIG_TARGET_ROOTFS_INITRAMFS),)
  ARTIFACTS += initramfs-factory.ubi
  ARTIFACT/initramfs-factory.ubi := append-image-stage initramfs-recovery.itb | ubinize-kernel
endif
endef
TARGET_DEVICES += wirelesstag_zx7981pd-ubootmod

define Device/xiaomi_mi-router-ax3000t-mtkuboot
  DEVICE_VENDOR := Xiaomi
  DEVICE_MODEL := Mi Router AX3000T
  DEVICE_VARIANT := (MTK U-Boot layout)
  DEVICE_DTS := mt7981b-xiaomi-mi-router-ax3000t-mtkuboot
  DEVICE_DTS_DIR := ../dts-ext
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 114688k
  KERNEL_IN_UBI := 1
  IMAGES += factory.bin
  IMAGE/factory.bin := append-ubi | check-size $$$$(IMAGE_SIZE)
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += xiaomi_mi-router-ax3000t-mtkuboot

define Device/xiaomi_mi-router-wr30u-mtkuboot
  DEVICE_VENDOR := Xiaomi
  DEVICE_MODEL := Mi Router WR30U
  DEVICE_VARIANT := (MTK U-Boot layout)
  DEVICE_DTS := mt7981b-xiaomi-mi-router-wr30u-mtkuboot
  DEVICE_DTS_DIR := ../dts-ext
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 114688k
  KERNEL_IN_UBI := 1
  IMAGES += factory.bin
  IMAGE/factory.bin := append-ubi | check-size $$$$(IMAGE_SIZE)
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += xiaomi_mi-router-wr30u-mtkuboot

define Device/xiaomi_redmi-router-ax6000-mtkuboot
  DEVICE_VENDOR := Xiaomi
  DEVICE_MODEL := Redmi Router AX6000
  DEVICE_VARIANT := (MTK U-Boot layout)
  DEVICE_DTS := mt7986a-xiaomi-redmi-router-ax6000-mtkuboot
  DEVICE_DTS_DIR := ../dts-ext
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 112640k
  KERNEL_IN_UBI := 1
  IMAGES += factory.bin
  IMAGE/factory.bin := append-ubi | check-size $$$$(IMAGE_SIZE)
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += xiaomi_redmi-router-ax6000-mtkuboot

define Device/zhao_7981r128-mtkuboot
  DEVICE_VENDOR := ZHAO
  DEVICE_MODEL := 7981r128
  DEVICE_VARIANT := (MTK U-Boot layout)
  DEVICE_DTS := mt7981b-zhao-7981r128-mtkuboot
  DEVICE_DTS_DIR := ../dts-ext
  SUPPORTED_DEVICES := zhao,7981r128
  DEVICE_PACKAGES := kmod-usb3 kmod-sfp kmod-i2c-gpio automount f2fsck mkf2fs
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  IMAGE_SIZE := 114688k
  KERNEL_IN_UBI := 1
  IMAGES += factory.bin
  IMAGE/factory.bin := append-ubi | check-size $$$$(IMAGE_SIZE)
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += zhao_7981r128-mtkuboot

#
# NRadio C2000 Ultra / HC-WT9500 (MT7987A + MT7992)，SD 卡双系统
#
# 与同目录其它机型的关键差别：**不是 NAND UBI，是 SD 卡**。
#   p3 = kernel（FIT：内核 + DTB）
#   p4 = rootfs（squashfs，其后按 64KiB 对齐由 libfstools 认出 rootfs_data）
# 产物是原厂后台「烧写第二系统」认的未压缩 tar：
#   sysupgrade-nradio_c2000_ultra/kernel -> p3
#   sysupgrade-nradio_c2000_ultra/root   -> p4
# NOR 与 SD 的 GPT 一律不动，原厂系统只能只读访问。
#
# WiFi 用闭源 mt_hwifi/mt_wifi7，它们由 .config 里的全局
# CONFIG_PACKAGE_kmod-mt_wifi7 / kmod-mt_hwifi / kmod-mt7992 带入，
# 与同树 routerich_be7200 的做法一致，不在 DEVICE_PACKAGES 里重复列。
#
define Device/mediatek_nradio_c2000_ultra
  DEVICE_VENDOR := NRadio
  DEVICE_MODEL := C2000 Ultra
  DEVICE_ALT0_VENDOR := NRadio
  DEVICE_ALT0_MODEL := WT9500
  DEVICE_ALT1_VENDOR := HCMT
  DEVICE_ALT1_MODEL := HC-WT9500

  DEVICE_DTS := mt7987a-nradio-wt9500-wifi7
  DEVICE_DTS_DIR := ../dts-ext
  DEVICE_DTC_FLAGS := --pad 4096

  # USB 5G 模组（MT5700，CDC-NCM 数据口 + ttyUSB AT 口）必需的整套 USB 驱动。
  # 少任何一个，eth2 不会出现、ttyUSB* 不会出现，等于没有 WAN。
  # 依据 2026-11 实测的 v27 开机日志：cdc_ncm / cdc_mbim / cdc_wdm / cdc_ether /
  # huawei_cdc_ncm / qmi_wwan / option / usb_wwan / rndis_host / cdc_acm / usbnet。
  DEVICE_PACKAGES := \
	mt798x-2p5g-phy-firmware-internal \
	kmod-mt798x-2p5g-phy \
	kmod-phy-airoha-en8811h \
	kmod-usb3 \
	kmod-usb-net kmod-usb-net-cdc-ncm kmod-usb-net-cdc-mbim \
	kmod-usb-net-cdc-ether kmod-usb-net-qmi-wwan kmod-usb-net-rndis \
	kmod-usb-net-huawei-cdc-ncm \
	kmod-usb-serial kmod-usb-serial-option kmod-usb-serial-wwan \
	kmod-usb-acm kmod-usb-wdm \
	c2000-modem luci-app-c2000-modem \
	uboot-envtools blkid mkf2fs

  # 装载地址沿用实测能起的值：0x40000000 是 1GiB 内存起点，u-boot 自己占那一带，
  # 所以放 0x40080000。原厂 u-boot 只会解 lzma，gzip 的 FIT 在 u-boot 阶段就过不去。
  KERNEL_LOADADDR := 0x40080000
  KERNEL := kernel-bin | lzma
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 64k
  KERNEL_INITRAMFS_SUFFIX := .itb

  IMAGES := sd-upgrade.tar
  IMAGE/sd-upgrade.tar := append-kernel | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb | \
	sysupgrade-tar kernel=$$$$@

  # 默认不选，避免 make defconfig 把别的目标顶掉
  DEFAULT := n
endef
TARGET_DEVICES += mediatek_nradio_c2000_ultra
