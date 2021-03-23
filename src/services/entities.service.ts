import { Client, Message } from 'discord.js';

import { PrettyText } from 'src/lib/pretty-text';
import { EntitiesStore } from 'src/stores/entities.store';
import { ScoresStore } from 'src/stores/scores.store';

/** `GenerateText.help`に食わせるヘルプ文の定数。 */
const HELP = {
  DESC: '**「たぶんあこすけ」**は、あこすけの言霊の力(AP)をあなたに授けるDiscordボットです。',
  ITEMS: [
    ['!akosuke.set http://example.com/hoge.jpg /abc/', '`http://example.com/hoge.jpg` に正規表現 `/abc/` を設定します(上書き/新規追加)'],
    ['!akosuke.remove http://example.com/hoge.jpg', '`http://example.com/hoge.jpg` が設定されていれば削除します'],
    ['!akosuke.ranking', 'APのランキングを表示します'],
    ['!akosuke.help', '`!akosuke` コマンドのヘルプを表示します(エイリアス: `!akosuke`)']
  ]
} as const;

/** `EntitiesStore`の値を操作するサービスクラス。 */
export class EntitiesService {
  constructor(private client: Client, private entitiesStore: EntitiesStore, private scoresStore: ScoresStore) {}

  /** Clientからのイベント監視を開始する。 */
  run() {
    this.client.on('message', message => this.onMessage(message));
    return this;
  }

  /** `mesage`で関数を振り分けるファサード。 */
  private onMessage(message: Message) {
    const content   = message.content;
    const body      = content.replace(/!akosuke\.?\w*\s*\n*/, '').trim(); // コマンド以外のテキスト部分
    if (message.author.bot) { return; } // botの発言は無視
    if (content.startsWith('!akosuke.set')) { this.set(message, { body }); };
    if (content.startsWith('!akosuke.remove')) { this.remove(message, { body }); };
    if (content.startsWith('!akosuke.ranking')) { this.ranking(message); };
    if (content.startsWith('!akosuke.help') || content === '!akosuke') { this.help(message); };
    if (!content.startsWith('!akosuke')) { this.sendProbablyEntity(message); }
  }

  /** `!akosuke.set` コマンドを受け取った時、第一引数をキーに、第二引数を値にしたものを登録する。 */
  private async set({ channel }: Message, { body }: { body: string }) {
    const key   = body.replace(/\s.*/g, '');
    const value = body.replace(key, '').trim().replace(/^\/|\/$/g, '');
    channel.send(await this.entitiesStore.set(key, value).then(({ pretty }) => pretty));
  }

  /** `!akosuke.remove` コマンドを受け取った時、第一引数にマッチする値を削除する。 */
  private async remove({ channel }: Message, { body: url }: { body: string }) {
    channel.send(await this.entitiesStore.del(url).then(({ pretty }) => pretty));
  }

  /** `!akosuke.list` コマンドを受け取った時、値を一覧する。 */
  private async ranking({ channel }: Message) {
    channel.send(await this.scoresStore.data().then(({ pretty }) => pretty));
  }

  /** ヘルプを表示する。 */
  private help({ channel }: Message) {
    const text = PrettyText.helpList(HELP.DESC, ...HELP.ITEMS);
    channel.send(text);
  }

  /** どのEntityかを検知して、成功した場合は言霊を授ける。 */
  async sendProbablyEntity({ channel, member, mentions, content }: Message) {
    const storeResult = await this.scoresStore.calcAddProbably({ member, mentions, content });
    if (storeResult.pretty) { channel.send(storeResult.pretty); }
  }
}
