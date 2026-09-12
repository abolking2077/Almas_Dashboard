/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * الماس داشبورد | Almas Dashboard
 * Chrome Extension Background Service Worker (Manifest V3)
 */

// Initialize extension on install or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Almas Dashboard] Extension installed/updated, reason:', details.reason);

  // Setup context menus
  try {
    if (chrome.contextMenus) {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: 'almas_save_page',
          title: '💎 ذخیره این صفحه در بوکمارک‌های الماس',
          contexts: ['page', 'link']
        });

        chrome.contextMenus.create({
          id: 'almas_save_note',
          title: '📝 افزودن متن انتخابی به یادداشت‌های الماس',
          contexts: ['selection']
        });

        chrome.contextMenus.create({
          id: 'almas_open_dashboard',
          title: '✨ باز کردن تب جدید الماس داشبورد',
          contexts: ['action']
        });
      });
    }
  } catch (e) {
    console.warn('[Almas Dashboard] Context menus init notice:', e);
  }
});

// Handle Context Menu clicks
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'almas_save_page') {
      const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
      const targetTitle = tab?.title || 'صفحه جدید';
      if (!targetUrl) return;

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['almas_bookmarks', 'idashboard_bookmarks_v1'], (res) => {
          let list = res.idashboard_bookmarks_v1 || res.almas_bookmarks || [];
          const newBm = {
            id: 'bm_' + Date.now(),
            title: targetTitle,
            url: targetUrl,
            category: 'عمومی',
            pinned: false,
            createdAt: Date.now()
          };
          list.unshift(newBm);
          chrome.storage.local.set({ 
            almas_bookmarks: list,
            idashboard_bookmarks_v1: list 
          }, () => {
            notifyUser('الماس داشبورد', `صفحه «${targetTitle.slice(0, 32)}» در بوکمارک‌ها ذخیره شد.`);
          });
        });
      }
    } else if (info.menuItemId === 'almas_save_note') {
      const selectedText = (info.selectionText || '').trim();
      if (!selectedText) return;

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['idashboard_notes_v1', 'almas_notes'], (res) => {
          let notes = res.idashboard_notes_v1 || res.almas_notes || [];
          const newNote = {
            id: 'note_' + Date.now(),
            title: 'یادداشت سریع از وب',
            content: selectedText,
            color: 'indigo',
            updatedAt: Date.now(),
            pinned: false
          };
          notes.unshift(newNote);
          chrome.storage.local.set({ 
            idashboard_notes_v1: notes,
            almas_notes: notes 
          }, () => {
            notifyUser('یادداشت‌های الماس', 'متن انتخابی به یادداشت‌های شما اضافه شد.');
          });
        });
      }
    } else if (info.menuItemId === 'almas_open_dashboard') {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    }
  });
}

// Helper for notifications with graceful fallback
function notifyUser(title, message) {
  if (chrome.notifications && chrome.notifications.create) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: title,
      message: message
    });
  }
}

// Omnibox keyword search support: user types 'almas <query>' in browser address bar
if (chrome.omnibox && chrome.omnibox.onInputEntered) {
  chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    const url = chrome.runtime.getURL(`index.html?q=${encodeURIComponent(text)}`);
    if (disposition === 'currentTab') {
      chrome.tabs.update({ url });
    } else {
      chrome.tabs.create({ url });
    }
  });
}

// Listen to messages from popup or newtab
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_EXTENSION_INFO') {
    sendResponse({
      version: '1.2.0',
      name: 'الماس داشبورد',
      isExtension: true
    });
  }
  return true;
});
