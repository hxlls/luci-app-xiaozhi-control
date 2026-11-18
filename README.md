# OpenWrt 小智控制（openwrt-app 分支）

OpenWrt 侧的两个标准包：后端 HTTP API + LuCI 控制界面。配套的小智 ESP32 固件工具在 `xiaozhi-firmware` 分支。

## 组成

| 目录 | 说明 |
|---|---|
| `openwrt-xiaozhi-api/` | 后端：标准 apk 包，提供 HTTP JSON 接口（查设备/WAN/系统、端口映射、静态路由增删查） |
| `luci-app-xiaozhi-control/` | LuCI 应用：标准 luci-app，挂在「服务 → 小智控制」菜单，配置 token 和各功能开关 |

## 调用链

```
小智 ESP32（固件在 xiaozhi-firmware 分支）
   → 云端大模型 → 决定调工具
   → 固件 AddTool 发 HTTP 请求
   → 本仓库 routerapi 接口（/cgi-bin/routerapi）
   → 读 ARP/DHCP/firewall/network → 返回 JSON → 大模型播报
```

- 设备的连接地址取 ESP32 网关 IP，不用手填（小智直连那台 OpenWrt 时成立）
- 接口在 `/cgi-bin/routerapi`，页面在 LuCI「服务 → 小智控制」
- 控制类操作（端口映射、静态路由）两步确认：先取确认码，用户确认后带码执行

## 功能

查询类（默认开）：
- `clients` — 在线设备（ARP + DHCP hostname + OUI 厂商 + name_map）
- `wan` — WAN IP / 网关
- `status` — 运行时间 / 型号
- `portforward_list` — 端口转发列表
- `route_list` — 静态路由列表

控制类（默认关，需开总开关 + 逐项开启 + 二次确认）：
- `portforward` — 端口映射（DNAT，自动生成 dest=lan）
- `route_add` — 添加静态路由（CIDR → target + netmask）
- `route_del` — 删除静态路由

安全分层：token → 控制总开关 → 每功能独立开关 → 参数校验 → 二次确认码。

## 编译

两个包放 OpenWrt 源码树（ImmortalWrt / OpenWrt 25.12，mediatek filogic 等）的 `package/diy/` 下。25.12 用 **apk** 格式（不是 ipk）。

```sh
# clone openwrt-app 分支到源码树
git clone -b openwrt-app <仓库地址>.git <源码>/package/diy/luci-app-xiaozhi-control

cd <源码>
make menuconfig   # 勾选 Utilities → xiaozhi-api 和 LuCI → 3. Applications → luci-app-xiaozhi-control
# 分开编译，一次编两个会拉起 kernel 依赖链
make package/diy/luci-app-xiaozhi-control/openwrt-xiaozhi-api/compile V=s
make package/diy/luci-app-xiaozhi-control/luci-app-xiaozhi-control/compile V=s
```

产物：`bin/packages/aarch64_cortex-a53/base/*xiaozhi*.apk`

安装：
```sh
scp *xiaozhi*.apk root@<路由器IP>:/tmp/
ssh root@<路由器IP> 'apk add --allow-untrusted /tmp/*xiaozhi*.apk'
```

详细说明：
- `openwrt-xiaozhi-api/编译说明.md`
- `openwrt-xiaozhi-api/方案.md`
- `luci-app-xiaozhi-control/安装说明.md`

## 配套固件

ESP32 固件侧的 AddTool 代码在独立分支 `xiaozhi-firmware`（三个 .cc 文件）：

```sh
git clone -b xiaozhi-firmware <仓库地址>.git
```
