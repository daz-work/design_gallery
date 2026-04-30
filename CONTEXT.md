# design_gallery — CONTEXT.md

## 目的・ゴール
`getdesign` npmパッケージに収録されている71ブランドのデザイン仕様をカード型で一覧表示し、
クリックでブランドカラーのランディングページプレビューとデザイントークンを閲覧できるWebサイト。
AIや開発者にWebデザインの方向性を伝えるための視覚的リファレンスツール。

## 現状
- **実装完了・GitHub公開済み**（2026-04-30）
- ブランチ: `master`
- 71ブランド / 全9カテゴリ動作確認済み

## キーパーソン・ステークホルダー
- オーナー: nshot（個人プロジェクト）

## 直近のネクストアクション
- [ ] GitHub Pages でデプロイ（任意）

## 重要な経緯・決定事項
- ローカルパス: `C:\Users\nshot\projects\design_gallery`
- GitHub: https://github.com/daz-work/design_gallery
- データソース: `getdesign` npm パッケージ（ローカルバンドル済みテンプレート）— GitHub API 不使用
- 出力: `data.js`（`window.DESIGN_DATA`）— file:// CORS 回避のため JSON ではなく JS ファイル
- `node fetch-data.js` で全データ再生成可能（ネットワーク不要）
- 更新フロー: `npm install getdesign@latest && node fetch-data.js`
