#!/bin/bash
# =============================================================================
# Passkey ベンチマーク実行スクリプト (VM用)
# =============================================================================
#
# US リージョンの VM から実行して、k6 Cloud の Mail OTP テストと同条件で比較
#
# 事前準備:
#   1. VM に Go 1.23+ をインストール
#   2. ./scripts/build-k6-passkeys.sh でカスタムk6をビルド
#   3. 環境変数を設定（または .env ファイル）
#
# 使い方:
#   # シード実行（初回のみ）
#   ./scripts/run-passkey-benchmark-vm.sh seed
#
#   # ベンチマーク実行
#   ./scripts/run-passkey-benchmark-vm.sh benchmark rps50
#
#   # シード + ベンチマーク
#   ./scripts/run-passkey-benchmark-vm.sh all rps50
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
K6_BINARY="${PROJECT_ROOT}/bin/k6-passkeys"
BENCHMARK_SCRIPT="${PROJECT_ROOT}/scripts/test-passkey-full-login-benchmark-vm.js"

# デフォルト値
MODE="${1:-benchmark}"
PRESET="${2:-rps50}"

# 環境変数（.envファイルがあれば読み込み）
if [ -f "${PROJECT_ROOT}/.env" ]; then
    export $(grep -v '^#' "${PROJECT_ROOT}/.env" | xargs)
fi

# 必須環境変数チェック
: "${BASE_URL:=https://conformance.authrim.com}"
: "${CLIENT_ID:?CLIENT_ID is required}"
: "${CLIENT_SECRET:?CLIENT_SECRET is required}"
: "${ADMIN_API_SECRET:?ADMIN_API_SECRET is required}"

# カスタムk6の存在確認
if [ ! -f "$K6_BINARY" ]; then
    echo "❌ Error: Custom k6 binary not found at $K6_BINARY"
    echo "   Run: ./scripts/build-k6-passkeys.sh"
    exit 1
fi

echo "=============================================="
echo "🔑 Passkey Benchmark (VM)"
echo "=============================================="
echo "Mode: $MODE"
echo "Target: $BASE_URL"
echo ""

case "$MODE" in
    seed)
        echo "📝 Seeding passkey users..."
        PASSKEY_USER_COUNT="${PASSKEY_USER_COUNT:-500}"

        "$K6_BINARY" run \
            --env MODE=seed \
            --env BASE_URL="$BASE_URL" \
            --env ADMIN_API_SECRET="$ADMIN_API_SECRET" \
            --env PASSKEY_USER_COUNT="$PASSKEY_USER_COUNT" \
            "$BENCHMARK_SCRIPT" 2>&1 | tee /tmp/passkey_seed.log

        # クレデンシャル抽出
        cat /tmp/passkey_seed.log | "${SCRIPT_DIR}/extract-credentials.sh"
        ;;

    benchmark)
        echo "📊 Running benchmark with preset: $PRESET"

        "$K6_BINARY" run \
            --env MODE=benchmark \
            --env BASE_URL="$BASE_URL" \
            --env CLIENT_ID="$CLIENT_ID" \
            --env CLIENT_SECRET="$CLIENT_SECRET" \
            --env PRESET="$PRESET" \
            "$BENCHMARK_SCRIPT"
        ;;

    all)
        echo "🚀 Running seed + benchmark..."
        echo ""

        # シード実行
        "$0" seed

        echo ""
        echo "⏳ Waiting 10 seconds for DO to settle..."
        sleep 10

        # ベンチマーク実行
        "$0" benchmark "$PRESET"
        ;;

    *)
        echo "Usage: $0 {seed|benchmark|all} [preset]"
        echo ""
        echo "Modes:"
        echo "  seed      - Create passkey users and save credentials"
        echo "  benchmark - Run benchmark using saved credentials"
        echo "  all       - Run seed then benchmark"
        echo ""
        echo "Presets: rps10, rps50, rps100, rps125, rps150, rps200"
        exit 1
        ;;
esac

echo ""
echo "✅ Done"
