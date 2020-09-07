(function() {
  let blockingMode;
  let reblogSelector;

  const processPosts = async function() {
    const { timelineObject } = await fakeImport('/src/util/react_props.js');

    [...document.querySelectorAll('[data-id]:not(.xkit-cleanfeed-done)')]
    .forEach(async postElement => {
      postElement.classList.add('xkit-cleanfeed-done');

      if (blockingMode === 'all') {
        postElement.classList.add('xkit-cleanfeed-hidden');
        return;
      }

      const postTimelineObject = await timelineObject(postElement.dataset.id);

      {
        const {blog: {isAdult}} = postTimelineObject;
        if (isAdult) {
          postElement.classList.add('xkit-cleanfeed-hidden');
          return;
        }
      }

      const reblogs = postElement.querySelectorAll(reblogSelector);
      const {trail} = postTimelineObject;
      trail.forEach((trailItem, i) => {
        if (trailItem.blog === undefined) {
          return;
        }

        const {blog: {isAdult}} = trailItem;
        if (isAdult) {
          reblogs[i].classList.add('xkit-cleanfeed-hidden');
        }
      });
    });
  };

  const unProcessPosts = function() {
    $('.xkit-cleanfeed-done').removeClass('xkit-cleanfeed-done');
    $('.xkit-cleanfeed-hidden').removeClass('xkit-cleanfeed-hidden');
  };

  const onStorageChanged = function(changes, areaName) {
    if (areaName !== 'local') {
      return;
    }

    const {
      'cleanfeed.preferences.blockingMode': blockingModeChanges,
    } = changes;

    if (blockingModeChanges) {
      ({newValue: blockingMode} = blockingModeChanges);

      unProcessPosts();
      processPosts();
    }
  };

  const main = async function() {
    browser.storage.onChanged.addListener(onStorageChanged);
    const { getPreferences } = await fakeImport('/src/util/preferences.js');
    const { onNewPosts } = await fakeImport('/src/util/mutations.js');
    const { keyToCss } = await fakeImport('/src/util/css_map.js');

    reblogSelector = await keyToCss('reblog');

    ({blockingMode} = await getPreferences('cleanfeed'));

    onNewPosts.addListener(processPosts);
    processPosts();
  };

  const clean = async function() {
    browser.storage.onChanged.removeListener(onStorageChanged);
    const { onNewPosts } = await fakeImport('/src/util/mutations.js');
    onNewPosts.removeListener(processPosts);
    unProcessPosts();
  };

  const stylesheet = '/src/scripts/cleanfeed.css';

  return { main, clean, stylesheet };
})();
