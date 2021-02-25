/** いい感じに整形された文を作成するヘルパー関数。 */
export class PrettyText {
  /** Discordのコード記法(バッククォート3つで囲み、ファイルタイプを指定する記述)を作成しやすくする関数。 */
  static code = (value: string, type = 'md') => `\`\`\`${type}\n${value}\`\`\``;
  /**
   * 整形されたヘルプのリストを作成する。
   * @param desc        リストの概要/タイトル
   * @param ...items[0] 箇条書き項目のタイトル(半角英数字)
   * @param ...items[1] 箇条書き項目の説明(改行なしの短文)
   */
  static helpList = (desc: string, ...items: Readonly<[string, string]>[]) => {
    const padEndCount = Math.max(...items.map(([key, _]) => key.length));
    const body        = items.map(([key, value]) => `_**\`${key.padEnd(padEndCount)}\`**_ - ${value}`).join('\n');
    return desc + '\n\n' + body;
  }
  /**
   * 整形されたマークダウンのリストを作成する。
   * @param desc        リストの概要/タイトル
   * @param ...items[0] 箇条書き項目のタイトル(半角英数字)
   * @param ...items[1] 箇条書き項目の説明(マークダウン)
   */
  static markdownList = (desc: string, ...items: [string, string][]) => {
    const body = items.map(([key, value]) => `# **${key}**${value ? '\n' + PrettyText.code(value, 'md') : '\n'}`).join('\n');
    return desc ? desc + '\n\n' + body : body;
  }
}
