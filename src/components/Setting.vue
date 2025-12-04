<template>
  <!-- Preferences Dialog -->
  <el-dialog :visible.sync="visible" custom-class="pref-dialog" :show-close="true" :close-on-click-modal="false">
    <div class="pref-container">
      <!-- Header -->
      <div class="pref-header">{{ $t('message.preferences') }}</div>
      
      <div class="pref-body">
        <!-- Left Navigation -->
        <div class="pref-nav">
          <div 
            v-for="tab in tabs" 
            :key="tab.key"
            class="pref-nav-item"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key">
            {{ tab.label }}
          </div>
        </div>
        
        <!-- Right Content -->
        <div class="pref-content">
          <!-- General Config Tab -->
          <div v-show="activeTab === 'general'" class="pref-panel">
            <!-- Theme -->
            <div class="pref-form-item">
              <label class="pref-label">{{ $t('message.theme_select') }}</label>
              <div class="pref-btn-group">
                <button 
                  v-for="(label, theme) in themeList" 
                  :key="theme"
                  class="pref-btn"
                  :class="{ active: themeMode === theme }"
                  @click="themeMode = theme; changeTheme()">
                  {{ label }}
                </button>
              </div>
            </div>
            
            <!-- Language -->
            <div class="pref-form-item">
              <label class="pref-label">{{ $t('message.select_lang') }}</label>
              <LanguageSelector class="pref-select"></LanguageSelector>
            </div>
            
            <!-- Font -->
            <div class="pref-form-item">
              <label class="pref-label">
                {{ $t('message.font_family') }}
                <el-tooltip :content="$t('message.font_faq')" placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
                <i v-if="loadingFonts" class="el-icon-loading"></i>
              </label>
              <el-select 
                v-model="form.fontFamily" 
                @visible-change="getAllFonts" 
                allow-create 
                default-first-option
                filterable 
                :placeholder="$t('message.font_placeholder')"
                class="pref-select">
                <el-option
                  v-for="(font, index) in allFonts"
                  :key="index"
                  :label="font"
                  :value="font">
                </el-option>
              </el-select>
            </div>
            
            <!-- Font Size -->
            <div class="pref-form-item">
              <label class="pref-label">{{ $t('message.font_size') }}</label>
              <el-input-number
                v-model="form.fontSize"
                :min="10"
                :max="24"
                :step="1"
                controls-position="right"
                class="pref-number-input">
              </el-input-number>
            </div>
            
            <!-- SCAN Count & Key Icon Style -->
            <div class="pref-form-row">
              <div class="pref-form-item flex-1">
                <label class="pref-label">
                  {{ $t('message.keys_per_loading') }}
                  <el-tooltip :content="$t('message.keys_per_loading_tip')" placement="top">
                    <i class="el-icon-question"></i>
                  </el-tooltip>
                </label>
                <el-input v-model.number="form.keysPageSize" type="number" class="pref-input"></el-input>
              </div>
              <div class="pref-form-item flex-1">
                <label class="pref-label">{{ $t('message.key_icon_style') }}</label>
                <el-select v-model="form.keyIconStyle" class="pref-select">
                  <el-option value="compact" :label="$t('message.compact_style')"></el-option>
                  <el-option value="normal" :label="$t('message.normal_style')"></el-option>
                </el-select>
              </div>
            </div>
          </div>
          
          <!-- Editor Tab -->
          <div v-show="activeTab === 'editor'" class="pref-panel">
            <!-- Font -->
            <div class="pref-form-item">
              <label class="pref-label">
                {{ $t('message.font_family') }}
                <el-tooltip :content="$t('message.font_faq')" placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </label>
              <el-select 
                v-model="form.editorFontFamily" 
                @visible-change="getAllFonts" 
                allow-create 
                default-first-option
                filterable 
                :placeholder="$t('message.font_placeholder')"
                class="pref-select">
                <el-option
                  v-for="(font, index) in allFonts"
                  :key="index"
                  :label="font"
                  :value="font">
                </el-option>
              </el-select>
            </div>
            
            <!-- Font Size -->
            <div class="pref-form-item">
              <label class="pref-label">{{ $t('message.font_size') }}</label>
              <el-input-number
                v-model="form.editorFontSize"
                :min="10"
                :max="24"
                :step="1"
                controls-position="right"
                class="pref-number-input">
              </el-input-number>
            </div>
            
            <!-- Editor Options -->
            <div class="pref-checkbox-group">
              <el-checkbox v-model="form.editorLineNumbers">{{ $t('message.show_line_numbers') }}</el-checkbox>
              <el-checkbox v-model="form.editorFolding">{{ $t('message.enable_code_folding') }}</el-checkbox>
              <el-checkbox v-model="form.editorDragDrop">{{ $t('message.allow_drag_drop') }}</el-checkbox>
              <el-checkbox v-model="form.editorLinks">{{ $t('message.support_links') }}</el-checkbox>
            </div>
          </div>
          
          <!-- CLI Tab -->
          <div v-show="activeTab === 'cli'" class="pref-panel">
            <!-- Font -->
            <div class="pref-form-item">
              <label class="pref-label">
                {{ $t('message.font_family') }}
                <el-tooltip :content="$t('message.font_faq')" placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </label>
              <el-select 
                v-model="form.cliFontFamily" 
                @visible-change="getAllFonts" 
                allow-create 
                default-first-option
                filterable 
                :placeholder="$t('message.font_placeholder')"
                class="pref-select">
                <el-option
                  v-for="(font, index) in allFonts"
                  :key="index"
                  :label="font"
                  :value="font">
                </el-option>
              </el-select>
            </div>
            
            <!-- Font Size -->
            <div class="pref-form-item">
              <label class="pref-label">{{ $t('message.font_size') }}</label>
              <el-input-number
                v-model="form.cliFontSize"
                :min="10"
                :max="24"
                :step="1"
                controls-position="right"
                class="pref-number-input">
              </el-input-number>
            </div>
            
            <!-- Cursor Style -->
            <div class="pref-form-item">
              <label class="pref-label">{{ $t('message.cursor_style') }}</label>
              <div class="pref-btn-group">
                <button 
                  v-for="style in cursorStyles" 
                  :key="style.value"
                  class="pref-btn"
                  :class="{ active: form.cliCursorStyle === style.value }"
                  @click="form.cliCursorStyle = style.value">
                  {{ style.label }}
                </button>
              </div>
            </div>
          </div>
          
          <!-- Custom Decoder Tab -->
          <div v-show="activeTab === 'decoder'" class="pref-panel">
            <div class="pref-decoder-header">
              <div class="pref-decoder-actions">
                <el-button size="small" type="primary" @click="showAddDecoderDialog">
                  <i class="el-icon-plus"></i> {{ $t('message.add_decoder') }}
                </el-button>
                <el-dropdown size="small" trigger="click" @command="handleDecoderCommand">
                  <el-button size="small">
                    {{ $t('message.more_actions') }} <i class="el-icon-arrow-down"></i>
                  </el-button>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item command="import">
                      <i class="el-icon-upload2"></i> {{ $t('message.import') }}
                    </el-dropdown-item>
                    <el-dropdown-item command="export" :disabled="decoders.length === 0">
                      <i class="el-icon-download"></i> {{ $t('message.export') }}
                    </el-dropdown-item>
                    <el-dropdown-item divided command="enableAll" :disabled="decoders.length === 0">
                      <i class="el-icon-open"></i> {{ $t('message.enable_all') }}
                    </el-dropdown-item>
                    <el-dropdown-item command="disableAll" :disabled="decoders.length === 0">
                      <i class="el-icon-turn-off"></i> {{ $t('message.disable_all') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
              </div>
              <el-button size="small" type="text" @click="showDecoderHelp">
                <i class="el-icon-question"></i> {{ $t('message.help') }}
              </el-button>
            </div>
            
            <el-table :data="decoders" class="pref-decoder-table" :empty-text="$t('message.no_data')">
              <el-table-column :label="$t('message.decoder_name')" min-width="120">
                <template slot-scope="scope">
                  <span :class="{ 'decoder-disabled': !scope.row.enabled }">{{ scope.row.name }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="$t('message.command_preview')" min-width="150">
                <template slot-scope="scope">
                  <el-tooltip :content="scope.row.command" placement="top" :disabled="!scope.row.command || scope.row.command.length < 30">
                    <span class="decoder-command" :class="{ 'decoder-disabled': !scope.row.enabled }">{{ scope.row.command }}</span>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column :label="$t('message.status')" width="80" align="center">
                <template slot-scope="scope">
                  <el-switch v-model="scope.row.enabled" size="small" @change="onDecoderStatusChange"></el-switch>
                </template>
              </el-table-column>
              <el-table-column :label="$t('message.operation')" width="140" align="center">
                <template slot-scope="scope">
                  <el-tooltip :content="$t('message.test_decoder')" placement="top">
                    <el-button type="text" size="small" @click="testDecoder(scope.row)">
                      <i class="el-icon-video-play"></i>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip :content="$t('message.copy')" placement="top">
                    <el-button type="text" size="small" @click="copyDecoder(scope.row)">
                      <i class="el-icon-document-copy"></i>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip :content="$t('message.edit')" placement="top">
                    <el-button type="text" size="small" @click="editDecoder(scope.row, scope.$index)">
                      <i class="el-icon-edit"></i>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip :content="$t('message.delete_success').replace('成功', '')" placement="top">
                    <el-button type="text" size="small" class="danger-text" @click="deleteDecoder(scope.$index)">
                      <i class="el-icon-delete"></i>
                    </el-button>
                  </el-tooltip>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- Data Sync Tab -->
          <div v-show="activeTab === 'sync'" class="pref-panel">
            <!-- Manual Sync Section -->
            <div class="sync-section">
              <h4 class="sync-section-title">{{ $t('message.manual_sync') }}</h4>
              <p class="sync-section-desc">{{ $t('message.manual_sync_desc') }}</p>
              <div class="sync-actions">
                <el-button size="small" icon="el-icon-download" @click="showImportDataDialog">
                  {{ $t('message.import') }}
                </el-button>
                <el-button size="small" icon="el-icon-upload2" @click="exportAllData">
                  {{ $t('message.export') }}
                </el-button>
              </div>
            </div>
            
            <!-- S3 Sync Section -->
            <div class="sync-section">
              <h4 class="sync-section-title">{{ $t('message.s3_sync') }}</h4>
              <p class="sync-section-desc">{{ $t('message.s3_sync_desc') }}</p>
              
              <el-form label-position="top" size="small" class="s3-config-form">
                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item :label="$t('message.s3_endpoint')" required>
                      <el-input v-model="s3Config.endpoint" placeholder="https://s3.amazonaws.com"></el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item :label="$t('message.s3_region')">
                      <el-input v-model="s3Config.region" placeholder="us-east-1"></el-input>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item label="Access Key ID" required>
                      <el-input v-model="s3Config.accessKeyId" placeholder="Access Key ID"></el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="Secret Access Key" required>
                      <el-input v-model="s3Config.secretAccessKey" type="password" show-password placeholder="Secret Access Key"></el-input>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item :label="$t('message.s3_bucket')" required>
                      <el-input v-model="s3Config.bucket" placeholder="my-bucket"></el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item :label="$t('message.s3_prefix')">
                      <el-input v-model="s3Config.prefix" placeholder="ardm-sync/"></el-input>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-form>
              
              <div class="sync-actions">
                <el-button size="small" @click="testS3Connection" :loading="s3Testing">
                  <i class="el-icon-connection"></i> {{ $t('message.s3_test_connection') }}
                </el-button>
                <el-button size="small" @click="saveS3Config">
                  <i class="el-icon-check"></i> {{ $t('message.save_config') }}
                </el-button>
                <el-button size="small" type="warning" @click="s3Download" :loading="s3Syncing">
                  <i class="el-icon-download"></i> {{ $t('message.s3_download') }}
                </el-button>
                <el-button size="small" type="primary" @click="s3Upload" :loading="s3Syncing">
                  <i class="el-icon-upload2"></i> {{ $t('message.s3_upload') }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="pref-footer">
        <el-button @click="resetToDefault">{{ $t('message.reset_default') }}</el-button>
        <div class="pref-footer-right">
          <el-button @click="visible = false">{{ $t('el.messagebox.cancel') }}</el-button>
          <el-button type="danger" @click="saveSettings">{{ $t('message.save') }}</el-button>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Decoder Dialog -->
    <el-dialog 
      :title="editingDecoderIndex >= 0 ? $t('message.edit_decoder_title') : $t('message.add_decoder_title')" 
      :visible.sync="decoderDialogVisible" 
      width="550px" 
      append-to-body
      custom-class="decoder-dialog">
      <el-form :model="decoderForm" label-position="top" size="small">
        <el-form-item :label="$t('message.decoder_name')" required>
          <el-input v-model="decoderForm.name" :placeholder="$t('message.please_input')"></el-input>
        </el-form-item>
        
        <div class="decoder-tabs">
          <span 
            class="decoder-tab" 
            :class="{ active: decoderFormTab === 'decoder' }" 
            @click="decoderFormTab = 'decoder'">{{ $t('message.decoder') }}</span>
          <span 
            class="decoder-tab" 
            :class="{ active: decoderFormTab === 'encoder' }" 
            @click="decoderFormTab = 'encoder'">{{ $t('message.encoder') }}</span>
        </div>
        
        <el-form-item :required="decoderFormTab === 'decoder'">
          <span slot="label">
            {{ decoderFormTab === 'decoder' ? $t('message.decoder_path') : $t('message.encoder_path') }}
            <el-tooltip :content="$t('message.decoder_path_tip')" placement="top">
              <i class="el-icon-question"></i>
            </el-tooltip>
          </span>
          <div class="decoder-path-input">
            <el-input 
              v-model="decoderForm[decoderFormTab + 'Path']" 
              :placeholder="decoderFormTab === 'decoder' ? $t('message.decoder_path') : $t('message.encoder_path')">
            </el-input>
            <el-button @click="selectDecoderPath">...</el-button>
          </div>
        </el-form-item>
        
        <el-form-item>
          <span slot="label">
            {{ $t('message.run_args') }}
            <el-tooltip :content="$t('message.run_args_tip')" placement="top">
              <i class="el-icon-question"></i>
            </el-tooltip>
          </span>
          <div v-for="(arg, index) in decoderForm[decoderFormTab + 'Args']" :key="index" class="decoder-arg-row">
            <el-input v-model="decoderForm[decoderFormTab + 'Args'][index]" size="small" :placeholder="$t('message.arg_placeholder')"></el-input>
            <el-button size="small" type="text" class="danger-text" @click="removeDecoderArg(index)">
              <i class="el-icon-minus"></i>
            </el-button>
          </div>
          <el-button size="small" @click="addDecoderArg" class="decoder-add-arg">
            <i class="el-icon-plus"></i> {{ $t('message.add') }}
          </el-button>
        </el-form-item>
        
        <el-form-item :label="$t('message.test_value')">
          <el-input 
            v-model="testInput" 
            type="textarea" 
            :rows="2" 
            :placeholder="$t('message.test_value_placeholder')">
          </el-input>
          <div class="decoder-test-actions">
            <el-button size="mini" :loading="testing" @click="runDecoderTest">
              <i class="el-icon-video-play"></i> {{ $t('message.run_test') }}
            </el-button>
          </div>
          <div v-if="testOutput" class="decoder-test-output">
            <label>{{ $t('message.test_output') }}:</label>
            <pre>{{ testOutput }}</pre>
          </div>
          <div v-if="testError" class="decoder-test-error">
            <label>{{ $t('message.error') }}:</label>
            <pre>{{ testError }}</pre>
          </div>
        </el-form-item>
        
        <el-checkbox v-model="decoderForm.autoDecodeEncode">{{ $t('message.auto_decode') }}</el-checkbox>
      </el-form>
      
      <div slot="footer">
        <el-button @click="decoderDialogVisible = false">{{ $t('el.messagebox.cancel') }}</el-button>
        <el-button type="danger" @click="saveDecoder">{{ $t('el.messagebox.confirm') }}</el-button>
      </div>
    </el-dialog>
    
    <!-- Import Decoder Dialog -->
    <el-dialog
      :title="$t('message.import_decoder')"
      :visible.sync="importDecoderDialogVisible"
      width="400px"
      append-to-body>
      <el-upload
        ref="decoderUpload"
        :auto-upload="false"
        :multiple="false"
        action=""
        :limit="1"
        :on-change="loadDecoderFile"
        drag>
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">{{ $t('message.put_file_here') }}</div>
      </el-upload>
      <div slot="footer">
        <el-button @click="importDecoderDialogVisible = false">{{ $t('el.messagebox.cancel') }}</el-button>
        <el-button type="primary" @click="importDecoders">{{ $t('el.messagebox.confirm') }}</el-button>
      </div>
    </el-dialog>
    
    <!-- Import Data Dialog -->
    <el-dialog
      :title="$t('message.import_data')"
      :visible.sync="importDataDialogVisible"
      width="450px"
      append-to-body>
      <el-alert :title="$t('message.import_data_warning')" type="warning" show-icon :closable="false" style="margin-bottom: 16px;"></el-alert>
      <el-upload
        ref="dataUpload"
        :auto-upload="false"
        :multiple="false"
        action=""
        :limit="1"
        :on-change="loadDataFile"
        drag>
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">{{ $t('message.put_file_here') }}</div>
      </el-upload>
      <div slot="footer">
        <el-button @click="importDataDialogVisible = false">{{ $t('el.messagebox.cancel') }}</el-button>
        <el-button type="primary" @click="importAllData">{{ $t('el.messagebox.confirm') }}</el-button>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script type="text/javascript">
import storage from '@/storage.js';
import { ipcRenderer, remote } from 'electron';
import { spawn } from 'child_process';
import LanguageSelector from '@/components/LanguageSelector';
import S3SyncService from '@/s3Sync.js';

export default {
  data() {
    return {
      visible: false,
      activeTab: 'general',
      form: {
        fontFamily: '',
        fontSize: 14,
        keysPageSize: 3000,
        keyIconStyle: 'compact',
        // Editor settings
        editorFontFamily: '',
        editorFontSize: 14,
        editorLineNumbers: true,
        editorFolding: true,
        editorDragDrop: true,
        editorLinks: true,
        // CLI settings
        cliFontFamily: '',
        cliFontSize: 14,
        cliCursorStyle: 'block',
      },
      allFonts: [],
      loadingFonts: false,
      themeMode: 'system',
      // Decoders
      decoders: [],
      decoderDialogVisible: false,
      decoderFormTab: 'decoder',
      decoderForm: {
        name: '',
        decoderPath: '',
        decoderArgs: [],
        encoderPath: '',
        encoderArgs: [],
        autoDecodeEncode: true,
      },
      editingDecoderIndex: -1,
      // Test
      testInput: '',
      testOutput: '',
      testError: '',
      testing: false,
      // Import
      importDecoderDialogVisible: false,
      importDecoderContent: '',
      // Data Sync
      importDataDialogVisible: false,
      importDataContent: '',
      s3Config: {
        syncMode: 'manual',
        endpoint: '',
        region: 'us-east-1',
        accessKeyId: '',
        secretAccessKey: '',
        bucket: '',
        parallelism: 4,
        prefix: 'ardm-sync/',
      },
      s3ConfigDialogVisible: false,
      s3Testing: false,
      s3Syncing: false,
    };
  },
  components: { LanguageSelector },
  computed: {
    tabs() {
      return [
        { key: 'general', label: this.$t('message.general_config') },
        { key: 'editor', label: this.$t('message.editor') },
        { key: 'cli', label: this.$t('message.cli') },
        { key: 'decoder', label: this.$t('message.custom_decoder') },
        { key: 'sync', label: this.$t('message.data_sync') },
      ];
    },
    themeList() {
      return {
        light: this.$t('message.theme_light'),
        dark: this.$t('message.theme_dark'),
        system: this.$t('message.theme_auto'),
      };
    },
    cursorStyles() {
      return [
        { value: 'block', label: this.$t('message.cursor_block') },
        { value: 'underline', label: this.$t('message.cursor_underline') },
        { value: 'line', label: this.$t('message.cursor_line') },
      ];
    },
  },
  methods: {
    show() {
      this.restoreSettings();
      this.visible = true;
    },
    restoreSettings() {
      const settings = storage.getSetting();
      this.form = { ...this.form, ...settings };

      // theme
      let theme = localStorage.theme;
      if (!Object.keys(this.themeList).includes(theme)) {
        theme = 'system';
      }
      this.themeMode = theme;

      // decoders
      this.decoders = storage.getDecoders() || [];
      
      // S3 config
      this.s3Config = storage.getS3Config();
    },
    saveSettings() {
      storage.saveSettings(this.form);
      storage.saveDecoders(this.decoders);

      this.visible = false;
      this.$bus.$emit('reloadSettings', Object.assign({}, this.form));
      this.$message.success({
        message: this.$t('message.save_success'),
        duration: 1500,
      });
    },
    resetToDefault() {
      this.$confirm(this.$t('message.reset_confirm')).then(() => {
        this.form = {
          fontFamily: '',
          fontSize: 14,
          keysPageSize: 3000,
          keyIconStyle: 'compact',
          editorFontFamily: '',
          editorFontSize: 14,
          editorLineNumbers: true,
          editorFolding: true,
          editorDragDrop: true,
          editorLinks: true,
          cliFontFamily: '',
          cliFontSize: 14,
          cliCursorStyle: 'block',
        };
        this.themeMode = 'system';
        this.decoders = [];
      }).catch(() => {});
    },
    changeTheme() {
      localStorage.theme = this.themeMode;
      globalChangeTheme(this.themeMode);
    },
    bindGetAllFonts() {
      ipcRenderer.on('send-all-fonts', (event, fonts) => {
        fonts.unshift('Default Initial');
        this.allFonts = [...new Set(fonts)];
        this.loadingFonts = false;
      });
    },
    getAllFonts() {
      if (this.allFonts.length === 0) {
        this.loadingFonts = true;
        ipcRenderer.send('get-all-fonts');
      }
    },
    // Decoder methods
    showAddDecoderDialog() {
      this.decoderForm = {
        name: '',
        decoderPath: '',
        decoderArgs: [],
        encoderPath: '',
        encoderArgs: [],
        autoDecodeEncode: true,
      };
      this.decoderFormTab = 'decoder';
      this.editingDecoderIndex = -1;
      this.testInput = '';
      this.testOutput = '';
      this.testError = '';
      this.decoderDialogVisible = true;
    },
    editDecoder(row, index) {
      this.decoderForm = JSON.parse(JSON.stringify(row));
      // Ensure arrays exist
      if (!this.decoderForm.decoderArgs) this.decoderForm.decoderArgs = [];
      if (!this.decoderForm.encoderArgs) this.decoderForm.encoderArgs = [];
      this.decoderFormTab = 'decoder';
      this.editingDecoderIndex = index;
      this.testInput = '';
      this.testOutput = '';
      this.testError = '';
      this.decoderDialogVisible = true;
    },
    copyDecoder(row) {
      const newDecoder = JSON.parse(JSON.stringify(row));
      newDecoder.name = `${row.name} (${this.$t('message.copy')})`;
      this.decoders.push(newDecoder);
      this.$message.success(this.$t('message.copy_success'));
    },
    deleteDecoder(index) {
      this.$confirm(this.$t('message.confirm_delete')).then(() => {
        this.decoders.splice(index, 1);
      }).catch(() => {});
    },
    saveDecoder() {
      if (!this.decoderForm.name) {
        this.$message.warning(this.$t('message.decoder_name_required'));
        return;
      }
      if (!this.decoderForm.decoderPath) {
        this.$message.warning(this.$t('message.decoder_path_required'));
        return;
      }

      const decoder = {
        ...this.decoderForm,
        enabled: true,
        command: `${this.decoderForm.decoderPath} ${this.decoderForm.decoderArgs.join(' ')}`.trim(),
      };

      if (this.editingDecoderIndex >= 0) {
        this.$set(this.decoders, this.editingDecoderIndex, decoder);
      } else {
        this.decoders.push(decoder);
      }

      this.decoderDialogVisible = false;
    },
    addDecoderArg() {
      const key = this.decoderFormTab + 'Args';
      this.decoderForm[key].push('');
    },
    removeDecoderArg(index) {
      const key = this.decoderFormTab + 'Args';
      this.decoderForm[key].splice(index, 1);
    },
    selectDecoderPath() {
      const dialog = remote.dialog;
      dialog.showOpenDialog({
        properties: ['openFile'],
      }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
          const key = this.decoderFormTab + 'Path';
          this.decoderForm[key] = result.filePaths[0];
        }
      });
    },
    showDecoderHelp() {
      this.$alert(this.$t('message.decoder_help_content'), this.$t('message.help'), {
        confirmButtonText: this.$t('el.messagebox.confirm'),
        dangerouslyUseHTMLString: true,
      });
    },
    // Test decoder
    testDecoder(decoder) {
      this.decoderForm = JSON.parse(JSON.stringify(decoder));
      if (!this.decoderForm.decoderArgs) this.decoderForm.decoderArgs = [];
      if (!this.decoderForm.encoderArgs) this.decoderForm.encoderArgs = [];
      this.decoderFormTab = 'decoder';
      this.editingDecoderIndex = this.decoders.indexOf(decoder);
      this.testInput = '';
      this.testOutput = '';
      this.testError = '';
      this.decoderDialogVisible = true;
    },
    runDecoderTest() {
      const path = this.decoderForm[this.decoderFormTab + 'Path'];
      const args = this.decoderForm[this.decoderFormTab + 'Args'] || [];
      
      if (!path) {
        this.$message.warning(this.$t('message.decoder_path_required'));
        return;
      }
      
      this.testing = true;
      this.testOutput = '';
      this.testError = '';
      
      try {
        const child = spawn(path, args.filter(a => a), {
          shell: true,
          timeout: 10000,
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          this.testing = false;
          if (code === 0) {
            this.testOutput = stdout || this.$t('message.test_success');
          } else {
            this.testError = stderr || `Exit code: ${code}`;
          }
        });
        
        child.on('error', (err) => {
          this.testing = false;
          this.testError = err.message;
        });
        
        // Write test input
        if (this.testInput) {
          child.stdin.write(this.testInput);
        }
        child.stdin.end();
        
      } catch (err) {
        this.testing = false;
        this.testError = err.message;
      }
    },
    onDecoderStatusChange() {
      // Auto save when status changes
      storage.saveDecoders(this.decoders);
    },
    // Batch operations
    handleDecoderCommand(command) {
      switch (command) {
        case 'import':
          this.importDecoderDialogVisible = true;
          break;
        case 'export':
          this.exportDecoders();
          break;
        case 'enableAll':
          this.decoders.forEach(d => d.enabled = true);
          storage.saveDecoders(this.decoders);
          break;
        case 'disableAll':
          this.decoders.forEach(d => d.enabled = false);
          storage.saveDecoders(this.decoders);
          break;
      }
    },
    exportDecoders() {
      const data = JSON.stringify(this.decoders, null, 2);
      this.$util.createAndDownloadFile('decoders.json', data);
      this.$message.success(this.$t('message.export_success'));
    },
    loadDecoderFile(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.importDecoderContent = event.target.result;
      };
      reader.readAsText(file.raw);
    },
    importDecoders() {
      try {
        const imported = JSON.parse(this.importDecoderContent);
        if (!Array.isArray(imported)) {
          throw new Error('Invalid format');
        }
        // Merge with existing decoders
        imported.forEach(decoder => {
          if (decoder.name && decoder.decoderPath) {
            // Check if already exists
            const exists = this.decoders.find(d => d.name === decoder.name);
            if (!exists) {
              this.decoders.push(decoder);
            }
          }
        });
        this.importDecoderDialogVisible = false;
        this.importDecoderContent = '';
        if (this.$refs.decoderUpload) {
          this.$refs.decoderUpload.clearFiles();
        }
        this.$message.success(this.$t('message.import_success'));
      } catch (err) {
        this.$message.error(this.$t('message.import_failed') + ': ' + err.message);
      }
    },
    // Data Sync Methods
    getAllSyncData() {
      return {
        version: 2,
        timestamp: new Date().toISOString(),
        settings: storage.getSetting(),
        theme: localStorage.theme || 'system',
        connections: storage.getConnections(true),
        groups: storage.getGroups(true),
        decoders: storage.getDecoders() || [],
        s3Config: storage.getS3Config(),
      };
    },
    applyAllSyncData(data) {
      if (!data || !data.version) {
        throw new Error('Invalid sync data format');
      }
      
      // Apply settings
      if (data.settings) {
        storage.saveSettings(data.settings);
        this.form = { ...this.form, ...data.settings };
      }
      
      // Apply theme
      if (data.theme) {
        localStorage.theme = data.theme;
        this.themeMode = data.theme;
        globalChangeTheme(data.theme);
      }
      
      // Apply groups
      if (data.groups && Array.isArray(data.groups)) {
        const groups = {};
        for (const group of data.groups) {
          groups[group.key] = group;
        }
        storage.setGroups(groups);
      }
      
      // Apply connections
      if (data.connections && Array.isArray(data.connections)) {
        storage.setConnections({});
        for (const connection of data.connections) {
          storage.addConnection(connection);
        }
      }
      
      // Apply decoders
      if (data.decoders && Array.isArray(data.decoders)) {
        storage.saveDecoders(data.decoders);
        this.decoders = data.decoders;
      }
      
      // Apply S3 config (but don't overwrite credentials if empty)
      if (data.s3Config) {
        const currentS3 = storage.getS3Config();
        const newS3 = {
          ...data.s3Config,
          accessKeyId: data.s3Config.accessKeyId || currentS3.accessKeyId,
          secretAccessKey: data.s3Config.secretAccessKey || currentS3.secretAccessKey,
        };
        storage.saveS3Config(newS3);
        this.s3Config = newS3;
      }
    },
    showImportDataDialog() {
      this.importDataDialogVisible = true;
      this.importDataContent = '';
    },
    loadDataFile(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.importDataContent = event.target.result;
      };
      reader.readAsText(file.raw);
    },
    importAllData() {
      try {
        const data = JSON.parse(this.importDataContent);
        this.applyAllSyncData(data);
        
        this.importDataDialogVisible = false;
        this.importDataContent = '';
        if (this.$refs.dataUpload) {
          this.$refs.dataUpload.clearFiles();
        }
        
        // Refresh connections
        this.$bus.$emit('closeConnection');
        this.$bus.$emit('refreshConnections');
        
        this.$message.success(this.$t('message.import_success'));
      } catch (err) {
        this.$message.error(this.$t('message.import_failed') + ': ' + err.message);
      }
    },
    exportAllData() {
      const data = this.getAllSyncData();
      // Remove sensitive data from export
      const exportData = {
        ...data,
        s3Config: {
          ...data.s3Config,
          accessKeyId: '',
          secretAccessKey: '',
        },
      };
      this.$util.createAndDownloadFile('ardm-backup.json', JSON.stringify(exportData, null, 2));
      this.$message.success(this.$t('message.export_success'));
    },
    // S3 Sync Methods
    createS3Service() {
      return new S3SyncService(this.s3Config);
    },
    validateS3Config() {
      const { endpoint, accessKeyId, secretAccessKey, bucket } = this.s3Config;
      const validations = [
        [!endpoint, 's3_endpoint_required'],
        [!accessKeyId, 's3_accesskey_required'],
        [!secretAccessKey, 's3_secretkey_required'],
        [!bucket, 's3_bucket_required'],
      ];

      for (const [condition, messageKey] of validations) {
        if (condition) {
          this.$message.warning(this.$t(`message.${messageKey}`));
          return false;
        }
      }
      return true;
    },
    saveS3Config() {
      storage.saveS3Config(this.s3Config);
      this.$message.success(this.$t('message.save_success'));
    },
    formatS3Error(error) {
      if (!error.isS3Error) {
        return error.message || String(error);
      }
      
      // Map S3 error codes to i18n keys
      const errorMap = {
        'SignatureDoesNotMatch': 's3_error_signature',
        'InvalidAccessKeyId': 's3_error_accesskey',
        'AccessDenied': 's3_error_access_denied',
        'NoSuchBucket': 's3_error_no_bucket',
        'NoSuchKey': 's3_error_no_key',
        'RequestTimeout': 's3_error_timeout',
        'NetworkError': 's3_error_network',
        'InvalidBucketName': 's3_error_invalid_bucket',
      };
      
      const i18nKey = errorMap[error.code];
      if (i18nKey) {
        return this.$t(`message.${i18nKey}`);
      }
      
      // Fallback: show HTTP status code if available
      if (error.statusCode) {
        return `HTTP ${error.statusCode}: ${error.code || this.$t('message.s3_error_unknown')}`;
      }
      
      return error.code || this.$t('message.s3_error_unknown');
    },
    async testS3Connection() {
      if (!this.validateS3Config()) return;

      this.s3Testing = true;
      try {
        const result = await this.createS3Service().testConnection();
        if (result.success) {
          this.$message.success(this.$t('message.s3_connection_success'));
        } else {
          this.$message.error(`${this.$t('message.s3_connection_failed')}: ${this.formatS3Error(result.error)}`);
        }
      } catch (error) {
        this.$message.error(`${this.$t('message.s3_connection_failed')}: ${this.formatS3Error(error)}`);
      } finally {
        this.s3Testing = false;
      }
    },
    async s3Upload() {
      if (!this.validateS3Config()) return;

      try {
        await this.$confirm(this.$t('message.s3_upload_confirm'));
      } catch {
        return;
      }

      this.s3Syncing = true;
      try {
        // Save current settings first
        storage.saveSettings(this.form);
        storage.saveDecoders(this.decoders);
        storage.saveS3Config(this.s3Config);
        
        await this.createS3Service().upload();
        this.$message.success(this.$t('message.s3_upload_success'));
      } catch (error) {
        this.$message.error(`${this.$t('message.s3_upload_failed')}: ${this.formatS3Error(error)}`);
      } finally {
        this.s3Syncing = false;
      }
    },
    async s3Download() {
      if (!this.validateS3Config()) return;

      try {
        await this.$confirm(this.$t('message.s3_download_confirm'));
      } catch {
        return;
      }

      this.s3Syncing = true;
      try {
        const s3Service = this.createS3Service();
        const syncData = await s3Service.download();
        s3Service.applyDownloadedData(syncData);

        // Restore settings to form
        this.restoreSettings();
        
        // Refresh connections
        this.$bus.$emit('closeConnection');
        this.$bus.$emit('refreshConnections');

        this.$message.success(this.$t('message.s3_download_success'));
      } catch (error) {
        this.$message.error(`${this.$t('message.s3_download_failed')}: ${this.formatS3Error(error)}`);
      } finally {
        this.s3Syncing = false;
      }
    },
  },
  mounted() {
    this.bindGetAllFonts();
  },
};
</script>

