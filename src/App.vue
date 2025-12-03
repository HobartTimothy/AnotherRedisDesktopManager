<template>
  <el-container class="wrap-container" spellcheck="false">
    <!-- left icon nav bar -->
    <div class="nav-icon-bar" :class="{ collapsed: navCollapsed }">
      <!-- header with logo and toggle -->
      <div class="nav-header">
        <img v-if="!navCollapsed" src="./assets/logo.png" class="nav-logo" alt="logo" />
        <div class="nav-toggle-btn" @click="toggleNav" :title="navCollapsed ? 'Expand' : 'Collapse'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          @click="openSettings"
          :title="$t('message.settings')">
          <i class="fa fa-cog"></i>
          <span v-if="!navCollapsed" class="nav-label">{{ $t('message.settings') }}</span>
        </div>
        <div 
          class="nav-icon-item" 
          @click="openGitHub"
          :title="'GitHub'">
          <i class="fa fa-github"></i>
          <span v-if="!navCollapsed" class="nav-label">GitHub</span>
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
    openSettings() {
      this.$refs.aside.$refs.settingDialog.show();
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
html {
  height: 100%;
}
body {
  height: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;

  /*fix body scroll-y caused by tooltip in table*/
  overflow: hidden;
}

button, input, textarea, .vjs__tree {
  font-family: inherit !important;
}
a {
  color: #8e8d8d;
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
}

/* Nav Icon Bar Styles */
.nav-icon-bar {
  width: 140px;
  min-width: 140px;
  height: 100%;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  transition: width 0.2s, min-width 0.2s;
}
.nav-icon-bar.collapsed {
  width: 48px;
  min-width: 48px;
}
.dark-mode .nav-icon-bar {
  background: #1e2d35;
  border-right-color: #4a5a64;
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
  border-radius: 8px;
  margin: 2px 0;
  color: #606266;
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
.dark-mode .nav-icon-bar .nav-icon-item {
  color: #b0bec5;
}
.nav-icon-bar .nav-icon-item:hover {
  background: #e4e7ed;
  color: #409EFF;
}
.dark-mode .nav-icon-bar .nav-icon-item:hover {
  background: #3a4a54;
  color: #409EFF;
}
.nav-icon-bar .nav-icon-item.active {
  background: #409EFF;
  color: #fff;
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
  padding: 8px 8px 4px 12px;
}
.nav-icon-bar.collapsed .nav-header {
  justify-content: center;
  padding: 8px 8px 4px 8px;
}
.nav-logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

/* Toggle Button */
.nav-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #909399;
}
.nav-toggle-btn:hover {
  background: #e4e7ed;
  color: #409EFF;
}
.dark-mode .nav-toggle-btn {
  color: #b0bec5;
}
.dark-mode .nav-toggle-btn:hover {
  background: #3a4a54;
  color: #409EFF;
}
.nav-toggle-btn svg {
  display: block;
}

.aside-drag-container {
  position: relative;
  user-select: none;
  /*max-width: 50%;*/
}
.aside-connection {
  height: 100%;
  width: 100% !important;
  border-right: 1px solid #e4e0e0;
  overflow: hidden;
}
/*fix right container imdraggable*/
.right-main-container {
  width: 10%;
}
.right-main-container .main-tabs-container {
  overflow-y: hidden;
  padding-top: 0px;
  padding-right: 4px;
}

/* Command Log Full Page */
.command-log-fullpage {
  flex: 1;
  height: 100%;
  overflow: hidden;
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
}
#drag-resize-pointer::after {
  content: "";
  display: inline-block;
  width: 2px;
  height: 20px;
  border-left: 1px solid #adabab;
  border-right: 1px solid #adabab;

  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  margin: auto;
}
.dark-mode #drag-resize-pointer::after {
  border-left: 1px solid #b9b8b8;
  border-right: 1px solid #b9b8b8;
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
</style>
