<template>
  <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" :append-to-body='true' :close-on-click-modal='false' class='new-connection-dialog' :show-close="false">
    <div class="connection-dialog-container">
      <!-- left tab navigation -->
      <div class="tab-nav">
        <div 
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-nav-item" 
          :class="{ active: activeTab === tab.key }" 
          @click="activeTab = tab.key">
          {{ tab.label }}
        </div>
      </div>

      <!-- right content area -->
      <div class="tab-content">
        <!-- Basic Config -->
        <div v-show="activeTab === 'basic'" class="tab-pane">
          <div class="form-group">
            <label>{{ $t('message.connection_name') }}</label>
            <el-input v-model="connection.name" autocomplete="off"></el-input>
          </div>
          <div class="form-group">
            <label>{{ $t('message.connection_address') }}</label>
            <div class="address-row">
              <el-select v-model="connection.protocol" class="protocol-select">
                <el-option label="TCP" value="tcp"></el-option>
                <el-option label="Unix Socket" value="socket"></el-option>
              </el-select>
              <el-input v-model="connection.host" autocomplete="off" placeholder="127.0.0.1" class="host-input"></el-input>
              <span class="port-sep">:</span>
              <el-input type='number' v-model="connection.port" autocomplete="off" placeholder="6379" class="port-input"></el-input>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>{{ $t('message.password') }}</label>
              <InputPassword v-model="connection.auth" :hidepass="editMode" placeholder="Auth"></InputPassword>
            </div>
            <div class="form-group half">
              <label>{{ $t('message.username') }}</label>
              <el-input v-model="connection.username" :placeholder="$t('message.redis_username_tip')" autocomplete="off"></el-input>
            </div>
          </div>
          <div class="form-group">
            <label>{{ $t('message.connection_group') }}</label>
            <el-select v-model="connection.groupKey" clearable :placeholder="$t('message.ungrouped')" style="width: 100%">
              <el-option
                v-for="group in groups"
                :key="group.key"
                :label="group.name"
                :value="group.key">
              </el-option>
            </el-select>
          </div>
        </div>

        <!-- Advanced Config -->
        <div v-show="activeTab === 'advanced'" class="tab-pane">
          <div class="form-row">
            <div class="form-group half">
              <label>{{ $t('message.default_filter') }}</label>
              <el-input v-model="connection.keysPattern" autocomplete="off" placeholder="*"></el-input>
            </div>
            <div class="form-group half">
              <label>{{ $t('message.separator') }}</label>
              <el-input v-model="connection.separator" autocomplete="off" placeholder=":"></el-input>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>{{ $t('message.conn_timeout') }}</label>
              <div class="input-with-unit">
                <el-input type='number' v-model="connection.connectionTimeout" autocomplete="off" placeholder="60"></el-input>
                <span class="unit">{{ $t('message.seconds') }}</span>
              </div>
            </div>
            <div class="form-group half">
              <label>{{ $t('message.exec_timeout') }}</label>
              <div class="input-with-unit">
                <el-input type='number' v-model="connection.executeTimeout" autocomplete="off" placeholder="60"></el-input>
                <span class="unit">{{ $t('message.seconds') }}</span>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>{{ $t('message.default_view') }}</label>
              <div class="btn-group">
                <el-button :type="connection.defaultView === 'tree' ? 'danger' : ''" size="small" @click="connection.defaultView = 'tree'">{{ $t('message.tree_view') }}</el-button>
                <el-button :type="connection.defaultView === 'flat' ? 'danger' : ''" size="small" @click="connection.defaultView = 'flat'">{{ $t('message.flat_view') }}</el-button>
              </div>
            </div>
            <div class="form-group half">
              <label>{{ $t('message.load_key_count') }}</label>
              <el-input type='number' v-model="connection.scanCount" autocomplete="off" placeholder="10000"></el-input>
            </div>
          </div>
          <div class="form-group">
            <label>{{ $t('message.db_filter_mode') }}</label>
            <div class="btn-group">
              <el-button :type="connection.dbFilterMode === 'all' ? 'danger' : ''" size="small" @click="connection.dbFilterMode = 'all'">{{ $t('message.show_all') }}</el-button>
              <el-button :type="connection.dbFilterMode === 'include' ? 'danger' : ''" size="small" @click="connection.dbFilterMode = 'include'">{{ $t('message.show_specified') }}</el-button>
              <el-button :type="connection.dbFilterMode === 'exclude' ? 'danger' : ''" size="small" @click="connection.dbFilterMode = 'exclude'">{{ $t('message.hide_specified') }}</el-button>
            </div>
          </div>
          <div v-if="connection.dbFilterMode !== 'all'" class="form-group">
            <label>{{ $t('message.db_filter_list') }}</label>
            <el-input v-model="connection.dbFilterList" autocomplete="off" :placeholder="$t('message.db_filter_placeholder')"></el-input>
          </div>
          <div class="form-group">
            <label>{{ $t('message.mark_color') }}</label>
            <div class="color-picker-row">
              <span class="color-item" :class="{ active: !connection.markColor }" @click="connection.markColor = ''">
                <i class="el-icon-close"></i>
              </span>
              <span v-for="color in markColors" :key="color" class="color-item" :class="{ active: connection.markColor === color }" :style="{ backgroundColor: color }" @click="connection.markColor = color"></span>
            </div>
          </div>
          <div class="form-group">
            <el-checkbox v-model="connection.connectionReadOnly">{{ $t('message.readonly_mode') }}</el-checkbox>
          </div>
        </div>

        <!-- DB Alias -->
        <div v-show="activeTab === 'db_alias'" class="tab-pane">
          <div class="alias-list">
            <div v-for="(alias, index) in connection.dbAliases" :key="index" class="alias-item">
              <el-select v-model="alias.db" size="small" class="alias-db-select" placeholder="DB">
                <el-option v-for="db in 16" :key="db-1" :label="'DB' + (db-1)" :value="db-1"></el-option>
              </el-select>
              <el-input v-model="alias.name" size="small" class="alias-name" :placeholder="$t('message.alias_name')"></el-input>
              <el-button type="text" icon="el-icon-delete" @click="removeDbAlias(index)"></el-button>
            </div>
          </div>
          <el-button class="add-alias-btn" @click="addDbAlias">+ {{ $t('message.add') }}</el-button>
        </div>

        <!-- SSL/TLS -->
        <div v-show="activeTab === 'ssl'" class="tab-pane">
          <div class="form-group">
            <el-checkbox v-model="sslOptionsShow">{{ $t('message.enable_ssl') }}</el-checkbox>
          </div>
          <template v-if="sslOptionsShow">
            <div class="form-group">
              <label>{{ $t('message.public_key') }}</label>
              <FileInput
                :file.sync='connection.sslOptions.cert'
                :bookmark.sync='connection.sslOptions.certbookmark'
                :placeholder="$t('message.ssl_cert_placeholder')">
              </FileInput>
            </div>
            <div class="form-group">
              <label>{{ $t('message.private_key') }}</label>
              <FileInput
                :file.sync='connection.sslOptions.key'
                :bookmark.sync='connection.sslOptions.keybookmark'
                :placeholder="$t('message.ssl_key_placeholder')">
              </FileInput>
            </div>
            <div class="form-group">
              <label>{{ $t('message.authority') }}</label>
              <FileInput
                :file.sync='connection.sslOptions.ca'
                :bookmark.sync='connection.sslOptions.cabookmark'
                :placeholder="$t('message.ssl_ca_placeholder')">
              </FileInput>
            </div>
            <div class="form-group">
              <el-checkbox v-model="connection.sslOptions.rejectUnauthorized">{{ $t('message.reject_unauthorized') }}</el-checkbox>
            </div>
            <div class="form-group">
              <label>{{ $t('message.sni_servername') }}</label>
              <el-input v-model="connection.sslOptions.servername" autocomplete="off" :placeholder="$t('message.sni_servername')"></el-input>
            </div>
          </template>
        </div>

        <!-- SSH Tunnel -->
        <div v-show="activeTab === 'ssh'" class="tab-pane">
          <div class="form-group">
            <el-checkbox v-model="sshOptionsShow">{{ $t('message.enable_ssh') }}</el-checkbox>
          </div>
          <template v-if="sshOptionsShow">
            <div class="form-group">
              <label>{{ $t('message.connection_address') }}</label>
              <div class="address-row">
                <el-input v-model="connection.sshOptions.host" autocomplete="off" :placeholder="$t('message.ssh_host')" class="host-input"></el-input>
                <span class="port-sep">:</span>
                <el-input type='number' v-model="connection.sshOptions.port" autocomplete="off" placeholder="22" class="port-input"></el-input>
              </div>
            </div>
            <div class="form-group">
              <label>{{ $t('message.login_type') }}</label>
              <div class="btn-group">
                <el-button :type="sshLoginType === 'password' ? 'danger' : ''" size="small" @click="sshLoginType = 'password'">{{ $t('message.password') }}</el-button>
                <el-button :type="sshLoginType === 'privatekey' ? 'danger' : ''" size="small" @click="sshLoginType = 'privatekey'">{{ $t('message.private_key_file') }}</el-button>
              </div>
            </div>
            <div class="form-group">
              <label>{{ $t('message.username') }}</label>
              <el-input v-model="connection.sshOptions.username" autocomplete="off" :placeholder="$t('message.ssh_username')"></el-input>
            </div>
            <div v-if="sshLoginType === 'password'" class="form-group">
              <label>{{ $t('message.password') }}</label>
              <InputPassword v-model="connection.sshOptions.password" :placeholder="$t('message.ssh_password')"></InputPassword>
            </div>
            <template v-else>
              <div class="form-group">
                <label>{{ $t('message.private_key') }}</label>
                <FileInput
                  :file.sync='connection.sshOptions.privatekey'
                  :bookmark.sync='connection.sshOptions.privatekeybookmark'
                  :placeholder="$t('message.ssh_privatekey')">
                </FileInput>
              </div>
              <div class="form-group">
                <label>Passphrase</label>
                <InputPassword v-model="connection.sshOptions.passphrase" :placeholder="$t('message.ssh_passphrase')"></InputPassword>
              </div>
            </template>
          </template>
        </div>

        <!-- Sentinel Mode -->
        <div v-show="activeTab === 'sentinel'" class="tab-pane">
          <div class="form-group">
            <el-checkbox v-model="sentinelOptionsShow">{{ $t('message.enable_sentinel') }}</el-checkbox>
          </div>
          <template v-if="sentinelOptionsShow">
            <div class="form-group">
              <label>{{ $t('message.master_group_name') }}</label>
              <el-input v-model="connection.sentinelOptions.masterName" autocomplete="off" placeholder='mymaster'></el-input>
            </div>
            <div class="form-group">
              <label>{{ $t('message.redis_node_password') }}</label>
              <InputPassword v-model="connection.sentinelOptions.nodePassword" :placeholder="$t('message.redis_node_password')"></InputPassword>
            </div>
            <div class="form-group tip-text">
              <i class="el-icon-info"></i> {{ $t('message.sentinel_faq') }}
            </div>
          </template>
        </div>

        <!-- Cluster Mode -->
        <div v-show="activeTab === 'cluster'" class="tab-pane">
          <div class="form-group">
            <el-checkbox v-model="connection.cluster">{{ $t('message.enable_cluster') }}</el-checkbox>
          </div>
          <div v-if="connection.cluster" class="form-group tip-text">
            <i class="el-icon-info"></i> {{ $t('message.cluster_faq') }}
          </div>
        </div>

        <!-- Network Proxy -->
        <div v-show="activeTab === 'proxy'" class="tab-pane">
          <div class="form-group">
            <el-checkbox v-model="proxyOptionsShow">{{ $t('message.enable_proxy') }}</el-checkbox>
          </div>
          <template v-if="proxyOptionsShow">
            <div class="form-group">
              <label>{{ $t('message.proxy_type') }}</label>
              <el-select v-model="connection.proxyOptions.type" style="width: 100%">
                <el-option label="SOCKS5" value="socks5"></el-option>
                <el-option label="HTTP" value="http"></el-option>
              </el-select>
            </div>
            <div class="form-group">
              <label>{{ $t('message.proxy_address') }}</label>
              <div class="address-row">
                <el-input v-model="connection.proxyOptions.host" autocomplete="off" placeholder="127.0.0.1" class="host-input"></el-input>
                <span class="port-sep">:</span>
                <el-input type='number' v-model="connection.proxyOptions.port" autocomplete="off" placeholder="1080" class="port-input"></el-input>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group half">
                <label>{{ $t('message.username') }}</label>
                <el-input v-model="connection.proxyOptions.username" autocomplete="off"></el-input>
              </div>
              <div class="form-group half">
                <label>{{ $t('message.password') }}</label>
                <InputPassword v-model="connection.proxyOptions.password"></InputPassword>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <div class="footer-left">
        <el-button @click="testConnection" :loading="testing">{{ $t('message.test_connection') }}</el-button>
      </div>
      <div class="footer-right">
        <el-button @click="parseClipboard">{{ $t('message.parse_clipboard_url') }}</el-button>
        <el-button @click="dialogVisible = false">{{ $t('el.messagebox.cancel') }}</el-button>
        <el-button type="danger" @click="editConnection">{{ editMode ? $t('message.update') : $t('message.add') }}</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script type="text/javascript">
