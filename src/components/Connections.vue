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
    <div class="connections-list" ref="connectionsList">
      <!-- 混合排序：分组和未分组连接 -->
      <template v-for="(item, index) in sortedItems">
        <!-- 分组 -->
        <ConnectionGroup
          v-if="item.type === 'group'"
          :key="item.group.key"
          :group="item.group"
          :connections="getGroupConnections(item.group.key)"
          :allConnections="filteredConnections"
          :allGroups="groups"
          :globalSettings="globalSettings"
          :depth="1"
          @refresh="initConnections"
          @sortConnections="handleSortConnections">
        </ConnectionGroup>

        <!-- 未分组连接 - 直接与分组并列显示 -->
        <div 
          v-else-if="item.type === 'ungrouped' && ungroupedConnections.length > 0"
          :key="'ungrouped'"
          class="ungrouped-connections-wrapper" 
          data-ungrouped="true"
          ref="ungroupedConnectionsWrapper">
          <div class="ungrouped-connections" ref="ungroupedConnections">
            <ConnectionWrapper
              v-for="(conn, connIndex) of ungroupedConnections"
              :key="conn.key ? conn.key : conn.connectionName"
              :index="connIndex"
              :globalSettings="globalSettings"
              :config='conn'>
            </ConnectionWrapper>
          </div>
        </div>
      </template>
    </div>

    <ScrollToTop parentNum='1' :posRight='false'></ScrollToTop>

    <!-- Add Group Dialog -->
    <el-dialog
      :title="$t('message.add_group')"
      :visible.sync="addGroupDialogVisible"
      :append-to-body='true'
      :close-on-click-modal="false"
      custom-class="add-group-dialog"
      width="520px">
      <div class="add-group-hero">
        <div class="add-group-pill">New</div>
        <div>
          <h3>{{ $t('message.add_group') }}</h3>
          <p>{{ $t('message.group_icon') }} {{ $t('message.group_name') }}</p>
        </div>
      </div>

      <el-form label-position="top" class="add-group-form">
        <el-form-item :label="$t('message.group_icon')" class="form-card">
          <div class="icon-upload-area">
            <div class="icon-preview" @click="triggerIconUpload">
              <img v-if="newGroupIcon" :src="newGroupIcon" class="preview-img" />
              <div v-else class="icon-placeholder">
                <i class="el-icon-picture-outline-round"></i>
                <span>{{ $t('message.icon_size_tip') }}</span>
              </div>
            </div>
            <input
              type="file"
              ref="iconInput"
              accept="image/*"
              style="display: none"
              @change="handleIconChange" />
          </div>
        </el-form-item>

        <el-form-item :label="$t('message.group_name')" class="group-name-item form-card">
          <el-input v-model="newGroupName" :placeholder="$t('message.group_name')" clearable></el-input>
        </el-form-item>
      </el-form>

      <div slot="footer" class="add-group-footer">
        <div class="footer-actions">
          <el-button @click="addGroupDialogVisible = false">{{ $t('el.messagebox.cancel') }}</el-button>
          <el-button type="primary" @click="addGroup">{{ $t('el.messagebox.confirm') }}</el-button>
        </div>
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
      newGroupIcon: '',
    };
  },
  components: { ConnectionWrapper, ConnectionGroup, ScrollToTop },
  created() {
    this.$bus.$on('refreshConnections', this.handleRefreshConnections);
    this.$bus.$on('reloadSettings', this.handleReloadSettings);
  },
  beforeDestroy() {
    this.$bus.$off('refreshConnections', this.handleRefreshConnections);
    this.$bus.$off('reloadSettings', this.handleReloadSettings);
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
    rootGroups() {
      // Only show top-level groups (no parentKey)
      const groups = this.groups.filter(g => !g.parentKey);
      // Sort groups by order
      groups.sort((a, b) => {
        const aOrder = !isNaN(a.order) ? parseInt(a.order) : 999;
        const bOrder = !isNaN(b.order) ? parseInt(b.order) : 999;
        return aOrder - bOrder;
      });
      return groups;
    },
    ungroupedConnections() {
      const filtered = this.filteredConnections.filter(conn => !conn.groupKey);
      return filtered;
    },
    // 获取未分组连接的位置
    ungroupedPosition() {
      const saved = localStorage.getItem('ungroupedConnectionsPosition');
      return saved !== null ? parseInt(saved) : -1;
    },
    // 混合排序的列表：分组和未分组连接的混合
    sortedItems() {
      const items = [];
      const groups = [...this.rootGroups];
      const ungroupedPos = this.ungroupedPosition;
      const hasUngrouped = this.ungroupedConnections.length > 0;
      
      // 如果未分组连接有明确位置且有效
      if (hasUngrouped && ungroupedPos >= 0 && ungroupedPos <= groups.length) {
        // 在指定位置插入未分组连接
        groups.forEach((group, index) => {
          if (index === ungroupedPos) {
            items.push({ type: 'ungrouped' });
          }
          items.push({ type: 'group', group });
        });
        // 如果位置在最后
        if (ungroupedPos === groups.length) {
          items.push({ type: 'ungrouped' });
        }
      } else {
        // 默认：分组在前，未分组在后
        groups.forEach(group => {
          items.push({ type: 'group', group });
        });
        if (hasUngrouped) {
          items.push({ type: 'ungrouped' });
        }
      }
      
      return items;
    },
  },
  methods: {
    handleRefreshConnections() {
      this.initConnections();
    },
    handleReloadSettings(settings) {
      this.globalSettings = settings;
    },
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
      this.newGroupIcon = '';
      this.addGroupDialogVisible = true;
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
            this.newGroupIcon = canvas.toDataURL('image/png');
          } else {
            this.newGroupIcon = event.target.result;
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    addGroup() {
      if (!this.newGroupName.trim()) {
        this.$message.warning(this.$t('message.group_name_required'));
        return;
      }

      storage.addGroup({
        name: this.newGroupName.trim(),
        icon: this.newGroupIcon,
      });

      this.addGroupDialogVisible = false;
      this.initConnections();
      this.$message.success({
        message: this.$t('message.add_success'),
        duration: 1000,
      });
    },
    handleSortConnections({ groupKey, oldIndex, newIndex }) {
      // Handle connection sorting within/between groups
      const groupConnections = this.connections.filter(c => c.groupKey === groupKey);
      if (oldIndex !== newIndex && groupConnections.length > 0) {
        this.$storage.reOrderAndStore(this.connections);
      }
    },
    initUngroupedSortable() {
      const dragWrapper = this.$refs.ungroupedConnections;
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
            const { newIndex, oldIndex } = e;
            if (newIndex !== oldIndex) {
              const ungrouped = this.connections.filter(c => !c.groupKey);
              const currentRow = ungrouped.splice(oldIndex, 1)[0];
              ungrouped.splice(newIndex, 0, currentRow);
              this.$storage.reOrderAndStore(this.connections);
            }
          },
        });
      }
    },
    initGroupsSortable() {
      this.$nextTick(() => {
        const connectionsList = this.$refs.connectionsList;
        if (!connectionsList) return;
        
        // 如果没有分组且没有未分组连接，则不需要排序
        if (this.rootGroups.length === 0 && this.ungroupedConnections.length === 0) return;

        // 创建排序，支持分组和未分组连接的混合排序
        Sortable.create(connectionsList, {
          handle: '.group-header',
          animation: 400,
          direction: 'vertical',
          filter: '.group-content, .ungrouped-connections',
          preventOnFilter: true,
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          draggable: '.connection-group, .ungrouped-connections-wrapper',
          onEnd: (e) => {
            if (e.oldIndex === e.newIndex) return;
            
            const isGroup = e.item.classList.contains('connection-group');
            const isUngrouped = e.item.classList.contains('ungrouped-connections-wrapper');
            
            if (!isGroup && !isUngrouped) return;

            // 获取当前所有元素（分组和未分组连接容器）
            const allElements = Array.from(connectionsList.children);
            const sortedItems = [];
            let ungroupedIndex = -1;

            // 收集所有元素的位置信息
            allElements.forEach((el, index) => {
              if (el.classList.contains('connection-group')) {
                const groupKey = el.getAttribute('data-group-key');
                if (groupKey) {
                  const group = this.rootGroups.find(g => g.key === groupKey);
                  if (group) {
                    sortedItems.push({ type: 'group', key: groupKey, index, group });
                  }
                }
              } else if (el.classList.contains('ungrouped-connections-wrapper')) {
                ungroupedIndex = index;
                sortedItems.push({ type: 'ungrouped', index });
              }
            });

            // 更新分组和未分组连接的位置
            // 重新计算每个元素的order，排除未分组连接后的相对位置
            let groupIndex = 0;
            sortedItems.forEach((item) => {
              if (item.type === 'group') {
                item.group.order = groupIndex;
                groupIndex++;
              } else if (item.type === 'ungrouped') {
                // 未分组连接的位置：在groupIndex位置插入
                localStorage.setItem('ungroupedConnectionsPosition', groupIndex);
              }
            });

            // 保存所有分组的新排序
            const groupsToSave = sortedItems
              .filter(item => item.type === 'group')
              .map(item => item.group);
            
            if (groupsToSave.length > 0) {
              this.$storage.reOrderGroups(groupsToSave);
            } else if (ungroupedIndex >= 0) {
              // 如果没有分组，只保存未分组连接的位置
              localStorage.setItem('ungroupedConnectionsPosition', 0);
            }
            
            this.initConnections();
          },
        });
      });
    },
  },
  mounted() {
    this.initConnections();
    this.$nextTick(() => {
      this.initUngroupedSortable();
      this.initGroupsSortable();
    });
  },
};
</script>

