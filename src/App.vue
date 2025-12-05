<template>
  <el-container class="wrap-container" spellcheck="false">
    <!-- left icon nav bar -->
    <div class="nav-icon-bar" :class="{ collapsed: navCollapsed }">
      <!-- Settings Menu -->
      <div
        v-show="settingsMenuVisible"
        class="settings-menu"
        :style="{ left: menuX + 'px', top: menuY + 'px' }">
        <div class="menu-item" @click="openPreferences">
          <i class="fa fa-cog"></i>
          {{ $t('message.preferences') }}
        </div>
        <div class="menu-item" @click="reportBug">
          <i class="fa fa-bug"></i>
          {{ $t('message.report_bug') }}
        </div>
        <div class="menu-item" @click="openGuide">
          <i class="fa fa-book"></i>
          {{ $t('message.user_guide') }}
        </div>
        <div class="menu-item" @click="checkUpdate">
          <i class="fa fa-refresh"></i>
          {{ $t('message.check_update') }}...
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="showAboutDialog">
          <i class="fa fa-info-circle"></i>
          {{ $t('message.about') }}
        </div>
      </div>

      <!-- About Dialog -->
      <el-dialog :visible.sync="aboutDialogVisible" width="480px" :append-to-body="true" :show-close="true" custom-class="about-dialog">
        <div class="about-content">
          <div class="about-badge">
            <img src="./assets/applogo.png" class="about-logo" alt="logo" />
            <div class="about-glow"></div>
          </div>
          <div class="about-text">
            <h2 class="about-title">Another Redis Desktop Manager</h2>
            <p class="about-version">v{{ appVersion }}</p>
            <p class="about-tagline">{{ $t('message.about') }}</p>
          </div>
          <div class="about-actions">
            <el-button type="primary" round @click="openGitHub">
              <i class="fa fa-github"></i> {{ $t('message.source_code') }}
            </el-button>
            <el-button round plain @click="openGuide">
              <i class="fa fa-book"></i> {{ $t('message.user_guide') }}
            </el-button>
          </div>
          <div class="about-footnote">
            <span>Redis · Desktop · Productivity</span>
            <span class="dot">•</span>
            <span>Copyright © 2025 HobartTimothy</span>
          </div>
        </div>
      </el-dialog>

      <!-- header with logo and toggle -->
      <div class="nav-header">
        <img v-if="!navCollapsed" src="./assets/applogo.png" class="nav-logo" alt="logo" />
        <div class="nav-toggle-btn" @click="toggleNav" :title="navCollapsed ? 'Expand' : 'Collapse'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line :x1="navCollapsed ? 15 : 9" y1="3" :x2="navCollapsed ? 15 : 9" y2="21"></line>
          </svg>
        </div>
      </div>

      <div class="nav-top">
        <div
          class="nav-icon-item"
          :class="{ active: activeNav === 'server' }"
          @click="switchNav('server')"
          :title="$t('message.my_connections')">
          <i class="fa fa-server"></i>
          <span v-if="!navCollapsed" class="nav-label">{{ $t('message.my_connections') }}</span>
        </div>
        <div
          class="nav-icon-item"
          :class="{ active: activeNav === 'history' }"
          @click="switchNav('history')"
          :title="$t('message.command_log')">
          <i class="fa fa-history"></i>
          <span v-if="!navCollapsed" class="nav-label">{{ $t('message.command_log') }}</span>
        </div>
      </div>
      <div class="nav-bottom">
        <div
          class="nav-icon-item"
          @click="showSettingsMenu"
          :title="$t('message.settings')">
          <i class="fa fa-cog"></i>
          <span v-if="!navCollapsed" class="nav-label">{{ $t('message.settings') }}</span>
        </div>
      </div>
    </div>

    <!-- left aside draggable container -->
    <div v-show="activeNav === 'server'" class="aside-drag-container" :style="{width: sideWidth + 'px'}">
      <!-- connections -->
      <el-aside class="aside-connection">
        <Aside ref="aside"></Aside>
      </el-aside>

      <!-- drag area -->
      <div id="drag-resize-container">
        <div id="drag-resize-pointer"></div>
      </div>
    </div>

    <!-- right main container -->
    <el-container v-show="activeNav === 'server'" class='right-main-container'>
      <!-- tab container -->
      <el-main class='main-tabs-container'>
        <Tabs></Tabs>
      </el-main>
    </el-container>

    <!-- command log panel (full page) -->
    <div v-show="activeNav === 'history'" class="command-log-fullpage">
      <CommandLogPanel ref="commandLogPanel"></CommandLogPanel>
    </div>

    <UpdateCheck></UpdateCheck>
  </el-container>
