# Release Build

リリースビルドを行うスキルです。

## 手順

1. ユーザーに新しいバージョン番号を確認する（例: `0.1.6`）
2. `package.json` の `version` フィールドを新しいバージョン番号に更新する
3. `npm run build` を実行する（clean → TypeScriptコンパイル → electron-builder）
4. `dist/*.exe` が生成されていることを確認して報告する

## 注意事項

- バージョン番号は `package.json` の `version` フィールドのみ変更する
- ビルド成功後、`dist/jpnkn-onecomme-bridge-<version>.exe` が存在することを確認すること
- ビルドコマンド: `npm run build`（`package.json` の scripts に定義済み）
