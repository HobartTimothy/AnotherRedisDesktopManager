<template>
  <div class="connection-group">
    <!-- Group Header -->
    <div
      class="group-header"
      @click="toggleExpand"
      @contextmenu.prevent="showContextMenu">
      <i :class="['group-arrow', 'el-icon-arrow-right', { 'is-expanded': isExpanded }]"></i>
      <i class="group-icon fa fa-folder" :style="{ color: group.color || '#909399' }"></i>
      <span class="group-name">{{ group.name }}</span>
      <span class="group-count">({{ connections.length }})</span>
    </div>

    <!-- Group Connections -->
    <div v-show="isExpanded" class="group-connections" :ref="'groupConnections_' + group.key">
      <ConnectionWrapper
        v-for="(item, index) of connections"
        :key="item.key ? item.key : item.connectionName"
        :index="index"
        :globalSettings="globalSettings"
        :config='item'>
      </ConnectionWrapper>
    </div>

    <!-- Context Menu -->
    <div
      v-show="contextMenuVisible"
      class="group-context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }">
      <div class="menu-item" @click="addConnection">
        <i class="el-icon-circle-plus"></i>
        {{ $t('message.new_connection') }}
      </div>
      <div class="menu-item" @click="editGroup">
        <i class="el-icon-edit"></i>
        {{ $t('message.edit_group') }}
      </div>
      <div class="menu-item" @click="deleteGroup">
        <i class="el-icon-delete"></i>
        {{ $t('message.delete_group') }}
      </div>
    </div>

    <!-- Edit Group Dialog -->
    <el-dialog
      :title="$t('message.edit_group')"
      :visible.sync="editDialogVisible"
      :append-to-body='true'
      width="400px">
      <el-form label-position="top">
        <el-form-item :label="$t('message.group_name')">
          <el-input v-model="editGroupName" :placeholder="$t('message.group_name')"></el-input>
        </el-form-item>
        <el-form-item :label="$t('message.mark_color')">
          <el-color-picker
            v-model="editGroupColor"
            :predefine="['#f56c6c', '#F5C800', '#409EFF', '#85ce61', '#c6e2ff', '#909399']">
          </el-color-picker>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="editDialogVisible = false">{{ $t('el.messagebox.cancel') }}</el-button>
        <el-button type="primary" @click="saveGroup">{{ $t('el.messagebox.confirm') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import storage from '@/storage.js';
import ConnectionWrapper from '@/components/ConnectionWrapper';
import Sortable from 'sortablejs';

export default {
  name: 'ConnectionGroup',
  components: { ConnectionWrapper },
  props: {
    group: {
      type: Object,
      required: true,
    },
    connections: {
      type: Array,
      default: () => [],
    },
    globalSettings: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      isExpanded: true,
      contextMenuVisible: false,
      contextMenuX: 0,
      contextMenuY: 0,
      editDialogVisible: false,
      editGroupName: '',
      editGroupColor: '',
    };
  },
  mounted() {
    document.addEventListener('click', this.hideContextMenu);
    this.initSortable();
  },
  beforeDestroy() {
    document.removeEventListener('click', this.hideContextMenu);
  },
  methods: {
    toggleExpand() {
      this.isExpanded = !this.isExpanded;
    },
    addConnection() {
      this.hideContextMenu();
      this.$bus.$emit('showNewConnectionWithGroup', this.group.key);
    },
    showContextMenu(e) {
      this.contextMenuX = e.clientX;
      this.contextMenuY = e.clientY;
      this.contextMenuVisible = true;
    },
    hideContextMenu() {
      this.contextMenuVisible = false;
    },
    editGroup() {
      this.editGroupName = this.group.name;
      this.editGroupColor = this.group.color || '';
      this.editDialogVisible = true;
      this.hideContextMenu();
    },
    saveGroup() {
      if (!this.editGroupName.trim()) {
        this.$message.warning(this.$t('message.group_name_required'));
        return;
      }

      storage.editGroup({
        key: this.group.key,
        name: this.editGroupName.trim(),
        color: this.editGroupColor,
      });

      this.editDialogVisible = false;
      this.$emit('refresh');
    },
    deleteGroup() {
      this.$confirm(
        this.$t('message.confirm_delete_group'),
        { type: 'warning' },
      ).then(() => {
        storage.deleteGroup(this.group.key);
        this.$emit('refresh');
        this.$message.success({
          message: this.$t('message.delete_success'),
          duration: 1000,
        });
      }).catch(() => {});

      this.hideContextMenu();
    },
    initSortable() {
      this.$nextTick(() => {
        const dragWrapper = this.$refs['groupConnections_' + this.group.key];
        if (dragWrapper) {
          Sortable.create(dragWrapper, {
            handle: '.el-submenu__title',
            animation: 400,
            direction: 'vertical',
            group: 'connections',
            onEnd: (e) => {
              this.$emit('sortConnections', {
                groupKey: this.group.key,
                oldIndex: e.oldIndex,
                newIndex: e.newIndex,
                from: e.from,
                to: e.to,
              });
            },
          });
        }
      });
    },
  },
};
</script>

<style scoped>
.connection-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  user-select: none;
}

.group-header:hover {
  background: #f0f2f5;
}

.dark-mode .group-header:hover {
  background: #3a4a54;
}

.group-arrow {
  transition: transform 0.2s;
  margin-right: 6px;
  font-size: 12px;
}

.group-arrow.is-expanded {
  transform: rotate(90deg);
}

.group-icon {
  margin-right: 8px;
  font-size: 14px;
}

.group-name {
  font-weight: bold;
  font-size: 14px;
  flex: 1;
}

.group-count {
  color: #909399;
  font-size: 12px;
}

.group-connections {
  margin-left: 10px;
  border-left: 2px solid #e4e7ed;
  padding-left: 8px;
}

.dark-mode .group-connections {
  border-left-color: #4a5a64;
}

.group-context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  min-width: 120px;
}

.dark-mode .group-context-menu {
  background: #2d3a40;
  border-color: #4a5a64;
}

.group-context-menu .menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
}

.group-context-menu .menu-item:hover {
  background: #f0f2f5;
}

.dark-mode .group-context-menu .menu-item:hover {
  background: #3a4a54;
}

.group-context-menu .menu-item i {
  margin-right: 8px;
}
</style>
