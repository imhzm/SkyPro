const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  activateKey: (data) => ipcRenderer.invoke('activate-key', data),
  validateKey: (data) => ipcRenderer.invoke('validate-key', data),
  checkKeyStatus: (data) => ipcRenderer.invoke('check-key-status', data),

  // Browser
  launchBrowser: (options) => ipcRenderer.invoke('launch-browser', options),
  closeBrowser: (sessionId) => ipcRenderer.invoke('close-browser', sessionId),
  getBrowserStatus: (sessionId) => ipcRenderer.invoke('get-browser-status', sessionId),
  closeAllBrowsers: () => ipcRenderer.invoke('close-all-browsers'),
  checkPlatformSession: (data) => ipcRenderer.invoke('check-platform-session', data),

  // Facebook
  facebookLogin: (data) => ipcRenderer.invoke('facebook-login', data),
  facebookSearch: (data) => ipcRenderer.invoke('facebook-search', data),
  facebookExtractPageLikers: (data) => ipcRenderer.invoke('facebook-extract-likers', data),
  facebookExtractComments: (data) => ipcRenderer.invoke('facebook-extract-comments', data),
  facebookExtractGroupMembers: (data) => ipcRenderer.invoke('facebook-extract-group-members', data),
  facebookExtractFriends: (data) => ipcRenderer.invoke('facebook-extract-friends', data),
  facebookPostToGroups: (data) => ipcRenderer.invoke('facebook-post-groups', data),
  facebookSendMessages: (data) => ipcRenderer.invoke('facebook-send-messages', data),
  facebookMention: (data) => ipcRenderer.invoke('facebook-mention', data),
  facebookSharePost: (data) => ipcRenderer.invoke('facebook-share-post', data),
  facebookAutoReply: (data) => ipcRenderer.invoke('facebook-auto-reply', data),
  facebookExtractPageFollowers: (data) => ipcRenderer.invoke('facebook-extract-page-followers', data),
  facebookSendFriendRequests: (data) => ipcRenderer.invoke('facebook-send-friend-requests', data),
  facebookDeleteFriends: (data) => ipcRenderer.invoke('facebook-delete-friends', data),
  facebookInteractionFarm: (data) => ipcRenderer.invoke('facebook-interaction-farm', data),
  facebookDeletePosts: (data) => ipcRenderer.invoke('facebook-delete-posts', data),
  facebookAnalyzeGroup: (data) => ipcRenderer.invoke('facebook-analyze-group', data),
  facebookUsersToIds: (data) => ipcRenderer.invoke('facebook-users-to-ids', data),
  facebookExtractPostDetails: (data) => ipcRenderer.invoke('facebook-extract-post-details', data),
  facebookExtractPhones: (data) => ipcRenderer.invoke('facebook-extract-phones', data),
  facebookLinksToIds: (data) => ipcRenderer.invoke('facebook-links-to-ids', data),
  facebookSearchGroups: (data) => ipcRenderer.invoke('facebook-search-groups', data),
  facebookJoinGroups: (data) => ipcRenderer.invoke('facebook-join-groups', data),
  facebookExtractPageMessengers: (data) => ipcRenderer.invoke('facebook-extract-page-messengers', data),
  facebookExtractProfileMessengers: (data) => ipcRenderer.invoke('facebook-extract-profile-messengers', data),
  facebookExtractReviews: (data) => ipcRenderer.invoke('facebook-extract-reviews', data),
  facebookPageSendMessages: (data) => ipcRenderer.invoke('facebook-page-send-messages', data),
  facebookAddToGroupChat: (data) => ipcRenderer.invoke('facebook-add-to-group-chat', data),
  facebookSendPageMessages: (data) => ipcRenderer.invoke('facebook-send-page-messages', data),
  cancelExtraction: (data) => ipcRenderer.send('cancel-extraction', data),
  onExtractionProgress: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('extraction-progress', handler)
    return () => ipcRenderer.removeListener('extraction-progress', handler)
  },

  // Multi-account cycle
  getActiveSessions: () => ipcRenderer.invoke('get-active-sessions'),
  cycleAccounts: (data) => ipcRenderer.invoke('cycle-accounts', data),
  stopCycle: () => ipcRenderer.invoke('stop-cycle'),

  // WhatsApp
  whatsappLaunch: (opts) => ipcRenderer.invoke('whatsapp-launch', opts),
  whatsappSendMessages: (data) => ipcRenderer.invoke('whatsapp-send-messages', data),
  whatsappExtractGroups: (data) => ipcRenderer.invoke('whatsapp-extract-groups', data),
  whatsappFilterNumbers: (data) => ipcRenderer.invoke('whatsapp-filter-numbers', data),

  // Instagram
  instagramLogin: (data) => ipcRenderer.invoke('instagram-login', data),
  instagramExtractFollowers: (data) => ipcRenderer.invoke('instagram-extract-followers', data),
  instagramAutoFollow: (data) => ipcRenderer.invoke('instagram-auto-follow', data),
  instagramExtractComments: (data) => ipcRenderer.invoke('instagram-extract-comments', data),
  instagramSendMessages: (data) => ipcRenderer.invoke('instagram-send-messages', data),
  instagramExtractHashtag: (data) => ipcRenderer.invoke('instagram-extract-hashtag', data),

  // Twitter
  twitterLogin: (data) => ipcRenderer.invoke('twitter-login', data),
  twitterTweet: (data) => ipcRenderer.invoke('twitter-tweet', data),
  twitterExtractFollowers: (data) => ipcRenderer.invoke('twitter-extract-followers', data),
  twitterScheduleTweet: (data) => ipcRenderer.invoke('twitter-schedule-tweet', data),
  twitterFollow: (data) => ipcRenderer.invoke('twitter-follow', data),
  twitterRetweet: (data) => ipcRenderer.invoke('twitter-retweet', data),

  // LinkedIn
  linkedinLogin: (data) => ipcRenderer.invoke('linkedin-login', data),
  linkedinSearch: (data) => ipcRenderer.invoke('linkedin-search', data),
  linkedinExtractCompanies: (data) => ipcRenderer.invoke('linkedin-extract-companies', data),
  linkedinSendMessages: (data) => ipcRenderer.invoke('linkedin-send-messages', data),

  // Telegram
  telegramLogin: (data) => ipcRenderer.invoke('telegram-login', data),
  telegramVerifyCode: (data) => ipcRenderer.invoke('telegram-verify-code', data),
  telegramSendMessages: (data) => ipcRenderer.invoke('telegram-send-messages', data),
  telegramExtractMembers: (data) => ipcRenderer.invoke('telegram-extract-members', data),
  telegramAddUsers: (data) => ipcRenderer.invoke('telegram-add-users', data),

  // TikTok
  tiktokExtractComments: (data) => ipcRenderer.invoke('tiktok-extract-comments', data),
  tiktokExtractFollowers: (data) => ipcRenderer.invoke('tiktok-extract-followers', data),

  // Pinterest
  pinterestLogin: (data) => ipcRenderer.invoke('pinterest-login', data),
  pinterestSearch: (data) => ipcRenderer.invoke('pinterest-search', data),
  pinterestExtract: (data) => ipcRenderer.invoke('pinterest-extract', data),

  // Threads
  threadsLogin: (data) => ipcRenderer.invoke('threads-login', data),
  threadsExtract: (data) => ipcRenderer.invoke('threads-extract', data),
  threadsMention: (data) => ipcRenderer.invoke('threads-mention', data),

  // Reddit
  redditLogin: (data) => ipcRenderer.invoke('reddit-login', data),
  redditSearch: (data) => ipcRenderer.invoke('reddit-search', data),
  redditPublish: (data) => ipcRenderer.invoke('reddit-publish', data),

  // Snapchat
  snapchatLogin: (data) => ipcRenderer.invoke('snapchat-login', data),

  // Google
  googleMapsExtract: (data) => ipcRenderer.invoke('google-maps-extract', data),
  olxExtract: (data) => ipcRenderer.invoke('olx-extract', data),
  googleRate: (data) => ipcRenderer.invoke('google-rate', data),

  // Email
  sendEmail: (data) => ipcRenderer.invoke('send-email', data),

  // Auto Point
  autoPointRun: (data) => ipcRenderer.invoke('auto-point-run', data),

  // Generic Tool Runner
  runTool: (data) => ipcRenderer.invoke('run-tool', data),

  // Video Download
  videoDownload: (data) => ipcRenderer.invoke('video-download', data),

  // Hashtags
  generateHashtags: (data) => ipcRenderer.invoke('generate-hashtags', data),

  // Proxy
  saveProxy: (data) => ipcRenderer.invoke('save-proxy', data),
  getProxies: () => ipcRenderer.invoke('get-proxies'),
  deleteProxy: (data) => ipcRenderer.invoke('delete-proxy', data),
  testProxy: (data) => ipcRenderer.invoke('test-proxy', data),

  // Snapchat
  snapchatBroadcast: (data) => ipcRenderer.invoke('snapchat-broadcast', data),

  // SMTP Email
  sendSmtpEmail: (data) => ipcRenderer.invoke('send-smtp-email', data),
  getSmtpSettings: () => ipcRenderer.invoke('get-smtp-settings'),
  deleteSmtpSetting: (data) => ipcRenderer.invoke('delete-smtp-setting', data),

  // Security Settings
  getSecuritySettings: () => ipcRenderer.invoke('get-security-settings'),
  saveSecuritySettings: (data) => ipcRenderer.invoke('save-security-settings', data),

  // Scheduler
  scheduleCampaign: (data) => ipcRenderer.invoke('schedule-campaign', data),
  getScheduledCampaigns: () => ipcRenderer.invoke('get-scheduled-campaigns'),
  deleteCampaign: (data) => ipcRenderer.invoke('delete-campaign', data),

  // DB
  dbQuery: (data) => ipcRenderer.invoke('db-query', data),
  dbInsert: (data) => ipcRenderer.invoke('db-insert', data),
  dbUpdate: (data) => ipcRenderer.invoke('db-update', data),
  dbDelete: (data) => ipcRenderer.invoke('db-delete', data),

  // Export
  exportToCSV: (data) => ipcRenderer.invoke('export-csv', data),
  exportToExcel: (data) => ipcRenderer.invoke('export-excel', data),

  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getPlatform: () => process.platform,

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
})
