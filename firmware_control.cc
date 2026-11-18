// 固件侧：端口映射工具（控制类，带二次确认）
// 加进 main/mcp_server.cc 的 InitializeTools()，依赖 firmware_tool.cc 里的 GetGatewayIp()

// 第一步：请求映射 —— 接口返回确认码，此时并未真正执行
AddTool(
    "router.port_forward",
    "Request to map a WAN port to a device on the LAN. Ask the user to confirm before calling again. Params: ext_port (external WAN port), ip (internal device IP), int_port (internal port).",
    PropertyList({
        Property("ext_port", kPropertyTypeInteger, 1, 65535),
        Property("ip", kPropertyTypeString),
        Property("int_port", kPropertyTypeInteger, 1, 65535)
    }),
    [](const PropertyList& properties) -> ToolResult {
        std::string gw = GetGatewayIp();
        if (gw.empty()) return std::unexpected("No gateway IP");
        int ext = properties["ext_port"].value<int>();
        int inner = properties["int_port"].value<int>();
        auto ip = properties["ip"].value<std::string>();

        char url[256];
        snprintf(url, sizeof(url),
                 "http://%s/cgi-bin/routerapi?action=portforward&ext=%d&ip=%s&in=%d",
                 gw.c_str(), ext, ip.c_str(), inner);

        auto http = Board::GetInstance().GetNetwork()->CreateHttp(3);
        if (auto opened = http->Open("GET", url); !opened) {
            return std::unexpected("Open failed: " + opened.error().ToString());
        }
        auto status = http->GetStatusCode();
        if (!status || *status != 200) return std::unexpected("HTTP error");
        std::string body = http->ReadAll();
        http->Close();
        // 返回里有 need_confirm:true 和 confirm 码
        // 大模型据此向用户复述并请求确认
        return body;
    });

// 第二步：确认执行 —— 大模型拿到确认码后，用户说"确认"才调这个
AddTool(
    "router.port_forward_confirm",
    "Execute a previously requested port mapping. Only call this after the user explicitly confirmed. Params: ext_port, ip, int_port, confirm (the code returned by router.port_forward).",
    PropertyList({
        Property("ext_port", kPropertyTypeInteger, 1, 65535),
        Property("ip", kPropertyTypeString),
        Property("int_port", kPropertyTypeInteger, 1, 65535),
        Property("confirm", kPropertyTypeString)
    }),
    [](const PropertyList& properties) -> ToolResult {
        std::string gw = GetGatewayIp();
        if (gw.empty()) return std::unexpected("No gateway IP");
        int ext = properties["ext_port"].value<int>();
        int inner = properties["int_port"].value<int>();
        auto ip = properties["ip"].value<std::string>();
        auto confirm = properties["confirm"].value<std::string>();

        char url[320];
        snprintf(url, sizeof(url),
                 "http://%s/cgi-bin/routerapi?action=portforward&ext=%d&ip=%s&in=%d&confirm=%s",
                 gw.c_str(), ext, ip.c_str(), inner, confirm.c_str());

        auto http = Board::GetInstance().GetNetwork()->CreateHttp(3);
        if (auto opened = http->Open("GET", url); !opened) {
            return std::unexpected("Open failed: " + opened.error().ToString());
        }
        auto status = http->GetStatusCode();
        if (!status || *status != 200) return std::unexpected("HTTP error");
        std::string body = http->ReadAll();
        http->Close();
        return body;
    });

// 查看已建映射
AddTool(
    "router.port_forward_list",
    "List all port mappings created by this assistant.",
    PropertyList(),
    [](const PropertyList& properties) -> ToolResult {
        std::string gw = GetGatewayIp();
        if (gw.empty()) return std::unexpected("No gateway IP");
        std::string url = "http://" + gw + "/cgi-bin/routerapi?action=portforward_list";
        auto http = Board::GetInstance().GetNetwork()->CreateHttp(3);
        if (auto opened = http->Open("GET", url.c_str()); !opened) {
            return std::unexpected("Open failed: " + opened.error().ToString());
        }
        auto status = http->GetStatusCode();
        if (!status || *status != 200) return std::unexpected("HTTP error");
        std::string body = http->ReadAll();
        http->Close();
        return body;
    });
