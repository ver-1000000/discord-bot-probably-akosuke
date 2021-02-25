require('dotenv').config();

/** `.env`ファイルから定数を読み取ってオブジェクトとして提供する環境変数。 */
export const {
  DISCORD_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_PRESENCE_NAME,
  REDIS_URL,
  PROBABLY_AKOSUKE_RATE,
} = process.env;


