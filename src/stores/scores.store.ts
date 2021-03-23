import { Client, Message } from 'discord.js';
import Redis from 'ioredis';

import { REDIS_URL, DISCORD_GUILD_ID, PROBABLY_AKOSUKE_RATE } from 'src/environment';
import { EntitiesStore, Entity } from 'src/stores/entities.store';

/** ストアにアクセスした結果を使いやすくするためにラップする型。 */
interface StoreResult<T = number | Record<string, string>> {
  /** ストアにアクセスした結果をユーザーフレンドリーな文字列として整形した値。 */
  pretty: string;
  /** ストアにアクセスするのに利用されたkey。 */
  key: string;
  /** ストアにアクセスして取り出されたvalue。 */
  value: T;
}

/** Entityのレアリティ情報。 */
const RARITY = {
  SSR: { id: 'SSR', border: 95, point: 5, star: ':star2: :star2: :star2: :star2: :star2:' },
  SR: { id: 'SR', border: 80, point: 3.5, star: ':star2: :star2: :star2: :star:' },
  R: { id: 'R', border: 60, point: 2, star: ':star2: :star2:' },
  N: { id: 'N', border: 0, point: 1, star: ':star2:' },
} as const;

/** orderとentitiesから該当するランクを返す。 */
const orderToScore = (order: number, entities: Entity[]) => {
  const rate = order / entities.length * 100;
  return Object.values(RARITY).sort((a, b) => b.border - a.border).find(({ border }) => border <= rate);
};

/** アプリが管理している対象ユーザー。 */
class User {
  id: string;
  score: number
  constructor(opt: User) {
    this.id    = opt.id;
    this.score = opt.score;
  }
}

/** idで指定されたmemberのAPを加算し、その合計値を返却する。 メンバーが存在しないときはnullを返す。 */
const updateRankingScore = async (redis: Redis.Redis, id: string | undefined, rarity?: keyof typeof RARITY) => {
  if (id == null || rarity == null) { return null; }
  const users: User[] = JSON.parse(await redis.get('users') || '[]');
  const user          = ((foundUser: User) => (users.includes(foundUser) || users.push(foundUser), foundUser))(users.find(x => x.id === id) || { id, score: 0 });
  const gotScore      = RARITY[rarity].point;
  user.score         += gotScore;
  await redis.set('users', JSON.stringify(users));
  return user.score;
}

/** AP(AkosukePoint)を管理するためのクラス。 */ 
export class ScoresStore {
  private redis = new Redis(REDIS_URL || '', { db: 0 });

  constructor(private client: Client, private entitiesStore: EntitiesStore) {}

  /** メンバー全員のスコアを整形して返却する。 */
  async data(): Promise<Omit<StoreResult<User[]>, 'key'>> {
    const users: User[] = JSON.parse(await this.redis.get('users') || '[]');
    const sortedUsers   = users.sort((a, b) => b.score - a.score);
    const pretty        = (await Promise.all(sortedUsers.map(async (user, i) => {
      const name = (await (await this.client.guilds.fetch(DISCORD_GUILD_ID || '')).members.fetch(user.id)).displayName;
      return `${i === 0 ? ':crown: ' : ''}${name}: _**${user.score}** AP_`;
    }))).join('\n') || ':warning: AP保持者がいません。';
    return { pretty, value: sortedUsers };
  }

  /**
   * 「たぶんスコアを加算する」関数。
   * 次の条件を判断して、たぶんスコアを加算する。
   */
  async calcAddProbably({ content, member, mentions }: Pick<Message, 'content' | 'member' | 'mentions'>): Promise<StoreResult<number>> {
    const mentioned    = !!this.client.user && mentions.has((this.client.user));
    const hasUrl       = content.includes('http');
    const failedRandom = Math.random() > (Number(PROBABLY_AKOSUKE_RATE) || 0.1);
    const entities     = [...(await this.entitiesStore.data()).value].map(([_, entity]) => entity);
    const getAkosuke   = async () => {
      // 非メンションで、なおかつhasUrl:trueかfailedRandom:trueのときは失敗させる
      if (!mentioned && (hasUrl || failedRandom)) { return null; }
      const urls   = entities.reduce<string[]>((a, { id, regexp }) => new RegExp(regexp).test(content) ? a.concat(id) : a, []);
      const url    = urls[new Date().getMilliseconds() % urls.length] || '';
      const entity = (await this.entitiesStore.get(url)).value;
      const regexp = entity?.regexp || '';
      const rarity  = orderToScore(entity?.order || 0, entities)?.id;
      return { url, regexp, rarity };
    }
    const { url, regexp, rarity } = await getAkosuke() || {};
    const key   = member?.id || '';
    const value = mentioned ? 0 : (await updateRankingScore(this.redis, key, rarity)) ?? 0;
    if (value > 0 && url) { await this.entitiesStore.downgradeEntity(url); }
    if (mentioned) {
      return { pretty: url ? `${url} \`${regexp}\`` : '言霊はありません:cry:', key, value };
    } else if (url && rarity && regexp) {
      const pretty = `_${member?.displayName} は現在 ${value} AP！_\n${url} \`${regexp}\`\n_RANK: **${rarity}** ${RARITY[rarity].star}_`;
      return { pretty, key, value };
    } else {
      return { pretty: '', key, value };
    }
  }
}
