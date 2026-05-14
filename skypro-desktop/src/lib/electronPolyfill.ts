if (typeof window !== 'undefined' && !window.electronAPI) {
  const noop = () => Promise.resolve({ success: false, message: 'Not in Electron' })
  const noopVoid = () => {}

  window.electronAPI = {
    launchBrowser: noop,
    closeBrowser: noop,
    getBrowserStatus: noop,
    closeAllBrowsers: noop,
    checkPlatformSession: noop,

    activateKey: () => Promise.resolve({ success: true, data: { key: 'PREVIEW', status: 'active', expiryDate: '2027-01-01' } }),
    validateKey: () => Promise.resolve({ success: true, data: { key: 'PREVIEW', status: 'active', expiryDate: '2027-01-01' } }),
    checkKeyStatus: () => Promise.resolve({ success: true, data: { key: 'PREVIEW', status: 'active', expiryDate: '2027-01-01' } }),
    resetDevice: noop,
    getDeviceInfo: () => Promise.resolve({
      fingerprint: 'browser-preview',
      hostname: location.hostname,
      platform: navigator.platform,
      arch: 'x64',
      cpu: 'browser',
      cpuCores: navigator.hardwareConcurrency || 4,
      ram: '0',
    }),
    login: noop,
    getRememberedLogin: () => Promise.resolve({ success: false }),
    saveRememberedLogin: noop,
    clearRememberedLogin: noop,

    facebookLogin: noop, facebookSearch: noop, facebookExtractPageLikers: noop,
    facebookExtractComments: noop, facebookExtractGroupMembers: noop,
    facebookExtractFriends: noop, facebookPostToGroups: noop,
    facebookSendMessages: noop, facebookMention: noop, facebookSharePost: noop,
    facebookAutoReply: noop, facebookExtractPageFollowers: noop,
    facebookSendFriendRequests: noop, facebookDeleteFriends: noop,
    facebookInteractionFarm: noop, facebookDeletePosts: noop,
    facebookAnalyzeGroup: noop, facebookUsersToIds: noop,
    facebookExtractPostDetails: noop, facebookExtractPhones: noop,
    facebookLinksToIds: noop, facebookSearchGroups: noop,
    facebookJoinGroups: noop, facebookExtractPageMessengers: noop,
    facebookExtractProfileMessengers: noop, facebookExtractReviews: noop,
    facebookPageSendMessages: noop, facebookAddToGroupChat: noop,
    facebookSendPageMessages: noop,

    whatsappLaunch: noop, whatsappSendMessages: noop,
    whatsappExtractGroups: noop, whatsappFilterNumbers: noop,

    instagramLogin: noop, instagramExtractFollowers: noop,
    instagramAutoFollow: noop, instagramExtractComments: noop,
    instagramSendMessages: noop, instagramExtractHashtag: noop,

    twitterLogin: noop, twitterTweet: noop,
    twitterExtractFollowers: noop, twitterScheduleTweet: noop,
    twitterFollow: noop, twitterRetweet: noop,

    linkedinLogin: noop, linkedinSearch: noop,
    linkedinExtractCompanies: noop, linkedinSendMessages: noop,

    telegramLogin: noop, telegramVerifyCode: noop,
    telegramSendMessages: noop, telegramExtractMembers: noop,
    telegramAddUsers: noop,

    tiktokExtractComments: noop, tiktokExtractFollowers: noop,

    pinterestLogin: noop, pinterestSearch: noop, pinterestExtract: noop,

    threadsLogin: noop, threadsExtract: noop, threadsMention: noop,

    snapchatLogin: noop, snapchatBroadcast: noop,

    redditLogin: noop, redditSearch: noop, redditPublish: noop,

    googleMapsExtract: noop, olxExtract: noop, googleRate: noop,

    sendEmail: noop,
    autoPointRun: noop,
    runTool: noop,
    videoDownload: noop,
    generateHashtags: noop,

    saveProxy: noop, getProxies: noop, deleteProxy: noop, testProxy: noop,

    sendSmtpEmail: noop, getSmtpSettings: noop, deleteSmtpSetting: noop,

    getSecuritySettings: noop, saveSecuritySettings: noop,

    scheduleCampaign: noop, getScheduledCampaigns: noop, deleteCampaign: noop,

    dbQuery: () => Promise.resolve({ success: true, data: [] }),
    dbInsert: noop,
    dbUpdate: noop,
    dbDelete: noop,
    clearLeadsByPlatform: noop,
    dbCount: () => Promise.resolve({ success: true, count: 0 }),

    exportToCSV: noop, exportToExcel: noop,

    cancelExtraction: noopVoid,
    onExtractionProgress: () => noopVoid,

    getActiveSessions: noop,
    cycleAccounts: noop,
    stopCycle: noop,

    getAppVersion: () => Promise.resolve({ success: true, data: 'browser-preview' }),
    checkForUpdates: noop,
    installUpdate: noop,
    getPlatform: () => 'browser',

    minimizeWindow: noopVoid,
    toggleMaximizeWindow: noopVoid,
    closeWindow: noopVoid,
  } as unknown as Window['electronAPI']
}
