<template>
  <div class="aside-outer-container">
    <div>
      <!-- Right Click Menu -->
      <div
        v-show="contextMenuVisible"
        class="aside-context-menu"
        :style="{ left: menuX + 'px', top: menuY + 'px' }">
        <div class="menu-item" @click="addNewConnection">
          <i class="fa fa-plus-circle"></i>
          {{ $t('message.new_connection') }}
        </div>
        <div class="menu-item" @click="addNewGroup">
          <i class="fa fa-folder"></i>
          {{ $t('message.add_group') }}
        </div>
      </div>

      <!-- new connection dialog -->
      <NewConnectionDialog
        @editConnectionFinished="editConnectionFinished"
        ref="newConnectionDialog">
      </NewConnectionDialog>

      <!-- user settings -->
      <Setting ref="settingDialog"></Setting>

      <!-- redis command logs -->
      <CommandLog ref='commandLogDialog'></CommandLog>
      <!-- hot key tips dialog -->
      <HotKeys ref='hotKeysDialog'></HotKeys>
      <!-- custom shell formatter -->
      <CustomFormatter></CustomFormatter>
    </div>

    <!-- connection list -->
    <Connections ref="connections" @contextmenu.native.prevent="showContextMenu"></Connections>
  </div>
</template>

<script type="text/javascript">
import Setting from '@/components/Setting';
import Connections from '@/components/Connections';
import NewConnectionDialog from '@/components/NewConnectionDialog';
import CommandLog from '@/components/CommandLog';
import HotKeys from '@/components/HotKeys';
import CustomFormatter from '@/components/CustomFormatter';

export default {
  data() {
    return {
      contextMenuVisible: false,
      menuX: 0,
      menuY: 0,
    };
  },
  components: {
    Connections, NewConnectionDialog, Setting, CommandLog, HotKeys, CustomFormatter,
  },
  created() {
    document.addEventListener('click', this.hideContextMenu);
    this.$bus.$on('refreshConnections', this.handleRefreshConnections);
    this.$bus.$on('showNewConnectionWithGroup', this.handleShowNewConnectionWithGroup);
    this.$bus.$on('hideAllContextMenus', this.hideContextMenu);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.hideContextMenu);
    this.$bus.$off('refreshConnections', this.handleRefreshConnections);
    this.$bus.$off('showNewConnectionWithGroup', this.handleShowNewConnectionWithGroup);
    this.$bus.$off('hideAllContextMenus', this.hideContextMenu);
  },
  methods: {
    handleRefreshConnections() {
      // Refresh connections list
    },
    handleShowNewConnectionWithGroup(groupKey) {
      this.$refs.newConnectionDialog.showWithGroup(groupKey);
    },
    showContextMenu(e) {
      // 如果点击在分组上，不显示此菜单（分组有自己的菜单）
      if (e.target.closest && e.target.closest('.connection-group')) {
        return;
      }
      this.menuX = e.clientX;
      this.menuY = e.clientY;
      this.contextMenuVisible = true;
    },
    hideContextMenu() {
      this.contextMenuVisible = false;
    },
    editConnectionFinished() {
      this.$refs.connections.initConnections();
      this.updateConnectionsCount();
    },
    addNewConnection() {
      this.hideContextMenu();
      this.$refs.newConnectionDialog.show();
    },
    addNewGroup() {
      this.hideContextMenu();
      this.$refs.connections.showAddGroupDialog();
    },
    initShortcut() {
      // new connection
      this.$shortcut.bind('ctrl+n, ⌘+n', () => {
        this.$refs.newConnectionDialog.show();
        return false;
      });
      // settings
      this.$shortcut.bind('ctrl+,', () => {
        this.$refs.settingDialog.show();
        return false;
      });
      this.$shortcut.bind('⌘+,', () => {
        this.$refs.settingDialog.show();
        return false;
      });
      // logs
      this.$shortcut.bind('ctrl+g, ⌘+g', () => {
        this.$refs.commandLogDialog.show();
        return false;
      });
    },
  },
  mounted() {
    this.initShortcut();
  },
};
</script>

<style type="text/css">
  .aside-outer-container {
    height: 100%;
  }
  .aside-context-menu {
    position: fixed;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    min-width: 150px;
  }
  .dark-mode .aside-context-menu {
    background: #2d3a40;
    border-color: #4a5a64;
  }
  .aside-context-menu .menu-item {
    padding: 10px 16px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
  }
  .aside-context-menu .menu-item i {
    width: 16px;
    margin-right: 8px;
    text-align: center;
  }
  .aside-context-menu .menu-item:hover {
    background: #f0f2f5;
  }
  .dark-mode .aside-context-menu .menu-item:hover {
    background: #3a4a54;
  }
</style>
