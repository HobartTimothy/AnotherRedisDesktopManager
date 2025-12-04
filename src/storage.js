import utils from './util';

const { randomString } = utils;

export default {
  // ==================== Connection Groups ====================
  getGroups(returnList = false) {
    let groups = localStorage.connectionGroups || '{}';
    groups = JSON.parse(groups);

    if (returnList) {
      groups = Object.keys(groups).map(key => groups[key]);
      this.sortGroups(groups);
    }

    return groups;
  },
  getRootGroups() {
    const groups = this.getGroups(true);
    return groups.filter(g => !g.parentKey);
  },
  getChildGroups(parentKey) {
    const groups = this.getGroups(true);
    return groups.filter(g => g.parentKey === parentKey);
  },
  getGroupDepth(groupKey) {
    const groups = this.getGroups();
    let depth = 1;
    let current = groups[groupKey];
    while (current && current.parentKey) {
      depth++;
      current = groups[current.parentKey];
    }
    return depth;
  },
  canAddSubGroup(parentKey) {
    // Max depth is 3
    return this.getGroupDepth(parentKey) < 3;
  },
  setGroups(groups) {
    localStorage.connectionGroups = JSON.stringify(groups);
  },
  addGroup(group) {
    const groups = this.getGroups();
    const key = `group_${new Date().getTime()}_${randomString(5)}`;

    // calculate order
    const maxOrder = Math.max(0, ...Object.values(groups).map(item => (!isNaN(item.order) ? item.order : 0)));
    group.order = maxOrder + 1;
    group.key = key;

    groups[key] = group;
    this.setGroups(groups);

    return group;
  },
  editGroup(group) {
    const groups = this.getGroups();
    if (groups[group.key]) {
      groups[group.key] = { ...groups[group.key], ...group };
      this.setGroups(groups);
    }
  },
  deleteGroup(groupKey) {
    const groups = this.getGroups();
    
    // Recursively delete child groups
    const deleteRecursive = (key) => {
      // Find and delete children first
      for (const k in groups) {
        if (groups[k].parentKey === key) {
          deleteRecursive(k);
        }
      }
      delete groups[key];
    };
    
    deleteRecursive(groupKey);
    this.setGroups(groups);

    // move connections in deleted groups to ungrouped
    const connections = this.getConnections();
    for (const key in connections) {
      if (!groups[connections[key].groupKey]) {
        connections[key].groupKey = '';
      }
    }
    this.setConnections(connections);
  },
  sortGroups(groups) {
    groups.sort((a, b) => {
      if (!isNaN(a.order) && !isNaN(b.order)) {
        return parseInt(a.order) <= parseInt(b.order) ? -1 : 1;
      }
      return a.key < b.key ? -1 : 1;
    });
  },
  reOrderGroups(groups = []) {
    const newGroups = {};
    for (const index in groups) {
      const group = groups[index];
      group.order = parseInt(index);
      newGroups[group.key] = group;
    }
    this.setGroups(newGroups);
    return newGroups;
  },
  moveConnectionToGroup(connection, groupKey) {
    const connections = this.getConnections();
    const key = this.getConnectionKey(connection);
    if (connections[key]) {
      connections[key].groupKey = groupKey || '';
      this.setConnections(connections);
    }
  },
  getConnectionsByGroup(groupKey = '') {
    const connections = this.getConnections(true);
    return connections.filter(conn => (conn.groupKey || '') === groupKey);
  },
  // ==================== Connection Groups End ====================

  // ==================== S3 Sync Config ====================
  getS3Config() {
    let config = localStorage.getItem('s3Config');
    return config ? JSON.parse(config) : {
      syncMode: 'manual',
      endpoint: '',
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
      bucket: '',
      parallelism: 4,
      prefix: 'ardm-sync/',
    };
  },
  saveS3Config(config) {
    return localStorage.setItem('s3Config', JSON.stringify(config));
  },
  // ==================== S3 Sync Config End ====================

  // ==================== Custom Decoders ====================
  getDecoders() {
    let decoders = localStorage.getItem('customDecoders');
    return decoders ? JSON.parse(decoders) : [];
  },
  saveDecoders(decoders) {
    return localStorage.setItem('customDecoders', JSON.stringify(decoders));
  },
  // ==================== Custom Decoders End ====================

  getSetting(key) {
    let settings = localStorage.getItem('settings');
    settings = settings ? JSON.parse(settings) : {};

    return key ? settings[key] : settings;
  },
  saveSettings(settings) {
    settings = JSON.stringify(settings);
    return localStorage.setItem('settings', settings);
  },
  getFontFamily() {
    let fontFamily = this.getSetting('fontFamily');

    // set to default font-family
    if (
      !fontFamily || !fontFamily.length
      || fontFamily.toString() === 'Default Initial'
    ) {
      fontFamily = ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica',
        'Arial', 'sans-serif', 'Microsoft YaHei', 'Apple Color Emoji', 'Segoe UI Emoji'];
    }

    return fontFamily.map(line => `"${line}"`).join(',');
  },
  getCustomFormatter(name = '') {
    let formatters = localStorage.getItem('customFormatters');
    formatters = formatters ? JSON.parse(formatters) : [];

    if (!name) {
      return formatters;
    }

    for (const line of formatters) {
      if (line.name === name) {
        return line;
      }
    }
  },
  saveCustomFormatters(formatters = []) {
    return localStorage.setItem('customFormatters', JSON.stringify(formatters));
  },
  addConnection(connection) {
    this.editConnectionByKey(connection, '');
  },
  getConnections(returnList = false) {
    let connections = localStorage.connections || '{}';

    connections = JSON.parse(connections);

    if (returnList) {
      connections = Object.keys(connections).map(key => connections[key]);
      this.sortConnections(connections);
    }

    return connections;
  },
  editConnectionByKey(connection, oldKey = '') {
    oldKey = connection.key || oldKey;

    const connections = this.getConnections();
    delete connections[oldKey];

    this.updateConnectionName(connection, connections);
    const newKey = this.getConnectionKey(connection, true);
    connection.key = newKey;

    // new added has no order, add it. do not add when edit mode
    if (!oldKey && isNaN(connection.order)) {
      // connection.order = Object.keys(connections).length;
      const maxOrder = Math.max(...Object.values(connections).map(item => (!isNaN(item.order) ? item.order : 0)));
      connection.order = (maxOrder > 0 ? maxOrder : 0) + 1;
    }

    connections[newKey] = connection;
    this.setConnections(connections);
  },
  editConnectionItem(connection, items = {}) {
    const key = this.getConnectionKey(connection);
    const connections = this.getConnections();

    if (!connections[key]) {
      return;
    }

    Object.assign(connection, items);
    Object.assign(connections[key], items);
    this.setConnections(connections);
  },
  updateConnectionName(connection, connections) {
    let name = this.getConnectionName(connection);

    for (const key in connections) {
      // if 'name' same with others, add random suffix
      if (this.getConnectionName(connections[key]) == name) {
        name += ` (${randomString(3)})`;
        break;
      }
    }

    connection.name = name;
  },
  getConnectionName(connection) {
    return connection.name || `${connection.host}@${connection.port}`;
  },
  setConnections(connections) {
    localStorage.connections = JSON.stringify(connections);
  },
  deleteConnection(connection) {
    const connections = this.getConnections();
    const key = this.getConnectionKey(connection);

    delete connections[key];

    this.hookAfterDelConnection(connection);
    this.setConnections(connections);
  },
  getConnectionKey(connection, forceUnique = false) {
    if (Object.keys(connection).length === 0) {
      return '';
    }

    if (connection.key) {
      return connection.key;
    }

    if (forceUnique) {
      return `${new Date().getTime()}_${randomString(5)}`;
    }

    return connection.host + connection.port + connection.name;
  },
  sortConnections(connections) {
    connections.sort((a, b) => {
      // drag ordered
      if (!isNaN(a.order) && !isNaN(b.order)) {
        return parseInt(a.order) <= parseInt(b.order) ? -1 : 1;
      }

      // no ordered, by key
      if (a.key && b.key) {
        return a.key < b.key ? -1 : 1;
      }

      return a.key ? 1 : (b.key ? -1 : 0);
    });
  },
  reOrderAndStore(connections = []) {
    const newConnections = {};

    for (const index in connections) {
      const connection = connections[index];
      connection.order = parseInt(index);
      newConnections[this.getConnectionKey(connection, true)] = connection;
    }

    this.setConnections(newConnections);

    return newConnections;
  },
  getStorageKeyMap(type) {
    const typeMap = {
      cli_tip: 'cliTips',
      last_db: 'lastSelectedDb',
      custom_db: 'customDbName',
      search_tip: 'searchTips',
    };

    return type ? typeMap[type] : typeMap;
  },
  initStorageKey(prefix, connectionName) {
    return `${prefix}_${connectionName}`;
  },
  getStorageKeyByName(type = 'cli_tip', connectionName = '') {
    return this.initStorageKey(this.getStorageKeyMap(type), connectionName);
  },
  hookAfterDelConnection(connection) {
    const connectionName = this.getConnectionName(connection);
    const types = Object.keys(this.getStorageKeyMap());

    const willRemovedKeys = [];

    for (const type of types) {
      willRemovedKeys.push(this.getStorageKeyByName(type, connectionName));
    }

    willRemovedKeys.forEach(k => localStorage.removeItem(k));
  },
};
