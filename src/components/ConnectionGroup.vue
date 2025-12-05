<template>
  <div class="connection-group" :data-group-key="group.key">
    <!-- Group Header -->
    <div
      class="group-header"
      :style="{ paddingLeft: (12 + (depth - 1) * 16) + 'px' }"
      @click="toggleExpand"
      @contextmenu.prevent="showContextMenu">
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
      <div class="group-connections" :ref="'groupConnections_' + group.key">
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
    this.initSortable();
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleOutsideContextClick);
    window.removeEventListener('scroll', this.hideContextMenu, true);
  },
  computed: {
    childGroups() {
      return this.allGroups.filter(g => g.parentKey === this.group.key);
    },
    totalCount() {
      // Count connections in this group and all child groups recursively
      let count = this.connections.length;
      const countRecursive = (parentKey) => {
        const children = this.allGroups.filter(g => g.parentKey === parentKey);
        for (const child of children) {
          // Count connections directly in this child group
          const childConnections = this.allConnections.filter(c => c.groupKey === child.key);
          count += childConnections.length;
          // Recursively count connections in child's sub-groups
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
      return this.allConnections.filter(c => c.groupKey === groupKey);
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
