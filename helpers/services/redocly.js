const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const getUrlMap = require('../general/urlMap');
const github = require('./github');

const sync = async (res) => {
  const CACHE_KEY = 'redoclyData';
  const FILE_PATH = 'siteData.json';

  const KCDetails = getContent.KCDetails(res);
  const redoclyDataExisting = cacheHandle.get(CACHE_KEY, KCDetails);

  const home = await cacheHandle.ensureSingle(res, 'home', async () => {
    return getContent.home(res);
  });

  const footer = await cacheHandle.ensureSingle(res, 'footer', async () => {
    return getContent.footer(res);
  });

  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return getContent.UIMessages(res);
  });

  const platformsConfigPairings = await getContent.platformsConfigPairings(res);

  const redoclyData = {
    navigation: home[0].elements.subpages.linkedItems.map(item => { return { codename: item.system.codename, title: item.elements.title.value } }),
    footer: footer && footer.length ? footer[0] : null,
    urlMap: urlMap && urlMap.length ? urlMap : null,
    UIMessages: UIMessages && UIMessages.length ? UIMessages[0] : null,
    platformsConfig: platformsConfigPairings && platformsConfigPairings.length ? platformsConfigPairings : null,
  };

  const shouldSync = !(JSON.stringify(redoclyDataExisting) === JSON.stringify(redoclyData));

  if (shouldSync) {
    cacheHandle.put(CACHE_KEY, redoclyData, KCDetails);
    await github.createOrUpdateFileAsync({
      commitMessage: `Updates ${FILE_PATH}`,
      content: JSON.stringify(redoclyData),
      filePath: FILE_PATH
    });
  }
};

const redocly = { sync };

module.exports = redocly;
