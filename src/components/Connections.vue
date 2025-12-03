<template>
  <div class="connections-wrap">
    <!-- search connections input -->
    <div v-if="connections.length>=filterEnableNum" class="filter-input">
      <el-input
        v-model="filterMode"
        suffix-icon="el-icon-search"
        :placeholder="$t('message.search_connection')"
        clearable
        size="mini">
      </el-input>
    </div>

    <!-- connections list -->
    <div class="connections-list">
      <!-- Grouped connections -->
      <ConnectionGroup
        v-for="group in groups"
        :key="group.key"
        :group="group"
        :connections="getGroupConnections(group.key)"
        :globalSettings="globalSettings"
        @refresh="initConnections"
        @sortConnections="handleSortConnections">
      </ConnectionGroup>

      <!-- Ungrouped connections -->
      <div class="ungrouped-connections" ref="ungroupedConnections">
        <div v-if="ungroupedConnections.length > 0 && groups.length > 0" class="ungrouped-header">
          <i class="fa fa-folder-o"></i>
          <span>{{ $t('message.ungrouped') }}</span>
          <span class="ungrouped-count">({{ ungroupedConnections.length }})</span>
        </div>
        <ConnectionWrapper
          v-for="item, index of ungroupedConnections"
          :key="item.key ? item.key : item.connectionName"
          :index="index"
          :globalSettings="globalSettings"
          :config='item'>
        </ConnectionWrapper>
      </div>
    </div>

    <ScrollToTop parentNum='1' :posRight='false'></ScrollToTop>

    <!-- Add Group Dialog -->
    <el-dialog
      :title="$t('message.add_group')"
      :visible.sync="addGroupDialogVisible"
      :append-to-body='true'
      width="400px">
      <el-form label-position="top">
        <el-form-item :label="$t('message.group_name')">
          <el-input v-model="newGroupName" :placeholder="$t('message.group_name')"></el-input>
        </el-form-item>
        <el-form-item :label="$t('message.mark_color')">
          <el-color-picker
            v-model="newGroupColor"
            :predefine="['#f56c6c', '#F5C800', '#409EFF', '#85ce61', '#c6e2ff', '#909399']">
          </el-color-picker>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="addGroupDialogVisible = false">{{ $t('el.messagebox.cancel') }}</el-button>
        <el-button type="primary" @click="addGroup">{{ $t('el.messagebox.confirm') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script type="text/javascript">
import storage from '@/storage.js';
import ConnectionWrapper from '@/components/ConnectionWrapper';
import ConnectionGroup from '@/components/ConnectionGroup';
import ScrollToTop from '@/components/ScrollToTop';
import Sortable from 'sortablejs';


export default {
  data() {
    return {
      connections: [],
      groups: [],
      globalSettings: this.$storage.getSetting(),
      filterEnableNum: 4,
      filterMode: '',
      addGroupDialogVisible: false,
      newGroupName: '',
      newGroupColor: '#409EFF',
    };
  },
  components: { ConnectionWrapper, ConnectionGroup, ScrollToTop },
  created() {
    this.$bus.$on('refreshConnections', () => {
      this.initConnections();
    });
    this.$bus.$on('reloadSettings', (settings) => {
      this.globalSettings = settings;
    });
  },
  computed: {
    filteredConnections() {
      if (!this.filterMode) {
        return this.connections;
      }

      return this.connections.filter(item => {
        return item.name.toLowerCase().includes(this.filterMode.toLowerCase());
      });
    },
    ungroupedConnections() {
      const filtered = this.filteredConnections.filter(conn => !conn.groupKey);
      return filtered;
    },
  },
  methods: {
    initConnections() {
      const connections = storage.getConnections(true);
      const slovedConnections = [];
      // this.connections = [];

      for (const item of connections) {
        item.connectionName = storage.getConnectionName(item);
        // fix history bug, prevent db into config
        delete item.db;
        slovedConnections.push(item);
      }

      this.connections = slovedConnections;
      this.groups = storage.getGroups(true);
    },
    getGroupConnections(groupKey) {
      return this.filteredConnections.filter(conn => conn.groupKey === groupKey);
    },
    showAddGroupDialog() {
      this.newGroupName = '';
      this.newGroupColor = '#409EFF';
      this.addGroupDialogVisible = true;
    },
    addGroup() {
      if (!this.newGroupName.trim()) {
        this.$message.warning(this.$t('message.group_name_required'));
        return;
      }

      storage.addGroup({
        name: this.newGroupName.trim(),
        color: this.newGroupColor,
      });

      this.addGroupDialogVisible = false;
      this.initConnections();
      this.$message.success({
        message: this.$t('message.add_success'),
        duration: 1000,
      });
    },
    handleSortConnections(e) {
      // Handle connection sorting within/between groups
      this.$storage.reOrderAndStore(this.connections);
    },
    sortOrder() {
      const dragWrapper = document.querySelector('.connections-list');
      Sortable.create(dragWrapper, {
        handle: '.el-submenu__title',
        animation: 400,
        direction: 'vertical',
        onEnd: (e) => {
          const { newIndex } = e;
          const { oldIndex } = e;
          // change in connections
          const currentRow = this.connections.splice(oldIndex, 1)[0];
          this.connections.splice(newIndex, 0, currentRow);
          // store
          this.$storage.reOrderAndStore(this.connections);
        },
      });
    },
  },
  mounted() {
    this.initConnections();
    this.sortOrder();
  },
};
</script>

<style type="text/css">
  .connections-wrap {
    height: calc(100vh - 59px);
    overflow-y: auto;
    margin-top: 8px;
  }
  .connections-wrap .filter-input {
    padding: 0 13px 8px 13px;
  }
  /* set drag area min height, target to the end will be correct */
  .connections-wrap .connections-list {
    min-height: calc(100vh - 110px);
  }
  .connections-wrap .ungrouped-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    color: #909399;
    font-size: 13px;
    user-select: none;
  }
  .connections-wrap .ungrouped-header i {
    margin-right: 8px;
  }
  .connections-wrap .ungrouped-count {
    margin-left: 4px;
    font-size: 12px;
  }
</style>
