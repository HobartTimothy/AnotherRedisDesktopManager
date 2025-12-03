<template>
<div class="command-log-panel">
  <!-- header -->
  <div class="panel-header">
    <i class="fa fa-history"></i>
    <span class="header-title">{{ $t('message.command_log') }}</span>
  </div>

  <!-- filter bar -->
  <div class="filter-bar">
    <el-select 
      v-model="selectedConnection" 
      size="mini" 
      clearable
      :placeholder="$t('message.all_connections')"
      class="connection-filter">
      <el-option
        v-for="conn in connectionNames"
        :key="conn"
        :label="conn"
        :value="conn">
      </el-option>
    </el-select>
    <el-input 
      v-model='filter' 
      size='mini' 
      suffix-icon="el-icon-search"
      :placeholder="$t('message.key_to_search')"
      clearable>
    </el-input>
    <el-checkbox v-model='showOnlyWrite' size="mini">Only Write</el-checkbox>
    <el-button type="text" size="mini" icon="el-icon-delete" @click="logs=[]">
      {{ $t('el.colorpicker.clear') }}
    </el-button>
  </div>

  <!-- log list -->
  <div class="command-log-list">
    <vxe-table
      ref="commandLogList"
      size="mini" max-height="100%"
      border="none" show-overflow="title"
      :scroll-y="{enabled: true}"
      :row-config="{isHover: true, height: 28}"
      :column-config="{resizable: true}"
      :empty-text="$t('el.table.emptyText')"
      :data="logsShow">
      <vxe-column field="time" title="Time" width="90"></vxe-column>
      <vxe-column field="name" title="Connection" width="150"></vxe-column>
      <vxe-column field="cmd" title="Command" width="120" class-name="command-cmd"></vxe-column>
      <vxe-column field="args" title="Arguments" min-width="200"></vxe-column>
      <vxe-column field="cost" title="Cost(ms)" width="90" class-name="command-cost"></vxe-column>
    </vxe-table>
  </div>
</div>
</template>

<script type="text/javascript">
import { writeCMD } from '@/commands.js';
import { VxeTable, VxeColumn } from 'vxe-table';
import storage from '@/storage.js';

export default {
  data() {
    return {
      logs: [],
      maxLength: 5000,
      filter: '',
      showOnlyWrite: false,
      selectedConnection: '',
      connections: [],
    };
  },
  components: { VxeTable, VxeColumn, },
  created() {
    this.loadConnections();
    this.$bus.$on('refreshConnections', this.loadConnections);
    
    this.$bus.$on('commandLog', (record) => {
      // hide ping
      if (record.command.name === 'ping') {
        return;
      }

      this.logs.push({
        cmd: record.command.name,
        args: (record.command.name === 'auth') ? '***' : record.command.args.map(item => (item.length > 100 ? (`${item.slice(0, 100)}...`) : item.toString())).join(' '),
        cost: record.cost.toFixed(2),
        time: record.time.toTimeString().substr(0, 8),
        name: record.connectionName,
      });

      this.logs.length > this.maxLength && (this.logs = this.logs.slice(-this.maxLength));
      this.scrollToBottom();
    });
  },
  beforeDestroy() {
    this.$bus.$off('refreshConnections', this.loadConnections);
  },
  computed: {
    connectionNames() {
      // Get unique connection names from logs and current connections
      const namesFromLogs = [...new Set(this.logs.map(log => log.name))];
      const namesFromConns = this.connections.map(conn => storage.getConnectionName(conn));
      return [...new Set([...namesFromLogs, ...namesFromConns])].sort();
    },
    logsShow() {
      let { logs } = this;

      // Filter by selected connection
      if (this.selectedConnection) {
        logs = logs.filter(item => item.name === this.selectedConnection);
      }

      if (this.showOnlyWrite) {
        logs = logs.filter(item => writeCMD[item.cmd.toUpperCase()]);
      }

      if (this.filter) {
        logs = logs.filter(item => item.cmd.includes(this.filter) || item.args.includes(this.filter));
      }

      return logs;
    },
  },
  methods: {
    loadConnections() {
      this.connections = storage.getConnections(true);
    },
    scrollToBottom() {
      setTimeout(() => {
        this.$refs.commandLogList &&
          this.$refs.commandLogList.scrollTo(0, 99999999);
      }, 0);
    },
  },
};
</script>

<style type="text/css">
  .command-log-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 16px;
    box-sizing: border-box;
  }
  .command-log-panel .panel-header {
    display: flex;
    align-items: center;
    padding: 8px 8px 16px 8px;
    font-weight: bold;
    font-size: 16px;
    border-bottom: 1px solid #e4e7ed;
    margin-bottom: 12px;
  }
  .dark-mode .command-log-panel .panel-header {
    border-bottom-color: #4a5a64;
  }
  .command-log-panel .panel-header i {
    margin-right: 10px;
    color: #409EFF;
    font-size: 18px;
  }
  .command-log-panel .filter-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 4px 12px 4px;
    flex-wrap: wrap;
  }
  .command-log-panel .filter-bar .connection-filter {
    width: 180px;
  }
  .command-log-panel .filter-bar .el-input {
    max-width: 300px;
  }
  .command-log-panel .command-log-list {
    flex: 1;
    min-height: 0;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    overflow: hidden;
  }
  .dark-mode .command-log-panel .command-log-list {
    border-color: #4a5a64;
  }
  .command-log-panel .command-log-list .command-cmd {
    font-weight: bold;
  }
  .command-log-panel .command-log-list .command-cost {
    color: #e59090;
  }
</style>
