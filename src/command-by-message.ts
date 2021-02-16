import { Message } from 'discord.js';

import { AkosukesStore } from './akosukes.store';
import { ScoresStore } from './scores.store';

/** ヘルプ時に表示するヒアドキュメント。 */
const HELP_TEXT = `
**「たぶんあこすけ」**は、あこすけの言霊の力(AP)をあなたに授けるDiscordボットです。
_**\`!akosuke.set http://example.com/hoge.jpg /abc/ \`**_ - \`http://example.com/hoge.jpg\` に正規表現 \`/abc/\` を設定します(上書き/新規追加)
_**\`!akosuke.remove http://example.com/hoge.jpg    \`**_ - \`http://example.com/hoge.jpg\` が設定されていれば削除します
_**\`!akosuke.ranking                               \`**_ - APのランキングを表示します
_**\`!akosuke.help                                  \`**_ - \`!akosuke\` コマンドのヘルプを表示します(エイリアス: \`!akosuke\`)
`

/** Messageを解析してコマンドを判定し、コマンドごとに処理を行うクラス。 */
export class CommandByMessage {
  constructor(private akosukesStore: AkosukesStore, private scoresStore: ScoresStore) {}

  /** Messageから各処理を呼び出すFacade関数。 */
  run(message: Message) {
    const content   = message.content;
    const body      = content.replace(/!akosuke\.?\w*\s*\n*/, '').trim(); // コマンド以外のテキスト部分
    const isCommand = (command: string) => content.startsWith(`!akosuke.${command}`);
    if (message.author.bot) { return; } // botの発言は無視
    if (isCommand('set')) { this.commandSet(message, { body }); };
    if (isCommand('remove')) { this.commandRemove(message, { body }); };
    if (isCommand('ranking')) { this.commandRanking(message); };
    if (isCommand('help') || content === '!akosuke') { this.commandHelp(message); };
    if (!content.startsWith('!akosuke')) { this.sendProbablyAkosuke(message); }
  }

  /** `!akosuke.set` コマンドを受け取った時、第一引数をキーに、第二引数を値にしたものを登録する。 */
  private async commandSet({ channel }: Message, { body }: { body: string }) {
    const key   = body.replace(/\s.*/g, '');
    const value = body.replace(key, '').trim().replace(/^\/|\/$/g, '');
    channel.send(await this.akosukesStore.set(key, value).then(({ pretty }) => pretty));
  }

  /** `!akosuke.remove` コマンドを受け取った時、第一引数にマッチする値を削除する。 */
  private async commandRemove({ channel }: Message, { body: url }: { body: string }) {
    channel.send(await this.akosukesStore.del(url).then(({ pretty }) => pretty));
  }

  /** `!akosuke.list` コマンドを受け取った時、値を一覧する。 */
  private async commandRanking({ channel }: Message) {
    channel.send(await this.scoresStore.data().then(({ pretty }) => pretty));
  }

  /** `!akosuke.help`/`!akosuke` コマンドを受け取った時、ヘルプを表示する。 */
  private commandHelp({ channel }: Message) {
    channel.send(HELP_TEXT);
  }

  /** どのAkosukeかを検知して、成功した場合は言霊を授ける。 */
  async sendProbablyAkosuke({ channel, member, mentions, content }: Message) {
    const storeResult = await this.scoresStore.calcAddProbably({ member, mentions, content });
    if (storeResult.pretty) { channel.send(storeResult.pretty); }
  }
}
