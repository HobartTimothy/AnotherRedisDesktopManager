<template>
<div class="connection-menu-title" @contextmenu.prevent.stop="showContextMenu" @click.stop="handleTitleClick">
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
      <!-- 移动到组 -->
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

      <!-- 连接管理 -->
      <el-dropdown-item divided>
        <span style="color: #909399; font-weight: bold;">{{ $t('message.connection_management') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='handleEditConnection'>
        <span><i class='more-operate-ico el-icon-edit-outline'></i>&nbsp;{{ $t('message.edit_connection') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='handleDeleteConnection'>
        <span><i class='more-operate-ico el-icon-delete'></i>&nbsp;{{ $t('message.del_connection') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='handleDuplicateConnection'>
        <span><i class='more-operate-ico fa fa-clone'></i>&nbsp;{{ $t('message.duplicate_connection') }}</span>
      </el-dropdown-item>

      <!-- 导入导出 -->
      <el-dropdown-item divided>
        <span style="color: #909399; font-weight: bold;">{{ $t('message.import_export') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='handleImportKeys'>
        <span><i class='more-operate-ico el-icon-download'></i>&nbsp;{{ $t('message.import_key') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='handleExportKeys'>
        <span><i class='more-operate-ico el-icon-upload2'></i>&nbsp;{{ $t('message.export_key') }}</span>
      </el-dropdown-item>
      <el-dropdown-item @click.native='handleExportCMDS'>
        <span><i class='more-operate-ico fa fa-file-code-o'></i>&nbsp;{{ $t('message.export_cmd') }}</span>
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
    this.$bus.$on('hideAllContextMenus', () => {
      this.connectionMenuVisible = false;
    });
    document.addEventListener('click', this.hideContextMenu);
  },
  beforeDestroy() {
    this.$bus.$off('hideAllContextMenus');
    document.removeEventListener('click', this.hideContextMenu);
  },
  methods: {
    handleTitleClick(e) {
      // 如果点击的是下拉菜单内部，不触发展开/折叠
      if (e.target.closest('.connection-menu-more-ul')) {
        return;
      }
      // 触发父级 el-submenu 的点击事件来展开/折叠连接
      const submenuEl = this.$el.closest('.el-submenu');
      if (submenuEl) {
        const titleEl = submenuEl.querySelector('.el-submenu__title');
        if (titleEl) {
          titleEl.click();
        }
      }
    },
    showContextMenu(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      // 关闭其他所有右键菜单
      this.$bus.$emit('hideAllContextMenus');
      // Show this menu
      this.connectionMenuVisible = true;
      this.$nextTick(() => {
        if (this.$refs.connectionDropdown) {
          // Update popper position
          if (this.$refs.connectionDropdown.updatePopper) {
            this.$refs.connectionDropdown.updatePopper();
          }
        }
      });
    },
    hideContextMenu(e) {
      // Don't hide if clicking inside the dropdown menu
      if (e && e.target && e.target.closest && e.target.closest('.connection-menu-more-ul')) {
        return;
      }
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
    handleEditConnection() {
      this.hideContextMenu();
      this.showEditConnection();
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
    handleDuplicateConnection() {
      this.hideContextMenu();
      this.duplicateConnection();
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
    handleDeleteConnection() {
      this.hideContextMenu();
      this.deleteConnection();
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
    handleImportKeys() {
      this.hideContextMenu();
      this.importKeys();
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
    handleExportKeys() {
      this.hideContextMenu();
      this.exportKeys();
    },
    exportKeys() {
      if (!this.client) {
        return this.$message.warning(this.$t('message.please_open_connection_first') || '请先打开连接');
      }

      this.$message.info('开始导出Keys，请稍候...');
      const allKeys = [];
      const nodes = this.client.nodes ? this.client.nodes('master') : [this.client];
      const scanStreams = [];

      // 扫描所有keys
      nodes.forEach((node) => {
        const stream = node.scanBufferStream({ match: '*', count: 50000 });
        scanStreams.push(stream);

        stream.on('data', (keys) => {
          if (keys && keys.length) {
            allKeys.push(...keys);
          }
        });

        stream.on('error', (e) => {
          this.$message.error(`扫描Keys失败: ${e.message}`);
        });
      });

      // 等待所有扫描完成
      Promise.all(scanStreams.map(stream => new Promise((resolve) => {
        stream.on('end', resolve);
        stream.on('error', resolve);
      }))).then(() => {
        if (allKeys.length === 0) {
          return this.$message.warning('没有找到任何Keys');
        }

        // 导出所有keys
        this.$message.info(`找到 ${allKeys.length} 个Keys，开始导出...`);
        const lines = [];
        const promiseQueue = [];

        allKeys.forEach((key) => {
          promiseQueue.push(this.client.callBuffer('DUMP', key));
          promiseQueue.push(this.client.callBuffer('PTTL', key));
        });

        Promise.allSettled(promiseQueue).then((reply) => {
          for (let i = 0; i < reply.length; i += 2) {
            if (reply[i].status === 'fulfilled' && reply[i + 1].status === 'fulfilled') {
              const key = allKeys[i / 2];
              const keyHex = Buffer.isBuffer(key) ? key.toString('hex') : Buffer.from(key).toString('hex');
              const valueHex = reply[i].value.toString('hex');
              const ttl = reply[i + 1].value || 0;

              const line = `${keyHex},${valueHex},${ttl}`;
              lines.push(line);
            }
          }

          // 保存文件
          const fileName = `Dump_${this.config.connectionName}_${(new Date()).toISOString().substr(0, 10).replaceAll('-', '')}.csv`;
          this.$util.createAndDownloadFile(fileName, lines.join('\n'));
          this.$message.success({
            message: `导出成功！共导出 ${lines.length} 个Keys`,
            duration: 3000,
          });
        }).catch((e) => {
          this.$message.error(`导出失败: ${e.message}`);
        });
      });
    },
    handleExportCMDS() {
      this.hideContextMenu();
      this.exportCMDS();
    },
    exportCMDS() {
      if (!this.client) {
        return this.$message.warning(this.$t('message.please_open_connection_first') || '请先打开连接');
      }

      this.$message.info('开始导出命令，请稍候...');
      const allKeys = [];
      const nodes = this.client.nodes ? this.client.nodes('master') : [this.client];
      const scanStreams = [];

      // 扫描所有keys
      nodes.forEach((node) => {
        const stream = node.scanBufferStream({ match: '*', count: 50000 });
        scanStreams.push(stream);

        stream.on('data', (keys) => {
          if (keys && keys.length) {
            allKeys.push(...keys);
          }
        });

        stream.on('error', (e) => {
          this.$message.error(`扫描Keys失败: ${e.message}`);
        });
      });

      // 等待所有扫描完成
      Promise.all(scanStreams.map(stream => new Promise((resolve) => {
        stream.on('end', resolve);
        stream.on('error', resolve);
      }))).then(() => {
        if (allKeys.length === 0) {
          return this.$message.warning('没有找到任何Keys');
        }

        // 导出命令 - 使用RESTORE命令格式（更通用）
        this.$message.info(`找到 ${allKeys.length} 个Keys，开始导出命令...`);
        const commands = [];
        const promiseQueue = [];

        allKeys.forEach((key) => {
          promiseQueue.push(this.client.callBuffer('DUMP', key));
          promiseQueue.push(this.client.callBuffer('PTTL', key));
        });

        Promise.allSettled(promiseQueue).then((reply) => {
          for (let i = 0; i < reply.length; i += 2) {
            if (reply[i].status === 'fulfilled' && reply[i + 1].status === 'fulfilled') {
              const key = allKeys[i / 2];
              const keyHex = Buffer.isBuffer(key) ? key.toString('hex') : Buffer.from(key).toString('hex');
              const valueHex = reply[i].value.toString('hex');
              const ttl = reply[i + 1].value || 0;

              // 使用RESTORE命令格式，这样可以恢复所有类型的数据
              const cmd = `RESTORE ${keyHex} ${ttl} ${valueHex} REPLACE`;
              commands.push(cmd);
            }
          }

          // 保存文件
          const fileName = `Commands_${this.config.connectionName}_${(new Date()).toISOString().substr(0, 10).replaceAll('-', '')}.txt`;
          this.$util.createAndDownloadFile(fileName, commands.join('\n'));
          this.$message.success({
            message: `导出成功！共导出 ${commands.length} 条命令`,
            duration: 3000,
          });
        }).catch((e) => {
          this.$message.error(`导出失败: ${e.message}`);
        });
      });
    },
  },
};
</script>

<style type="text/css">
  .connection-menu-title {
    margin-left: -20px;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
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
  .connection-context-menu .el-dropdown-menu {
    z-index: 9999 !important;
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