<style type="text/css">
  .connections-wrap {
    height: 100%;
    overflow-y: auto;
  }
  .connections-wrap .filter-input {
    padding: 12px 16px 8px 16px;
  }
  /* set drag area min height, target to the end will be correct */
  .connections-wrap .connections-list {
    min-height: calc(100vh - 110px);
  }
  .connections-wrap .ungrouped-connections {
    margin-bottom: 8px;
  }

  /* 未分组连接包装器样式 */
  .ungrouped-connections-wrapper {
    margin-bottom: 6px;
    position: relative;
  }

  /* 未分组连接列表 - 直接与分组并列显示，与分组内的连接项对齐 */
  .ungrouped-connections {
    margin-left: 0;
    padding-left: 0;
  }

  .ungrouped-connections .connection-menu {
    margin-left: 0;
  }

  /* 使未分组连接项对齐到分组标题的位置
     分组标题（depth=1）位置计算：
     - paddingLeft: 12px
     - 图标宽度: 20px
     - 图标右边距: 10px
     - 文字开始位置: 12px + 20px + 10px = 42px
     
     未分组连接项要对齐到分组标题：
     - connection-name padding-left: 4px
     - 图标宽度: 20px
     - gap: 10px（与分组标题图标右边距一致）
     - 文字开始位置 = el-submenu__title padding-left + 4px + 20px + 10px = 42px
     - 所以 el-submenu__title padding-left = 42 - 4 - 20 - 10 = 8px
     - 但为了让图标开始位置也对齐（12px），需要 padding-left = 12px - 4px = 8px
     实际上，padding-left = 12px 时，图标开始位置 = 12px + 4px = 16px，不对齐
     所以 padding-left = 12px - 4px = 8px，这样图标开始位置 = 8px + 4px = 12px，文字开始位置 = 8px + 4px + 20px + 10px = 42px */
  .ungrouped-connections .connection-menu .connection-menu-title {
    margin-left: 0 !important;
  }

  .ungrouped-connections .connection-menu .el-submenu__title {
    padding-left: 8px !important;
  }

  /* 拖拽排序样式 - 适用于分组和未分组连接 */
  .sortable-ghost {
    opacity: 0.4;
    background: rgba(148, 163, 184, 0.1) !important;
    border-radius: 8px;
  }

  .dark-mode .sortable-ghost {
    background: rgba(148, 163, 184, 0.15) !important;
  }

  .sortable-chosen {
    cursor: grabbing !important;
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
  }

  .dark-mode .sortable-chosen {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .sortable-drag {
    opacity: 0.8;
  }

  /* 分组可拖拽样式 */
  .connections-list .connection-group .group-header {
    cursor: grab;
  }

  .connections-list .connection-group .group-header:active {
    cursor: grabbing;
  }

  /* 连接项可拖拽样式 */
  .connections-list .connection-menu .el-submenu__title {
    cursor: grab;
  }

  .connections-list .connection-menu .el-submenu__title:active {
    cursor: grabbing;
  }
  .connections-wrap .icon-upload-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .connections-wrap .icon-preview {
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
  .connections-wrap .icon-preview:hover {
    border-color: #409EFF;
  }
  .connections-wrap .icon-preview .el-icon-plus {
    font-size: 24px;
    color: #909399;
  }
  .connections-wrap .icon-preview .preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }
  .connections-wrap .icon-tip {
    font-size: 12px;
    color: #909399;
  }
  /* Modern add-group dialog */
  .add-group-dialog .el-dialog {
    border-radius: 24px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), var(--app-surface));
    box-shadow: 0 25px 80px rgba(15, 23, 42, 0.25);
    resize: both;
    overflow: auto;
    min-width: 360px;
    max-width: 720px;
  }
  .dark-mode .add-group-dialog .el-dialog {
    background: linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(16, 24, 40, 0.92));
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.45);
  }
  .add-group-dialog .el-dialog__header {
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    padding: 14px 20px 12px;
  }
  .dark-mode .add-group-dialog .el-dialog__header {
    border-color: rgba(148, 163, 184, 0.12);
  }
  .add-group-dialog .el-dialog__title {
    font-weight: 700;
    color: var(--app-ink);
    letter-spacing: -0.2px;
  }
  .dark-mode .add-group-dialog .el-dialog__title {
    color: #e5e7eb;
  }
  .add-group-dialog .el-dialog__body {
    padding: 18px 22px 10px;
    background: transparent;
  }
  .add-group-hero {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    margin-bottom: 8px;
    border-radius: 12px;
    background: linear-gradient(120deg, rgba(34, 211, 238, 0.12), rgba(14, 165, 233, 0.08));
  }
  .dark-mode .add-group-hero {
    background: linear-gradient(120deg, rgba(56, 189, 248, 0.16), rgba(59, 130, 246, 0.08));
  }
  .add-group-hero h3 {
    margin: 0 0 2px;
    font-size: 16px;
    color: var(--app-ink);
  }
  .add-group-hero p {
    margin: 0;
    color: var(--app-muted);
    font-size: 13px;
  }
  .add-group-pill {
    background: rgba(34, 211, 238, 0.16);
    color: var(--app-accent-strong);
    padding: 6px 10px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
  }
  .dark-mode .add-group-pill {
    background: rgba(56, 189, 248, 0.18);
    color: #7dd3fc;
  }
  .add-group-form .el-form-item__label {
    color: var(--app-muted);
    font-weight: 600;
    font-size: 13px;
  }
  .add-group-form .form-card {
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.75);
  }
  .dark-mode .add-group-form .form-card {
    border-color: rgba(148, 163, 184, 0.16);
    background: rgba(15, 23, 42, 0.75);
  }
  .add-group-dialog .icon-upload-area {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .add-group-dialog .icon-preview {
    flex: 1;
    min-height: 120px;
    border: 1px dashed rgba(148, 163, 184, 0.6);
    border-radius: 12px;
    display: grid;
    place-items: center;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.6);
    transition: all 0.2s ease;
  }
  .add-group-dialog .icon-preview:hover {
    border-color: var(--app-accent-strong);
    box-shadow: 0 10px 25px rgba(34, 211, 238, 0.18);
  }
  .dark-mode .add-group-dialog .icon-preview {
    background: rgba(15, 23, 42, 0.6);
    border-color: rgba(148, 163, 184, 0.35);
  }
  .icon-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: var(--app-muted);
    font-size: 12px;
  }
  .icon-placeholder i {
    font-size: 22px;
    color: var(--app-accent);
  }
  .add-group-dialog .icon-preview .preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 10px;
  }
  .add-group-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 6px 4px;
    border-top: 1px solid rgba(148, 163, 184, 0.18);
  }
  .dark-mode .add-group-footer {
    border-color: rgba(148, 163, 184, 0.12);
  }
  .add-group-footer .footer-hint {
    color: var(--app-muted);
    font-size: 12px;
  }
  .add-group-footer .footer-actions {
    display: flex;
    gap: 8px;
  }
</style>