<style type="text/css">
/* Preferences Dialog */
.pref-dialog {
  width: 780px !important;
  max-width: 90vw;
  margin-top: 5vh !important;
  border-radius: 16px !important;
  overflow: visible;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1) !important;
  min-width: 600px;
  min-height: 400px;
}
.pref-dialog .el-dialog {
  border-radius: 16px !important;
  resize: both;
  overflow: auto;
  min-width: 600px;
  min-height: 450px;
  max-width: 95vw;
  max-height: 90vh;
}
.pref-dialog .el-dialog__header {
  display: none;
}
.pref-dialog .el-dialog__body {
  padding: 0;
  border-radius: 16px;
  height: 100%;
}
.dark-mode .pref-dialog {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 8px 25px rgba(0, 0, 0, 0.3) !important;
}

/* Resize Handle */
.pref-dialog .el-dialog::-webkit-resizer {
  background: linear-gradient(135deg, transparent 50%, #ddd 50%, #ddd 60%, transparent 60%, transparent 70%, #ddd 70%, #ddd 80%, transparent 80%);
  border-radius: 0 0 16px 0;
}
.dark-mode .pref-dialog .el-dialog::-webkit-resizer {
  background: linear-gradient(135deg, transparent 50%, #4a5a64 50%, #4a5a64 60%, transparent 60%, transparent 70%, #4a5a64 70%, #4a5a64 80%, transparent 80%);
}

.pref-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 450px;
  border-radius: 16px;
  overflow: hidden;
}

.pref-header {
  padding: 20px 28px;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
  background: linear-gradient(135deg, #fff 0%, #f9fafc 100%);
  border-radius: 16px 16px 0 0;
}
.dark-mode .pref-header {
  border-color: #3d4a52;
  background: linear-gradient(135deg, #2d3a40 0%, #252f35 100%);
}

.pref-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  background: #fff;
}
.dark-mode .pref-body {
  background: #1e282d;
}

/* Left Navigation */
.pref-nav {
  width: 140px;
  padding: 20px 0;
  border-right: 1px solid #ebeef5;
  flex-shrink: 0;
  background: #f9fafc;
}
.dark-mode .pref-nav {
  border-color: #3d4a52;
  background: #242e34;
}

.pref-nav-item {
  padding: 14px 24px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  border-left: 3px solid transparent;
  transition: all 0.25s ease;
  margin: 2px 0;
}
.dark-mode .pref-nav-item {
  color: #b0bec5;
}
.pref-nav-item:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.05);
}
.pref-nav-item.active {
  color: #f56c6c;
  border-left-color: #f56c6c;
  font-weight: 500;
  background: rgba(245, 108, 108, 0.08);
}
.dark-mode .pref-nav-item:hover {
  background: rgba(245, 108, 108, 0.1);
}
.dark-mode .pref-nav-item.active {
  background: rgba(245, 108, 108, 0.15);
}

