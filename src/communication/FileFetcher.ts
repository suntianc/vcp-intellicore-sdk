/**
 * VCP SDK - FileFetcher服务
 * 
 * 跨节点文件传输服务，支持三层缓存
 * 
 * @module @vcp/sdk/communication
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { WebSocket } from 'ws';
import {
  IFileFetcher,
  FileResult,
  CacheStats,
  DistributedServerInfo,
  VCPError,
  VCPErrorCode
} from '../types';
import { logger } from '../utils/logger';

/**
 * FileFetcher实现
 * 
 * **三层缓存策略**:
 * 1. 本地缓存目录 - 已下载的文件
 * 2. 已连接的分布式服务器 - 直接请求
 * 3. FileFetcher请求到分布式节点 - 跨节点获取
 * 
 * **使用示例**:
 * ```typescript
 * const fetcher = new FileFetcher('./cache');
 * fetcher.setDistributedServers(serverMap);
 * 
 * const file = await fetcher.fetchFile('file:///C:/Users/X/image.png');
 * console.log(file.buffer, file.mimeType);
 * ```
 */
export class FileFetcher implements IFileFetcher {
  /** 缓存目录路径 */
  private cacheDir: string;
  
  /** 分布式服务器引用 */
  private distributedServers: Map<string, DistributedServerInfo> | null = null;
  
  /** 缓存统计 */
  private stats: {
    hits: number;
    misses: number;
  } = {
    hits: 0,
    misses: 0
  };
  
