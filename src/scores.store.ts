import Redis from 'ioredis';
import { Client } from 'discord.js';

/** AP(AkosukePoint)を管理するためのクラス。 */ 
export class ScoresStore {
  private redis = new Redis(process.env.REDIS_URL || '', { db: 1 });

  constructor(private client: Client) {}

  /** idで指定されたmemberのAPを加算し、その合計値を返却する。 メンバーが存在しないときはnullを返す。 */
  async calcAdd(id: string | undefined, score: number) {
    if (id == null) { return null; }
    const currentScore = Number(await this.redis.get(id)) || 0;
    const sumScore     = Math.ceil((currentScore + score) * 100) / 100; // 浮動小数点の端数が出ないようにceil
    await this.redis.set(id, sumScore);
    return sumScore;
  }

  /** メンバー全員のスコアを整形して返却する。 */
  async showall() {
    const keys         = await this.redis.keys('*');
    const keyValues    = await Promise.all(keys.map(async key => [key, await this.redis.get(key).then(value => value || '')]));
    const sortedScores = keyValues.sort(([_a, aValue], [_b, bValue]) => Number(bValue) - Number(aValue));
    const trimedScores = await Promise.all(sortedScores.map(async ([k, v], i) => {
      const name = (await (await this.client.guilds.fetch(process.env.DISCORD_GUILD_ID || '')).members.fetch(k)).displayName;
      return `${i === 0 ? ':crown: ' : ''}${name}: _**${v}** AP_`;
    }));
    return trimedScores.join('\n') || ':warning: AP保持者がいません。';
  }
}
