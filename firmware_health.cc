// 固件侧：网络体检（只读查询）
// 加进 main/mcp_server.cc 的 InitializeTools()，依赖 firmware_tool.cc 里的 GetGatewayIp()

AddTool(
    "router.network_health",
    "Run a read-only network health check on the OpenWrt router. Use when the user asks about network quality, internet latency, DNS, router load, or unfamiliar devices. Returns a JSON report with score, per-item checks and issues; answer using its summary and key issues.",
    PropertyList(),
    [](const PropertyList& properties) -> ToolResult {
        std::string gw = GetGatewayIp();
        if (gw.empty()) return std::unexpected("No gateway IP");
        std::string url = "http://" + gw + "/cgi-bin/routerapi?action=health";

        // 体检要跑 ping/DNS，最长约 3 秒，HTTP 超时给 8 秒
        auto http = Board::GetInstance().GetNetwork()->CreateHttp(8);
        if (auto opened = http->Open("GET", url.c_str()); !opened) {
            return std::unexpected("Open failed: " + opened.error().ToString());
        }
        auto status = http->GetStatusCode();
        if (!status || *status != 200) return std::unexpected("HTTP error");
        std::string body = http->ReadAll();
        http->Close();
        return body;
    });
