require('dotenv').config();

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';

/** ストアにアクセスした結果を使いやすくするためにラップする型。 */
interface StoreResult<T = string | Record<string, string>> {
  /** ストアにアクセスした結果をユーザーフレンドリーな文字列として整形した値。 */
  pretty: string;
  /** ストアにアクセスするのに利用されたkey。 */
  key: string;
  /** ストアにアクセスして取り出されたvalue。 */
  value: T;
}

/** 画像と正規表現のレコードを表すクラス。 */
export class AkosukesStore {
  private redis = new Redis(REDIS_URL, { db: 0 });
  /** インメモリーで保持するAkosuke。 Redisのデータが書き換わるたびに`this.updateCache`で更新される。 */
  private cache: null | Record<string, string> = null;

  constructor() {}

  /** データストアから値を取得する。 */
  async get(key: string): Promise<StoreResult<string | undefined>> {
    const value  = (await this.data()).value[key];
    const pretty = value == null ? `**${key}** は設定されていません:cry:` : ` **\`${key}\`** \`/${value}/\``;
    return { pretty, key, value };
  }

  /** Redisサーバーからakosukesの最新値を取得し、srcを更新する。 */
  private async fetchData(): Promise<Record<string, string>> {
    const keys      = await this.redis.keys('*');
    const keyValues = await Promise.all(keys.map(async key => [key, await this.redis.get(key).then(value => value || '')]));
    return Object.fromEntries(keyValues);
  }

  /** データストアに値を設定する。 */
  async set(key: string, value: string): Promise<StoreResult<string>> {
    await this.redis.set(key, value);
    const pretty = `**\`${key}\`** に **\`/${value}/\`** を設定しました:pleading_face:`;
    this.cache   = await this.fetchData();
    return { pretty, key, value };
  }

  /** データストアから値を削除する。 */
  async del(key: string): Promise<StoreResult<string | undefined>> {
    const value  = (await this.get(key)).value;
    const pretty = value == null ? `**\`${key}\`** は設定されていません:cry:` : `**\`${key}\` \`/${value}/\`** を削除しました:wave:`;
    if (value) {
      await this.redis.del(key);
      this.cache = await this.fetchData();
    }
    return { pretty, key, value };
  }

  /** 設定されている値をすべて取得する。 */
  async data(): Promise<Omit<StoreResult<Record<string, string>>, 'key'>> {
    const value    = this.cache == null ? await this.fetchData() : this.cache; 
    const prettyFn = ([key, value]: [string, string]) => ` **\`${key}\`** \`/${value}/\``;
    const pretty   = Object.entries<string>(value).map(prettyFn).join('\n') || `あこすけがひとつも設定されていません:cry:`;;
    return { pretty, value };
  }
}
