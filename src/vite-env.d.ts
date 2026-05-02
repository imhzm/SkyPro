export {}

declare global {
  interface Window {
    electronAPI: {
      // Browser
      launchBrowser: (options: any) => Promise<any>
      closeBrowser: (sessionId: string) => Promise<any>
      getBrowserStatus: (sessionId: string) => Promise<any>
      closeAllBrowsers: () => Promise<any>
      checkPlatformSession: (data: any) => Promise<any>

      // Activation
      activateKey: (data: any) => Promise<any>
      validateKey: (data: any) => Promise<any>
      checkKeyStatus: (data: any) => Promise<any>
      resetDevice: (data: any) => Promise<any>
      getDeviceInfo: () => Promise<any>
      login: (data: any) => Promise<any>
      getRememberedLogin: () => Promise<any>
      saveRememberedLogin: (data: any) => Promise<any>
      clearRememberedLogin: () => Promise<any>

      // Facebook
      facebookLogin: (data: any) => Promise<any>
      facebookSearch: (data: any) => Promise<any>
      facebookExtractPageLikers: (data: any) => Promise<any>
      facebookExtractComments: (data: any) => Promise<any>
      facebookExtractGroupMembers: (data: any) => Promise<any>
      facebookExtractFriends: (data: any) => Promise<any>
      facebookPostToGroups: (data: any) => Promise<any>
      facebookSendMessages: (data: any) => Promise<any>
      facebookMention: (data: any) => Promise<any>
      facebookSharePost: (data: any) => Promise<any>
      facebookAutoReply: (data: any) => Promise<any>
      facebookExtractPageFollowers: (data: any) => Promise<any>
      facebookSendFriendRequests: (data: any) => Promise<any>
      facebookDeleteFriends: (data: any) => Promise<any>
      facebookInteractionFarm: (data: any) => Promise<any>
      facebookDeletePosts: (data: any) => Promise<any>
      facebookAnalyzeGroup: (data: any) => Promise<any>
      facebookUsersToIds: (data: any) => Promise<any>
      facebookExtractPostDetails: (data: any) => Promise<any>
      facebookExtractPhones: (data: any) => Promise<any>
      facebookLinksToIds: (data: any) => Promise<any>
      facebookSearchGroups: (data: any) => Promise<any>
      facebookJoinGroups: (data: any) => Promise<any>
      facebookExtractPageMessengers: (data: any) => Promise<any>
      facebookExtractProfileMessengers: (data: any) => Promise<any>
      facebookExtractReviews: (data: any) => Promise<any>
      facebookPageSendMessages: (data: any) => Promise<any>
      facebookAddToGroupChat: (data: any) => Promise<any>
      facebookSendPageMessages: (data: any) => Promise<any>

      // WhatsApp
      whatsappLaunch: (opts?: { proxy?: string }) => Promise<any>
      whatsappSendMessages: (data: any) => Promise<any>
      whatsappExtractGroups: (data: any) => Promise<any>
      whatsappFilterNumbers: (data: any) => Promise<any>

      // Instagram
      instagramLogin: (data: any) => Promise<any>
      instagramExtractFollowers: (data: any) => Promise<any>
      instagramAutoFollow: (data: any) => Promise<any>
      instagramExtractComments: (data: any) => Promise<any>
      instagramSendMessages: (data: any) => Promise<any>
      instagramExtractHashtag: (data: any) => Promise<any>

      // Twitter
      twitterLogin: (data: any) => Promise<any>
      twitterTweet: (data: any) => Promise<any>
      twitterExtractFollowers: (data: any) => Promise<any>
      twitterScheduleTweet: (data: any) => Promise<any>
      twitterFollow: (data: any) => Promise<any>
      twitterRetweet: (data: any) => Promise<any>

      // LinkedIn
      linkedinLogin: (data: any) => Promise<any>
      linkedinSearch: (data: any) => Promise<any>
      linkedinExtractCompanies: (data: any) => Promise<any>
      linkedinSendMessages: (data: any) => Promise<any>

      // Telegram
      telegramLogin: (data: any) => Promise<any>
      telegramVerifyCode: (data: any) => Promise<any>
      telegramSendMessages: (data: any) => Promise<any>
      telegramExtractMembers: (data: any) => Promise<any>
      telegramAddUsers: (data: any) => Promise<any>

      // TikTok
      tiktokExtractComments: (data: any) => Promise<any>
      tiktokExtractFollowers: (data: any) => Promise<any>

      // Pinterest
      pinterestLogin: (data: any) => Promise<any>
      pinterestSearch: (data: any) => Promise<any>
      pinterestExtract: (data: any) => Promise<any>

      // Threads
      threadsLogin: (data: any) => Promise<any>
      threadsExtract: (data: any) => Promise<any>
      threadsMention: (data: any) => Promise<any>

      // Snapchat
      snapchatLogin: (data: any) => Promise<any>

      // Reddit
      redditLogin: (data: any) => Promise<any>
      redditSearch: (data: any) => Promise<any>
      redditPublish: (data: any) => Promise<any>

      // Google
      googleMapsExtract: (data: any) => Promise<any>
      olxExtract: (data: any) => Promise<any>
      googleRate: (data: any) => Promise<any>

      // Email
      sendEmail: (data: any) => Promise<any>

      // Auto Point
      autoPointRun: (data: any) => Promise<any>

      // Generic Tool Runner
      runTool: (data: any) => Promise<any>

      // Video Download
      videoDownload: (data: any) => Promise<any>

      // Hashtags
      generateHashtags: (data: any) => Promise<any>

      // Proxy
      saveProxy: (data: any) => Promise<any>
      getProxies: () => Promise<any>
      deleteProxy: (data: any) => Promise<any>
      testProxy: (data: any) => Promise<any>

      // Snapchat
      snapchatBroadcast: (data: any) => Promise<any>

      // SMTP Email
      sendSmtpEmail: (data: any) => Promise<any>
      getSmtpSettings: () => Promise<any>
      deleteSmtpSetting: (data: any) => Promise<any>

      // Security Settings
      getSecuritySettings: () => Promise<any>
      saveSecuritySettings: (data: any) => Promise<any>

      // Scheduler
      scheduleCampaign: (data: any) => Promise<any>
      getScheduledCampaigns: () => Promise<any>
      deleteCampaign: (data: any) => Promise<any>

      // DB
      dbQuery: (data: any) => Promise<any>
      dbInsert: (data: any) => Promise<any>
      dbUpdate: (data: any) => Promise<any>
      dbDelete: (data: any) => Promise<any>

      // Export
      exportToCSV: (data: any) => Promise<any>
      exportToExcel: (data: any) => Promise<any>

      // Extraction streaming & cancel
      cancelExtraction: (data: any) => void
      onExtractionProgress: (callback: (data: any) => void) => () => void

      // Multi-account cycle
      getActiveSessions: () => Promise<any>
      cycleAccounts: (data: any) => Promise<any>
      stopCycle: () => Promise<any>

      getAppVersion: () => Promise<any>
      checkForUpdates: () => Promise<any>
      installUpdate: () => Promise<any>
      getPlatform: () => string

      // Window Controls
      minimizeWindow: () => void
      toggleMaximizeWindow: () => void
      closeWindow: () => void
    }
  }
}
