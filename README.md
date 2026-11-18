# OpenWrt 小智控制（openwrt-app 分支）

OpenWrt 侧的两个标准包：后端 HTTP API + LuCI 控制界面。配套的小智 ESP32 固件工具在 `xiaozhi-firmware` 分支。

## 组成

| 目录 | 说明 |
|---|---|
| `openwrt-xiaozhi-api/` | 后端：标准 ipk 包，提供 HTTP JSON 接口（查设备/WAN/系统、端口映射、OUI 厂商识别） |
| `luci-app-xiaozhi-control/` | LuCI 应用：标准 luci-app，挂在「服务 → 小智控制」菜单，配置 token 和各功能开关 |

## 调用链

```
小智 ESP32（固件在 xiaozhi-firmware 分支）
   → 云端大模型 → 决定调工具
   → 固件 AddTool 发 HTTP 请求
   → 本仓库 routerapi 接口（/cgi-bin/routerapi）
   → 读 ARP/DHCP/firewall → 返回 JSON → 大模型播报
```

- 设备的连接地址取 ESP32 网关 IP，不用手填（小智直连那台 OpenWrt 时成立）
- 接口在 `/cgi-bin/routerapi`，页面在 LuCI「服务 → 小智控制」

## 功能

查询类（默认开）：
- `clients` — 在线设备（ARP + DHCP hostname + OUI 厂商 + 手动映射）
- `wan` — WAN IP / 网关
- `status` — 运行时间 / 型号

控制类（默认关，需逐项开启 + 二次确认）：
- `portforward` — 端口映射，两阶段确认码防误操作
- `portforward_list` — 查看已建映射

安全分层：token → 控制总开关 → 每功能独立开关 → 参数校验 → 二次确认码。

## 编译

两个包都放 OpenWrt 源码树（ImmortalWrt / OpenWrt 25.12，mediatek filogic 等）的 `package/utils/` 下：

```sh
cp -r openwrt-xiaozhi-api/     <源码>/package/utils/
cp -r luci-app-xiaozhi-control/ <源码>/package/utils/

cd <源码>
make menuconfig   # 勾选 Utilities → xiaozhi-api 和 LuCI → 3. Applications → luci-app-xiaozhi-control
make package/utils/xiaozhi-api/compile V=s
make package/utils/luci-app-xiaozhi-control/compile V=s
```

详细说明：
- `openwrt-xiaozhi-api/编译说明.md`
- `openwrt-xiaozhi-api/方案.md`
- `luci-app-xiaozhi-control/安装说明.md`

## 配套固件

ESP32 固件侧的 AddTool 代码在独立分支 `xiaozhi-firmware`：

```sh
git clone -b xiaozhi-firmware <仓库地址>.git
```
