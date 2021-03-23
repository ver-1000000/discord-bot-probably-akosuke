import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Client, ClientUser } from 'discord.js';

import { DISCORD_TOKEN } from 'src/environment';
import { EntitiesStore } from 'src/stores/entities.store';

import { EntitiesService } from 'src/services/entities.service';
import { ScoresStore } from './stores/scores.store';

/** 起点となるメインのアプリケーションクラス。 */
class App {
  constructor(private client: Client) {}

  /** アプリケーションクラスを起動する。 */
  run() {
    this.confirmToken();
    this.launchWarmGlitch();
    this.client.on('ready', () => this.initializeBotStatus(this.client.user));
    this.client.login(DISCORD_TOKEN);
  }

  /** DISCORD_LOGIN_TOKENが設定されていなければ異常終了させる。 */
  private confirmToken() {
    if (DISCORD_TOKEN) { return; }
    console.log('DISCORD_TOKENが設定されていません。');
    process.exit(1);
  }

  /** Glitchのコールドスタート対策用のサービングを開始する。 */
  private launchWarmGlitch() {
    const whenPost = (req: IncomingMessage, res: ServerResponse) => {
      const chunks: string[] = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const data  = chunks.join();
        console.log(`requested: ${data}`);
        res.end();
      });
    };
    createServer((req, res) => {
      if (req.method == 'POST') { whenPost(req, res); }
    }).listen(3000);
  }

  /** readyイベントにフックして、ボットのステータスなどを設定する。 */
  private initializeBotStatus(user: ClientUser | null) {
    console.log('ready...');
    user?.setPresence({ activity: { name: 'みんなの発言', type: 'WATCHING' } });
  }
}

/** 依存を解決しつつアプリケーションを起動する。 */
(() => {
  const client      = new Client();
  const entityStore = new EntitiesStore();
  const scoresStore = new ScoresStore(client, entityStore);
  new EntitiesService(client, entityStore, scoresStore).run();
  new App(client).run();
})();
