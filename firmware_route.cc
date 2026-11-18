// 固件侧：静态路由工具（控制类，带二次确认）
// 加进 main/mcp_server.cc 的 InitializeTools()，依赖 firmware_tool.cc 里的 GetGatewayIp()

// 查看静态路由
AddTool(
    "router.route_list",
    "List all static routes on the OpenWrt router (target, gateway, netmask).",
    PropertyList(),
    [](const PropertyList& properties) -> ToolResult {
        std::string gw = GetGatewayIp();
        if (gw.empty()) return std::unexpected("No gateway IP");
        std::string url = "http://" + gw + "/cgi-bin/routerapi?action=route_list";
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

// 第一步：请求添加路由 —— 返回确认码，不真正执行
AddTool(
    "router.route_add",
    "Request to add a static route. Ask the user to confirm before calling route_add_confirm. Params: cidr (target network like 192.168.2.0/24), gateway (next hop IP).",
    PropertyList({
        Property("cidr", kPropertyTypeString),
        Property("gateway", kPropertyTypeString)
    }),
    [](const PropertyList& properties) -> ToolResult {
        std::string gw = GetGatewayIp();
        if (gw.empty()) return std::unexpected("No gateway IP");
        auto cidr = properties["cidr"].value<std::string>();
        auto gateway = properties["gateway"].value<std::string>();

        char url[320];
        snprintf(url, sizeof(url),
                 "http://%s/cgi-bin/routerapi?action=route_add&cidr=%s&gw=%s",
                 gw.c_str(), cidr.c_str(), gateway.c_str());

        auto http = Board::GetInstance().GetNetwork()->CreateHttp(3);
        if (auto opened = http->Open("GET", url); !opened) {
            return std::unexpected("Open failed: " + opened.error().ToString());
        }
        auto status = http->GetStatusCode();
        if (!status || *status != 200) return std::unexpected("HTTP error");
        std::string body = http->ReadAll();
        http->Close();
        // 返回 need_confirm:true 和 confirm 码，大模型据此请求用户确认
        return body;
    });

// 第二步：确认添加 —— 用户确认后带 confirm 码执行
AddTool(
    "router.route_add_confirm",
    "Execute a previously requested static route addition. Only call after user confirms. Params: cidr, gateway, confirm (code from router.route_add).",
    PropertyList({
        Property("cidr", kPropertyTypeString),
        Property("gateway", kPropertyTypeString),
        Property("confirm", kPropertyTypeString)
    }),
    [](const PropertyList& properties) -> ToolResult {
        std::string gw = GetGatewayIp();
        if (gw.empty()) return std::unexpected("No gateway IP");
        auto cidr = properties["cidr"].value<std::string>();
        auto gateway = properties["gateway"].value<std::string>();
        auto confirm = properties["confirm"].value<std::string>();

        char url[384];
        snprintf(url, sizeof(url),
                 "http://%s/cgi-bin/routerapi?action=route_add&cidr=%s&gw=%s&confirm=%s",
                 gw.c_str(), cidr.c_str(), gateway.c_str(), confirm.c_str());

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

// 第一步：请求删除路由 —— 返回确认码
AddTool(
    "router.route_del",
    "Request to delete a static route. Ask the user to confirm before calling route_del_confirm. Param: cidr (target network like 192.168.2.0/24).",
    PropertyList({
        Property("cidr", kPropertyTypeString)
    }),
    [](const PropertyList& properties) -> ToolResult {
        std::string gw = GetGatewayIp();
        if (gw.empty()) return std::unexpected("No gateway IP");
        auto cidr = properties["cidr"].value<std::string>();

        char url[320];
        snprintf(url, sizeof(url),
                 "http://%s/cgi-bin/routerapi?action=route_del&cidr=%s",
                 gw.c_str(), cidr.c_str());

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

// 第二步：确认删除
AddTool(
    "router.route_del_confirm",
    "Execute a previously requested static route deletion. Only call after user confirms. Params: cidr, confirm (code from router.route_del).",
    PropertyList({
        Property("cidr", kPropertyTypeString),
        Property("confirm", kPropertyTypeString)
    }),
    [](const PropertyList& properties) -> ToolResult {
        std::string gw = GetGatewayIp();
        if (gw.empty()) return std::unexpected("No gateway IP");
        auto cidr = properties["cidr"].value<std::string>();
        auto confirm = properties["confirm"].value<std::string>();

        char url[384];
        snprintf(url, sizeof(url),
                 "http://%s/cgi-bin/routerapi?action=route_del&cidr=%s&confirm=%s",
                 gw.c_str(), cidr.c_str(), confirm.c_str());

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
