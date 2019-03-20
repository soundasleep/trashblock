chrome.runtime.onInstalled.addListener(() => {
  resetDatabase();
});

// -- context menus
const CONTEXT_MENU_REPORT = 'trashblock-report-trash';
const CONTEXT_MENU_DEBUG = 'trashblock-open-debug'
const CONTEXT_MENU_LEARN = 'trashblock-learn'

chrome.contextMenus.create({
  'id': CONTEXT_MENU_REPORT,
  'title': "Open trash menu",
  'contexts': ['page', 'link', 'audio', 'image', 'video', 'editable', 'frame', 'selection']
});

chrome.contextMenus.create({
  'id': CONTEXT_MENU_LEARN,
  'title': "Enable learning mode",
  'contexts': ['browser_action', 'page_action']
});

chrome.contextMenus.create({
  'id': CONTEXT_MENU_DEBUG,
  'title': "Show TrashBlock config/debug",
  'contexts': ['browser_action', 'page_action']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == CONTEXT_MENU_REPORT) {
    chrome.tabs.sendMessage(tab.id, 'TrashBlock_ReportTrash');
  } else if (info.menuItemId == CONTEXT_MENU_LEARN) {
    chrome.tabs.sendMessage(tab.id, 'TrashBlock_Learn');
  } else if (info.menuItemId == CONTEXT_MENU_DEBUG) {
    chrome.tabs.create({
      'url': chrome.extension.getURL('popup.html'),
      'selected': true
    });
  }
});
