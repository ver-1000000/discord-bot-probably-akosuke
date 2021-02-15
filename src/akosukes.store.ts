import Redis from 'ioredis';

/** 画像と正規表現のレコードを表すクラス。 */
export class AkosukesStore {
  private redis = new Redis(process.env.REDIS_URL || '', { db: 0 });
  /** インメモリーで保持するAkosuke。 Redisのデータが書き換わるたびに`this.updateCache`で更新される。 */
  cache: Record<string, string> = {};

  constructor() {
    this.updateCache();
  }

  /** Redisサーバーからakosukesの最新値を取得し、srcを更新する。 */
  private async updateCache(): Promise<void> {
    const keys      = await this.redis.keys('*');
    const keyValues = await Promise.all(keys.map(async key => [key, await this.redis.get(key).then(value => value || '')]));
    this.cache      = Object.fromEntries(keyValues);
  }

  /** データストアに値を設定する。 */
  async set(url: string, regexpStr: string): Promise<void> {
    await this.redis.set(url, regexpStr);
    await this.updateCache();
  }

  /** データストアから値を削除する。 */
  async del(url: string): Promise<void> {
    await this.redis.del(url);
    await this.updateCache();
  }

  /** データストアから値を取得する。 */
  get(url: string): string | undefined {
    return this.cache[url];
  }
}