</template>

<script>
import Aside from '@/Aside';
import Tabs from '@/components/Tabs';
import UpdateCheck from '@/components/UpdateCheck';
import CommandLogPanel from '@/components/CommandLogPanel';
import addon from './addon';
import { shell } from 'electron';

export default {
  name: 'App',
  data() {
    return {
      sideWidth: 265,
      activeNav: 'server',
      navCollapsed: false,
      settingsMenuVisible: false,
      menuX: 0,
      menuY: 0,
      aboutDialogVisible: false,
      appVersion: (new URL(window.location.href)).searchParams.get('version'),
    };
  },
  created() {
    this.$bus.$on('reloadSettings', () => {
      addon.reloadSettings();
    });

    // restore side bar width
    this.restoreSideBarWidth();
    // restore nav collapsed state
    this.navCollapsed = localStorage.navCollapsed === 'true';
    // hide menu on click
    document.addEventListener('click', this.hideSettingsMenu);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.hideSettingsMenu);
  },
  components: { Aside, Tabs, UpdateCheck, CommandLogPanel },
  methods: {
    switchNav(nav) {
      this.activeNav = nav;
    },
    toggleNav() {
      this.navCollapsed = !this.navCollapsed;
      localStorage.navCollapsed = this.navCollapsed;
    },
    showSettingsMenu(e) {
      e.stopPropagation();
      // Position menu above the settings button
      const rect = e.currentTarget.getBoundingClientRect();
      this.menuX = rect.left;
      this.menuY = rect.top - 10; // Will be adjusted by CSS transform
      this.settingsMenuVisible = true;
    },
    hideSettingsMenu() {
      this.settingsMenuVisible = false;
    },
    showAboutDialog() {
      this.hideSettingsMenu();
      this.aboutDialogVisible = true;
    },
    openPreferences() {
      this.hideSettingsMenu();
      this.$refs.aside.$refs.settingDialog.show();
    },
    reportBug() {
      this.hideSettingsMenu();
      shell.openExternal('https://github.com/HobartTimothy/AnotherRedisDesktopManager/issues');
    },
    openGuide() {
      this.hideSettingsMenu();
      shell.openExternal('https://github.com/HobartTimothy/AnotherRedisDesktopManager#readme');
    },
    checkUpdate() {
      this.hideSettingsMenu();
      this.$bus.$emit('update-check');
    },
    openGitHub() {
      shell.openExternal('https://github.com/HobartTimothy/AnotherRedisDesktopManager');
    },
    bindSideBarDrag() {
      const that = this;
      const dragPointer = document.getElementById('drag-resize-pointer');

      function mousemove(e) {
        const mouseX = e.x;
        const dragSideWidth = mouseX - 17;

        if ((dragSideWidth > 200) && (dragSideWidth < 1500)) {
          that.sideWidth = dragSideWidth;
        }
      }

      function mouseup(e) {
        document.documentElement.removeEventListener('mousemove', mousemove);
        document.documentElement.removeEventListener('mouseup', mouseup);

        // store side bar with
        localStorage.sideWidth = that.sideWidth;
      }

      dragPointer.addEventListener('mousedown', (e) => {
        e.preventDefault();

        document.documentElement.addEventListener('mousemove', mousemove);
        document.documentElement.addEventListener('mouseup', mouseup);
      });
    },
    restoreSideBarWidth() {
      const { sideWidth } = localStorage;
      sideWidth && (this.sideWidth = sideWidth);
    },
  },
  mounted() {
    setTimeout(() => {
      this.$bus.$emit('update-check');
    }, 2000);

    this.bindSideBarDrag();
    // addon init setup
    addon.setup();
  },
};
</script>

<style type="text/css">
/* Design tokens */
:root {
  --app-accent: #22d3ee;
  --app-accent-strong: #0ea5e9;
  --app-bg: #f5f7fb;
  --app-surface: #ffffff;
  --app-muted: #6b7280;
  --app-ink: #1f2937;
  --app-border: #e5e7eb;
}
.dark-mode {
  --app-accent: #38bdf8;
  --app-accent-strong: #0ea5e9;
  --app-bg: #0b1220;
  --app-surface: #0f172a;
  --app-muted: #9ca3af;
  --app-ink: #e5e7eb;
  --app-border: #1f2937;
}

