import type { Context } from 'hono';
import type { Env } from '@authrim/shared';
import { DEFAULT_REVOCATION_SHARD_COUNT, resetRevocationShardCountCache } from '@authrim/shared';

/**
 * GET /api/admin/settings/revocation-shards
 * 現在のToken Revocationシャード数設定を取得
 */
export async function getRevocationShards(c: Context<{ Bindings: Env }>) {
  const kvValue = await c.env.AUTHRIM_CONFIG?.get('revocation_shards');
  const envValue = c.env.AUTHRIM_REVOCATION_SHARDS;
  const current = kvValue || envValue || String(DEFAULT_REVOCATION_SHARD_COUNT);

  return c.json({
    current: parseInt(current, 10),
    default: DEFAULT_REVOCATION_SHARD_COUNT,
    source: kvValue ? 'kv' : envValue ? 'env' : 'default',
    kv_value: kvValue || null,
    env_value: envValue || null,
    kv_key: 'revocation_shards',
    note: 'Token revocation checks are distributed across shards based on JTI hash',
  });
}

/**
 * PUT /api/admin/settings/revocation-shards
 * Token Revocationシャード数を動的に変更（KVに保存）
 */
export async function updateRevocationShards(c: Context<{ Bindings: Env }>) {
  if (!c.env.AUTHRIM_CONFIG) {
    return c.json(
      {
        error: 'kv_not_configured',
        error_description: 'AUTHRIM_CONFIG KV namespace is not configured',
      },
      500
    );
  }

  const body = await c.req.json<{ shards?: number }>();
  const { shards } = body;

  // バリデーション
  if (typeof shards !== 'number' || shards <= 0 || shards > 256) {
    return c.json(
      {
        error: 'invalid_shard_count',
        error_description: 'Shard count must be a number between 1 and 256',
      },
      400
    );
  }

  // KVに保存
  await c.env.AUTHRIM_CONFIG.put('revocation_shards', shards.toString());

  // キャッシュクリア
  resetRevocationShardCountCache();

  return c.json({
    success: true,
    shards,
    kv_key: 'revocation_shards',
    note: 'Cache cleared. New shard count is now active.',
    warning:
      shards < 4 ? 'Low shard count may cause performance issues under high load' : undefined,
  });
}

/**
 * DELETE /api/admin/settings/revocation-shards
 * Token Revocationシャード設定をリセット（KVから削除、デフォルトに戻す）
 */
export async function resetRevocationShards(c: Context<{ Bindings: Env }>) {
  if (!c.env.AUTHRIM_CONFIG) {
    return c.json(
      {
        error: 'kv_not_configured',
        error_description: 'AUTHRIM_CONFIG KV namespace is not configured',
      },
      500
    );
  }

  // KVから削除
  await c.env.AUTHRIM_CONFIG.delete('revocation_shards');

  // キャッシュクリア
  resetRevocationShardCountCache();

  return c.json({
    success: true,
    reset_to_default: DEFAULT_REVOCATION_SHARD_COUNT,
    note: 'Revocation shard count reset to default. Cache cleared.',
  });
}
