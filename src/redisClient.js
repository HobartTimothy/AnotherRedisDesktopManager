/**
 * Redis 客户端连接管理模块
 * 
 * 该模块负责创建和管理 Redis 连接，支持以下功能：
 * - 单机模式（Standalone）
 * - 哨兵模式（Sentinel）
 * - 集群模式（Cluster）
 * - SSH 隧道连接
 * - TLS/SSL 加密连接
 * - 命令日志记录和性能监控
 * - 只读模式支持
 * 
 * @module redisClient
 */

import Redis from 'ioredis';
import { createTunnel } from 'tunnel-ssh';
import vue from '@/main.js';
import { app as remoteApp } from '@electron/remote';
import { writeCMD } from '@/commands.js';

const fs = require('fs');

// 保存原始的 sendCommand 方法，用于后续调用
const { sendCommand } = Redis.prototype;

/**
 * 重写 Redis 的 sendCommand 方法，用于：
 * 1. 记录命令执行日志
 * 2. 监控命令执行时间
 * 3. 实现只读模式限制
 */
Redis.prototype.sendCommand = function (...options) {
  const command = options[0];

  // 只读模式检查：如果连接设置为只读模式且当前命令为写命令，则拒绝执行
  if (this.options.connectionReadOnly && writeCMD[command.name.toUpperCase()]) {
    command.reject(new Error('You are in readonly mode! Unable to execute write command!'));
    return command.promise;
  }

  // 不记录日志模式：某些内部命令不需要记录日志（如心跳检测等）
  if (this.withoutLogging === true) {
    // 标记在下次调用时失效（仅对当前调用有效）
    this.withoutLogging = false;
    return sendCommand.apply(this, options);
  }

  // 记录命令开始执行的时间
  const start = performance.now();
  const response = sendCommand.apply(this, options);
  // 计算命令执行耗时
  const cost = performance.now() - start;

  // 构造命令日志记录对象
  const record = {
    time: new Date(),                    // 执行时间
    connectionName: this.options.connectionName,  // 连接名称
    command,                             // 命令对象
    cost,                                // 执行耗时（毫秒）
  };
  // 通过事件总线发送命令日志
  vue.$bus.$emit('commandLog', record);

  return response;
};

/**
 * 修复 ioredis 库中 hgetall 命令的返回值格式问题
 * 
 * ioredis 默认会将 hgetall 的结果转换为对象，但键值会被 toString() 转换
 * 这里将结果转换为数组格式：[[key1, value1], [key2, value2], ...]
 * 
 * @param {Array} result - Redis 返回的原始数组结果
 * @returns {Array} 转换后的键值对数组
 */
Redis.Command.setReplyTransformer('hgetall', (result) => {
  const arr = [];
  // Redis 返回的是扁平数组 [key1, value1, key2, value2, ...]
  // 需要转换为嵌套数组 [[key1, value1], [key2, value2], ...]
  for (let i = 0; i < result.length; i += 2) {
    arr.push([result[i], result[i + 1]]);
  }

  return arr;
});


