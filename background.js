chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({color: '#3aa757'}, () => {
    console.log("The color is green.");
  });
});

var CONTEXT_MENU_ID = 'trashblock-report-trash';

chrome.contextMenus.create({
  'id': CONTEXT_MENU_ID,
  'title': "Report trash",
  'contexts': ['all']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("info = ", info);
  console.log("tab = ", tab);

  if (info.menuItemId == CONTEXT_MENU_ID) {
    chrome.tabs.sendMessage(tab.id, 'TrashBlock_ReportTrash');
  }
});
