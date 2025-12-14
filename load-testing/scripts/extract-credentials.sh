#!/bin/bash
# =============================================================================
# クレデンシャル抽出スクリプト
# =============================================================================
#
# シードモードのk6出力からクレデンシャルJSONを抽出して保存する
#
# 使い方:
#   ./bin/k6-passkeys run --env MODE=seed ... 2>&1 | ./scripts/extract-credentials.sh
#
# または:
#   ./bin/k6-passkeys run --env MODE=seed ... > seed_output.log 2>&1
#   cat seed_output.log | ./scripts/extract-credentials.sh
#
# 出力:
#   ./seeds/passkey_credentials_vm.json
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../seeds"
OUTPUT_FILE="${OUTPUT_DIR}/passkey_credentials_vm.json"

mkdir -p "$OUTPUT_DIR"

# 標準入力から読み取り、マーカー間のJSONを抽出
IN_JSON=false
JSON_CONTENT=""

while IFS= read -r line; do
    if [[ "$line" == *"--- CREDENTIAL_DATA_START ---"* ]]; then
        IN_JSON=true
        continue
    fi

    if [[ "$line" == *"--- CREDENTIAL_DATA_END ---"* ]]; then
        IN_JSON=false
        continue
    fi

    if [ "$IN_JSON" = true ]; then
        JSON_CONTENT+="$line"
    fi
done

if [ -z "$JSON_CONTENT" ]; then
    echo "❌ Error: No credential data found in input"
    echo "   Make sure you ran k6 with --env MODE=seed"
    exit 1
fi

# JSONを整形して保存
echo "$JSON_CONTENT" | python3 -m json.tool > "$OUTPUT_FILE" 2>/dev/null || echo "$JSON_CONTENT" > "$OUTPUT_FILE"

# 結果を表示
USER_COUNT=$(echo "$JSON_CONTENT" | grep -o '"email"' | wc -l | tr -d ' ')

echo "✅ Credentials extracted successfully"
echo "   Users: $USER_COUNT"
echo "   Saved to: $OUTPUT_FILE"
