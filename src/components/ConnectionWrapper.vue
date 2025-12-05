<template>
  <el-menu
    ref="connectionMenu"
    :collapse-transition='false'
    :id="connectionAnchor"
    @open="openConnection()"
    class="connection-menu"
    active-text-color="#ffd04b">
    <el-submenu :index="config.connectionName">
      <!-- connection menu -->
      <ConnectionMenu
        slot="title"
        ref="connectionMenuComponent"
        :config="config"
        :client='client'
        @changeColor='setColor'
        @refreshConnection='openConnection(false, true)'>
      </ConnectionMenu>

      <!-- db search operate -->
      <OperateItem
        ref='operateItem'
        :config="config"
        :client='client'>
      </OperateItem>

      <!-- key list -->
      <KeyList
        ref='keyList'
        :config="config"
        :globalSettings='globalSettings'
        :client='client'>
      </KeyList>
    </el-submenu>
  </el-menu>
</template>

<script type="text/javascript">
import redisClient from '@/redisClient.js';
import KeyList from '@/components/KeyList';
import OperateItem from '@/components/OperateItem';
import ConnectionMenu from '@/components/ConnectionMenu';

export default {
  data() {
    return {
      client: null,
      pingTimer: null,
      pingInterval: 10000, // ms
      lastSelectedDb: 0,
    };
  },
  props: ['config', 'globalSettings', 'index'],
  components: { ConnectionMenu, OperateItem, KeyList },
  created() {
    this.$bus.$on('closeConnection', (connectionName = false) => {
      this.closeConnection(connectionName);
    });
    // open connection
    this.$bus.$on('openConnection', (connectionName) => {
      if (connectionName && (connectionName == this.config.connectionName)) {
        this.openConnection();
        this.$refs.connectionMenu.open(this.config.connectionName);
      }
    });
  },
  computed: {
    connectionAnchor() {
      return `connection-anchor-${this.config.connectionName}`;
    },
  },
  methods: {
    initShow() {
      this.$refs.operateItem.initShow();
      this.$refs.keyList.initShow();
    },
    initLastSelectedDb() {
      const db = parseInt(localStorage.getItem(`lastSelectedDb_${this.config.connectionName}`));

      if (db > 0 && this.lastSelectedDb != db) {
        this.lastSelectedDb = db;
        this.$refs.operateItem && this.$refs.operateItem.setDb(db);
      }
    },
    openConnection(callback = false, forceOpen = false) {
      // scroll to connection
      this.scrollToConnection();
      // recovery last selected db
      this.initLastSelectedDb();

      // opened, do nothing
      if (this.client) {
        return forceOpen ? this.afterOpenConnection(this.client, callback) : false;
      }

      // set searching status first
      this.$refs.operateItem.searchIcon = 'el-icon-loading';

      // create a new client
      const clientPromise = this.getRedisClient(this.config);

      clientPromise.then((realClient) => {
        this.afterOpenConnection(realClient, callback);
      }).catch((e) => {});
    },
    afterOpenConnection(client, callback = false) {
      // new connection, not ready
      if (client.status != 'ready') {
        client.on('ready', () => {
          if (client.readyInited) {
            return;
          }

          client.readyInited = true;
          // open status tab
          this.$bus.$emit('openStatus', client, this.config.connectionName);
          this.startPingInterval();

          this.initShow();
          callback && callback();
        });
      }

      // connection is ready
      else {
        this.initShow();
        callback && callback();
      }
    },
    closeConnection(connectionName) {
      // if connectionName is not passed, close all connections
      if (connectionName && (connectionName != this.config.connectionName)) {
        return;
      }

      this.$refs.connectionMenu
      && this.$refs.connectionMenu.close(this.config.connectionName);
      this.$bus.$emit('removeAllTab', connectionName);

      // clear ping interval
      clearInterval(this.pingTimer);

      // reset operateItem items
      this.$refs.operateItem && this.$refs.operateItem.resetStatus();
      // reset keyList items
      this.$refs.keyList && this.$refs.keyList.resetKeyList(true);

      this.client && this.client.quit && this.client.quit();
      this.client = null;
    },
    startPingInterval() {
      this.pingTimer = setInterval(() => {
        this.client && this.client.ping().then((reply) => {}).catch((e) => {
          // this.$message.error('Ping Error: ' + e.message);
        });
      }, this.pingInterval);
    },
    formatConnectionError(error) {
      const errorStr = error.toString();
      const errorMessage = error.message || errorStr;
      const errorLower = errorMessage.toLowerCase();

      // 检查常见的连接错误类型（不区分大小写）
      if (errorLower.includes('econnrefused') || errorLower.includes('connection refused')) {
        return `${this.$t('message.client_error_connection_refused')}: ${errorMessage}`;
      }
      if (errorLower.includes('etimedout') || errorLower.includes('timeout')) {
        return `${this.$t('message.client_error_timeout')}: ${errorMessage}`;
      }
      if (errorLower.includes('enotfound') || errorLower.includes('host not found') || errorLower.includes('getaddrinfo')) {
        return `${this.$t('message.client_error_host_not_found')}: ${errorMessage}`;
      }
      if (errorLower.includes('econnreset') || errorLower.includes('connection reset')) {
        return `${this.$t('message.client_error_connection_reset')}: ${errorMessage}`;
      }
      if (errorLower.includes('authentication') || errorLower.includes('password') || errorLower.includes('auth') || errorLower.includes('invalid password')) {
        return `${this.$t('message.client_error_auth_failed')}: ${errorMessage}`;
      }

      // 默认错误消息
      return `${this.$t('message.client_error')}: ${errorMessage}`;
    },
    getRedisClient(config) {
      // prevent changing back to raw config, such as config.db
      const configCopy = JSON.parse(JSON.stringify(config));
      // select db
      configCopy.db = this.lastSelectedDb;

      // ssh client
      if (configCopy.sshOptions) {
        var clientPromise = redisClient.createSSHConnection(
          configCopy.sshOptions, configCopy.host, configCopy.port, configCopy.auth, configCopy,
        );
      }
      // normal client
      else {
        var clientPromise = redisClient.createConnection(
          configCopy.host, configCopy.port, configCopy.auth, configCopy,
        );
      }

      clientPromise.then((client) => {
        this.client = client;

        client.on('error', (error) => {
          const errorMessage = this.formatConnectionError(error);
          this.$message.error({
            message: errorMessage,
            duration: 3000,
            customClass: 'redis-on-error-message',
          });

          this.$bus.$emit('closeConnection');
        });
      }).catch((error) => {
        const errorMessage = this.formatConnectionError(error);
        this.$message.error(errorMessage);
        this.$bus.$emit('closeConnection');
      });

      return clientPromise;
    },
    setColor(color, save = true) {
      const ulDom = this.$refs.connectionMenu.$el;
      const className = 'menu-with-custom-color';

      // save to setting
      save && this.$storage.editConnectionItem(this.config, { color });

      if (!color) {
        ulDom.classList.remove(className);
        ulDom.style.removeProperty('--menu-color');
      } else {
        ulDom.classList.add(className);
        ulDom.style.setProperty('--menu-color', color);
      }
    },
    handleSubmenuContextMenu(e) {
      // Forward context menu event to ConnectionMenu component
      if (this.$refs.connectionMenuComponent && this.$refs.connectionMenuComponent.showContextMenu) {
        this.$refs.connectionMenuComponent.showContextMenu(e);
      }
    },
    scrollToConnection() {
      this.$nextTick(() => {
        // 300ms after menu expand animination
        setTimeout(() => {
          let scrollTop = 0;
          const menus = document.querySelectorAll('.connections-wrap .connections-list>ul');

          // calc height sum of all above menus
          for (const menu of menus) {
            if (menu.id === this.connectionAnchor) {
              break;
            }
            scrollTop += (menu.clientHeight + 8);
          }

          // if connections filter input exists, scroll more
          // 32 = height('.filter-input')+margin
          const offset = document.querySelector('.connections-wrap .filter-input') ? 32 : 0;
          document.querySelector('.connections-wrap').scrollTo({
            top: scrollTop + offset,
            behavior: 'smooth',
          });
        }, 320);
      });
    },
  },
  mounted() {
    this.setColor(this.config.color, false);
  },
  beforeDestroy() {
    this.closeConnection(this.config.connectionName);
  },
};
</script>

<style type="text/css">
  /*menu ul*/
  .connection-menu {
    margin-bottom: 8px;
    padding-right: 6px;
    border-right: 0;
  }

  .connection-menu.menu-with-custom-color li.el-submenu {
    border-left: 5px solid var(--menu-color, transparent);
    border-radius: 4px 0 0 4px;
    padding-left: 3px;
  }

  /*this error shows first*/
  .redis-on-error-message {
    z-index:9999 !important;
  }
</style>