/* Right Content */
.pref-content {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
  background: #fff;
}
.dark-mode .pref-content {
  background: #1e282d;
}

.pref-panel {
  min-height: 100%;
}

/* Form Items */
.pref-form-item {
  margin-bottom: 20px;
}

.pref-form-row {
  display: flex;
  gap: 20px;
}
.pref-form-row .flex-1 {
  flex: 1;
}

.pref-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}
.dark-mode .pref-label {
  color: #b0bec5;
}
.pref-label i {
  margin-left: 4px;
  color: #909399;
  cursor: help;
}

/* Button Group */
.pref-btn-group {
  display: inline-flex;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}
.dark-mode .pref-btn-group {
  border-color: #4a5a64;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
.pref-btn {
  padding: 10px 18px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: all 0.25s ease;
}
.dark-mode .pref-btn {
  background: #2d3a40;
  color: #b0bec5;
}
.pref-btn:not(:last-child) {
  border-right: 1px solid #e4e7ed;
}
.dark-mode .pref-btn:not(:last-child) {
  border-color: #4a5a64;
}
.pref-btn:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.05);
}
.pref-btn.active {
  background: linear-gradient(135deg, #f56c6c 0%, #e74c3c 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
}

/* Input Styles */
.pref-select {
  width: 100%;
  max-width: 300px;
}
.pref-input {
  width: 100%;
  max-width: 300px;
}
.pref-number-input {
  width: 140px;
}

/* Checkbox Group */
.pref-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pref-checkbox-group .el-checkbox {
  margin: 0;
}

/* Decoder Tab */
.pref-decoder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.pref-decoder-actions {
  display: flex;
  gap: 8px;
}
.pref-decoder-table {
  width: 100%;
}
.pref-decoder-table .decoder-disabled {
  color: #c0c4cc;
}
.pref-decoder-table .decoder-command {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}
.pref-decoder-table .danger-text {
  color: #f56c6c;
}
.pref-decoder-table .danger-text:hover {
  color: #f78989;
}

/* Footer */
.pref-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 28px;
  border-top: 1px solid #ebeef5;
  background: linear-gradient(135deg, #f9fafc 0%, #fff 100%);
  border-radius: 0 0 16px 16px;
}
.dark-mode .pref-footer {
  border-color: #3d4a52;
  background: linear-gradient(135deg, #252f35 0%, #2d3a40 100%);
}
.pref-footer-right {
  display: flex;
  gap: 12px;
}
.pref-footer .el-button {
  border-radius: 8px;
  padding: 10px 20px;
}
.pref-footer .el-button--primary {
  background: linear-gradient(135deg, #f56c6c 0%, #e74c3c 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
}
.pref-footer .el-button--primary:hover {
  background: linear-gradient(135deg, #f78989 0%, #e74c3c 100%);
  box-shadow: 0 6px 16px rgba(245, 108, 108, 0.4);
}

/* Decoder Dialog */
.decoder-dialog .el-dialog {
  border-radius: 12px !important;
}
.decoder-dialog .el-dialog__header {
  border-radius: 12px 12px 0 0;
}
.decoder-dialog .el-dialog__body {
  padding-top: 10px;
}
.decoder-tabs {
  margin-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}
.dark-mode .decoder-tabs {
  border-color: #3d4a52;
}
.decoder-tab {
  display: inline-block;
  padding: 10px 18px;
  cursor: pointer;
  color: #606266;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.25s ease;
  border-radius: 8px 8px 0 0;
}
.dark-mode .decoder-tab {
  color: #b0bec5;
}
.decoder-tab:hover {
  background: rgba(245, 108, 108, 0.05);
}
.decoder-tab.active {
  color: #f56c6c;
  border-bottom-color: #f56c6c;
  background: rgba(245, 108, 108, 0.08);
}
.decoder-path-input {
  display: flex;
  gap: 8px;
}
.decoder-path-input .el-input {
  flex: 1;
}
.decoder-arg-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.decoder-arg-row .el-input {
  flex: 1;
}
.decoder-add-arg {
  width: 100%;
}
.decoder-test-actions {
  margin-top: 8px;
}
.decoder-test-output,
.decoder-test-error {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
}
.decoder-test-output {
  background: linear-gradient(135deg, #f0f9eb 0%, #e8f8e0 100%);
  border: 1px solid #d4edcc;
}
.decoder-test-output label {
  color: #67c23a;
  font-weight: 600;
}
.decoder-test-output pre {
  margin: 8px 0 0;
  color: #52a82f;
  white-space: pre-wrap;
  word-break: break-all;
}
.decoder-test-error {
  background: linear-gradient(135deg, #fef0f0 0%, #ffe6e6 100%);
  border: 1px solid #fdd;
}
.decoder-test-error label {
  color: #f56c6c;
  font-weight: 600;
}
.decoder-test-error pre {
  margin: 8px 0 0;
  color: #e74c3c;
  white-space: pre-wrap;
  word-break: break-all;
}
.dark-mode .decoder-test-output {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.1) 0%, rgba(103, 194, 58, 0.15) 100%);
  border-color: rgba(103, 194, 58, 0.3);
}
.dark-mode .decoder-test-error {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.1) 0%, rgba(245, 108, 108, 0.15) 100%);
  border-color: rgba(245, 108, 108, 0.3);
}

/* Data Sync Tab */
.sync-section {
  background: linear-gradient(135deg, #f9fafc 0%, #f5f7fa 100%);
  border: 1px solid #e8ecf1;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
}
.sync-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.dark-mode .sync-section {
  background: linear-gradient(135deg, #2d3a40 0%, #28343a 100%);
  border-color: #3d4a52;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.dark-mode .sync-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.sync-section-title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.dark-mode .sync-section-title {
  color: #e8e8e8;
}
.sync-section-desc {
  margin: 0 0 18px;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}
.sync-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.sync-actions .el-button {
  border-radius: 8px;
}
.s3-config-form {
  margin-bottom: 18px;
}
.s3-config-form .el-form-item {
  margin-bottom: 14px;
}
.s3-config-form .el-input__inner {
  border-radius: 8px;
}
</style>
