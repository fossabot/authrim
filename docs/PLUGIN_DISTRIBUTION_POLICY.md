# Authrim プラグイン配布・責任ポリシー

## 概要

このドキュメントは、Authrim プラグインの配布方式、責任分界、および互換性ポリシーを定義します。

---

## 1. 責任分界（Responsibility Model）

### Authrim の責務

1. **プラットフォームの安定性**
   - メジャーバージョン内（例: 1.x.x）で破壊的変更を行わない
   - プラグインAPI の後方互換性を維持

2. **破壊が発生した場合の対応**
   - 影響を受けるプラグインの作者に連絡
   - 修正版のリリースまたはドキュメント更新

3. **情報提供**
   - 互換性警告の表示
   - プラグインソース（読み込み元）の表示

### プラグイン作者の責務

1. **セキュリティ**
   - 脆弱性のないコードの提供
   - 依存関係の管理

2. **互換性**
   - `minAuthrimVersion` / `maxAuthrimVersion` の正確な宣言
   - Authrim バージョンアップ時の動作確認

3. **メンテナンス**
   - バグ修正
   - ユーザーサポート

### 免責事項

```
サードパーティプラグインは、その作者により提供されています。
Authrim はサードパーティプラグインのセキュリティ、信頼性、
互換性を保証しません。ご利用は自己責任でお願いします。

Third-party plugins are provided by their respective authors.
Authrim does not guarantee the security, reliability, or
compatibility of third-party plugins. Use at your own risk.
```

---

## 2. プラグインの配布方式

### 推奨される配布方式

| 方式 | 対象 | 特徴 |
|------|------|------|
| **npm パッケージ** | 公開プラグイン | バージョン管理、依存関係解決が容易 |
| **モノレポ内蔵** | 公式プラグイン | Authrim と同時リリース |
| **プライベートnpm** | 企業内プラグイン | npm の仕組みを活用しつつ非公開 |
| **ローカルファイル** | 開発・テスト用 | 最も柔軟 |

### npm パッケージの推奨構成

```json
{
  "name": "@your-org/authrim-plugin-xxx",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@authrim/ar-lib-plugin": "^1.0.0"
  },
  "keywords": ["authrim", "authrim-plugin"]
}
```

---

## 3. 公式プラグインの判定

### 判定基準

| 条件 | 判定 | UI 表示 |
|------|------|---------|
| `ar-lib-plugin/src/builtin/` 内蔵 | 公式 | ⭐ Authrim Official (Built-in) |
| npm `@authrim/*` スコープ | 公式 | ⭐ Authrim Official (npm) |
| それ以外 | コミュニティ | 🧩 Community Plugin |

### 重要な注意

- `official: true` フラグは **UI 補助情報** であり、信頼の根拠にはならない
- `author.name: 'Authrim'` は **自己申告** であり、検証されない
- 公式性は **配布経路（ソース）** のみで判定される

---

## 4. 互換性ポリシー

### Authrim のバージョニング規約

```
メジャー.マイナー.パッチ (例: 1.5.2)
   │       │      └── バグ修正（互換性維持）
   │       └────────── 機能追加（互換性維持）
   └────────────────── 破壊的変更
```

### プラグインの互換性宣言

```typescript
meta: {
  // 最小対応バージョン（必須推奨）
  minAuthrimVersion: '1.0.0',

  // 最大対応バージョン（任意）
  // メジャーバージョンが上がった場合に設定
  maxAuthrimVersion: '1.999.999',
}
```

### 起動時の互換性チェック

| 状態 | レベル | 動作 |
|------|--------|------|
| `minAuthrimVersion` より古い | ⚠️ warn | ログ出力、動作継続 |
| `maxAuthrimVersion` より新しい | ⚠️ warn | ログ出力、動作継続 |
| `stability: 'deprecated'` | ⚠️ warn | 非推奨警告 |
| `stability: 'alpha'` in production | ⚠️ warn | 本番環境警告 |

**注意:** デフォルトでは警告のみで、プラグインの読み込みは継続されます。
これは作者の宣言が保守的すぎる場合を考慮しています。

### 環境変数による制御

```bash
# 互換性チェックのレベル
PLUGIN_COMPATIBILITY_CHECK=warn   # デフォルト
PLUGIN_COMPATIBILITY_CHECK=error  # 非互換時に停止
PLUGIN_COMPATIBILITY_CHECK=ignore # チェックしない
```

---

## 5. 更新通知

### npm プラグインの場合

- Admin UI でバージョン情報を表示
- 新バージョンの有無は参考情報として提供
- **更新の判断・実行は利用者の責任**

### ローカル/プライベートプラグインの場合

- バージョン文字列のみ表示
- 更新通知機能は提供されない

---

## 6. セキュリティに関する注意

### プラグインのインストール前に確認すべきこと

1. **作者の信頼性** - 誰が開発したか
2. **ソースコード** - 可能であればレビュー
3. **依存関係** - 不審な依存がないか
4. **アクティビティ** - メンテナンスされているか

### Authrim が提供しないもの

- プラグインのセキュリティ監査
- 脆弱性スキャン
- 悪意あるプラグインの検出

---

## 7. 中央レジストリについて

### Authrim はプラグインレジストリを運営しません

理由:
- 中央集権的な管理は Authrim の思想に反する
- 作者同一性の検証が技術的に困難
- OSS と企業内利用で差が生じる

### 代替手段

- npm レジストリ（パブリック/プライベート）
- GitHub Releases
- 企業内パッケージリポジトリ

---

## 8. サードパーティプラグイン開発者向け

### 推奨プラクティス

1. **明確なメタデータ**
   ```typescript
   meta: {
     name: 'Your Plugin Name',
     description: '何をするプラグインか',
     author: {
       name: 'Your Name',
       email: 'contact@example.com', // 任意
     },
     license: 'MIT',
     minAuthrimVersion: '1.0.0',
     stability: 'stable',
   }
   ```

2. **セマンティックバージョニング**
   - 破壊的変更はメジャーバージョンで

3. **テスト**
   - Authrim の複数バージョンでテスト

4. **ドキュメント**
   - インストール方法
   - 設定オプション
   - 既知の制限

---

## 変更履歴

- 2024-12-24: 初版作成
