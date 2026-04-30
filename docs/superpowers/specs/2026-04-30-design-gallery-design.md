# design-gallery 設計ドキュメント

**作成日**: 2026-04-30  
**ステータス**: 承認済み

---

## 概要

[awesome-design-md](https://github.com/voltagent/awesome-design-md) に収録されている59ブランドのデザイン仕様書を、カード型ギャラリーとして一覧・プレビューできるWebサイト。

**用途**: Webデザインの方向性をAIや開発者に伝えるときの視覚的リファレンスツール。

---

## ファイル構成

```
design-gallery/
├── index.html            ← カードギャラリー本体
├── style.css             ← レイアウト・共通スタイル
├── data.json             ← 全ブランドデータ（fetch-data.jsが生成）
├── fetch-data.js         ← GitHub APIからDESIGN.mdを取得しdata.jsonを生成するNode.jsスクリプト
└── package.json          ← 依存: getdesign のみ
```

---

## data.json スキーマ

ブランドごとに以下の構造：

```json
{
  "brands": [
    {
      "slug": "stripe",
      "name": "Stripe",
      "category": "Fintech & Crypto",
      "colors": {
        "primary": "#635BFF",
        "background": "#0A2540",
        "surface": "#1A3A5C",
        "text": "#FFFFFF",
        "accent": "#00D4FF"
      },
      "fonts": {
        "heading": "Söhne",
        "body": "Söhne"
      },
      "description": "Payment platforms, gradient-heavy designs, premium fintech UIs",
      "personality": "Gradient-forward aesthetic, weight-300 elegance, signature purple"
    }
  ]
}
```

**カテゴリ一覧**（フィルター用）:
- AI & LLM Platforms
- Developer Tools & IDEs
- Backend, Database & DevOps
- Productivity & SaaS
- Design & Creative Tools
- Fintech & Crypto
- E-commerce & Retail
- Media & Consumer Tech
- Automotive

---

## ギャラリー画面（index.html）

### レイアウト
- ヘッダー: サイトタイトル + カテゴリフィルターボタン
- メイン: カードグリッド（CSS Grid、3〜4列、レスポンシブ）

### カードデザイン
各カードはそのブランドの `colors.background` を背景色、`colors.text` を文字色として装飾。

```
┌────────────────────────────────┐
│  [ブランド名]        [カテゴリ] │  ← brand bg color
│                                │
│  ████ ████ ████ ████           │  ← カラースウォッチ（主要4〜5色）
│                                │
│  Font: Söhne                   │  ← heading font
│                                │
│  "Payment, gradient-heavy..."  │  ← description
└────────────────────────────────┘
```

### インタラクション
- カテゴリフィルターボタンでカード絞り込み（JS、リロード不要）
- カードクリックでモーダルを開く

---

## モーダル（カード詳細）

カードクリックで全画面モーダルが開く。2タブ構成。

### タブ1: ミニランディングページ

共通テンプレートにブランドデータを注入してレンダリング。

セクション構成:
1. **ナビゲーションバー** — ロゴ（ブランド名）+ ナビリンク + CTAボタン
2. **ヒーローセクション** — キャッチコピー + サブテキスト + CTAボタン2つ
3. **フィーチャーセクション** — アイコン付き特徴カード × 3
4. **CTAバナー** — シンプルな行動喚起エリア

スタイル適用方法: JavaScriptで `data.json` の色・フォント情報をCSSカスタムプロパティとしてモーダル内に注入。

### タブ2: デザイントークン一覧

- **カラーパレット** — 各色のスウォッチ + HEX値
- **タイポグラフィ** — フォント名、ウェイト別サンプルテキスト
- **コンポーネントサンプル** — ボタン（プライマリ/セカンダリ）、カード、バッジ

---

## fetch-data.js の動作

GitHub APIは使わない。`getdesign` npmパッケージにDESIGN.mdが全テンプレートとしてローカルバンドルされているため、それを直接読み込む。

1. `node_modules/getdesign/templates/*.md` を全件読み込み
2. 各DESIGN.mdからカラーコード（HEX）・フォント名・説明文を正規表現で抽出
3. `data.json` に書き出し

**更新フロー**:
```bash
npm install getdesign@latest   # 新ブランド・更新を取得
node fetch-data.js             # data.json を再生成
```

- ネットワーク不要（npm install 時のみ）
- APIレート制限なし
- オフライン動作可能
- 現在のテンプレート数: 72ブランド

---

## 実装進め方

**フェーズ1（先行実装・検証）**:  
Stripe、Apple、Notionの3ブランドで動作確認。カード表示・モーダル・両タブをすべて検証。

**フェーズ2（全展開）**:  
fetch-data.jsで全59ブランドを取得してdata.jsonを生成。問題なければそのまま反映。

---

## 非機能要件

- ビルド不要（HTML/CSS/JSのみ、ローカルファイルで動作）
- GitHub Pagesでそのままデプロイ可
- `data.json` は `fetch-data.js` が常に上書き再生成する（手動編集は不要）