import storage from '@/storage';
import FileInput from '@/components/FileInput';
import InputPassword from '@/components/InputPassword';
import redisClient from '@/redisClient';
import { clipboard } from 'electron';

export default {
  data() {
    return {
      dialogVisible: false,
      activeTab: 'basic',
      testing: false,
      sshLoginType: 'password',
      proxyOptionsShow: false,
      markColors: ['#f56c6c', '#e6a23c', '#f2d74b', '#67c23a', '#409eff', '#b86ae3'],
      connection: {
        host: '',
        port: '',
        auth: '',
        username: '',
        name: '',
        separator: ':',
        protocol: 'tcp',
        cluster: false,
        connectionReadOnly: false,
        groupKey: '',
        keysPattern: '*',
        connectionTimeout: 60,
        executeTimeout: 60,
        defaultView: 'tree',
        scanCount: 10000,
        dbFilterMode: 'all',
        dbFilterList: '',
        markColor: '',
        dbAliases: [],
        sshOptions: {
          host: '',
          port: 22,
          username: '',
          password: '',
          privatekey: '',
          passphrase: '',
          timeout: 30,
        },
        sslOptions: {
          key: '',
          cert: '',
          ca: '',
          servername: '',
          rejectUnauthorized: false,
        },
        sentinelOptions: {
          masterName: 'mymaster',
          nodePassword: '',
        },
        proxyOptions: {
          type: 'socks5',
          host: '',
          port: 1080,
          username: '',
          password: '',
        },
      },
      connectionEmpty: {},
      sshOptionsShow: false,
      sslOptionsShow: false,
      sentinelOptionsShow: false,
      groups: [],
    };
  },
  components: { FileInput, InputPassword },
  created() {
    this.loadGroups();
  },
  props: {
    config: {
      default: _ => new Array(),
    },
    editMode: {
      default: false,
    },
  },
  computed: {
    tabs() {
      return [
        { key: 'basic', label: this.$t('message.basic_config') },
        { key: 'advanced', label: this.$t('message.advanced_config') },
        { key: 'db_alias', label: this.$t('message.db_alias') },
        { key: 'ssl', label: 'SSL/TLS' },
        { key: 'ssh', label: this.$t('message.ssh_tunnel') },
        { key: 'sentinel', label: this.$t('message.sentinel_mode') },
        { key: 'cluster', label: this.$t('message.cluster_mode') },
        { key: 'proxy', label: this.$t('message.network_proxy') },
      ];
    },
    dialogTitle() {
      return this.editMode ? this.$t('message.edit_connection')
        : this.$t('message.new_connection');
    },
  },
  methods: {
    loadGroups() {
      this.groups = storage.getGroups(true);
    },
    show() {
      this.loadGroups();
      this.dialogVisible = true;
      this.activeTab = 'basic';
      this.resetFields();
    },
    showWithGroup(groupKey) {
      this.loadGroups();
      this.dialogVisible = true;
      this.activeTab = 'basic';
      this.resetFields();
      this.connection.groupKey = groupKey || '';
    },
    resetFields() {
      if (this.editMode) {
        this.sshOptionsShow = !!this.config.sshOptions;
        this.sslOptionsShow = !!this.config.sslOptions;
        this.sentinelOptionsShow = !!this.config.sentinelOptions;
        this.proxyOptionsShow = !!this.config.proxyOptions;
        const connection = Object.assign({}, this.connectionEmpty, this.config);
        this.connection = JSON.parse(JSON.stringify(connection));
        // Determine SSH login type
        if (this.connection.sshOptions && this.connection.sshOptions.privatekey) {
          this.sshLoginType = 'privatekey';
        } else {
          this.sshLoginType = 'password';
        }
      } else {
        this.sshOptionsShow = false;
        this.sslOptionsShow = false;
        this.sentinelOptionsShow = false;
        this.proxyOptionsShow = false;
        this.sshLoginType = 'password';
        this.connection = JSON.parse(JSON.stringify(this.connectionEmpty));
      }
    },
    addDbAlias() {
      if (!this.connection.dbAliases) {
        this.connection.dbAliases = [];
      }
      const nextDb = this.connection.dbAliases.length;
      this.connection.dbAliases.push({ db: nextDb, name: '' });
    },
    removeDbAlias(index) {
      this.connection.dbAliases.splice(index, 1);
    },
    async testConnection() {
      this.testing = true;
      const config = JSON.parse(JSON.stringify(this.connection));
      !config.host && (config.host = '127.0.0.1');
      !config.port && (config.port = 6379);
      
      try {
        const client = redisClient.createConnection(config);
        await client.ping();
        client.quit();
        this.$message.success(this.$t('message.connect_success'));
      } catch (e) {
        this.$message.error(`${this.$t('message.connect_fail')}: ${e.message}`);
      }
      this.testing = false;
    },
    parseClipboard() {
      try {
        const text = clipboard.readText();
        if (!text) {
          return this.$message.warning(this.$t('message.clipboard_empty'));
        }
        // Parse redis:// or rediss:// URL
        const urlMatch = text.match(/^rediss?:\/\/(?:([^:]+):)?([^@]+)?@?([^:]+):(\d+)\/?.*$/);
        if (urlMatch) {
          this.connection.username = urlMatch[1] || '';
          this.connection.auth = urlMatch[2] || '';
          this.connection.host = urlMatch[3] || '';
          this.connection.port = urlMatch[4] || '';
          if (text.startsWith('rediss://')) {
            this.sslOptionsShow = true;
          }
          this.$message.success(this.$t('message.parse_success'));
        } else {
          this.$message.warning(this.$t('message.invalid_url'));
        }
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    editConnection() {
      const config = JSON.parse(JSON.stringify(this.connection));

      if (this.sentinelOptionsShow && config.cluster) {
        return this.$message.error('Sentinel & Cluster cannot be checked together!');
      }

      !config.host && (config.host = '127.0.0.1');
      !config.port && (config.port = 6379);

      if (!this.sshOptionsShow || !config.sshOptions.host) {
        delete config.sshOptions;
      }

      if (!this.sslOptionsShow) {
        delete config.sslOptions;
      }

      if (!this.sentinelOptionsShow || !config.sentinelOptions.masterName) {
        delete config.sentinelOptions;
      }

      if (!this.proxyOptionsShow || !config.proxyOptions.host) {
        delete config.proxyOptions;
      }

      const oldKey = storage.getConnectionKey(this.config);
      storage.editConnectionByKey(config, oldKey);

      this.dialogVisible = false;
      this.$emit('editConnectionFinished', config);
    },
  },
  mounted() {
    this.connectionEmpty = JSON.parse(JSON.stringify(this.connection));

    if (this.editMode) {
      this.sslOptionsShow = !!this.config.sslOptions;
      this.sshOptionsShow = !!this.config.sshOptions;
      this.sentinelOptionsShow = !!this.config.sentinelOptions;
      this.proxyOptionsShow = !!this.config.proxyOptions;

      this.connection = Object.assign({}, this.connection, this.config);
    }

    delete this.connection.connectionName;
  },
};
</script>

<style type="text/css">
  .new-connection-dialog .el-dialog {
    max-width: 800px;
    border-radius: 8px;
  }
  .new-connection-dialog .el-dialog__header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #ebeef5;
  }
  .new-connection-dialog .el-dialog__body {
    padding: 0;
  }
  .new-connection-dialog .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid #ebeef5;
  }
  .dark-mode .new-connection-dialog .el-dialog__header,
  .dark-mode .new-connection-dialog .el-dialog__footer {
    border-color: #4a5a64;
  }

  .connection-dialog-container {
    display: flex;
    min-height: 480px;
  }

  /* Tab Navigation */
  .new-connection-dialog .tab-nav {
    width: 120px;
    flex-shrink: 0;
    background: #fafafa;
    border-right: 1px solid #ebeef5;
    padding: 16px 0;
  }
  .dark-mode .new-connection-dialog .tab-nav {
    background: #1e2d35;
    border-right-color: #4a5a64;
  }
  .new-connection-dialog .tab-nav-item {
    padding: 12px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #606266;
    position: relative;
    transition: all 0.2s;
  }
  .dark-mode .new-connection-dialog .tab-nav-item {
    color: #b0b8bf;
  }
  .new-connection-dialog .tab-nav-item:hover {
    color: #f56c6c;
  }
  .new-connection-dialog .tab-nav-item.active {
    color: #f56c6c;
    font-weight: 500;
  }
  .new-connection-dialog .tab-nav-item.active::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    background: #f56c6c;
    border-radius: 2px 0 0 2px;
  }

  /* Tab Content */
  .new-connection-dialog .tab-content {
    flex: 1;
    padding: 20px 24px;
    overflow-y: auto;
    max-height: 480px;
  }
  .new-connection-dialog .tab-pane {
    animation: fadeIn 0.2s;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Form Groups */
  .new-connection-dialog .form-group {
    margin-bottom: 16px;
  }
  .new-connection-dialog .form-group label {
    display: block;
    font-size: 13px;
    color: #606266;
    margin-bottom: 6px;
  }
  .dark-mode .new-connection-dialog .form-group label {
    color: #b0b8bf;
  }
  .new-connection-dialog .form-row {
    display: flex;
    gap: 16px;
  }
  .new-connection-dialog .form-group.half {
    flex: 1;
  }

  /* Address Row */
  .new-connection-dialog .address-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .new-connection-dialog .protocol-select {
    width: 100px;
  }
  .new-connection-dialog .host-input {
    flex: 1;
  }
  .new-connection-dialog .port-sep {
    color: #909399;
    font-weight: bold;
  }
  .new-connection-dialog .port-input {
    width: 80px;
  }

  /* Input with unit */
  .new-connection-dialog .input-with-unit {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .new-connection-dialog .input-with-unit .el-input {
    flex: 1;
  }
  .new-connection-dialog .input-with-unit .unit {
    color: #909399;
    font-size: 13px;
  }

  /* Button Group */
  .new-connection-dialog .btn-group {
    display: flex;
    gap: 0;
  }
  .new-connection-dialog .btn-group .el-button {
    border-radius: 0;
    margin: 0;
  }
  .new-connection-dialog .btn-group .el-button:first-child {
    border-radius: 4px 0 0 4px;
  }
  .new-connection-dialog .btn-group .el-button:last-child {
    border-radius: 0 4px 4px 0;
  }
  .new-connection-dialog .btn-group .el-button:not(:first-child) {
    margin-left: -1px;
  }

  /* Color Picker */
  .new-connection-dialog .color-picker-row {
    display: flex;
    gap: 10px;
  }
  .new-connection-dialog .color-item {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
    transition: all 0.2s;
  }
  .new-connection-dialog .color-item:first-child {
    border: 2px solid #dcdfe6;
    color: #909399;
  }
  .new-connection-dialog .color-item.active {
    transform: scale(1.15);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  /* Alias List */
  .new-connection-dialog .alias-list {
    margin-bottom: 16px;
  }
  .new-connection-dialog .alias-item {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .new-connection-dialog .alias-db-select {
    width: 90px;
  }
  .new-connection-dialog .alias-name {
    flex: 1;
  }
  .new-connection-dialog .add-alias-btn {
    width: 100%;
    border-style: dashed;
  }

  /* Tip Text */
  .new-connection-dialog .tip-text {
    font-size: 12px;
    color: #909399;
    line-height: 1.6;
  }
  .new-connection-dialog .tip-text i {
    color: #409eff;
    margin-right: 4px;
  }

  /* Footer */
  .new-connection-dialog .dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .new-connection-dialog .footer-left,
  .new-connection-dialog .footer-right {
    display: flex;
    gap: 8px;
  }
</style>
