include $(TOPDIR)/rules.mk

PKG_NAME:=sblite
PKG_VERSION:=$(strip $(if $(CONFIG_VERSION_CODE),$(CONFIG_VERSION_CODE),$(if $(shell git describe --tags --abbrev=0 2>/dev/null),$(shell git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//'),1.0.0)))
PKG_RELEASE:=1

PKG_MAINTAINER:=SBLite
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/sblite
  SECTION:=net
  CATEGORY:=Network
  TITLE:=sblite service
  DEPENDS:=
endef

define Package/sblite/description
  A lightweight Sing-box controller with Web UI.
endef

define Build/Download
	# Do nothing
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	# Copy the pre-built binary from the artifacts directory into the build directory
	cp /artifacts/sblite-bin $(PKG_BUILD_DIR)/sblite
endef

define Build/Compile
	# This package uses precompiled binaries provided externally.
endef

define Build/Clean
	# Do nothing
endef

define Package/sblite/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/sblite $(1)/usr/bin/sblite

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/sblite.init $(1)/etc/init.d/sblite
endef

$(eval $(call BuildPackage,sblite))
