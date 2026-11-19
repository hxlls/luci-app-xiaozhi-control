# 小智 ESP32 固件侧工具

这些是加到 `xiaozhi-esp32` 固件里的 MCP 工具代码，让小智能调用 OpenWrt 上的 `xiaozhi-api` 接口。

## 文件

| 文件 | 说明 |
|---|---|
| `firmware_tool.cc` | 基础查询工具 + `GetGatewayIp()`：在线设备 |
| `firmware_health.cc` | 网络体检：`router.network_health` |
| `firmware_control.cc` | 控制工具：端口映射（带二次确认）、查看映射 |
| `firmware_route.cc` | 控制工具：静态路由增删查（添加/删除带二次确认） |

四个文件都要加进 `main/`，`GetGatewayIp()` 定义在 `firmware_tool.cc`，其他文件依赖它。

## 用法

### 1. 放到固件源码

把这四个文件放到 `xiaozhi-esp32` 固件的 `main/` 目录下。

### 2. 修改 main/mcp_server.cc

在 `InitializeTools()` 函数里，把这些文件里的 `AddTool(...)` 代码块粘进去。

参考固件自带的 `self.screen.preview_image` 工具——这些代码就是照它的模板写的（HTTP GET 访问接口）。

### 3. 依赖

- `#include <esp_netif.h>`（在 `firmware_tool.cc` 里已包含，用于取网关 IP）
- `GetGatewayIp()` 定义在 `firmware_tool.cc`，`firmware_health.cc`、`firmware_control.cc`、`firmware_route.cc` 都依赖它——**四个文件都要加**

### 4. 编译烧录

按 `xiaozhi-esp32` 官方流程（ESP-IDF 6.0.1+，推荐 release/v6.1）：

```sh
. $IDF_PATH/export.sh
idf.py build flash monitor
```

## 关键点

- **IP 自动获取**：用 ESP32 的网关 IP（它连的路由器），不用手填
- **前提**：小智连的路由器就是跑 `xiaozhi-api` 的那台 OpenWrt；跨网段（二级路由）需另行处理
- **token**：如果 OpenWrt 侧设了 token，固件 URL 要带 `?token=xxx`（当前示例未带，按实际补）
- **控制类**：`port_forward` 先返回确认码，用户确认后才调 `port_forward_confirm` 执行

## 对应的 OpenWrt 侧

接口定义在同仓库 `openwrt-xiaozhi-api/`：
- `/cgi-bin/routerapi?action=clients|wan|status|health|portforward|portforward_list`

工具名与接口 action 对应关系：
| MCP 工具 | 接口 action |
|---|---|
| `router.get_clients` | `clients` |
| `router.network_health` | `health` |
| `router.port_forward` | `portforward`（第一步，取确认码） |
| `router.port_forward_confirm` | `portforward`（带 confirm 码执行） |
| `router.port_forward_list` | `portforward_list` |
| `router.route_list` | `route_list` |
| `router.route_add` | `route_add`（第一步，取确认码） |
| `router.route_add_confirm` | `route_add`（带 confirm 码执行） |
| `router.route_del` | `route_del`（第一步，取确认码） |
| `router.route_del_confirm` | `route_del`（带 confirm 码执行） |
