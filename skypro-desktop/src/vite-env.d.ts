/// <reference types="vite/client" />

export {}

// ==================== Common IPC Response Types ====================
interface IpcSuccess<T = unknown> {
  success: true
  message?: string
  data?: T
  [key: string]: unknown
}

interface IpcError {
  success: false
  error?: string
  message?: string
  [key: string]: unknown
}

type IpcResult<T = unknown> = IpcSuccess<T> | IpcError

interface BrowserLaunchResult {
  success: boolean
  sessionId?: string
  message?: string
  error?: string
  needsQR?: boolean
  [key: string]: unknown
}

interface PlatformSessionResult extends BrowserLaunchResult {
  alreadyLoggedIn?: boolean
  url?: string
}

interface LoginResult {
  success: boolean
  message?: string
  error?: string
  sessionId?: string
  needsCode?: boolean
  [key: string]: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ExtractionResult {
  success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
  count?: number
  jobId?: string
  cancelled?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  partialData?: any
  error?: string
  [key: string]: unknown
}

interface ExtractionProgress {
  type: string
  count: number
  total: number
  data?: Record<string, unknown>[]
}

interface RememberedLogin {
  email: string
  password?: string
  serial: string
  remember: boolean
}

interface DeviceInfo {
  fingerprint: string
  hostname: string
  platform: string
  arch: string
  cpu: string
  cpuCores: number
  ram: string
}

interface ActivationData {
  key: string
  status: string
  expiryDate?: string
  expiresAt?: string
  deviceId?: string
  maxDevices?: number
}

interface ProxyRecord {
  id: number
  label: string
  host: string
  port: string
  protocol: string
  accountId?: number
  username?: string
  hasPassword: boolean
  status: string
  created_at: string
}

interface SmtpRecord {
  id: number
  email: string
  hasPassword: boolean
  host: string
  port: number
  ssl: string
  created_at: string
}

interface SecuritySettings {
  enabled: number | boolean
  randomDelays: number | boolean
  minDelay: number
  maxDelay: number
  maxActionsPerHour: number
  rotateUserAgent: number | boolean
  randomizeViewport: number | boolean
  useStealthMode: number | boolean
  maxRetries: number
}

interface CampaignRecord {
  id: number
  name: string
  platform: string
  type: string
  status: string
  results: string
  scheduled_at: string
  data: string
  created_at: string
}

interface DbQueryParams {
  table: string
  filters?: Array<{ column: string; op: string; value: unknown }>
  limit?: number
  where?: string
}

interface DbInsertParams {
  table: string
  data: Record<string, unknown>
}

interface DbUpdateParams {
  table: string
  id: number
  data: Record<string, unknown>
}

interface DbDeleteParams {
  table: string
  id: number
}

interface SmtpSendParams {
  smtp: { host: string; port: number; email: string; password?: string; ssl?: string }
  to: string | string[]
  subject: string
  body: string
  attachments?: unknown[]
}

interface ExportParams {
  filename?: string
  data: Record<string, unknown>[]
  headers: string[]
}

// Platform-specific login params
interface PlatformLoginParams {
  accountId?: number
  username?: string
  password?: string
  headless?: boolean
  proxy?: string
  phoneNumber?: string
  [key: string]: unknown
}

interface PlatformSearchParams {
  sessionId: string
  query: string
  type?: string
  limit?: number
}

interface ExtractionParams {
  sessionId: string
  postUrl?: string
  url?: string
  username?: string
  videoUrl?: string
  limit?: number
  jobId?: string
  delayMs?: number
  [key: string]: unknown
}

interface MessageParams {
  sessionId: string
  message: string
  users?: string[]
  usernames?: string[]
  recipients?: string[]
  delay?: number
  [key: string]: unknown
}

// ==================== Electron API Interface ====================
declare global {
  interface Window {
    electronAPI: {
      // Browser
      launchBrowser: (options: { headless?: boolean; platform?: string; proxy?: string; profileId?: string }) => Promise<BrowserLaunchResult>
      closeBrowser: (sessionId: string) => Promise<IpcResult>
      getBrowserStatus: (sessionId: string) => Promise<IpcResult<{ active: boolean }>>
      closeAllBrowsers: () => Promise<IpcResult>
      checkPlatformSession: (data: { platform: string; headless?: boolean }) => Promise<PlatformSessionResult>

      // Activation
      activateKey: (data: { key: string; deviceId?: string; deviceInfo?: Record<string, unknown> }) => Promise<IpcResult<ActivationData>>
      validateKey: (data: { key: string; deviceId?: string }) => Promise<IpcResult<ActivationData>>
      checkKeyStatus: (data: { key: string }) => Promise<IpcResult<ActivationData>>
      resetDevice: (data: { key: string; deviceId?: string; token?: string | null }) => Promise<IpcResult>
      getDeviceInfo: () => Promise<DeviceInfo>
      login: (data: { email: string; password?: string; serial: string; deviceFingerprint?: string; deviceInfo?: Record<string, unknown> }) => Promise<IpcResult>
      getRememberedLogin: () => Promise<IpcResult<RememberedLogin>>
      saveRememberedLogin: (data: Partial<RememberedLogin>) => Promise<IpcResult>
      clearRememberedLogin: () => Promise<IpcResult>

      // Facebook
      facebookLogin: (data: PlatformLoginParams) => Promise<LoginResult>
      facebookSearch: (data: PlatformSearchParams) => Promise<ExtractionResult>
      facebookExtractPageLikers: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookExtractComments: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookExtractGroupMembers: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookExtractFriends: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookPostToGroups: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookSendMessages: (data: MessageParams) => Promise<IpcResult>
      facebookMention: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookSharePost: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookAutoReply: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookExtractPageFollowers: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookSendFriendRequests: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookDeleteFriends: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookInteractionFarm: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookDeletePosts: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookAnalyzeGroup: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookUsersToIds: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookExtractPostDetails: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookExtractPhones: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookLinksToIds: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookSearchGroups: (data: PlatformSearchParams) => Promise<ExtractionResult>
      facebookJoinGroups: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookExtractPageMessengers: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookExtractProfileMessengers: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookExtractReviews: (data: ExtractionParams) => Promise<ExtractionResult>
      facebookPageSendMessages: (data: MessageParams) => Promise<IpcResult>
      facebookAddToGroupChat: (data: Record<string, unknown>) => Promise<IpcResult>
      facebookSendPageMessages: (data: MessageParams) => Promise<IpcResult>
      facebookSearchPages: (data: { sessionId: string; query: string; location?: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      facebookLikePages: (data: { sessionId: string; pageUrls: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      facebookExtractSharers: (data: { sessionId: string; postUrl: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      facebookInviteFriends: (data: { sessionId: string; pageUrl: string; usernames?: string[]; inviteAll?: boolean }) => Promise<IpcResult>
      facebookCommentOnPages: (data: { sessionId: string; pageUrls: string[]; commentText: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      facebookPostWithImages: (data: { sessionId: string; groups: string[]; message?: string; imagePaths?: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      facebookDemographicsAnalyze: (data: { items: Record<string, unknown>[] }) => Promise<IpcResult<{ total: number; genderGuess: { male: number; female: number; unknown: number }; hasPhone: number; hasEmail: number; arabicSpeakers?: number; englishSpeakers?: number; topLocations: Array<{ value: string; count: number }>; topRegions?: Array<{ value: string; count: number }>; topNames: Array<{ value: string; count: number }> }>>
      facebookDetectOpenGroups: (data: { sessionId: string; groupUrls: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      facebookExtractActiveFriends: (data: { sessionId: string; limit?: number; activeDays?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>

      // WhatsApp
      whatsappLaunch: (opts?: { proxy?: string }) => Promise<BrowserLaunchResult>
      whatsappSendMessages: (data: MessageParams) => Promise<IpcResult>
      whatsappExtractGroups: (data: ExtractionParams) => Promise<ExtractionResult>
      whatsappFilterNumbers: (data: Record<string, unknown>) => Promise<IpcResult>
      whatsappSendMedia: (data: { sessionId: string; recipients: string[]; mediaPaths: string[]; caption?: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      whatsappExtractChats: (data: { sessionId: string; limit?: number; includeGroups?: boolean; includeContacts?: boolean }) => Promise<ExtractionResult>
      whatsappExtractContacts: (data: { sessionId: string; limit?: number }) => Promise<ExtractionResult>
      whatsappExtractGroupMembers: (data: { sessionId: string; groupName?: string; limit?: number }) => Promise<ExtractionResult>
      whatsappAddToGroup: (data: { sessionId: string; groupName: string; phones: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      whatsappNumbersToVcf: (data: { numbers: string[]; namePrefix?: string; savePath?: string }) => Promise<IpcResult<{ path: string; count: number }>>
      whatsappFastSend: (data: { sessionId: string; recipients: string[]; message: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      whatsappTempGroupBroadcast: (data: { sessionId: string; groupName?: string; members: string[]; message: string; leaveAfter?: boolean; jobId?: string }) => Promise<IpcResult>
      whatsappExtractArchived: (data: { sessionId: string; limit?: number }) => Promise<ExtractionResult>
      whatsappMultiNumberRotation: (data: { sessionIds: string[]; recipients: string[]; message: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      whatsappExtractGroupsFromPlatforms: (data: { sessionId: string; keyword: string; sources?: ('google' | 'facebook' | 'telegram' | 'twitter')[]; limit?: number; jobId?: string }) => Promise<ExtractionResult>

      // Instagram
      instagramLogin: (data: PlatformLoginParams) => Promise<LoginResult>
      instagramExtractFollowers: (data: ExtractionParams) => Promise<ExtractionResult>
      instagramAutoFollow: (data: Record<string, unknown>) => Promise<IpcResult>
      instagramExtractComments: (data: ExtractionParams) => Promise<ExtractionResult>
      instagramSendMessages: (data: MessageParams) => Promise<IpcResult>
      instagramExtractHashtag: (data: Record<string, unknown>) => Promise<ExtractionResult>
      instagramUnfollow: (data: { sessionId: string; usernames: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      instagramPostInteract: (data: { sessionId: string; postUrls: string[]; actions: { like?: boolean; comment?: string }; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      instagramSharePostDM: (data: { sessionId: string; postUrl: string; recipients: string[]; message?: string; jobId?: string }) => Promise<ExtractionResult>
      instagramExtractLikers: (data: { sessionId: string; postUrl: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      instagramExtractFollowing: (data: { sessionId: string; targetUser: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      instagramFollowMessage: (data: { sessionId: string; usernames: string[]; message: string; followFirst?: boolean; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      instagramExtractSuggested: (data: { sessionId: string; baseUser: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      instagramTopInfluencers: (data: { sessionId: string; hashtag: string; country?: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      instagramAnalyzeProfile: (data: { sessionId: string; username: string }) => Promise<IpcResult<{ username: string; name: string; handle: string; posts: string; followers: string; following: string; bio: string }>>

      // Twitter
      twitterLogin: (data: PlatformLoginParams) => Promise<LoginResult>
      twitterTweet: (data: Record<string, unknown>) => Promise<IpcResult>
      twitterExtractFollowers: (data: ExtractionParams) => Promise<ExtractionResult>
      twitterScheduleTweet: (data: Record<string, unknown>) => Promise<IpcResult>
      twitterFollow: (data: Record<string, unknown>) => Promise<IpcResult>
      twitterRetweet: (data: Record<string, unknown>) => Promise<IpcResult>
      twitterSearchTweets: (data: { sessionId: string; query: string; tab?: 'top' | 'latest'; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      twitterExtractTweetLikers: (data: { sessionId: string; tweetUrl: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      twitterExtractTrends: (data: { sessionId: string; woeid?: number | string; limit?: number }) => Promise<ExtractionResult>
      twitterLikeTweets: (data: { sessionId: string; tweetUrls: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      twitterReplyTweets: (data: { sessionId: string; tweetUrls: string[]; message: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      twitterValidateAccounts: (data: { sessionId: string; usernames: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      twitterBoostTweets: (data: { sessionId: string; tweetUrls: string[]; doLike?: boolean; doSave?: boolean; doRetweet?: boolean; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      twitterQuoteRetweet: (data: { sessionId: string; tweetUrls: string[]; comment: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      twitterFollowInteractors: (data: { sessionId: string; tweetUrl: string; mode?: 'likers' | 'retweeters'; limit?: number; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      twitterMassPublish: (data: { sessionId: string; tweets: Array<string | { text: string; imagePath?: string }>; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>

      // LinkedIn
      linkedinLogin: (data: PlatformLoginParams) => Promise<LoginResult>
      linkedinSearch: (data: PlatformSearchParams) => Promise<ExtractionResult>
      linkedinExtractCompanies: (data: ExtractionParams) => Promise<ExtractionResult>
      linkedinSendMessages: (data: MessageParams) => Promise<IpcResult>
      linkedinExtractPeople: (data: { sessionId: string; query: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      linkedinConnectRequests: (data: { sessionId: string; profiles: string[]; note?: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      linkedinFollowCompanies: (data: { sessionId: string; companies: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      linkedinPostFeed: (data: { sessionId: string; content: string }) => Promise<IpcResult>
      linkedinJoinGroups: (data: { sessionId: string; groupUrls: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      linkedinExtractDeepData: (data: { sessionId: string; profileUrls: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      linkedinExtractSchools: (data: { sessionId: string; query: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      linkedinExtractOrgMembers: (data: { sessionId: string; orgUrl: string; kind?: 'company' | 'school'; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      linkedinExtractPostEngagement: (data: { sessionId: string; postUrl: string; mode?: 'reactions' | 'comments'; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      linkedinListMyGroups: (data: { sessionId: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      linkedinPostToGroups: (data: { sessionId: string; groupUrls: string[]; content: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      linkedinEmailsByInterest: (data: { sessionId: string; interest: string; country?: string; limit?: number }) => Promise<ExtractionResult>
      linkedinExtractCompanyFull: (data: { sessionId: string; companyUrls: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>

      // Telegram
      telegramLogin: (data: PlatformLoginParams) => Promise<LoginResult>
      telegramVerifyCode: (data: Record<string, unknown>) => Promise<IpcResult>
      telegramSendMessages: (data: MessageParams) => Promise<IpcResult>
      telegramExtractMembers: (data: ExtractionParams) => Promise<ExtractionResult>
      telegramAddUsers: (data: Record<string, unknown>) => Promise<IpcResult>
      telegramExtractDialogs: (data: { sessionId: string; limit?: number; filter?: 'all' | 'chat' | 'group' | 'channel' | 'bot' }) => Promise<ExtractionResult>
      telegramExtractContacts: (data: { sessionId: string; limit?: number }) => Promise<ExtractionResult>
      telegramSearchPublic: (data: { sessionId: string; query: string; type?: 'all' | 'group' | 'channel' | 'bot'; limit?: number }) => Promise<ExtractionResult>
      telegramJoinGroups: (data: { sessionId: string; groups: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      telegramSendToGroups: (data: { sessionId: string; groups: string[]; message: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      telegramAddById: (data: { sessionId: string; groupName: string; userIds: (string | number)[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      telegramBulkGroupsDownload: (data: { sessionId: string; keywords: string[]; type?: 'all' | 'group' | 'channel' | 'bot'; perKeyword?: number; jobId?: string }) => Promise<ExtractionResult>

      // Telegram Premium
      telegramPremiumExtractHidden: (data: { sessionId: string; groupName: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      telegramPremiumAddByUsername: (data: { sessionId: string; targetGroup: string; usernames: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      telegramPremiumAddByPhone: (data: { sessionId: string; targetGroup: string; phones: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      telegramPremiumReact: (data: { sessionId: string; groupName: string; emoji?: string; count?: number; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>

      // TikTok
      tiktokExtractComments: (data: ExtractionParams) => Promise<ExtractionResult>
      tiktokExtractFollowers: (data: ExtractionParams) => Promise<ExtractionResult>
      tiktokSearch: (data: { sessionId: string; query: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      tiktokFollow: (data: { sessionId: string; usernames: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      tiktokInteract: (data: { sessionId: string; videoUrls: string[]; doLike?: boolean; comment?: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      tiktokUploadVideo: (data: { sessionId: string; videoPath: string; caption?: string }) => Promise<IpcResult>

      // Pinterest
      pinterestLogin: (data: PlatformLoginParams) => Promise<LoginResult>
      pinterestSearch: (data: PlatformSearchParams) => Promise<ExtractionResult>
      pinterestExtract: (data: ExtractionParams) => Promise<ExtractionResult>
      pinterestFollowUsers: (data: { sessionId: string; usernames: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      pinterestExtractHashtag: (data: { sessionId: string; keyword: string; limit?: number }) => Promise<ExtractionResult>
      pinterestSendMessage: (data: { sessionId: string; usernames: string[]; message: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      pinterestAnalyzeProfile: (data: { sessionId: string; username: string }) => Promise<IpcResult<{ username: string; name: string; followers: string; following: string; pins: string; bio: string }>>
      pinterestExtractBoards: (data: { sessionId: string; keyword: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>
      pinterestAutoPublish: (data: { sessionId: string; pins: Array<{ imagePath: string; title?: string; description?: string; link?: string }>; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>

      // Threads
      threadsLogin: (data: PlatformLoginParams) => Promise<LoginResult>
      threadsExtract: (data: ExtractionParams) => Promise<ExtractionResult>
      threadsMention: (data: Record<string, unknown>) => Promise<IpcResult>
      threadsPublish: (data: { sessionId: string; content?: string; imagePath?: string }) => Promise<IpcResult>
      threadsSendMessage: (data: { sessionId: string; usernames: string[]; message: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      threadsFollowSend: (data: { sessionId: string; usernames: string[]; message: string; followFirst?: boolean; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      pinterestDownload: (data: { sessionId: string; source?: 'search' | 'board'; query?: string; boardUrl?: string; saveDir: string; limit?: number; jobId?: string }) => Promise<ExtractionResult>
      pinterestOpenSignupBatch: (data: { count?: number }) => Promise<IpcResult<{ sessionIds: string[] }>>
      pinterestSharePin: (data: { sessionId: string; pinUrl: string; boards: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>

      // Snapchat
      snapchatLogin: (data: PlatformLoginParams) => Promise<LoginResult>
      snapchatBroadcast: (data: { sessionId: string; usernames: string[]; message?: string; imagePath?: string; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      snapchatExtractFriends: (data: { sessionId: string; limit?: number; jobId?: string; delayMs?: number }) => Promise<ExtractionResult>

      // Reddit
      redditLogin: (data: PlatformLoginParams) => Promise<LoginResult>
      redditSearch: (data: PlatformSearchParams) => Promise<ExtractionResult>
      redditPublish: (data: Record<string, unknown>) => Promise<IpcResult>
      redditSearchCommunities: (data: { sessionId: string; query: string; limit?: number }) => Promise<ExtractionResult>
      redditJoinCommunities: (data: { sessionId: string; subreddits: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      redditUpvote: (data: { sessionId: string; postUrls: string[]; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      redditSavePosts: (data: { sessionId: string; postUrls: string[]; doUpvote?: boolean; delayMs?: number; jobId?: string }) => Promise<ExtractionResult>
      redditTopGrowingCommunities: (data: { sessionId: string; limit?: number; jobId?: string }) => Promise<ExtractionResult>
      redditPublishWithImage: (data: { sessionId: string; subreddit: string; title: string; content?: string; imagePath?: string }) => Promise<IpcResult>

      // Google
      googleMapsExtract: (data: Record<string, unknown>) => Promise<ExtractionResult>
      olxExtract: (data: Record<string, unknown>) => Promise<ExtractionResult>
      googleRate: (data: Record<string, unknown>) => Promise<IpcResult>

      // Email
      sendEmail: (data: Record<string, unknown>) => Promise<IpcResult>

      // Auto Point
      autoPointRun: (data: Record<string, unknown>) => Promise<IpcResult>

      // Generic Tool Runner
      runTool: (data: Record<string, unknown>) => Promise<IpcResult>

      // Video Download
      videoDownload: (data: { url: string; saveDir?: string }) => Promise<IpcResult>

      // Hashtags
      generateHashtags: (data: { keyword: string; platform?: string }) => Promise<IpcResult>

      // Proxy
      saveProxy: (data: { label: string; host: string; port: string; protocol: string; username?: string; password?: string
  has_password?: boolean }) => Promise<IpcResult>
      getProxies: () => Promise<IpcResult<ProxyRecord[]>>
      deleteProxy: (data: { id: number }) => Promise<IpcResult>
      testProxy: (data: { host: string; port: string; protocol: string; username?: string; password?: string }) => Promise<IpcResult>

      // SMTP Email
      sendSmtpEmail: (data: SmtpSendParams) => Promise<IpcResult>
      getSmtpSettings: () => Promise<IpcResult<SmtpRecord[]>>
      deleteSmtpSetting: (data: { id: number }) => Promise<IpcResult>

      // Security Settings
      getSecuritySettings: () => Promise<IpcResult<SecuritySettings>>
      saveSecuritySettings: (data: Partial<SecuritySettings>) => Promise<IpcResult>

      // Scheduler
      scheduleCampaign: (data: { name: string; platform: string; type: string; data: Record<string, unknown>; scheduledAt: string }) => Promise<IpcResult>
      getScheduledCampaigns: () => Promise<IpcResult<CampaignRecord[]>>
      deleteCampaign: (data: { id: number }) => Promise<IpcResult>

      // DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbQuery: (data: DbQueryParams) => Promise<IpcResult<any[]>>
      dbInsert: (data: DbInsertParams) => Promise<IpcResult<{ id: number }>>
      dbUpdate: (data: DbUpdateParams) => Promise<IpcResult>
      dbDelete: (data: DbDeleteParams) => Promise<IpcResult>
      dbBulkDelete: (data: { table: string; ids: number[] }) => Promise<IpcResult<{ changes: number; requested: number }>>
      dbDeleteEmptyAccounts: () => Promise<IpcResult<{ changes: number }>>
      clearLeadsByPlatform: (data: { platform: string }) => Promise<IpcResult>
      dbCount: (data: DbQueryParams) => Promise<{ success: boolean; count?: number; error?: string }>

      // Export
      exportToCSV: (data: ExportParams) => Promise<IpcResult>
      exportToExcel: (data: ExportParams) => Promise<IpcResult>

      // Extraction streaming & cancel
      cancelExtraction: (data: { jobId: string }) => void
      onExtractionProgress: (callback: (data: ExtractionProgress) => void) => () => void

      // Safety / anti-ban
      safetyGenerateMessageVariations: (data: { template: string; count?: number; synonyms?: Record<string, string[]> }) => Promise<IpcResult<{ variations: string[]; count: number; requested: number }>>
      safetySessionHealth: (data: { sessionId: string; platform: string }) => Promise<IpcResult<{ alive: boolean; reason?: string; shouldReLogin?: boolean; url?: string }>>

      // Multi-account cycle
      getActiveSessions: () => Promise<IpcResult>
      cycleAccounts: (data: Record<string, unknown>) => Promise<IpcResult>
      stopCycle: () => Promise<IpcResult>

      getAppVersion: () => Promise<IpcResult<string>>
      checkForUpdates: () => Promise<IpcResult<{ updateAvailable: boolean; version: string; currentVersion: string }>>
      downloadUpdate: () => Promise<IpcResult>
      installUpdate: () => Promise<IpcResult>
      onUpdateStatus: (callback: (data: {
        status: 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
        version?: string
        percent?: number
        transferred?: number
        total?: number
        bytesPerSecond?: number
        error?: string
        releaseDate?: string
      }) => void) => () => void
      getPlatform: () => string

      // Window Controls
      minimizeWindow: () => void
      toggleMaximizeWindow: () => void
      closeWindow: () => void
    }
  }
}
