# discord-bot-probably-akosuke
heroku上で動作させることを前提とした、TypeScriptで実装しているDiscord BOTです。

## 機能
- `akosukes`の正規表現にマッチした発言に対して、対応した`Akosuke`を発言します
- マッチした歳、発言の長さで`AP`をユーザーに贈与します

## ローカルへの環境構築
### 前提
- DiscordサーバーにBOTがログインしている状態にしておくこと
- `node.js`のいい感じの環境を整えておくこと
- Heroku上で`Heroku Redis`のアドオンを有効にしておくこと

### 手順
1. 本リポジトリをクローンし、`npm i`を実行します
2. プロジェクトのルートディレクトリにある`.env.sample`をコピーして`.env`を作成します
3. `.env`の中身をいい感じに書き換えます
   - `DISCORD_TOKEN`: Discord APIを利用するために必要なトークンです。 具体的な権限はちょっとあんま覚えてないのでよしなに
   - `DISCORD_GUILD_ID`: 対象のDiscordサーバーのGuildIDです
   - `DISCORD_PRESENCE_NAME`: BOTのステータスみたいなところに表示される「○○をプレイ中」の「○○」を設定します
   - `PROBABLY_AKOSUKE_RATE`: 「たぶんあこすけ」の発生率を0.0-1.0で記述します(0は未発生、1.0が発生率最大)
   - `REDIS_URL`: 利用するRedisサーバーのURLです。 Heroku Redisアドオンの設定からそれっぽいやつを探してください
4. `npm start`を行うと、アプリが起動し指定されたDiscordサーバーでBOTが動作し始めます

## Herokuへのデプロイ
コードをクローンしていい感じにHerokuにあげたらあとはpushするたびにビルドが走ってBOTが動作し始めます。

## その他
### Akosukeとは？
本アプリにおいてキモとなる概念で、具体的には**_正規表現と発言内容がセットになったレコード_**です。
