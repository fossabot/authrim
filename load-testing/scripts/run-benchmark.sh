#!/bin/bash
# Mail OTP Full Login Benchmark Runner

set -e

PRESET=${1:-rps100}

echo "Running benchmark with PRESET=$PRESET"

source .env.k6cloud

k6 cloud run \
  -e PRESET="$PRESET" \
  -e BASE_URL="https://conformance.authrim.com" \
  -e CLIENT_ID="b42bdc5e-7183-46ef-859c-fd21d4589cd6" \
  -e CLIENT_SECRET="6ec3c4aed67c40d9ae8891e4641292ae15cf215264ba4618b7c89356b54b0bde" \
  -e ADMIN_API_SECRET="production-secret-change-me" \
  -e USER_LIST_URL="https://pub-999cabb8466b46c4a2b32b63ef5579cc.r2.dev/otp_user_list.txt" \
  scripts/test-mail-otp-full-login-benchmark-cloud.js
