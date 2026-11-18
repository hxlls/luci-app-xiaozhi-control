include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-xiaozhi-control
PKG_VERSION:=1.0
PKG_RELEASE:=1

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-xiaozhi-control
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=XiaoZhi Control Configuration
  DEPENDS:=+luci-base +xiaozhi-api
  PKGARCH:=all
endef

define Package/luci-app-xiaozhi-control/description
  LuCI web interface for xiaozhi-api (config, device list, port forwarding).
endef

define Package/luci-app-xiaozhi-control/install
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./files/menu.d/luci-app-xiaozhi-control.json $(1)/usr/share/luci/menu.d/

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./files/acl.d/luci-app-xiaozhi-control.json $(1)/usr/share/rpcd/acl.d/

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/xiaozhi-control
	$(INSTALL_DATA) ./files/view/xiaozhi-control.js $(1)/www/luci-static/resources/view/xiaozhi-control/xiaozhi-control.js
endef

$(eval $(call BuildPackage,luci-app-xiaozhi-control))
