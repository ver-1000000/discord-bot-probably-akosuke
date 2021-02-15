import { Client, ClientUser } from 'discord.js';

import { CommandByMessage } from './command-by-message';

/** ディスコードサーバーの挙動を管理するクラス。 */
export class DiscordClientManager {
  constructor(private client: Client, private commandByMessage: CommandByMessage) {}

  /** アプリケーションクラスを起動する。 */
  run() {
    this.confirmToken();
    this.client.on('ready', () => this.initializeBotStatus(this.client.user));
    this.client.on('message', message => this.commandByMessage.run(message));
    this.client.login(process.env.DISCORD_TOKEN);
  }

  /** DISCORD_LOGIN_TOKENが設定されていなければ異常終了させる。 */
  private confirmToken() {
    if (process.env.DISCORD_TOKEN) { return; }
    console.log('DISCORD_TOKENが設定されていません。');
    process.exit(1);
  }

  /** readyイベントにフックして、ボットのステータスなどを設定する。 */
  private initializeBotStatus(user: ClientUser | null) {
    console.log('ready...');
    user?.setPresence({ activity: { name: process.env.DISCORD_PRESENCE_NAME || 'たぶんあこすけ' } });
  }
}
