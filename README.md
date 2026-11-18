# luci-app-xiaozhi-control

让小智 ESP32 通过固件自带的 MCP 能力调用 OpenWrt 路由器：查询状态、端口映射等。

本项目按产品拆成两条**独立分支**，各自可单独 clone 与维护：

| 分支 | 内容 | clone |
|---|---|---|
| `openwrt-app` | OpenWrt 侧：后端 API 包 + LuCI 控制界面 | `git clone -b openwrt-app <url>` |
| `xiaozhi-firmware` | 小智 ESP32 固件侧：MCP AddTool 工具代码 | `git clone -b xiaozhi-firmware <url>` |

两条分支互不依赖历史（orphan），可独立演进。

## 完整链路

```
你说话 → 小智 ESP32（xiaozhi-firmware 分支）
       → 云端大模型 → 决定调工具
       → 固件 AddTool 发 HTTP 请求 → OpenWrt routerapi（openwrt-app 分支）
       → 读 ARP/DHCP/firewall → 返回 JSON → 大模型播报
```

## clone

把 `<仓库地址>` 换成实际托管平台的仓库 URL（Gitea / GitHub 均可）：

```sh
# OpenWrt 侧
git clone -b openwrt-app <仓库地址>.git

# 固件侧
git clone -b xiaozhi-firmware <仓库地址>.git
```

各分支的 README 有各自的编译和使用说明。