html {
  height: 100%;
}
body {
  height: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  background: radial-gradient(120% 120% at 10% 20%, #e0f2fe 0%, #f8fafc 35%, #f5f7fb 70%, #edf1f7 100%);
  color: var(--app-ink);

  /*fix body scroll-y caused by tooltip in table*/
  overflow: hidden;
}
.dark-mode body {
  background: radial-gradient(120% 120% at 15% 20%, rgba(56, 189, 248, 0.08) 0%, #0b1220 45%, #0b1220 100%);
  color: var(--app-ink);
}

button, input, textarea, .vjs__tree {
  font-family: inherit !important;
}
a {
  color: var(--app-muted);
}


/*fix el-select bottom scroll bar*/
.el-scrollbar__wrap {
  overflow-x: hidden;
}

/*scrollbar style start*/
::-webkit-scrollbar {
  width: 9px;
}
/*track*/
::-webkit-scrollbar-track {
  background: #eaeaea;
  border-radius: 4px;
}
.dark-mode ::-webkit-scrollbar-track {
  background: #425057;
}
/*track hover*/
::-webkit-scrollbar-track:hover {
  background: #e0e0dd;
}
.dark-mode ::-webkit-scrollbar-track:hover {
  background: #495961;
}
/*thumb*/
::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: #c1c1c1;
}
.dark-mode ::-webkit-scrollbar-thumb {
  background: #5a6f7a;
}
/*thumb hover*/
::-webkit-scrollbar-thumb:hover {
  background: #7f7f7f;
}
.dark-mode ::-webkit-scrollbar-thumb:hover {
  background: #6a838f;
}
/*scrollbar style end*/

/*list index*/
li .list-index {
  color: #828282;
  /*font-size: 80%;*/
  user-select: none;
  margin-right: 10px;
  min-width: 28px;
}
.dark-mode li .list-index {
  color: #adacac;
}

.wrap-container {
  height: 100%;
  background: transparent;
}

/* Nav Icon Bar Styles */
.nav-icon-bar {
  width: 148px;
  min-width: 148px;
  height: 100%;
  background: var(--app-surface);
  border-right: 1px solid var(--app-border);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  transition: width 0.2s, min-width 0.2s;
  box-shadow: 2px 0 16px rgba(15, 23, 42, 0.08);
}
.nav-icon-bar.collapsed {
  width: 56px;
  min-width: 56px;
}
.nav-icon-bar .nav-top {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0 4px;
  flex: 1;
}
.nav-icon-bar .nav-bottom {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0 4px 8px 4px;
}
.nav-icon-bar .nav-icon-item {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid transparent;
  margin: 2px 0;
  color: var(--app-muted);
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
}
.nav-icon-bar .nav-icon-item i {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}
.nav-icon-bar .nav-icon-item .nav-label {
  margin-left: 10px;
  font-size: 13px;
}
.nav-icon-bar .nav-icon-item:hover {
  background: rgba(148, 163, 184, 0.14);
  color: var(--app-ink);
  transform: translateX(2px);
}
.nav-icon-bar .nav-icon-item.active {
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid var(--app-border);
  color: var(--app-ink);
  font-weight: 600;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
}
.dark-mode .nav-icon-bar .nav-icon-item.active {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(148, 163, 184, 0.25);
  color: #e5e7eb;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.36);
}
.nav-icon-bar.collapsed .nav-icon-item {
  justify-content: center;
  padding: 0;
}

/* Nav Header with Logo and Toggle */
.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 12px 12px;
}
.nav-icon-bar.collapsed .nav-header {
  justify-content: center;
  padding: 8px 8px 12px 8px;
}
.nav-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

/* Toggle Button */
.nav-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: var(--app-muted);
  border: 1px solid var(--app-border);
  background: rgba(0, 0, 0, 0.02);
}
.nav-toggle-btn:hover {
  background: rgba(34, 211, 238, 0.12);
  color: var(--app-ink);
}
.nav-toggle-btn svg {
  display: block;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  box-sizing: content-box;
}

.aside-drag-container {
  position: relative;
  user-select: none;
  /*max-width: 50%;*/
}
.aside-connection {
  height: 100%;
  width: 100% !important;
  border-right: 1px solid var(--app-border);
  overflow: hidden;
  background: var(--app-surface);
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.02);
}
/*fix right container imdraggable*/
.right-main-container {
  width: 10%;
}
.right-main-container .main-tabs-container {
  overflow-y: hidden;
  padding-top: 0px;
  padding-right: 4px;
  background: var(--app-bg);
}

/* Command Log Full Page */
.command-log-fullpage {
  flex: 1;
  height: 100%;
  overflow: hidden;
  background: var(--app-bg);
}

.el-message-box .el-message-box__message {
  word-break: break-all;
  overflow-y: auto;
  max-height: 80vh;
}

