<template>
  <div class="connection-group" :data-group-key="group.key">
    <!-- Group Header -->
    <div
      class="group-header"
      :style="{ paddingLeft: (12 + (depth - 1) * 16) + 'px' }"
      @click="toggleExpand"
      @contextmenu.prevent.stop="showContextMenu">
      <img v-if="group.icon" :src="group.icon" class="group-icon-img" />
      <i v-else class="group-icon fa fa-folder" :style="{ color: group.color || '#909399' }"></i>
      <span class="group-name">{{ group.name }}</span>
      <span class="group-count">({{ totalCount }})</span>
    </div>

    <!-- Group Content (子分组 + 连接) -->
    <div v-show="isExpanded" class="group-content">
      <!-- Child Groups (递归) -->
      <ConnectionGroup
        v-for="childGroup in childGroups"
        :key="childGroup.key"
        :group="childGroup"
        :connections="getGroupConnections(childGroup.key)"
        :allConnections="allConnections"
        :allGroups="allGroups"
        :globalSettings="globalSettings"
        :depth="depth + 1"
        @refresh="$emit('refresh')"
        @sortConnections="$emit('sortConnections', $event)" />
      
      <!-- Group Connections -->
      <div 
        class="group-connections" 
        :ref="'groupConnections_' + group.key"
        :data-group-key="group.key">
        <ConnectionWrapper
          v-for="(item, index) of connections"
          :key="item.key ? item.key : item.connectionName"
          :index="index"
          :globalSettings="globalSettings"
          :config='item'>
        </ConnectionWrapper>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-show="contextMenuVisible"
      class="group-context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }">
      <div class="menu-item" @click="addConnection">
        <i class="fa fa-plus-circle"></i>
        {{ $t('message.new_connection') }}
      </div>
      <div v-if="depth < 3" class="menu-item" @click="showAddSubGroupDialog">
        <i class="fa fa-folder"></i>
        {{ $t('message.add_sub_group') }}
      </div>
      <div class="menu-item" @click="editGroup">
        <i class="fa fa-pencil"></i>
        {{ $t('message.edit_group') }}
      </div>
      <div class="menu-item" @click="deleteGroup">
        <i class="fa fa-trash-o"></i>
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
        <el-form-item :label="$t('message.group_icon')">
          <div class="icon-upload-area">
            <div class="icon-preview" @click="triggerIconUpload">
              <img v-if="editGroupIcon" :src="editGroupIcon" class="preview-img" />
              <i v-else class="el-icon-plus"></i>
            </div>
            <input
              type="file"
              ref="iconInput"
              accept="image/*"
              style="display: none"
              @change="handleIconChange" />
            <el-button v-if="editGroupIcon" type="text" size="mini" @click="editGroupIcon = ''">
              {{ $t('message.remove') }}
            </el-button>
            <div class="icon-tip">{{ $t('message.icon_size_tip') }}</div>
          </div>
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

    <!-- Add Sub Group Dialog -->
    <el-dialog
      :title="$t('message.add_sub_group')"
      :visible.sync="addSubGroupDialogVisible"
      :append-to-body='true'
      width="400px">
      <el-form label-position="top">
        <el-form-item :label="$t('message.group_name')">
          <el-input v-model="newSubGroupName" :placeholder="$t('message.group_name')"></el-input>
        </el-form-item>
        <el-form-item :label="$t('message.group_icon')">
          <div class="icon-upload-area">
            <div class="icon-preview" @click="triggerSubIconUpload">
              <img v-if="newSubGroupIcon" :src="newSubGroupIcon" class="preview-img" />
              <i v-else class="el-icon-plus"></i>
            </div>
            <input
              type="file"
              ref="subIconInput"
              accept="image/*"
              style="display: none"
              @change="handleSubIconChange" />
            <el-button v-if="newSubGroupIcon" type="text" size="mini" @click="newSubGroupIcon = ''">
              {{ $t('message.remove') }}
            </el-button>
            <div class="icon-tip">{{ $t('message.icon_size_tip') }}</div>
          </div>
        </el-form-item>
        <el-form-item :label="$t('message.mark_color')">
          <el-color-picker
            v-model="newSubGroupColor"
            :predefine="['#f56c6c', '#F5C800', '#409EFF', '#85ce61', '#c6e2ff', '#909399']">
          </el-color-picker>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="addSubGroupDialogVisible = false">{{ $t('el.messagebox.cancel') }}</el-button>
        <el-button type="primary" @click="addSubGroup">{{ $t('el.messagebox.confirm') }}</el-button>
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
    allConnections: {
      type: Array,
      default: () => [],
    },
    allGroups: {
      type: Array,
      default: () => [],
    },
    globalSettings: {
      type: Object,
      default: () => ({}),
    },
    depth: {
      type: Number,
      default: 1,
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
      editGroupIcon: '',
      // Sub group dialog
      addSubGroupDialogVisible: false,
      newSubGroupName: '',
      newSubGroupColor: '#409EFF',
      newSubGroupIcon: '',
    };
  },
  mounted() {
    document.addEventListener('click', this.handleOutsideContextClick);
    window.addEventListener('scroll', this.hideContextMenu, true);
    this.$bus.$on('hideAllContextMenus', this.hideContextMenu);
    this.initSortable();
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleOutsideContextClick);
    window.removeEventListener('scroll', this.hideContextMenu, true);
    this.$bus.$off('hideAllContextMenus', this.hideContextMenu);
  },
  computed: {
    childGroups() {
      return this.allGroups.filter(g => g.parentKey === this.group.key);
    },
    totalCount() {
      // Count connections in this group and all child groups recursively
      // 实时响应连接和分组的变化
      if (!this.allConnections || !this.allGroups) {
        return 0;
      }
      
      // 直接从 allConnections 过滤当前分组的连接，确保响应式更新
      // 这样可以确保当连接的 groupKey 变化时，计算属性能够自动重新计算
      let count = this.allConnections.filter(c => (c.groupKey || '') === (this.group.key || '')).length;
      
      // 递归统计所有子分组中的连接数
      const countRecursive = (parentKey) => {
        // 访问 allGroups 数组以触发响应性追踪
        const children = this.allGroups.filter(g => (g.parentKey || '') === (parentKey || ''));
        for (const child of children) {
          // 访问 allConnections 数组以触发响应性追踪
          const childConnections = this.allConnections.filter(c => (c.groupKey || '') === (child.key || ''));
          count += childConnections.length;
          // 递归统计子分组的所有子分组
          countRecursive(child.key);
        }
      };
      
      countRecursive(this.group.key);
      return count;
    },
  },
  methods: {
    toggleExpand() {
      this.isExpanded = !this.isExpanded;
    },
    addConnection() {
      this.hideContextMenu();
      this.$bus.$emit('showNewConnectionWithGroup', this.group.key);
    },
    getGroupConnections(groupKey) {
      // 使用与 totalCount 相同的规范化比较方式，确保一致性
      return this.allConnections.filter(c => (c.groupKey || '') === (groupKey || ''));
    },
    showAddSubGroupDialog() {
      this.newSubGroupName = '';
      this.newSubGroupColor = '#409EFF';
      this.newSubGroupIcon = '';
      this.addSubGroupDialogVisible = true;
      this.hideContextMenu();
    },
    triggerSubIconUpload() {
      this.$refs.subIconInput.click();
    },
    handleSubIconChange(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 100 * 1024) {
        this.$message.warning(this.$t('message.icon_size_exceed'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          if (img.width > 180 || img.height > 180) {
            const canvas = document.createElement('canvas');
            const scale = Math.min(180 / img.width, 180 / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            this.newSubGroupIcon = canvas.toDataURL('image/png');
          } else {
            this.newSubGroupIcon = event.target.result;
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    addSubGroup() {
      if (!this.newSubGroupName.trim()) {
        this.$message.warning(this.$t('message.group_name_required'));
        return;
      }

      storage.addGroup({
        name: this.newSubGroupName.trim(),
        color: this.newSubGroupColor,
        icon: this.newSubGroupIcon,
        parentKey: this.group.key,
      });

      this.addSubGroupDialogVisible = false;
      this.$emit('refresh');
      this.$message.success({
        message: this.$t('message.add_success'),
        duration: 1000,
      });
    },
    showContextMenu(e) {
      // 关闭其他所有右键菜单
      this.$bus.$emit('hideAllContextMenus');
      
      const menuWidth = 200;
      const menuHeight = 240;
      const maxX = window.innerWidth - menuWidth - 8;
      const maxY = window.innerHeight - menuHeight - 8;
      this.contextMenuX = Math.max(8, Math.min(e.pageX, maxX));
      this.contextMenuY = Math.max(8, Math.min(e.pageY, maxY));
      this.contextMenuVisible = true;
    },
    hideContextMenu() {
      this.contextMenuVisible = false;
    },
    handleOutsideContextClick(event) {
      if (!this.contextMenuVisible) return;
      const menu = this.$el.querySelector('.group-context-menu');
      if (menu && menu.contains(event.target)) return;
      this.hideContextMenu();
    },
    editGroup() {
      this.editGroupName = this.group.name;
      this.editGroupColor = this.group.color || '';
      this.editGroupIcon = this.group.icon || '';
      this.editDialogVisible = true;
      this.hideContextMenu();
    },
    triggerIconUpload() {
      this.$refs.iconInput.click();
    },
    handleIconChange(e) {
      const file = e.target.files[0];
      if (!file) return;

      // Check file size (100KB)
      if (file.size > 100 * 1024) {
        this.$message.warning(this.$t('message.icon_size_exceed'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Check dimensions
          if (img.width > 180 || img.height > 180) {
            // Resize image
            const canvas = document.createElement('canvas');
            const scale = Math.min(180 / img.width, 180 / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            this.editGroupIcon = canvas.toDataURL('image/png');
          } else {
            this.editGroupIcon = event.target.result;
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
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
        icon: this.editGroupIcon,
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
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: (e) => {
              // 检测是否跨容器拖拽
              const isCrossContainer = e.from !== e.to;
              
              if (isCrossContainer) {
                // 跨容器拖拽：处理连接移动到其他分组或未分组区域
                this.handleCrossContainerDrag(e);
              } else {
                // 同一容器内排序
                this.$emit('sortConnections', {
                  groupKey: this.group.key,
                  oldIndex: e.oldIndex,
                  newIndex: e.newIndex,
                  from: e.from,
                  to: e.to,
                });
              }
            },
          });
        }
      });
    },
    // 处理跨容器拖拽
    handleCrossContainerDrag(e) {
      // 从拖拽元素中获取连接的 connectionName
      const connectionName = this.getConnectionNameFromElement(e.item);
      if (!connectionName) {
        return;
      }

      // 获取源分组的 groupKey（可能是 null 表示未分组）
      const sourceGroupKey = this.getGroupKeyFromContainer(e.from);
      
      // 获取目标分组的 groupKey
      // 如果目标容器是当前分组的容器，使用当前分组的 key
      const currentContainer = this.$refs['groupConnections_' + this.group.key];
      let targetGroupKey;
      if (e.to === currentContainer) {
        // 拖拽到当前分组
        targetGroupKey = this.group.key;
      } else {
        // 拖拽到其他容器，从容器元素中获取
        // 如果是未分组容器，getGroupKeyFromContainer 会返回 null
        targetGroupKey = this.getGroupKeyFromContainer(e.to);
      }
      
      // 找到连接配置（从所有连接中查找，不仅仅是过滤后的）
      const connection = this.allConnections.find(c => {
        const connName = c.connectionName || c.name;
        return connName === connectionName;
      });

      if (!connection) {
        return;
      }

      // 规范化比较 groupKey，处理 null、undefined 和空字符串
      const normalizedSourceKey = (sourceGroupKey || '');
      const normalizedTargetKey = (targetGroupKey || '');
      
      // 如果目标分组和源分组不同，更新连接的 groupKey
      if (normalizedTargetKey !== normalizedSourceKey) {
        // 使用 storage.moveConnectionToGroup 来更新连接的 groupKey
        // 如果 targetGroupKey 是 null（拖拽到未分组），传入空字符串
        storage.moveConnectionToGroup(connection, normalizedTargetKey);
        
        // 刷新连接列表，立即刷新以确保数量统计正确更新
        this.$emit('refresh');
        
        this.$message.success({
          message: this.$t('message.modify_success'),
          duration: 1000,
        });
      }
    },
    // 从 DOM 元素中获取连接的 connectionName
    getConnectionNameFromElement(element) {
      // 查找 connection-anchor-* id
      const menuElement = element.querySelector('[id^="connection-anchor-"]');
      if (menuElement && menuElement.id) {
        const match = menuElement.id.match(/^connection-anchor-(.+)$/);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // 如果找不到 id，尝试从 el-submenu 的 index 属性获取
      const submenu = element.querySelector('.el-submenu');
      if (submenu && submenu.getAttribute('index')) {
        return submenu.getAttribute('index');
      }
      
      return null;
    },
    // 从容器元素中获取分组的 groupKey
    getGroupKeyFromContainer(container) {
      if (!container) {
        return null;
      }
      
      // 首先检查容器本身是否有 data-ungrouped 属性
      if (container.hasAttribute('data-ungrouped')) {
        return null;
      }
      
      // 如果容器有 data-group-key 属性，直接返回
      if (container.hasAttribute('data-group-key')) {
        const groupKey = container.getAttribute('data-group-key');
        return groupKey || null;
      }
      
      // 检查父元素中是否有 data-ungrouped（未分组容器）
      const ungroupedWrapper = container.closest('[data-ungrouped]');
      if (ungroupedWrapper) {
        return null;
      }
      
      // 尝试从父元素中查找 group-key
      const groupElement = container.closest('[data-group-key]');
      if (groupElement) {
        const groupKey = groupElement.getAttribute('data-group-key');
        return groupKey || null;
      }
      
      return null;
    },
  },
};
</script>

<style scoped>
.connection-group {
  margin-bottom: 6px;
  position: relative;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  user-select: none;
  white-space: nowrap;
  margin: 2px 0;
  position: relative;
}

.group-header:hover {
  background: rgba(148, 163, 184, 0.1);
  transform: translateX(2px);
}

.dark-mode .group-header:hover {
  background: rgba(148, 163, 184, 0.15);
}


.group-icon {
  margin-right: 10px;
  font-size: 16px;
  flex-shrink: 0;
}

.group-icon-img {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.group-name {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1e293b;
}

.dark-mode .group-name {
  color: #e5e7eb;
}

.group-count {
  color: #94a3b8;
  font-size: 12px;
  margin-left: 6px;
  flex-shrink: 0;
  font-weight: 500;
}

.dark-mode .group-count {
  color: #64748b;
}

.group-connections {
  margin-left: 0;
  padding-left: 0;
}

.group-content {
  border-left: 2px solid rgba(148, 163, 184, 0.2);
  margin-left: 28px;
  padding-left: 8px;
  transition: border-color 0.2s ease;
}

.group-content:hover {
  border-left-color: rgba(148, 163, 184, 0.4);
}

.dark-mode .group-content {
  border-left-color: rgba(148, 163, 184, 0.15);
}

.dark-mode .group-content:hover {
  border-left-color: rgba(148, 163, 184, 0.3);
}

.group-content .group-connections ::v-deep .connection-menu {
  margin-left: 0;
}

/* 对齐连接项文字到分组标题文字位置
   分组标题（depth=1，无箭头）文字开始位置（从容器左边缘）：
     paddingLeft(12px) + 图标宽度(20px) + 图标右边距(10px) = 42px
   
   分组内容起始位置（从容器左边缘）：
     margin-left(28px) + border(2px) + padding-left(8px) = 38px
   
   连接项文字位置计算（从容器左边缘）：
     - group-content 起始: 38px
     - el-submenu__title padding-left: 14px
     - connection-menu-title margin-left: 0（已重置）
     - connection-name padding-left: 4px
     - 图标宽度: 20px
     - gap: 10px
     - 文字开始位置: 38px + 14px + 4px + 20px + 10px = 86px
   
   但我们要让连接项文字对齐到分组标题文字（42px），这不太合理，因为分组内的连接项应该有缩进。
   所以这里让连接项文字对齐到分组标题文字位置是不对的，应该让它们与分组标题有视觉上的层级关系。
   当前设置（padding-left: 14px）保持了连接项在分组内容内的缩进效果。
*/
.group-content .group-connections ::v-deep .connection-menu-title {
  margin-left: 0 !important;
}

.group-content .group-connections ::v-deep .connection-menu .el-submenu__title {
  padding-left: 14px !important;
}

.dark-mode .group-content {
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
  display: flex;
  align-items: center;
}

.group-context-menu .menu-item:hover {
  background: #f0f2f5;
}

.dark-mode .group-context-menu .menu-item:hover {
  background: #3a4a54;
}

.group-context-menu .menu-item i {
  width: 16px;
  margin-right: 8px;
  text-align: center;
}

.icon-upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-preview {
  width: 60px;
  height: 60px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.icon-preview:hover {
  border-color: #409EFF;
}

.icon-preview .el-icon-plus {
  font-size: 24px;
  color: #909399;
}

.icon-preview .preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.icon-tip {
  font-size: 12px;
  color: #909399;
}
</style>
