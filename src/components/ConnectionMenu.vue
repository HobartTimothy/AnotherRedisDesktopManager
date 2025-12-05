<template>
<div class="connection-menu-title" @contextmenu.prevent.stop="showContextMenu">
  <el-dropdown
    ref="connectionDropdown"
    class='connection-menu-more connection-context-menu'
    trigger="manual"
    placement='bottom-start'
    :visible.sync="connectionMenuVisible"
    :show-timeout="0"
    :hide-timeout="150">
    <div :title="connectionTitle()" class="connection-name">
      <img v-if="config.icon" :src="config.icon" class="connection-icon-img" />
      <i v-else class="connection-icon fa fa-database" :style="{ color: config.markColor || '#dc382d' }"></i>
      {{config.connectionName}}
    </div>
    <el-dropdown-menu class='connection-menu-more-ul' slot="dropdown">
      <!-- move to group submenu -->
      <el-dropdown-item>
        <el-popover placement="right" trigger="hover" :visible-arrow="false" popper-class="move-to-group-popover">
          <div slot="reference" class="move-to-group-trigger">
            <span><i class='more-operate-ico fa fa-folder-open-o'></i>&nbsp;{{ $t('message.move_to_group') }}</span>
            <i class="el-icon-arrow-right"></i>
          </div>
          <div class="group-list">
            <!-- Ungrouped option -->
            <div class="group-item" @click="moveToGroup('')" v-if="config.groupKey">
              <i class="fa fa-folder-o"></i>&nbsp;{{ $t('message.ungrouped') }}
            </div>
            <!-- Root groups with nested children -->
            <template v-for="group in rootGroups">
              <div
                :key="group.key"
                class="group-item level-1"
                :class="{ 'is-current': config.groupKey === group.key }"
                @click="moveToGroup(group.key)">
                <i class="fa fa-folder" :style="{ color: group.color }"></i>&nbsp;{{ group.name }}
              </div>
              <!-- Level 2 children -->
              <template v-for="child2 in getChildGroups(group.key)">
                <div
                  :key="child2.key"
                  class="group-item level-2"
                  :class="{ 'is-current': config.groupKey === child2.key }"
                  @click="moveToGroup(child2.key)">
                  <i class="fa fa-folder" :style="{ color: child2.color }"></i>&nbsp;{{ child2.name }}
                </div>
                <!-- Level 3 children -->
                <div
                  v-for="child3 in getChildGroups(child2.key)"
                  :key="child3.key"
                  class="group-item level-3"
                  :class="{ 'is-current': config.groupKey === child3.key }"
                  @click="moveToGroup(child3.key)">
                  <i class="fa fa-folder" :style="{ color: child3.color }"></i>&nbsp;{{ child3.name }}
                </div>
              </template>
            </template>
            <div v-if="groups.length === 0" class="no-groups">
              {{ $t('message.no_groups') }}
            </div>
          </div>
        </el-popover>
      </el-dropdown-item>

      <el-dropdown-item @click.native='closeConnection' divided>
        <span><i class='more-operate-ico fa fa-power-off'></i>&nbsp;{{ $t('message.close_connection') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='showEditConnection'>
        <span><i class='more-operate-ico el-icon-edit-outline'></i>&nbsp;{{ $t('message.edit_connection') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='deleteConnection'>
        <span><i class='more-operate-ico el-icon-delete'></i>&nbsp;{{ $t('message.del_connection') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='duplicateConnection'>
        <span><i class='more-operate-ico fa fa-clone'></i>&nbsp;{{ $t('message.duplicate_connection') }}</span>
      </el-dropdown-item>

      <el-dropdown-item @click.native='memoryAnalisys' divided>
        <span><i class='more-operate-ico fa fa-table'></i>&nbsp;{{ $t('message.memory_analysis') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='slowLog'>
        <span><i class='more-operate-ico fa fa-hourglass-start'></i>&nbsp;{{ $t('message.slow_log') }}</span>
      </el-dropdown-item>

      <!-- menu color picker -->
      <el-tooltip placement="right" effect="light">
        <el-color-picker
          slot='content'
          v-model="menuColor"
          @change='changeColor'
          :predefine="['#f56c6c', '#F5C800', '#409EFF', '#85ce61', '#c6e2ff']">
        </el-color-picker>

        <el-dropdown-item divided>
          <span><i class='more-operate-ico fa fa-bookmark-o'></i>&nbsp;{{ $t('message.mark_color') }}</span>
        </el-dropdown-item>
      </el-tooltip>

      <el-dropdown-item @click.native='flushDB' divided>
        <span><i class='more-operate-ico fa fa-exclamation-triangle'></i>&nbsp;{{ $t('message.flushdb') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='importKeys'>
        <span><i class='more-operate-ico el-icon-download'></i>&nbsp;{{ $t('message.import') }} Key</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='execFileCMDS'>
        <span><i class='more-operate-ico fa fa-file-code-o'></i>&nbsp;{{ $t('message.import') }} CMD</span>
      </el-dropdown-item>
    </el-dropdown-menu>
  </el-dropdown>

  <NewConnectionDialog
    editMode='true'
    :config='config'
    @editConnectionFinished='editConnectionFinished'
    ref='editConnectionDialog'>
  </NewConnectionDialog>
</div>
</template>

<script type="text/javascript">
import storage from '@/storage.js';
import { dialog, getCurrentWindow } from '@electron/remote';
import NewConnectionDialog from '@/components/NewConnectionDialog';
import splitargs from '@qii404/redis-splitargs';

export default {
  data() {
    return {
      menuColor: '#409EFF',
      groups: [],
      connectionMenuVisible: false,
    };
  },
  props: ['config', 'client'],
  components: { NewConnectionDialog },
  computed: {
    rootGroups() {
      return this.groups.filter(g => !g.parentKey);
    },
  },
  created() {
    this.loadGroups();
    this.$bus.$on('duplicateConnection', (newConfig) => {
      // not self
      if (this.config.name !== newConfig.name) {
        return;
      }

      this.showEditConnection();
    });
    document.addEventListener('click', this.hideContextMenu);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.hideContextMenu);
  },
  methods: {
    showContextMenu() {
      this.connectionMenuVisible = true;
      this.$nextTick(() => {
        this.$refs.connectionDropdown && this.$refs.connectionDropdown.updatePopper && this.$refs.connectionDropdown.updatePopper();
      });
    },
    hideContextMenu() {
      this.connectionMenuVisible = false;
    },
    connectionTitle() {
      const { config } = this;
      const sep = '-----------';
      const lines = [
        config.connectionName,
        sep,
        `${this.$t('message.host')}: ${config.host}`,
        `${this.$t('message.port')}: ${config.port}`,
      ];

      config.username && lines.push(`${this.$t('message.username')}: ${config.username}`);
      config.separator && lines.push(`${this.$t('message.separator')}: "${config.separator}"`);

      if (config.connectionReadOnly) {
        lines.push(`${sep}\nREADONLY`);
      }
      if (config.sshOptions) {
        lines.push(`${sep}\nSSH:`);
        lines.push(`  ${this.$t('message.host')}: ${config.sshOptions.host}`);
        lines.push(`  ${this.$t('message.port')}: ${config.sshOptions.port}`);
        lines.push(`  ${this.$t('message.username')}: ${config.sshOptions.username}`);
      }
      if (config.cluster) {
        lines.push(`${sep}\nCLUSTER`);
      }
      if (config.sentinelOptions) {
        lines.push(`${sep}\nSENTINEL:`);
        lines.push(`  ${this.$t('message.master_group_name')}: ${config.sentinelOptions.masterName}`);
      }

      return lines.join('\n');
    },
    refreshConnection() {
      this.$emit('refreshConnection');
    },
    showEditConnection() {
      // connection is cloesd, do not display confirm
      if (!this.client) {
        return this.$refs.editConnectionDialog.show();
      }

      this.$confirm(
        this.$t('message.close_to_edit_connection'),
        { type: 'warning' },
      ).then(() => {
        this.$bus.$emit('closeConnection', this.config.connectionName);
        this.$refs.editConnectionDialog.show();
      }).catch(() => {});
    },
    closeConnection() {
      this.$confirm(
        this.$t('message.close_to_connection'),
        { type: 'warning' },
      ).then(() => {
        this.$bus.$emit('closeConnection', this.config.connectionName);
      }).catch(() => {});
    },
    editConnectionFinished(newConfig) {
      this.$bus.$emit('refreshConnections');
    },
    duplicateConnection() {
      // empty key\order , just as a new connection
      const newConfig = {
        ...this.config,
        key: undefined,
        order: undefined,
        connectionName: undefined,
      };

      storage.addConnection(newConfig);

      this.$bus.$emit('refreshConnections');
      // 100ms after connection list is ready
      setTimeout(() => {
        this.$bus.$emit('duplicateConnection', newConfig);
      }, 100);
    },
    deleteConnection() {
      this.$confirm(
        this.$t('message.confirm_to_delete_connection'),
        { type: 'warning' },
      ).then(() => {
        storage.deleteConnection(this.config);
        this.$bus.$emit('refreshConnections');

        this.$message.success({
          message: this.$t('message.delete_success'),
          duration: 1000,
        });
      }).catch(() => {});
    },
    openStatus() {
      if (!this.client) {
        // open Connections.vue menu
        this.$parent.$parent.$parent.$refs.connectionMenu.open(this.config.connectionName);
        // open connection
        this.$parent.$parent.$parent.openConnection();
      } else {
        this.$bus.$emit('openStatus', this.client, this.config.connectionName);
      }
    },
    openCli() {
      // open cli before connection opened
      if (!this.client) {
        // open Connections.vue menu
        this.$parent.$parent.$parent.$refs.connectionMenu.open(this.config.connectionName);
        // open connection
        this.$parent.$parent.$parent.openConnection(() => {
          this.$bus.$emit('openCli', this.client, this.config.connectionName);
        });
      } else {
        this.$bus.$emit('openCli', this.client, this.config.connectionName);
      }
    },
    memoryAnalisys() {
      if (!this.client) {
        return;
      }

      this.$bus.$emit('memoryAnalysis', this.client, this.config.connectionName);
    },
    slowLog() {
      if (!this.client) {
        return;
      }

      this.$bus.$emit('slowLog', this.client, this.config.connectionName);
    },
    importKeys() {
      dialog.showOpenDialog(getCurrentWindow(), {
        properties: ['openFile'],
      }).then((reply) => {
        if (reply.canceled) {
          return;
        }

        const succ = [];
        const fail = [];
        let count = 0;

        const rl = require('readline').createInterface({
          input: require('fs').createReadStream(reply.filePaths[0]),
        });

        rl.on('line', (line) => {
          let [key, content, ttl] = line.split(',');

          if (!key || !content) {
            return;
          }

          count++;

          // show notify in first time
          if (count === 1) {
            this.$notify.success({
              message: this.$createElement('p', { ref: 'importKeysNotify' }, ''),
              duration: 0,
            });
          }

          key = Buffer.from(key, 'hex');
          content = Buffer.from(content, 'hex');
          ttl = ttl > 0 ? ttl : 0;

          // fix #1213, REPLACE can be used in Redis>=3.0
          this.client.callBuffer('RESTORE', key, ttl, content, 'REPLACE').then((reply) => {
            // reply == 'OK'
            succ.push(key);
          }).catch((e) => {
            fail.push(key);
          }).finally(() => {
            this.$set(this.$refs.importKeysNotify,
              'innerHTML',
              `Succ: ${succ.length}, Fail: ${fail.length}`);
          });
        });

        rl.on('close', () => {
          if (count === 0) {
            return this.$message.error('File parse failed.');
          }

          (count > 10000) && this.$message.success({
            message: this.$t('message.import_success'),
            duration: 800,
          });

          // refresh keu list
          this.$bus.$emit('refreshKeyList', this.client);
        });
      });
    },
    execFileCMDS() {
      dialog.showOpenDialog(getCurrentWindow(), {
        properties: ['openFile'],
      }).then((reply) => {
        if (reply.canceled) {
          return;
        }

        const succ = [];
        const fail = [];
        let count = 0;

        const rl = require('readline').createInterface({
          input: require('fs').createReadStream(reply.filePaths[0]),
        });

        rl.on('line', (line) => {
          const paramsArr = splitargs(line, true);

          if (!paramsArr || !paramsArr.length) {
            return;
          }

          count++;

          // show notify in first time
          if (count === 1) {
            this.$notify.success({
              message: this.$createElement('p', { ref: 'importCMDNotify' }, ''),
              duration: 0,
            });
          }

          this.client.callBuffer(...paramsArr).then((reply) => {
            succ.push(line);
          }).catch((e) => {
            fail.push(line);
          }).finally(() => {
            this.$set(this.$refs.importCMDNotify,
              'innerHTML',
              `Succ: ${succ.length}, Fail: ${fail.length}`
            );
          });
        });

        rl.on('close', () => {
          if (count === 0) {
            return this.$message.error('File parse failed.');
          }

          (count > 10000) && this.$message.success({
            message: this.$t('message.import_success'),
            duration: 800,
          });

          // refresh key list
          this.$bus.$emit('refreshKeyList', this.client);
        });
      });
    },
    flushDB() {
      if (!this.client) {
        return;
      }

      const preDB = this.client.condition ? this.client.condition.select : 0;
      const inputTxt = 'y';
      const placeholder = this.$t('message.flushdb_prompt', { txt: inputTxt });

      this.$prompt(this.$t('message.confirm_flush_db', { db: preDB }), {
        inputValidator: value => ((value == inputTxt) ? true : placeholder),
        inputPlaceholder: placeholder,
      })
        .then((value) => {
          this.client.flushdb().then((reply) => {
            if (reply == 'OK') {
              this.$message.success({
                message: this.$t('message.delete_success'),
                duration: 1000,
              });

              this.refreshConnection();
            }
          }).catch((e) => { this.$message.error(e.message); });
        })
        .catch((e) => {});
    },
    changeColor(color) {
      this.$emit('changeColor', color);
    },
    loadGroups() {
      this.groups = storage.getGroups(true);
    },
    getChildGroups(parentKey) {
      return this.groups.filter(g => g.parentKey === parentKey);
    },
    moveToGroup(groupKey) {
      if (this.config.groupKey === groupKey) {
        return;
      }
      storage.moveConnectionToGroup(this.config, groupKey);
      this.$bus.$emit('refreshConnections');
      this.$message.success({
        message: this.$t('message.modify_success'),
        duration: 1000,
      });
    },
  },
};
</script>

<style type="text/css">
  .connection-menu-title {
    margin-left: -20px;
  }

  .connection-menu .connection-name {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px;
    word-break: keep-all;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 700;
    font-size: 1.05em;
    border-radius: 8px;
    cursor: context-menu;
    background: transparent;
    box-shadow: none;
  }
  .connection-icon {
    font-size: 16px;
    flex-shrink: 0;
  }
  .connection-icon-img {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
  }
  /* remove default hover tint to avoid double highlight */
  .connection-menu .connection-name:hover {
    background: transparent;
    box-shadow: none;
  }
  .connection-menu .el-submenu__title {
    display: flex;
    align-items: center;
    padding: 6px 10px !important;
    height: auto;
    line-height: 1.4;
    min-height: 32px;
    border-radius: 10px;
    transition: background 0.2s ease;
  }
  /* active/selected state - 移除选中状态的背景色 */
  .connection-menu .el-submenu.is-opened > .el-submenu__title,
  .connection-menu .el-submenu.is-active > .el-submenu__title {
    background: transparent !important;
    color: var(--app-ink);
  }
  .dark-mode .connection-menu .el-submenu.is-opened > .el-submenu__title,
  .dark-mode .connection-menu .el-submenu.is-active > .el-submenu__title {
    background: transparent !important;
    color: #e5e7eb;
  }
  /* 选中状态下hover保持透明 */
  .connection-menu .el-submenu.is-opened > .el-submenu__title:hover,
  .connection-menu .el-submenu.is-active > .el-submenu__title:hover {
    background: transparent !important;
  }
  .dark-mode .connection-menu .el-submenu.is-opened > .el-submenu__title:hover,
  .dark-mode .connection-menu .el-submenu.is-active > .el-submenu__title:hover {
    background: transparent !important;
  }
  /* 未选中状态的hover */
  .connection-menu .el-submenu:not(.is-opened):not(.is-active) > .el-submenu__title:hover {
    background: rgba(148, 163, 184, 0.1) !important;
  }
  .dark-mode .connection-menu .el-submenu:not(.is-opened):not(.is-active) > .el-submenu__title:hover {
    background: rgba(148, 163, 184, 0.15) !important;
  }
  .connection-menu .el-submenu__title:focus {
    background: transparent !important;
  }

  /*fix more operation btn icon vertical-center*/
  .connection-menu-more {
    vertical-align: baseline;
  }
  /*more operation ul>ico*/
  .connection-menu-more-ul .more-operate-ico {
    width: 13px;
    text-align: center;
  }

  .font-weight-bold {
    font-weight: bold;
  }

  /* Move to group popover styles */
  .move-to-group-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .move-to-group-trigger .el-icon-arrow-right {
    margin-left: 8px;
    font-size: 12px;
  }
  .move-to-group-popover {
    padding: 0 !important;
    min-width: 120px;
  }
  .move-to-group-popover .group-list {
    max-height: 200px;
    overflow-y: auto;
  }
  .move-to-group-popover .group-item {
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13px;
  }
  .move-to-group-popover .group-item.level-2 {
    padding-left: 32px;
  }
  .move-to-group-popover .group-item.level-3 {
    padding-left: 48px;
  }
  .move-to-group-popover .group-item:hover {
    background: #f0f2f5;
  }
  .dark-mode .move-to-group-popover .group-item:hover {
    background: #3a4a54;
  }
  .move-to-group-popover .group-item.is-current {
    color: #409EFF;
    font-weight: bold;
  }
  .move-to-group-popover .no-groups {
    padding: 16px;
    text-align: center;
    color: #909399;
    font-size: 12px;
  }
</style>