#drag-resize-container {
  position: absolute;
  /*height: 100%;*/
  width: 10px;
  right: -12px;
  top: 0px;
}
#drag-resize-pointer {
  position: fixed;
  height: 100%;
  width: 10px;
  cursor: col-resize;
  opacity: 0;
  transition: opacity 0.2s;
}
#drag-resize-pointer::after {
  content: "";
  display: inline-block;
  width: 2px;
  height: 20px;
  border-left: 1px solid rgba(148, 163, 184, 0.6);
  border-right: 1px solid rgba(148, 163, 184, 0.6);

  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  margin: auto;
}
.aside-drag-container:hover #drag-resize-pointer {
  opacity: 1;
}

@keyframes rotate {
  to{ transform: rotate(360deg); }
}

/*vxe-table dark-mode color*/
html .dark-mode {
  --vxe-ui-table-header-background-color: #273239 !important;
  --vxe-ui-layout-background-color: #273239 !important;
  --vxe-ui-table-row-striped-background-color: #3b4b54 !important;
  --vxe-ui-table-row-hover-background-color: #3b4b54 !important;
  --vxe-ui-table-row-hover-striped-background-color: #50646f !important;
  /*border color*/
  --vxe-ui-table-border-color: #7f8ea5 !important;
  /*font color*/
  --vxe-ui-font-color: #f3f3f4 !important;
  --vxe-ui-table-header-font-color: #f3f3f4 !important;
}

/* Settings Menu */
.settings-menu {
  position: fixed;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
  z-index: 9999;
  min-width: 160px;
  transform: translateY(-100%);
  padding: 4px 0;
}
.dark-mode .settings-menu {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
}
.settings-menu .menu-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  color: var(--app-ink);
}
.dark-mode .settings-menu .menu-item {
  color: #e5e7eb;
}
.settings-menu .menu-item i {
  width: 16px;
  margin-right: 10px;
  text-align: center;
}
.settings-menu .menu-item:hover {
  background: rgba(34, 211, 238, 0.12);
}
.dark-mode .settings-menu .menu-item:hover {
  background: rgba(56, 189, 248, 0.12);
}
.settings-menu .menu-divider {
  height: 1px;
  background: rgba(148, 163, 184, 0.4);
  margin: 4px 0;
}
.dark-mode .settings-menu .menu-divider {
  background: rgba(148, 163, 184, 0.2);
}

/* About Dialog */
.about-dialog {
  border-radius: 16px !important;
}
.about-dialog .el-dialog {
  border-radius: 16px !important;
}
.about-dialog .el-dialog__header {
  display: none;
}
.about-dialog .el-dialog__body {
  padding: 32px 34px 28px;
  background: linear-gradient(135deg, var(--app-surface), rgba(255, 255, 255, 0.92));
  border-radius: 16px;
}
.dark-mode .about-dialog .el-dialog__body {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(16, 24, 40, 0.86));
}
.about-content {
  text-align: center;
  color: var(--app-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.about-badge {
  position: relative;
  width: 108px;
  height: 108px;
  display: grid;
  place-items: center;
}
.about-logo {
  width: 82px;
  height: 82px;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(34, 211, 238, 0.22);
  z-index: 2;
}
.about-glow {
  position: absolute;
  inset: 0;
  border-radius: 28px;
  background: radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.4), transparent 60%),
              radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.45), transparent 60%);
  filter: blur(18px);
  z-index: 1;
}
.about-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.about-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--app-ink);
  letter-spacing: -0.2px;
}
.dark-mode .about-title {
  color: #e5e7eb;
}
.about-version {
  margin: 0;
  color: var(--app-muted);
  font-size: 14px;
}
.about-tagline {
  margin: 6px 0 0;
  color: var(--app-muted);
  font-size: 13px;
  letter-spacing: 0.2px;
}
.about-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
.about-actions .el-button {
  padding: 10px 16px;
  border-radius: 999px;
}
.about-actions .el-button--primary {
  background: linear-gradient(90deg, var(--app-accent) 0%, var(--app-accent-strong) 100%);
  border: none;
}
.about-actions .el-button--primary:hover {
  filter: brightness(1.05);
}
.about-actions .el-button.is-plain {
  border-color: var(--app-border);
  color: var(--app-ink);
}
.dark-mode .about-actions .el-button.is-plain {
  border-color: rgba(148, 163, 184, 0.2);
  color: #e5e7eb;
}
.about-footnote {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--app-muted);
  font-size: 12px;
  margin-top: 4px;
}
.about-footnote .dot {
  color: var(--app-accent);
}
</style>
