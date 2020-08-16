import {
  ExtensionContext,
  ViewColumn,
  window,
  workspace
} from 'vscode';

// Types
interface LineCountCache {
  [fileName: string]: number;
};

// Constants
const TOTAL_LINES_ADDED_KEY = 'totalLinesAdded';
const REWARD_LINES_KEY = 'rewardLines';
const LINE_COUNT_CACHE_KEY = 'lineCountCache';
const REWARD_THRESHOLD = 1;
const TIK_TOK_EMBED_API_PREFIX = 'https://www.tiktok.com/oembed?url=';
const TIK_TOK_VIDEOS = [
  'https://www.tiktok.com/@woetheromans/video/6852829230288473350',
  'https://www.tiktok.com/@k9vigo/video/6853852874447932677'
];

// Helper functions
function getRewardViewContent(tikTokUrl: string) {
  /* eslint-disable max-len */
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'unsafe-inline' https:">
  <title>Nice work!</title>
</head>
<body>
  <h1>Nice job!</h1>
  <div id="container">
    <h2>Loading reward...</h2>
  </div>
  <script>
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '${TIK_TOK_EMBED_API_PREFIX}${tikTokUrl}');
    xhr.addEventListener("load", function (e) {
      var res = JSON.parse(xhr.response);
      document.getElementById('container').innerHTML = res.html;
      var tikTokScript = document.createElement('script');
      tikTokScript.setAttribute('src', 'https://www.tiktok.com/embed.js');
      tikTokScript.setAttribute('async', '');
      document.getElementById('container').append(tikTokScript);
    });
    xhr.send();
  </script>
</body>
</html>`;
  /* eslint-enable max-len */
}

// Trigger this function when the extension is activated
export function activate(context: ExtensionContext) {
  // When a text document is changed, determine if the number of lines has
  // changed. If lines have been added, increment the stored value. Open the
  // reward web view if applicable.
  context.subscriptions.push(workspace.onDidChangeTextDocument(function ({
    document
  }) {
    const { lineCount, fileName } = document;

    // Get the cached line counts and update the cache
    const lineCountCache =
      context.workspaceState.get<LineCountCache>(LINE_COUNT_CACHE_KEY, {});
    const cachedCount = lineCountCache[fileName] || lineCount;
    lineCountCache[fileName] = lineCount;
    context.workspaceState.update(LINE_COUNT_CACHE_KEY, lineCountCache);

    // Get the number of lines changed, ignore if no lines are added
    const lineDiff = lineCount - cachedCount;
    if (lineDiff <= 0) { return; }

    // Increment the total lines added in storage
    let totalLinesAdded = context.globalState.get(TOTAL_LINES_ADDED_KEY, 0);
    totalLinesAdded += lineDiff;
    context.globalState.update(TOTAL_LINES_ADDED_KEY, totalLinesAdded);

    // Get the number of reward lines available and show reward view if needed
    let rewardLines = context.globalState.get(REWARD_LINES_KEY, 0);
    rewardLines += lineDiff;
    while (rewardLines > REWARD_THRESHOLD) {
      console.log('Trigger reward');
      const panel = window.createWebviewPanel(
        'rewardPanel',
        'Reward Panel',
        ViewColumn.Active,
        {
          enableScripts: true
        }
      );
      panel.webview.html = getRewardViewContent(TIK_TOK_VIDEOS[0]);
      rewardLines -= REWARD_THRESHOLD;
    }
    context.globalState.update(REWARD_LINES_KEY, rewardLines);
  }));
}

export function deactivate() {}
