require('dotenv').config();

import Redis from 'ioredis';

import { Client, Message } from 'discord.js';
import { AkosukesStore } from './akosukes.store';

const REDIS_URL             = process.env.REDIS_URL || '';
const DISCORD_GUILD_ID      = process.env.DISCORD_GUILD_ID || '';
const PROBABLY_AKOSUKE_RATE = Number(process.env.PROBABLY_AKOSUKE_RATE || 0.1);

/** ストアにアクセスした結果を使いやすくするためにラップする型。 */
interface StoreResult<T = number | Record<string, string>> {
  /** ストアにアクセスした結果をユーザーフレンドリーな文字列として整形した値。 */
  pretty: string;
  /** ストアにアクセスするのに利用されたkey。 */
  key: string;
  /** ストアにアクセスして取り出されたvalue。 */
  value: T;
}

/** AP(AkosukePoint)を管理するためのクラス。 */ 
export class ScoresStore {
  private redis = new Redis(REDIS_URL || '', { db: 1 });

  constructor(private akosukesStore: AkosukesStore, private client: Client) {
  }

  /** idで指定されたmemberのAPを加算し、その合計値を返却する。 メンバーが存在しないときはnullを返す。 */
  private async calcAdd(id: string | undefined, score: number) {
    if (id == null) { return null; }
    const currentScore = Number(await this.redis.get(id)) || 0;
    const sumScore     = Math.ceil((currentScore + score) * 100) / 100; // 浮動小数点の端数が出ないようにceil
    await this.redis.set(id, sumScore);
    return sumScore;
  }

  /** メンバー全員のスコアを整形して返却する。 */
  async data(): Promise<Omit<StoreResult<Record<string, string>>, 'key'>> {
    const keys         = await this.redis.keys('*');
    const keyValues    = await Promise.all(keys.map(async key => [key, await this.redis.get(key).then(value => value || '')]));
    const sortedScores = keyValues.sort(([_a, aValue], [_b, bValue]) => Number(bValue) - Number(aValue));
    const value        = Object.fromEntries(sortedScores);
    const pretty       = (await Promise.all(sortedScores.map(async ([key, value], i) => {
      const name = (await (await this.client.guilds.fetch(DISCORD_GUILD_ID)).members.fetch(key)).displayName;
      return `${i === 0 ? ':crown: ' : ''}${name}: _**${value}** AP_`;
    }))).join('\n') || ':warning: AP保持者がいません。';;
    return { pretty, value }
  }

  /**
   * 「たぶんスコアを加算する」関数。
   * 次の条件を判断して、たぶんスコアを加算する。
   */
  async calcAddProbably({ content, member, mentions }: Pick<Message, 'content' | 'member' | 'mentions'>): Promise<StoreResult<number>> {
    const mentioned = !!this.client.user && mentions.has((this.client.user));
    const getAkosuke = async () => {
      // メンションではないときは`PROBABLY_AKOSUKE_RATE`の確率で成功させ、それ以外は失敗させる
      if (!mentioned && Math.random() > PROBABLY_AKOSUKE_RATE) { return null; }
      const reduceFn = (urls: string[], [url, regexpStr]: [string, string]) => new RegExp(regexpStr).test(content) ? urls.concat(url) : urls;
      const urls     = Object.entries((await this.akosukesStore.data()).value).reduce<string[]>(reduceFn, []);
      const url      = urls[new Date().getMilliseconds() % urls.length] || '';
      const regexp   = (await this.akosukesStore.get(url)).value || '';
      const score    = 1 / content.length;
      return { url, regexp, score };
    }
    const { score, url, regexp } = await getAkosuke() || {};
    const key   = member?.id || '';
    const value = mentioned ? 0 : (await this.calcAdd(key, score || 0)) ?? 0;
    if (mentioned) {
      return { pretty: url ? `${url} ||${regexp}||` : '言霊はありません:cry:', key, value };
    } else if (url && score && regexp) {
      return { pretty: `_\`${member?.displayName} は ${score}AP を獲得した！ 現在 ${value}AP！\`_\n${url} ||${regexp}||`, key, value };
    } else {
      return { pretty: '', key, value };
    }
  }
}
