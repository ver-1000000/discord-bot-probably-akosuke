import { Client } from 'discord.js';

import { AkosukesStore } from './akosukes.store';
import { ScoresStore } from './scores.store';
import { CommandByMessage } from './command-by-message';
import { DiscordClientManager } from './discord-client.manager';

/** 起点となるメインのアプリケーションクラス。 */
class App {
  constructor() {}

  /** 依存性を解決しつつアプリケーションクラスを起動する。 */
  async run() {
    const client               = new Client();
    const akosukesStore        = new AkosukesStore();
    const scoresStore          = new ScoresStore(akosukesStore, client);
    const commandByMessage     = new CommandByMessage(akosukesStore, scoresStore);
    const discordClientManager = new DiscordClientManager(client, commandByMessage);
    discordClientManager.run();
  }
}
new App().run();
