import { Client, Message } from 'discord.js';

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
  constructor(private client: Client, private akosukesStore: AkosukesStore, private scoresStore: ScoresStore) {}

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
    // 以下は`!akosuke`コマンド以外
    if (content.startsWith('!akosuke')) { return; }
    this.sendProbablyAkosuke(message);
  }

  /** `!akosuke.set` コマンドを受け取った時、第一引数をキーに、第二引数を値にしたものを登録する。 */
  private commandSet({ channel }: Message, { body }: { body: string }) {
    const key   = body.replace(/\s.*/g, '');
    const value = body.replace(key, '').trim().replace(/^\/|\/$/g, '');
    this.akosukesStore.set(key, value);
    channel.send(`**\`${key}\`** に **\`/${value}/\`** を設定しました:pleading_face:`);
  }

  /** `!akosuke.remove` コマンドを受け取った時、第一引数にマッチする値を削除する。 */
  private commandRemove({ channel }: Message, { body: url }: { body: string }) {
    const value = this.akosukesStore.get(url);
    if (value) {
      this.akosukesStore.del(url);
      channel.send(`**\`${url}\` \`/${value}/\`** を削除しました:wave:`);
    } else {
      channel.send(`**\`${url}\`** は登録されていません:cry:`);
    }
  }

  /** `!akosuke.list` コマンドを受け取った時、値を一覧する。 */
  private async commandRanking({ channel }: Message) {
    channel.send(await this.scoresStore.showall());
  }

  /** `!akosuke.help`/`!akosuke` コマンドを受け取った時、ヘルプを表示する。 */
  private commandHelp({ channel }: Message) {
    channel.send(HELP_TEXT);
  }

  /** どのAkosukeかを検知して、成功した場合は言霊を授ける。 */
  async sendProbablyAkosuke({ channel, content, member, mentions }: Message) {
    const mentioned = !!this.client.user && mentions.has((this.client.user));
    const getAkosuke = () => {
      // メンションではないときは`process.env.PROBABLY_AKOSUKE_RATE`の確率で成功させ、それ以外は失敗させる
      if (!mentioned && Math.random() > Number(process.env.PROBABLY_AKOSUKE_RATE)) { return null; }
      const reduceFn = (urls: string[], [url, regexpStr]: [string, string]) => new RegExp(regexpStr).test(content) ? urls.concat(url) : urls;
      const urls     = Object.entries(this.akosukesStore.cache).reduce<string[]>(reduceFn, []);
      const url      = urls[new Date().getMilliseconds() % urls.length] || '';
      const regexp   = this.akosukesStore.get(url) || '';
      const score    = 1 / content.length;
      return { url, regexp, score };
    }
    const { score, url, regexp } = getAkosuke() || {};
    if (mentioned) {
      channel.send(url ? `${url} ||${regexp}||` : '言霊はありません:cry: ');
    } else if (url && score) {
      const scoreSummary = await this.scoresStore.calcAdd(member?.id, score);
      channel.send(`_\`${member?.displayName} は ${score}AP を獲得した！ 現在 ${scoreSummary}AP！\`_\n${url} ||${regexp}||`);
    } 
  }
}
