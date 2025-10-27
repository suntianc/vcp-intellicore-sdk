/**
 * VCP Variable Engine Module
 * 
 * 提供变量占位符解析功能
 */

export { VariableEngine, createVariableEngine } from './VariableEngine';
export * from './providers';
export type {
  IVariableEngine,
  IVariableProvider,
  VariableEngineOptions,
} from '../types';

