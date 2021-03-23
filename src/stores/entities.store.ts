import Redis from 'ioredis';

import { REDIS_URL } from 'src/environment';
import { PrettyText } from 'src/lib/pretty-text';

/** ストアにアクセスした結果を使いやすくするためにラップする型。 */
interface StoreResult<T = string | Record<string, string>> {
  /** ストアにアクセスした結果をユーザーフレンドリーな文字列として整形した値。 */
  pretty: string;
  /** ストアにアクセスするのに利用されたkey。 */
  key: string;
  /** ストアにアクセスして取り出されたvalue。 */
  value: T;
}

export interface Entity {
  /** 一意になるURL。 */
  id: string;
  /** あこすけが呼び出される根拠となる正規表現。 */
  regexp: string;
  /** あこすけが呼び出された累計回数。 */
  order: number;
}

/** 画像と正規表現のレコードを表すクラス。 */
export class EntitiesStore {
  private redis = new Redis(REDIS_URL, { db: 0 });
  /** インメモリーで保持するEntity。 Redisのデータが書き換わるたびに`this.updateCache`で更新される。 */
  private cache: null | Map<string, Entity> = null;

  constructor() {}

  /** RedisサーバーからEntityの最新値を取得る。 */
  private async fetchData(): Promise<Map<string, Entity>> {
    const entities = await this.redis.get('entities').then(x => JSON.parse(x || '[]') as Entity[]);
    return new Map(entities.sort((a, b) => a.order - b.order).map(x => [x.id, x]));
  }

  /** 設定されている値をすべて取得する。 */
  async data(): Promise<Omit<StoreResult<Map<string, Entity>>, 'key'>> {
    const value  = this.cache == null ? await this.fetchData() : this.cache; 
    const pretty = PrettyText.markdownList('', ...[...value].map(([k, v]) => [k, v.regexp] as [string, string]));
    return { pretty, value };
  }

  /** データストアから値を取得する。 */
  async get(key: string): Promise<StoreResult<undefined | Entity>> {
    const value  = (await this.data()).value.get(key);
    const pretty = value == null ? `**${key}** は設定されていません:cry:` : ` **\`${key}\`** \`/${value.regexp}/\``;
    return { pretty, key, value };
  }

  /** データストアに値を設定する。 */
  async set(key: string, regexp: string): Promise<StoreResult<string>> {
    const entity = await this.get(key).then(async x => x.value || { id: key, regexp: regexp, order: (await this.data()).value?.size || 0 });
    const cached = (await this.data()).value;
    cached.set(key, entity);
    await this.redis.set('entities', JSON.stringify([...cached.values()]));
    const pretty = `**\`${key}\`** に **\`/${regexp}/\`** を設定しました:pleading_face:`;
    this.cache   = await this.fetchData();
    return { pretty, key, value: regexp };
  }

  /** データストアから値を削除する。 */
  async del(key: string): Promise<StoreResult<Entity | undefined>> {
    const value  = (await this.get(key)).value;
    const pretty = value == null ? `**\`${key}\`** は設定されていません:cry:` : `**\`${key}\` \`/${value.regexp}/\`** を削除しました:wave:`;
    if (value) {
      (await this.data()).value?.delete(key);
      await this.redis.del(key);
      this.cache = await this.fetchData();
    }
    return { pretty, key, value };
  }

  /** 渡されたIDのEntityをダウングレードす(orderを下げ)る。 */
  async downgradeEntity(id: string): Promise<string | null> {
    const cached   = (await this.data()).value;
    const entities = [...cached.values()];
    const entity   = cached.get(id);
    if (entity == null) { return null; }
    entity.order = Math.max(entity.order - Math.round(cached.size / 10), 0);
    entities.sort((a, b) => a.order - b.order).forEach((x, i) => x.order = i);
    return await this.redis.set('entities', JSON.stringify([...cached.values()]));
  }
}
