# graphql-codegen-plugin-typescript-swr スモークテストアプリ

`swr` / `graphql-request` / `graphql` / `react` などの依存パッケージを更新した際に、生成された SWR フックが実際にブラウザ上で動作するかを目視確認するための React + Tailwind CSS 製アプリです。バックエンドは [MSW](https://mswjs.io/) でブラウザ内にモックしているため、`yarn dev` だけで完結します。

## 使い方(依存パッケージ更新時のスモークテスト手順)

1. ルートで依存を更新する(`package.json` の `swr` / `graphql-request` / `graphql` / `react` 等、あるいは `sample/package.json` 側の対応するバージョン)
2. ルートで `yarn build`(プラグイン本体をビルド)
3. ルートで `yarn sample:codegen`(`sample/src/generated/*.ts` を再生成)
4. `sample` で `yarn install`(依存を変更した場合)
   - `msw` を更新した場合は追加で `npx msw init public --save` を実行し、Service Worker スクリプトを再生成する。
5. `sample` で `yarn dev` を起動し、各タブを目視確認する

## デモ画面

| タブ | 確認内容 |
|---|---|
| 基本クエリ | デフォルト設定の `useComment` フック(key を明示) |
| autogenSWRKey | `autogenSWRKey: true` の key 省略パターン |
| useSWRInfinite | `useSWRInfinite: ["Feed"]` によるページネーション(※既知の制約あり、下記参照) |
| excludeQueries | 除外されたクエリはフックではなく素の Promise 関数になること |
| mutation | `submitComment` / `vote` と `mutate()` によるキャッシュ再検証 |
| Authorization | JWT ヘッダーの有無で `currentUser` が変わること |

## スキーマ・モックデータ

`dev-test/githunt` のスキーマ・ドキュメント(GitHunt サンプルスキーマ)をそのまま使用しています。バックエンドは持たず、`src/mocks/data.ts` のインメモリデータを `src/mocks/handlers.ts` の MSW ハンドラが返します。

## 既知の制約

- **`rawRequest: true` は未対応です。** 現状のプラグイン(`src/visitor.ts`)には、`rawRequest: true` を指定しても生成される SWR フック側の型・実装が raw レスポンス形式に対応せず、常に通常のレスポンス型のまま生成される既知の不具合があります(`getSdk()` の素の関数側は正しく raw 対応します)。最新の swr(v2 系)と組み合わせると型エラーになるため、本アプリのデモ対象からは除外しています。
- **`useSWRInfinite` によるページネーションが swr v2 系では機能しません。** 「useSWRInfinite」タブで「もっと読み込む」をクリックしても `offset` が更新されず、常に1ページ目のデータを再取得します(React コンソールにも重複 key の警告が出ます)。原因は、プラグイン(`src/visitor.ts` の `generateFetcher`)が生成するフェッチャーが `(id, fieldName, fieldValue)` という3引数呼び出しを前提としている点です。これは swr v1 系で配列キーがフェッチャーに spread して渡されていた挙動に依存しており、swr v2.5.1 ではキー配列がそのまま1つの引数として渡される(spread されない)ため、`fieldName` / `fieldValue` が `undefined` になり `offset` がマージされません。
- `graphql-request` は `^4.3.0` に固定しています。v5 以降は `package.json` の `exports` フィールドでサブパスが制限され、本プラグインが生成する `graphql-request/dist/types` / `graphql-request/dist/types.dom` の import が解決できなくなるためです。
- Next.js 固有の SSR/SSG(`getStaticProps` 等)の再現は行っていません。
