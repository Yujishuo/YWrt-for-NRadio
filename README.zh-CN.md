# YWrt

基于 [ImmortalWrt](https://github.com/immortalwrt/immortalwrt) 25.12（`openwrt-25.12`）构建、
面向**鲲鹏无限 NRadio C2000** 系列路由器的 OpenWrt 固件。

- 底座：OpenWrt 25.12、Linux 6.12.116、`apk` 包管理器
- 源码：本仓库内含完整 OpenWrt 源码树，另附配置预设与构建脚本

---

## 支持的硬件

| 型号 | SoC | 无线 | 状态 |
|---|---|---|---|
| **C2000 Ultra**（HC-WT9500） | 联发科 MT7987A | MT7992，WiFi 7 | **v1.0.0** |
| **C2000 pro+** | 联发科 MT7981B | AX3000（NU313 模组） | 适配中 |
| C2000 / C2000 pro / C2000 plus / C2000 max | — | — | 暂不支持 |

> C2000 的六个型号是**不同的主板**，不是同一款设计的区域版本。
> 刷机前请先核对机身标签上的型号。

构建系统使用的板名：`mediatek_nradio_c2000_ultra`，
target 为 `mediatek`，subtarget 为 `filogic`。

---

## 从源码构建

本仓库是一份完整的 OpenWrt 源码树，因此沿用常规做法。feeds 在
`feeds.conf.default` 中声明，**不**随仓库提交。

```sh
git clone https://github.com/Yujishuo/YWrt-for-NRadio.git
cd YWrt-for-NRadio

./scripts/feeds update -a
./scripts/feeds install -a

cp defconfig/c2000-ultra.config .config
./build.sh
```

`build.sh` 做了以下几件事：

- 没有 `.config` 时拒绝运行
- 若 `private-key.pem` / `public-key.pem` 缺失，用 `openssl` 生成 `apk` 签名密钥
- 校验 `scripts/getver.sh` 输出的版本号是数字形式 —— 版本号格式不对会导致
  `base-files` 无法打包，进而被 `apk` 拒绝
- **编译两遍。** 第二遍会把 `files/` 覆盖层重新铺进 `staging_dir`，
  并删掉缓存的 `root.squashfs`；只跑一遍会悄悄产出一个与上一版完全相同的镜像。

产物落在 `bin/targets/mediatek/filogic/`，脚本会打印 MD5。

注意：

- 本地重新编译出的镜像**不会**与发布包校验值一致。feeds 版本尚未钉死，
  且构建日期会被写进镜像。
- 构建需要 Linux 主机（或 WSL2），并装好 OpenWrt 的常规编译依赖。

---

## 仓库结构

| 路径 | 内容 |
|---|---|
| `build.sh` | 构建外壳脚本：预设检查、apk 密钥、两遍编译 |
| `defconfig/c2000-ultra.config` | C2000 Ultra 的预设 `.config` |
| `defconfig/low-mem-512m/` | 面向其它 SoC / 无线组合的预设，实验性质 |
| `files/` | 打包之后覆盖进根文件系统的覆盖层 |
| `package/`、`target/`、`tools/`、`toolchain/` | OpenWrt 源码树 |
| `version` | 当 `.git` 目录缺失时供 `base-files` 使用的版本字符串 |

---

## 已知限制

- **暂时仅支持 C2000 Ultra。** 不要往其它任何 C2000 型号上刷。
- **其他 4G/5G 模组尚未完整支持。** 本次发布聚焦系统底座与无线；
- **2.4 GHz 默认使用信道 12、EHT40**（占用信道 5–13）。在干扰严重的环境中，
  建议钉在 6 或 11，或者降到 20 MHz。
- **5 GHz 默认使用信道 56、EHT160**，属于 DFS 信道，在部分地区可能受限。

---

## 授权与第三方组件

- OpenWrt 源码树按其 `LICENSE` 与 `LICENSES/` 中列明的许可证分发
  （以 GPL-2.0 为主）。
- 默认主题 **vantage** 采用 Apache-2.0 许可证。
- 预编译的**联发科闭源无线驱动与出厂固件/校准数据**在此再分发，
  目的仅为与其所搭载的硬件保持兼容。它们**不受 GPL 覆盖**，也没有可用源码。

本固件按原样提供，不附带任何形式的担保。刷机风险自负。

---

## English

An English version of this document is available in [README.md](README.md).
