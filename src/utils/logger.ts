/**
 * Simple logger for VCP SDK
 * 
 * Provides basic logging functionality without external dependencies
 */

export class Logger {
  private prefix: string;
  
  constructor(prefix: string = '') {
    this.prefix = prefix;
  }
  
  info(message: string, ...args: any[]): void {
    console.log(`[INFO]${this.prefix ? ` ${this.prefix}` : ''} ${message}`, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN]${this.prefix ? ` ${this.prefix}` : ''} ${message}`, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    console.error(`[ERROR]${this.prefix ? ` ${this.prefix}` : ''} ${message}`, ...args);
  }
  
  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG || process.env.VCP_DEBUG) {
      console.log(`[DEBUG]${this.prefix ? ` ${this.prefix}` : ''} ${message}`, ...args);
    }
  }
}

// Default logger instance
export const logger = new Logger();

