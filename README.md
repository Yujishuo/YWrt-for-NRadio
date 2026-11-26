# YWrt

OpenWrt-based firmware for the **NRadio C2000** series of routers, built on
[ImmortalWrt](https://github.com/immortalwrt/immortalwrt) 25.12 (`openwrt-25.12`).

- Base: OpenWrt 25.12, Linux 6.12.116, `apk` package manager
- Source: full OpenWrt tree in this repository, plus presets and a build script

---

## Supported hardware

| Model | SoC | Wi-Fi | Status |
|---|---|---|---|
| **C2000 Ultra** (HC-WT9500) | MediaTek MT7987A | MT7992, Wi-Fi 7 | **v1.0.0** |
| **C2000 pro+** | MediaTek MT7981B | AX3000 (NU313 module) | in progress |
| C2000 / C2000 pro / C2000 plus / C2000 max | — | — | not supported yet |

> The six C2000 variants are **different boards**, not regional SKUs of one design.
> Check the model name on the label before flashing.

Board name used by the build system: `mediatek_nradio_c2000_ultra`,
target `mediatek` / subtarget `filogic`.

---

## Building from source

The repository is a full OpenWrt tree, so the usual rules apply. Feeds are
declared in `feeds.conf.default` and are **not** committed.

```sh
git clone https://github.com/Yujishuo/YWrt-for-NRadio.git
cd YWrt-for-NRadio

./scripts/feeds update -a
./scripts/feeds install -a

cp defconfig/c2000-ultra.config .config
./build.sh
```

`build.sh` does the following:

- refuses to run without `.config`
- generates the `apk` signing keys (`private-key.pem` / `public-key.pem`) with
  `openssl` if they are missing
- validates that `scripts/getver.sh` produces a numeric revision — a malformed
  revision makes `base-files` unpackageable and `apk` rejects it
- **builds twice.** The second pass reinstalls the `files/` overlay into
  `staging_dir` and drops the cached `root.squashfs`, because a single pass
  silently produces an image identical to the previous one.

Output lands in `bin/targets/mediatek/filogic/` and the script prints the MD5.

Notes:

- A locally rebuilt image will **not** match the published checksum. Feed
  revisions are not pinned yet and the build date is embedded in the image.
- Building needs a Linux host (or WSL2) with the usual OpenWrt prerequisites.

---

## Repository layout

| Path | Contents |
|---|---|
| `build.sh` | build wrapper: preset check, apk keys, two-pass build |
| `defconfig/c2000-ultra.config` | preset `.config` for the C2000 Ultra |
| `defconfig/low-mem-512m/` | additional presets for other SoC / Wi-Fi combinations, experimental |
| `files/` | overlay copied into the root filesystem after packaging |
| `package/`, `target/`, `tools/`, `toolchain/` | OpenWrt tree |
| `version` | revision string consumed by `base-files` when `.git` is absent |

---

## Limitations

- **Only the C2000 Ultra for now.** Do not flash any other C2000 model.
- **The other 4G/5G modem is not fully supported yet.** This release focuses on the
  system base and Wi-Fi.
- **2.4 GHz defaults to channel 12, EHT40** (covering channels 5–13). In crowded
  environments pin it to 6 or 11, or drop to 20 MHz.
- **5 GHz defaults to channel 56, EHT160**, which is a DFS channel and may be
  restricted in some regions.

---

## Licensing and third-party components

- The OpenWrt tree is distributed under the licenses found in `LICENSE` and
  `LICENSES/` (predominantly GPL-2.0).
- The default theme, **vantage**, is licensed under Apache-2.0.
- Prebuilt **closed-source MediaTek Wi-Fi driver and factory firmware/calibration
  blobs** are redistributed here for compatibility with the hardware they ship
  on. They are not covered by the GPL and no source is available for them.

Provided as is, without warranty of any kind. Flashing firmware is done at your
own risk.

---

## 中文说明

> 完整中文版见 [README.zh-CN.md](README.zh-CN.md)。

YWrt 是给**鲲鹏无限 NRadio C2000 系列**做的 OpenWrt 固件，基于 ImmortalWrt 25.12。

- **目前只支持 C2000 Ultra（HC-WT9500，MT7987A + MT7992 WiFi7）**。C2000 系列六个型号硬件互不相同，**不要跨型号刷**。

完整刷机步骤和已知问题见 [Releases](https://github.com/Yujishuo/YWrt-for-NRadio/releases) 页面里的说明。