export default {
  /**
   * 创建 Redis 连接
   * 
   * 支持创建以下类型的连接：
   * - 单机模式（Standalone）
   * - 哨兵模式（Sentinel）
   * - 集群模式（Cluster）
   * 
   * @param {string} host - Redis 服务器地址
   * @param {number} port - Redis 服务器端口
   * @param {string} auth - Redis 认证密码
   * @param {Object} config - 连接配置对象
   * @param {boolean} promise - 是否返回 Promise 包装的客户端（默认：true）
   * @param {boolean} forceStandalone - 是否强制使用单机模式（默认：false）
   * @param {boolean} removeDb - 是否移除数据库选择（用于哨兵连接，默认：false）
   * @returns {Promise<Redis>|Redis} Redis 客户端实例
   */
  createConnection(host, port, auth, config, promise = true, forceStandalone = false, removeDb = false) {
    // 获取 Redis 连接选项
    const options = this.getRedisOptions(host, port, auth, config);
    let client = null;

    // 如果指定移除数据库选择（哨兵模式下不需要选择数据库）
    if (removeDb) {
      delete options.db;
    }

    // 强制使用单机模式（通常用于 SSH 隧道场景）
    if (forceStandalone) {
      client = new Redis(options);
    }

    // 哨兵模式：通过哨兵节点发现主节点
    else if (config.sentinelOptions) {
      const sentinelOptions = this.getSentinelOptions(host, port, auth, config);
      client = new Redis(sentinelOptions);
    }

    // 集群模式：连接到 Redis 集群
    else if (config.cluster) {
      const clusterOptions = this.getClusterOptions(options, config.natMap ? config.natMap : {});
      client = new Redis.Cluster([{ port, host }], clusterOptions);
    }

    // 单机模式：直接连接到 Redis 服务器
    else {
      client = new Redis(options);
    }

    // 如果需要返回 Promise 包装的客户端
    if (promise) {
      return new Promise((resolve, reject) => {
        resolve(client);
      });
    }

    return client;
  },

  /**
   * 创建通过 SSH 隧道的 Redis 连接
   * 
   * 该方法首先建立 SSH 隧道，然后通过隧道创建 Redis 连接
   * 支持单机、哨兵、集群三种模式通过 SSH 隧道连接
   * 
   * @param {Object} sshOptions - SSH 连接选项
   * @param {string} host - Redis 服务器地址（在 SSH 服务器内）
   * @param {number} port - Redis 服务器端口（在 SSH 服务器内）
   * @param {string} auth - Redis 认证密码
   * @param {Object} config - Redis 连接配置对象
   * @returns {Promise<Redis>} Promise 包装的 Redis 客户端实例
   */
  createSSHConnection(sshOptions, host, port, auth, config) {
    // 获取 SSH 隧道配置选项
    const sshOptionsDict = this.getSSHOptions(sshOptions, host, port);

    // 深拷贝配置对象，避免在后续处理中被修改
    const configRaw = JSON.parse(JSON.stringify(config));
    const sshConfigRaw = JSON.parse(JSON.stringify(sshOptionsDict));

    const sshPromise = new Promise((resolve, reject) => {
      // 创建 SSH 隧道
      createTunnel(...Object.values(sshOptionsDict)).then(([server, connection]) => {
        // 获取本地隧道监听地址
        const listenAddress = server.address();

        // 哨兵模式：通过 SSH 隧道连接哨兵，然后获取主节点地址
        if (configRaw.sentinelOptions) {
          // 创建连接到哨兵节点的客户端（移除数据库选择）
          const client = this.createConnection(listenAddress.address, listenAddress.port, auth, configRaw, false, true, true);

          client.on('ready', () => {
            // 通过哨兵获取主节点地址
            client.call('sentinel', 'get-master-addr-by-name', configRaw.sentinelOptions.masterName).then((reply) => {
              if (!reply) {
                return reject(new Error(`Master name "${configRaw.sentinelOptions.masterName}" not exists!`));
              }

              // 为主节点创建 SSH 隧道并连接
              this.createClusterSSHTunnels(sshConfigRaw, [{ host: reply[0], port: reply[1] }]).then((tunnels) => {
                const sentinelClient = this.createConnection(
                  tunnels[0].localHost, tunnels[0].localPort, configRaw.sentinelOptions.nodePassword, configRaw, false, true,
                );

                return resolve(sentinelClient);
              });
            }).catch((e) => { reject(e); }); // 哨兵命令执行失败
          });

          client.on('error', (e) => { reject(e); });
        }

        // SSH 集群模式：通过 SSH 隧道连接 Redis 集群
        else if (configRaw.cluster) {
          const client = this.createConnection(listenAddress.address, listenAddress.port, auth, configRaw, false, true);

          client.on('ready', () => {
            // 获取所有集群节点信息
            client.call('cluster', 'nodes').then((reply) => {
              const nodes = this.getClusterNodes(reply);

              // 为每个集群节点创建 SSH 隧道
              this.createClusterSSHTunnels(sshConfigRaw, nodes).then((tunnels) => {
                // 初始化 NAT 映射表，用于将远程地址映射到本地隧道地址
                configRaw.natMap = this.initNatMap(tunnels);

                // 选择第一个隧道作为集群连接的入口点
                const clusterClient = this.createConnection(tunnels[0].localHost, tunnels[0].localPort, auth, configRaw, false);

                resolve(clusterClient);
              });
            }).catch((e) => { reject(e); });
          });

          client.on('error', (e) => { reject(e); });
        }

        // SSH 单机模式：通过 SSH 隧道连接单机 Redis
        else {
          const client = this.createConnection(listenAddress.address, listenAddress.port, auth, configRaw, false);
          return resolve(client);
        }

      // SSH 隧道创建失败
      }).catch((e) => {
        // vue.$message.error('SSH errror: ' + e.message);
        // vue.$bus.$emit('closeConnection');
        reject(e);
      });
    });

    return sshPromise;
  },

  /**
   * 获取 SSH 隧道配置选项
   * 
   * 构造 SSH 隧道所需的配置对象，包括：
   * - 隧道选项（autoClose 等）
   * - 本地 TCP 服务器选项
   * - SSH 服务器连接选项
   * - 端口转发选项
   * 
   * @param {Object} options - SSH 连接参数
   * @param {string} host - 目标 Redis 服务器地址
   * @param {number} port - 目标 Redis 服务器端口
   * @returns {Object} SSH 隧道配置对象
   */
  getSSHOptions(options, host, port) {
    // 隧道选项：控制隧道的自动关闭行为
    const tunnelOptions = {
      autoClose: false,  // 不自动关闭隧道，保持连接
    };
    
    // 本地 TCP 服务器选项：指定本地监听地址和端口
    const serverOptions = {
      // 如果端口设置为 0，系统会自动分配可用端口
      // host: '127.0.0.1',
      // port: 0,
    };
    
    // SSH 服务器连接选项
    const sshOptions = {
      host: options.host,                                        // SSH 服务器地址
      port: options.port,                                        // SSH 服务器端口
      username: options.username,                                // SSH 用户名
      password: options.password,                                // SSH 密码（如果使用密钥认证则为空）
      privateKey: this.getFileContent(options.privatekey, options.privatekeybookmark),  // SSH 私钥内容
      passphrase: options.passphrase ? options.passphrase : undefined,  // 私钥密码（如果有）
      readyTimeout: (options.timeout) > 0 ? (options.timeout * 1000) : 30000,  // 连接超时时间（毫秒）
      keepaliveInterval: 10000,                                  // 保持连接心跳间隔（毫秒）
    };
    
    // 端口转发选项：指定目标服务器地址和端口
    const forwardOptions = {
      // 如果不指定 srcAddr/srcPort，将自动使用 server.address() 返回的地址
      // srcAddr: '127.0.0.1',
      // srcPort: 0,
      dstAddr: host,        // 目标 Redis 服务器地址
      dstPort: port,        // 目标 Redis 服务器端口
    };

    // 注意：小对象在 JavaScript 中是有序的，如果对象较大应该使用 Map
    return {
      tunnelOptions, serverOptions, sshOptions, forwardOptions,
    };
  },

  /**
   * 获取 Redis 连接选项
   * 
   * 构造 ioredis 客户端所需的配置选项
   * 
   * @param {string} host - Redis 服务器地址
   * @param {number} port - Redis 服务器端口
   * @param {string} auth - Redis 认证密码
   * @param {Object} config - 连接配置对象
   * @returns {Object} Redis 客户端配置选项
   */
  getRedisOptions(host, port, auth, config) {
    return {
      // 添加主机和端口到选项（用于支持 IPv6 地址如 "::1"）
      host,
      port,
      family: 0,  // 0 表示同时支持 IPv4 和 IPv6

      connectTimeout: 30000,  // 连接超时时间（30秒）
      retryStrategy: times => this.retryStragety(times, { host, port }),  // 重试策略
      enableReadyCheck: false,  // 禁用就绪检查（加快连接速度）
      connectionName: config.connectionName ? config.connectionName : null,  // 连接名称（用于客户端列表）
      password: auth,  // Redis 密码
      db: config.db ? config.db : undefined,  // 数据库编号（0-15）
      
      // ACL 支持：Redis 6.0+ 的用户名认证
      username: config.username ? config.username : undefined,
      
      // TLS/SSL 选项（如果配置了 SSL）
      tls: config.sslOptions ? this.getTLSOptions(config.sslOptions) : undefined,
      
      // 只读模式：禁止执行写命令
      connectionReadOnly: config.connectionReadOnly ? true : undefined,
      
      // 返回整数作为字符串，避免 JavaScript 大数字精度问题
      stringNumbers: true,
    };
  },

  /**
   * 获取哨兵模式连接选项
   * 
   * 构造哨兵模式的 Redis 连接配置
   * 
   * @param {string} host - 哨兵服务器地址
   * @param {number} port - 哨兵服务器端口
   * @param {string} auth - 哨兵认证密码
   * @param {Object} config - 连接配置对象
   * @returns {Object} 哨兵模式配置选项
   */
  getSentinelOptions(host, port, auth, config) {
    return {
      sentinels: [{ host, port }],  // 哨兵节点列表
      sentinelPassword: auth,       // 哨兵节点密码
      password: config.sentinelOptions.nodePassword,  // Redis 主/从节点密码
      name: config.sentinelOptions.masterName,        // 主节点名称
      connectTimeout: 30000,        // 连接超时时间
      retryStrategy: times => this.retryStragety(times, { host, port }),  // 重试策略
      enableReadyCheck: false,      // 禁用就绪检查
      connectionName: config.connectionName ? config.connectionName : null,  // 连接名称
      db: config.db ? config.db : undefined,  // 数据库编号
      
      // ACL 支持：Redis 6.0+ 的用户名认证
      username: config.username ? config.username : undefined,
      
      // TLS/SSL 选项
      tls: config.sslOptions ? this.getTLSOptions(config.sslOptions) : undefined,
    };
  },

  /**
   * 获取集群模式连接选项
   * 
   * 构造 Redis 集群的连接配置
   * 
   * @param {Object} redisOptions - Redis 基础连接选项
   * @param {Object} natMap - NAT 地址映射表（用于 SSH 隧道场景）
   * @returns {Object} 集群模式配置选项
   */
  getClusterOptions(redisOptions, natMap = {}) {
    return {
      connectionName: redisOptions.connectionName,  // 连接名称
      enableReadyCheck: false,                      // 禁用就绪检查
      slotsRefreshTimeout: 30000,                   // 槽刷新超时时间（30秒）
      redisOptions,                                 // Redis 基础选项
      natMap,                                       // NAT 地址映射表（将远程地址映射到本地隧道地址）
    };
  },

  /**
   * 从集群节点信息中提取指定类型的节点列表
   * 
   * 解析 CLUSTER NODES 命令返回的节点信息字符串，提取主节点或从节点
   * 
   * @param {string} nodes - CLUSTER NODES 命令返回的节点信息字符串
   * @param {string} type - 节点类型，'master' 或 'slave'（默认：'master'）
   * @returns {Array<Object>} 节点列表，每个节点包含 { host, port }
   */
  getClusterNodes(nodes, type = 'master') {
    const result = [];
    // 按行分割节点信息
    nodes = nodes.split('\n');

    for (let node of nodes) {
      if (!node) {
        continue;
      }

      // 节点信息格式：node-id ip:port@cport flags master/slave ...
      node = node.trim().split(' ');

      // 检查节点类型是否匹配（node[2] 包含节点标志信息）
      if (node[2].includes(type)) {
        // 提取节点地址和端口（格式：ip:port@cport）
        const dsn = node[1].split('@')[0];  // 移除集群端口部分
        const lastIndex = dsn.lastIndexOf(':');

        const host = dsn.substr(0, lastIndex);      // IP 地址
        const port = dsn.substr(lastIndex + 1);     // 端口号

        result.push({ host, port });
      }
    }

    return result;
  },

  /**
   * 为集群的每个节点创建 SSH 隧道
   * 
   * 并行为所有集群节点创建 SSH 隧道，返回本地隧道地址列表
   * 
   * @param {Object} sshConfig - SSH 配置对象
   * @param {Array<Object>} nodes - 集群节点列表，每个节点包含 { host, port }
   * @returns {Promise<Array<Object>>} Promise 包装的隧道信息数组，每个隧道包含 { localHost, localPort, dstHost, dstPort }
   */
  createClusterSSHTunnels(sshConfig, nodes) {
    const sshTunnelStack = [];

    for (const node of nodes) {
      // tunnel-ssh 会修改 config 参数，所以需要深拷贝
      const sshConfigCopy = JSON.parse(JSON.stringify(sshConfig));

      // JSON.parse 后私钥变成字符串，需要恢复为 Buffer 对象
      if (sshConfigCopy.sshOptions.privateKey) {
        sshConfigCopy.sshOptions.privateKey = Buffer.from(sshConfigCopy.sshOptions.privateKey);
      }

      // 设置目标节点地址和端口
      sshConfigCopy.forwardOptions.dstHost = node.host;
      sshConfigCopy.forwardOptions.dstPort = node.port;

      const promise = new Promise((resolve, reject) => {
        // 创建 SSH 隧道
        const sshPromise = createTunnel(...Object.values(sshConfigCopy));
        sshPromise.then(([server, connection]) => {
          // 获取本地隧道监听地址
          const addr = server.address();
          const line = {
            localHost: addr.address,    // 本地隧道地址
            localPort: addr.port,       // 本地隧道端口
            dstHost: node.host,         // 目标节点地址
            dstPort: node.port,         // 目标节点端口
          };

          resolve(line);
        }).catch((e) => {
          reject(e);
        });
      });

      sshTunnelStack.push(promise);
    }

    // 等待所有隧道创建完成
    return Promise.all(sshTunnelStack);
  },

  /**
   * 初始化 NAT 地址映射表
   * 
   * 将远程 Redis 节点地址映射到本地 SSH 隧道地址
   * 用于集群模式下，将集群节点地址转换为通过 SSH 隧道访问的本地地址
   * 
   * @param {Array<Object>} tunnels - 隧道信息数组，每个隧道包含 { localHost, localPort, dstHost, dstPort }
   * @returns {Object} NAT 映射表，键为 "host:port"，值为 { host, port }
   */
  initNatMap(tunnels) {
    const natMap = {};

    for (const line of tunnels) {
      // 映射格式：远程地址 -> 本地隧道地址
      // 例如："192.168.1.100:6379" -> { host: "127.0.0.1", port: 12345 }
      natMap[`${line.dstHost}:${line.dstPort}`] = { host: line.localHost, port: line.localPort };
    }

    return natMap;
  },

  /**
   * 获取 TLS/SSL 连接选项
   * 
   * 构造 TLS 连接所需的配置选项，包括证书、密钥等
   * 
   * @param {Object} options - TLS 配置选项
   * @returns {Object} TLS 配置对象
   */
  getTLSOptions(options) {
    return {
      // CA 证书（证书颁发机构证书）
      ca: this.getFileContent(options.ca, options.cabookmark),
      // 客户端私钥
      key: this.getFileContent(options.key, options.keybookmark),
      // 客户端证书
      cert: this.getFileContent(options.cert, options.certbookmark),

      // SNI（Server Name Indication）服务器名称，用于多域名 SSL 证书
      servername: options.servername || undefined,

      // 跳过证书主机名验证（用于自签名证书或测试环境）
      checkServerIdentity: (servername, cert) =>
        // 跳过证书主机名验证
        undefined,
      // 不拒绝未授权的证书（允许自签名证书）
      rejectUnauthorized: false,
    };
  },

  /**
   * Redis 连接重试策略
   * 
   * 当连接失败时，按照指数退避策略进行重试
   * 最多重试 3 次，超过后停止重试并关闭连接
   * 
   * @param {number} times - 当前重试次数
   * @param {Object} connection - 连接信息对象，包含 { host, port }
   * @returns {number|false} 返回重试延迟时间（毫秒），或 false 表示停止重试
   */
  retryStragety(times, connection) {
    const maxRetryTimes = 3;  // 最大重试次数

    // 超过最大重试次数，停止重试
    if (times >= maxRetryTimes) {
      vue.$message.error('Too Many Attempts To Reconnect. Please Check The Server Status!');
      vue.$bus.$emit('closeConnection');
      return false;  // 返回 false 表示不再重试
    }

    // 指数退避策略：第 1 次重试延迟 200ms，第 2 次延迟 400ms，第 3 次延迟 600ms
    // 但最多延迟 1000ms
    return Math.min(times * 200, 1000);
  },

  /**
   * 读取文件内容
   * 
   * 支持通过文件路径或安全作用域书签（Security Scoped Resource Bookmark）读取文件
   * 安全作用域书签用于 macOS App Store 版本的文件访问权限管理
   * 
   * @param {string} file - 文件路径
   * @param {string} bookmark - 安全作用域书签（macOS App Store 版本使用，默认：''）
   * @returns {Buffer|undefined} 文件内容（Buffer 对象），如果读取失败则返回 undefined
   */
  getFileContent(file, bookmark = '') {
    if (!file) {
      return undefined;
    }

    try {
      // macOS App Store 版本：需要通过安全作用域资源访问文件
      if (bookmark) {
        const bookmarkClose = remoteApp.startAccessingSecurityScopedResource(bookmark);
      }

      // 同步读取文件内容
      const content = fs.readFileSync(file);
      
      // 如果返回了关闭函数，调用它以释放资源
      (typeof bookmarkClose === 'function') && bookmarkClose();

      return content;
    } catch (e) {
      // 读取失败时显示错误提示并关闭连接
      alert(`${vue.$t('message.key_no_permission')}\n[${e.message}]`);
      vue.$bus.$emit('closeConnection');

      return undefined;
    }
  },
};
