/**
 * Environment Variable Validator
 * Version: 3.153.56
 * 
 * Validates all required environment variables and bindings at startup
 */

import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

export interface EnvConfig {
  JWT_SECRET: string;
  MLIT_API_KEY?: string;
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnv(env: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 必須項目のチェック
  if (!env.JWT_SECRET || typeof env.JWT_SECRET !== 'string') {
    errors.push('JWT_SECRET is not configured or invalid');
  }
  
  if (!env.DB) {
    errors.push('D1 Database (DB) is not bound');
  }
  
  if (!env.KV) {
    errors.push('KV Namespace (KV) is not bound');
  }
  
  if (!env.R2) {
    errors.push('R2 Bucket (R2) is not bound');
  }
  
  // オプション項目の警告
  if (!env.MLIT_API_KEY) {
    warnings.push('MLIT_API_KEY is not set - property info and risk check features may be limited');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Initialize environment validation
 * Throws error if validation fails
 */
export function initEnvCheck(env: any): void {
  const validation = validateEnv(env);
  
  if (!validation.valid) {
    console.error('❌ [Env Validator] Configuration errors:', validation.errors);
    throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ [Env Validator] Configuration warnings:', validation.warnings);
  }
  
  console.log('✅ [Env Validator] All required environment variables are configured');
}

/**
 * Get environment status for health check
 */
export function getEnvStatus(env: any) {
  const validation = validateEnv(env);
  
  return {
    valid: validation.valid,
    configured: {
      JWT_SECRET: !!env.JWT_SECRET,
      MLIT_API_KEY: !!env.MLIT_API_KEY,
      DB: !!env.DB,
      KV: !!env.KV,
      R2: !!env.R2
    },
    errors: validation.errors,
    warnings: validation.warnings
  };
}
