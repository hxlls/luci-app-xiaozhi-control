# luci-app-xiaozhi-control

让小智 ESP32 通过固件自带的 MCP 能力调用 OpenWrt 路由器：查询状态、端口映射等，并提供 LuCI 管理界面。

## 组成

| 目录 | 说明 |
|---|---|
| `xiaozhi-firmware/` | 小智 ESP32 固件侧：AddTool 工具代码（独立，加到 xiaozhi-esp32 固件里） |
| `openwrt-xiaozhi-api/` | OpenWrt 后端：标准 ipk 包，提供 HTTP JSON 接口（查设备/WAN/系统、端口映射、OUI 厂商识别） |
| `luci-app-xiaozhi-control/` | LuCI 应用：标准 luci-app，挂在「服务 → 小智控制」菜单，配置 token 和各功能开关 |

## 架构

```
你说话 → 小智 ESP32 → 云端大模型 → 决定调工具
       → 固件 AddTool 发 HTTP 请求 → OpenWrt routerapi 接口
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

## 固件侧

`xiaozhi-firmware/` 是 ESP32 固件的 AddTool 代码，照 `xiaozhi-esp32` 源码里 `self.screen.preview_image` 的模板写，加进固件的 `main/mcp_server.cc` 编译。详见该目录的 README。

## 编译

见各目录的说明文档：
- `xiaozhi-firmware/README.md`
- `openwrt-xiaozhi-api/编译说明.md`
- `openwrt-xiaozhi-api/方案.md`
- `luci-app-xiaozhi-control/安装说明.md`

基于 ImmortalWrt / OpenWrt 25.12（mediatek filogic 等），两个包都放源码树 `package/utils/` 下即可编译。
