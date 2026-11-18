include $(TOPDIR)/rules.mk

PKG_NAME:=xiaozhi-api
PKG_VERSION:=0.1
PKG_RELEASE:=1

include $(INCLUDE_DIR)/package.mk

# 纯脚本包，无源码需要编译
define Build/Prepare
endef

define Build/Compile
endef

define Package/xiaozhi-api
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=HTTP JSON API for XiaoZhi ESP32
  DEPENDS:=+uhttpd +jsonfilter +wget
endef

define Package/xiaozhi-api/description
  Provide HTTP JSON endpoints so the XiaoZhi ESP32 firmware can query
  OpenWrt router state (clients / WAN / system) via MCP tools.
endef

define Package/xiaozhi-api/conffiles
/etc/config/xiaozhi-api
endef

define Package/xiaozhi-api/install
	$(INSTALL_DIR) $(1)/www/cgi-bin
	$(INSTALL_BIN) ./files/routerapi $(1)/www/cgi-bin/routerapi
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/xiaozhi-api.config $(1)/etc/config/xiaozhi-api
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/xiaozhi-api.init $(1)/etc/init.d/xiaozhi-api
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/oui-update.sh $(1)/usr/bin/oui-update.sh
endef

$(eval $(call BuildPackage,xiaozhi-api))
