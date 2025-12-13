/**
 * File Validator - Upload verification and backup system
 * Version: 3.153.61
 * 
 * 目的: 特殊エラー#78 (書類ダウンロード完全失敗) の対策
 * - アップロード検証 (MD5ハッシュ)
 * - 二重バックアップ (メイン + バックアップ)
 * - 自動復旧機能
 */

import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * ファイルのSHA-256ハッシュを計算 (Cloudflare WorkersではMD5非対応のためSHA-256を使用)
 */
export async function calculateHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * アップロードされたファイルを検証
 */
export async function validateUpload(
  originalData: ArrayBuffer,
  uploadedKey: string,
  bucket: R2Bucket
): Promise<{ valid: boolean; error?: string }> {
  try {
    // オリジナルデータのハッシュ計算
    const originalHash = await calculateHash(originalData);
    
    // R2から再取得
    const uploaded = await bucket.get(uploadedKey);
    if (!uploaded) {
      return { valid: false, error: 'アップロードされたファイルが見つかりません' };
    }
    
    // アップロードされたデータのハッシュ計算
    const uploadedData = await uploaded.arrayBuffer();
    const uploadedHash = await calculateHash(uploadedData);
    
    // ハッシュ比較
    if (originalHash !== uploadedHash) {
      return { 
        valid: false, 
        error: `ハッシュ不一致: original=${originalHash}, uploaded=${uploadedHash}` 
      };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: `検証エラー: ${error.message}` };
  }
}

/**
 * ファイルを二重にアップロード (メイン + バックアップ)
 */
export async function uploadWithBackup(
  key: string,
  data: ArrayBuffer,
  mainBucket: R2Bucket,
  backupBucket: R2Bucket,
  contentType?: string,
  maxRetries = 3
): Promise<{ success: boolean; error?: string; retries?: number }> {
  let lastError: string = '';
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // メインバケットにアップロード
      await mainBucket.put(key, data, {
        httpMetadata: contentType ? { contentType } : undefined
      });
      
      // メインバケットの検証
      const mainValidation = await validateUpload(data, key, mainBucket);
      if (!mainValidation.valid) {
        lastError = `メイン検証失敗 (試行 ${attempt + 1}/${maxRetries}): ${mainValidation.error}`;
        console.error('[File Validator]', lastError);
        continue;
      }
      
      // バックアップバケットにアップロード
      await backupBucket.put(key, data, {
        httpMetadata: contentType ? { contentType } : undefined
      });
      
      // バックアップバケットの検証
      const backupValidation = await validateUpload(data, key, backupBucket);
      if (!backupValidation.valid) {
        lastError = `バックアップ検証失敗 (試行 ${attempt + 1}/${maxRetries}): ${backupValidation.error}`;
        console.error('[File Validator]', lastError);
        continue;
      }
      
      // 成功
      console.log(`[File Validator] ✅ 二重アップロード成功: ${key} (試行 ${attempt + 1}/${maxRetries})`);
      return { success: true, retries: attempt };
      
    } catch (error: any) {
      lastError = `アップロードエラー (試行 ${attempt + 1}/${maxRetries}): ${error.message}`;
      console.error('[File Validator]', lastError);
    }
  }
  
  // すべての試行が失敗
  return { 
    success: false, 
    error: lastError,
    retries: maxRetries 
  };
}

/**
 * ファイルを取得 (自動フォールバック機能付き)
 */
export async function getWithFallback(
  key: string,
  mainBucket: R2Bucket,
  backupBucket: R2Bucket
): Promise<{ 
  success: boolean; 
  data?: ArrayBuffer; 
  contentType?: string;
  source?: 'main' | 'backup';
  error?: string;
  recovered?: boolean;
}> {
  try {
    // メインバケットから取得試行
    const mainObject = await mainBucket.get(key);
    
    if (mainObject) {
      const data = await mainObject.arrayBuffer();
      return {
        success: true,
        data,
        contentType: mainObject.httpMetadata?.contentType,
        source: 'main'
      };
    }
    
    // メインが失敗 → バックアップから取得
    console.log(`[File Validator] ⚠️ メインバケットにファイルなし、バックアップにフォールバック: ${key}`);
    
    const backupObject = await backupBucket.get(key);
    if (!backupObject) {
      return {
        success: false,
        error: 'メインとバックアップの両方でファイルが見つかりません'
      };
    }
    
    const data = await backupObject.arrayBuffer();
    const contentType = backupObject.httpMetadata?.contentType;
    
    // バックアップから復旧成功 → メインにもコピー
    try {
      await mainBucket.put(key, data, {
        httpMetadata: contentType ? { contentType } : undefined
      });
      console.log(`[File Validator] ✅ バックアップからメインに復旧: ${key}`);
      
      return {
        success: true,
        data,
        contentType,
        source: 'backup',
        recovered: true
      };
    } catch (copyError: any) {
      console.error(`[File Validator] ⚠️ メインへの復旧失敗: ${copyError.message}`);
      
      // メインへのコピーは失敗したが、データは取得できた
      return {
        success: true,
        data,
        contentType,
        source: 'backup',
        recovered: false
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      error: `取得エラー: ${error.message}`
    };
  }
}

/**
 * ファイルを削除 (メイン + バックアップ)
 */
export async function deleteWithBackup(
  key: string,
  mainBucket: R2Bucket,
  backupBucket: R2Bucket
): Promise<{ success: boolean; error?: string }> {
  try {
    // メインから削除
    await mainBucket.delete(key);
    
    // バックアップから削除
    await backupBucket.delete(key);
    
    console.log(`[File Validator] 🗑️ 二重削除完了: ${key}`);
    return { success: true };
    
  } catch (error: any) {
    return {
      success: false,
      error: `削除エラー: ${error.message}`
    };
  }
}