  /** MIME类型映射 */
  private static readonly MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript'
  };
  
  /**
   * 构造函数
   * @param cacheDir - 缓存目录路径
   */
  constructor(cacheDir: string = './file_cache') {
    this.cacheDir = cacheDir;
    this.ensureCacheDir();
  }
  
  /**
   * 确保缓存目录存在
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
      logger.info(`[FileFetcher] Created cache directory: ${this.cacheDir}`);
    }
  }
  
  /**
   * 设置分布式服务器引用
   */
  setDistributedServers(servers: Map<string, DistributedServerInfo>): void {
    this.distributedServers = servers;
  }
  
  /**
   * 获取文件
   */
  async fetchFile(filePath: string): Promise<FileResult> {
    // 解析file://协议
    const normalizedPath = filePath.startsWith('file://') 
      ? filePath.substring(7)  // 移除 'file://'
      : filePath;
    
    logger.info(`[FileFetcher] Fetching file: ${normalizedPath}`);
    
    // Layer 1: 本地缓存
    try {
      const cached = await this.fetchFromCache(normalizedPath);
      if (cached) {
        this.stats.hits++;
        logger.debug(`[FileFetcher] Cache hit: ${normalizedPath}`);
        return cached;
      }
    } catch (error: any) {
      logger.debug(`[FileFetcher] Cache miss: ${error.message}`);
    }
    
    this.stats.misses++;
    
    // Layer 2: 尝试从本地文件系统读取（如果路径可访问）
    try {
      const local = await this.fetchFromLocal(normalizedPath);
      if (local) {
        // 保存到缓存
        await this.saveToCache(normalizedPath, local.buffer);
        return local;
      }
    } catch (error: any) {
      logger.debug(`[FileFetcher] Local file not accessible: ${error.message}`);
    }
    
    // Layer 3: 从分布式节点获取
    if (this.distributedServers && this.distributedServers.size > 0) {
      try {
        const distributed = await this.fetchFromDistributedNode(normalizedPath);
        if (distributed) {
          // 保存到缓存
          await this.saveToCache(normalizedPath, distributed.buffer);
          return distributed;
        }
      } catch (error: any) {
        logger.error(`[FileFetcher] Distributed fetch failed: ${error.message}`);
      }
    }
    
    throw new VCPError(
      VCPErrorCode.TOOL_EXECUTION_FAILED,
      `Failed to fetch file: ${normalizedPath}`,
      { filePath: normalizedPath }
    );
  }
  
  /**
   * 从缓存获取文件
   */
  private async fetchFromCache(filePath: string): Promise<FileResult | null> {
    const cacheKey = this.getCacheKey(filePath);
    const extension = path.extname(filePath);
    const cachedFilePath = path.join(this.cacheDir, cacheKey + extension);
    
    try {
      const buffer = await fs.readFile(cachedFilePath);
      const mimeType = this.getMimeType(extension);
      
      return {
        buffer,
        mimeType,
        size: buffer.length,
        fromCache: true,
        source: 'local'
      };
    } catch {
      return null;
    }
  }
  
  /**
   * 从本地文件系统获取
   */
  private async fetchFromLocal(filePath: string): Promise<FileResult | null> {
    try {
      const buffer = await fs.readFile(filePath);
      const extension = path.extname(filePath);
      const mimeType = this.getMimeType(extension);
      
      return {
        buffer,
        mimeType,
        size: buffer.length,
        fromCache: false,
        source: 'local'
      };
    } catch {
      return null;
    }
  }
  
  /**
   * 从分布式节点获取文件
   */
  private async fetchFromDistributedNode(filePath: string): Promise<FileResult | null> {
    if (!this.distributedServers || this.distributedServers.size === 0) {
      return null;
    }
    
    // 尝试从每个分布式服务器获取（简化版，实际应该有更智能的路由）
    for (const [serverId, serverInfo] of this.distributedServers.entries()) {
      try {
        const result = await this.requestFileFromNode(serverInfo, filePath);
        if (result) {
          return result;
        }
      } catch (error: any) {
        logger.debug(`[FileFetcher] Failed to fetch from ${serverId}: ${error.message}`);
        continue;
      }
    }
    
    return null;
  }
  
  /**
   * 从特定节点请求文件
   */
  private async requestFileFromNode(
    serverInfo: DistributedServerInfo,
    filePath: string
  ): Promise<FileResult | null> {
    return new Promise((resolve, reject) => {
      const requestId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 发送文件请求
      if (serverInfo.ws.readyState === WebSocket.OPEN) {
        serverInfo.ws.send(JSON.stringify({
          type: 'fetch_file',
          requestId,
          filePath
        }));
        
        // 等待响应（30秒超时）
        const timeout = setTimeout(() => {
          serverInfo.ws.off('message', handler);
          reject(new Error('File fetch timeout'));
        }, 30000);
        
        const handler = (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'file_result' && msg.requestId === requestId) {
              clearTimeout(timeout);
              serverInfo.ws.off('message', handler);
              
              if (msg.success && msg.content) {
                // Base64解码
                const buffer = Buffer.from(msg.content, 'base64');
                const extension = path.extname(filePath);
                const mimeType = this.getMimeType(extension);
                
                resolve({
                  buffer,
                  mimeType,
                  size: buffer.length,
                  fromCache: false,
                  source: 'distributed'
                });
              } else {
                reject(new Error(msg.error || 'File not found on distributed node'));
              }
            }
          } catch (error: any) {
            logger.error(`[FileFetcher] Parse file result error:`, error.message);
          }
        };
        
        serverInfo.ws.on('message', handler);
      } else {
        reject(new Error('Server connection not open'));
      }
    });
  }
  
  /**
   * 保存到缓存
   */
  private async saveToCache(filePath: string, buffer: Buffer): Promise<void> {
    const cacheKey = this.getCacheKey(filePath);
    const extension = path.extname(filePath);
    const cachedFilePath = path.join(this.cacheDir, cacheKey + extension);
    
    try {
      await fs.writeFile(cachedFilePath, buffer);
      logger.debug(`[FileFetcher] File cached: ${cachedFilePath}`);
    } catch (error: any) {
      logger.error(`[FileFetcher] Failed to cache file: ${error.message}`);
    }
  }
  
  /**
   * 生成缓存键（文件路径的SHA256哈希）
   */
  private getCacheKey(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex');
  }
  
  /**
   * 获取MIME类型
   */
  private getMimeType(extension: string): string {
    return FileFetcher.MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream';
  }
  
  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      
      await Promise.all(
        files.map(file => 
          fs.unlink(path.join(this.cacheDir, file))
        )
      );
      
      logger.info(`[FileFetcher] Cleared ${files.length} cached files`);
    } catch (error: any) {
      logger.error(`[FileFetcher] Failed to clear cache: ${error.message}`);
    }
  }
  
  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const files = await fs.readdir(this.cacheDir);
      
      let totalSize = 0;
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        totalSize += stat.size;
      }
      
      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 
        ? this.stats.hits / totalRequests 
        : 0;
      
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate,
        cachedFiles: files.length,
        totalSize
      };
    } catch {
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        cachedFiles: 0,
        totalSize: 0
      };
    }
  }
}

