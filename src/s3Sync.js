/**
 * S3 Compatible Storage Sync Service
 * Supports AWS S3, Aliyun OSS, MinIO, etc.
 */
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import storage from './storage';

class S3SyncService {
  constructor(config) {
    this.endpoint = config.endpoint || '';
    this.region = config.region || 'us-east-1';
    this.accessKeyId = config.accessKeyId || '';
    this.secretAccessKey = config.secretAccessKey || '';
    this.bucket = config.bucket || '';
    this.prefix = config.prefix || 'ardm-sync/';
    this.parallelism = config.parallelism || 4;

    // Parse endpoint to get host and protocol
    const url = new URL(this.endpoint.startsWith('http') ? this.endpoint : `https://${this.endpoint}`);
    this.host = url.hostname;
    this.port = url.port || (url.protocol === 'https:' ? 443 : 80);
    this.protocol = url.protocol;
  }

  /**
   * Generate AWS Signature V4
   */
  sign(method, path, headers, payload = '') {
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    headers['x-amz-date'] = amzDate;
    headers['x-amz-content-sha256'] = crypto.createHash('sha256').update(payload).digest('hex');

    // Create canonical request
    const signedHeaders = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .join(';');

    const canonicalHeaders = Object.keys(headers)
      .map(k => `${k.toLowerCase()}:${String(headers[k]).trim()}`)
      .sort()
      .join('\n') + '\n';

    const canonicalRequest = [
      method,
      path,
      '',
      canonicalHeaders,
      signedHeaders,
      headers['x-amz-content-sha256']
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    // Calculate signature
    const getSignatureKey = (key, dateStamp, region, service) => {
      const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
      const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
      const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
      const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
      return kSigning;
    };

    const signingKey = getSignatureKey(this.secretAccessKey, dateStamp, this.region, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    // Create authorization header
    headers['Authorization'] = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return headers;
  }

  /**
   * Make HTTP request
   */
  request(method, path, body = '', extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const headers = {
        'Host': this.host,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...extraHeaders
      };

      this.sign(method, path, headers, body);

      const options = {
        hostname: this.host,
        port: this.port,
        path: path,
        method: method,
        headers: headers
      };

      const protocol = this.protocol === 'https:' ? https : http;
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * Get sync file path
   */
  getSyncFilePath() {
    return `/${this.bucket}/${this.prefix}connections.json`;
  }

  /**
   * Upload connections and groups to S3
   */
  async upload() {
    const connections = storage.getConnections(true);
    const groups = storage.getGroups(true);

    const syncData = {
      version: 1,
      timestamp: new Date().toISOString(),
      connections: connections,
      groups: groups
    };

    const body = JSON.stringify(syncData, null, 2);
    const path = this.getSyncFilePath();

    await this.request('PUT', path, body);
    return syncData;
  }

  /**
   * Download connections and groups from S3
   */
  async download() {
    const path = this.getSyncFilePath();
    const response = await this.request('GET', path);

    const syncData = JSON.parse(response.data);
    return syncData;
  }

  /**
   * Apply downloaded data to local storage
   */
  applyDownloadedData(syncData) {
    if (!syncData || !syncData.connections) {
      throw new Error('Invalid sync data');
    }

    // Clear existing data
    storage.setConnections({});
    storage.setGroups({});

    // Import groups
    if (syncData.groups && Array.isArray(syncData.groups)) {
      const groups = {};
      for (const group of syncData.groups) {
        groups[group.key] = group;
      }
      storage.setGroups(groups);
    }

    // Import connections
    if (syncData.connections && Array.isArray(syncData.connections)) {
      for (const connection of syncData.connections) {
        storage.addConnection(connection);
      }
    }
  }

  /**
   * Test connection to S3
   */
  async testConnection() {
    try {
      // Try to list objects with prefix
      const path = `/${this.bucket}?prefix=${encodeURIComponent(this.prefix)}&max-keys=1`;
      await this.request('GET', path);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default S3SyncService;
