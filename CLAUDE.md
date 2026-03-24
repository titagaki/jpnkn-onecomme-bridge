# CLAUDE.md - AI開発者向けコンテキスト

## プロジェクト概要

**jpnkn Fast → わんコメ ブリッジ**は、jpnkn掲示板のMQTTストリームをリアルタイムで購読し、わんコメ（OneComme）のHTTP APIに自動転送するElectronアプリケーション。配信者が掲示板のレスをわんコメで表示・読み上げできるようにするトレイ常駐型ブリッジアプリ。

### 技術スタック

- TypeScript 5.9（strict モード）
- Electron 31.0
- MQTT: mqtt 5.5.0
- HTTP: axios 1.7.0
- 設定: electron-store 9.0.0
- テスト: Jest 29.7.0 + ts-jest
- ビルド: Portable .exe（インストール不要、Windows 10/11）

## アーキテクチャ

### モジュール構成

```
main.ts                     # エントリーポイント
├── src/window.ts           # ウィンドウ管理
├── src/tray.ts             # トレイアイコン
├── src/bridge.ts           # MQTTブリッジ
├── src/onecomme-client.ts  # わんコメAPI呼び出し
├── src/ipc-handlers.ts     # IPCハンドラー
└── src/transform.ts        # データ変換
```

### Electronプロセス構成

- **Main Process** ([main.ts](main.ts)): Node.js環境。アプリライフサイクル、MQTT接続、HTTP通信
- **Renderer Process** ([src/renderer.ts](src/renderer.ts)): ブラウザ環境。設定UI表示とユーザー操作
- **Preload Script** ([preload.ts](preload.ts)): `contextBridge` でAPIを公開。最小限の実装のみ

### データフロー

```
jpnkn MQTT
  ↓ (body: "名前<>mail<>日時<>本文<>", no, bbsid, threadkey)
BridgeManager (bridge.ts)
  ↓
parsePayload (transform.ts) → UI表示用テキスト
transformJpnknToOneComme (transform.ts) → わんコメペイロード
  ↓
postToOneComme (onecomme-client.ts)
  ↓
わんコメ HTTP API (http://127.0.0.1:11180/api/comments)
```

## API仕様

### jpnkn MQTT

```typescript
interface JpnknPayload {
  body: string;       // "名前<>メール<>日時<>本文<>"
  no: string;         // レス番号（文字列）
  bbsid: string;      // 板ID
  threadkey: string;  // スレッドキー
}

const MQTT_CONFIG = {
  URL: 'mqtt://bbs.jpnkn.com:1883',
  USERNAME: 'genkai',
  PASSWORD: '7144',
  KEEPALIVE: 60,
  RECONNECT_PERIOD: 3000
} as const;
```

### わんコメ HTTP API

- **URL**: `http://127.0.0.1:11180/api/comments`
- **Method**: POST / Content-Type: application/json

```typescript
interface OneCommePayload {
  service: {
    id: string;  // 枠ID（設定画面で入力）
  };
  comment: {
    id: string;      // "jpnkn:bbsid:threadkey:no"
    userId: string;  // mailフィールドまたは "jpnkn:anonymous"
    name: string;    // 名前または "名無し"
    comment: string; // 本文
  };
}
```

詳細は [docs/onecomme-api-spec.md](docs/onecomme-api-spec.md) を参照。

## コーディング規約

- 定数: `UPPER_SNAKE_CASE` / 関数・変数: `camelCase` / 型・インターフェース: `PascalCase` / ファイル名: `kebab-case.ts`
- インポートは `.js` 拡張子を明示（ESM）、型インポートは `import type` を使用
- エラーメッセージは英語（コード内）、UIメッセージは日本語
- ファイル参照は必ずMarkdownリンク形式で記述（バックティック使用禁止）

## テスト

テストは `tests/transform.test.ts`（24テスト）に集約。新形式専用（旧形式のテストは存在しない）。

実行: `npm test`

## ビルド

```bash
npm run build   # TypeScriptコンパイル
npm run dist    # Electronパッケージング
npm run clean   # distディレクトリ削除
```

出力: `dist/jpnkn-fast-onecomme-bridge-0.1.0-portable.exe`

## 制約事項（厳守）

### Electronセキュリティ

- preload.ts では `contextBridge` と `ipcRenderer` のみ使用
- Main Process でのみ `ipcMain` を使用
- Renderer Process では `window.bridge` 経由でのみ Main と通信
- preload.ts で Node.js API を直接呼び出し禁止

### 変更時のルール

- 既存の動作を変更する場合は必ず理由を明示し、テストを追加する
- `app.setLoginItemSettings` などのOS依存機能は慎重に実装
- 不要な依存パッケージを追加しない

### エラーハンドリング（必須）

- MQTT接続エラーは自動リトライ（reconnectPeriod: 3秒）
- HTTP POSTエラーはログ出力し、UIに通知する

## よくある開発タスク

### 新しいMQTTフィールドの追加

1. [src/transform.ts](src/transform.ts) の `JpnknPayload` に型を追加
2. `transformJpnknToOneComme` 関数でマッピング処理を追加
3. [tests/transform.test.ts](tests/transform.test.ts) にテストを追加
4. [docs/jpnkn-api-spec.md](docs/jpnkn-api-spec.md) を更新

### 新しい設定項目の追加

1. [config.ts](config.ts) の `StoreSchema` に型を追加
2. [src/ipc-handlers.ts](src/ipc-handlers.ts) の get-config/set-config に追加
3. [src/index.html](src/index.html) にUI要素を追加
4. [src/renderer.ts](src/renderer.ts) で保存/読み込み処理を追加

## トラブルシューティング

- **MQTTに接続できない**: ファイアウォール設定・jpnknサーバーステータスを確認
- **わんコメにコメントが表示されない**: 枠IDの確認、わんコメのHTTP API設定を有効化、ログでPOSTエラーを確認
- **ビルドエラー**: `npm run clean` 後に再ビルド、または `node_modules` 削除後 `npm install`

## 関連ドキュメント

- [README.md](README.md) - ユーザー向けドキュメント
- [docs/architecture.md](docs/architecture.md) - アーキテクチャ詳細
- [docs/jpnkn-api-spec.md](docs/jpnkn-api-spec.md) - jpnkn API仕様
- [docs/onecomme-api-spec.md](docs/onecomme-api-spec.md) - わんコメAPI仕様
