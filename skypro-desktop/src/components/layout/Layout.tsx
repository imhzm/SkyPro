import { lazy, Suspense } from 'react'
import { useAppStore } from '../../stores/appStore'
import Sidebar from './Sidebar'
import AppTitleBar from './AppTitleBar'
import ErrorBoundary from '../../components/common/ErrorBoundary'

const DashboardModule = lazy(() => import('../../modules/dashboard/DashboardModule'))
const AccountsModule = lazy(() => import('../../modules/accounts/AccountsModule'))
const FacebookModule = lazy(() => import('../../modules/facebook/FacebookModule'))
const WhatsappModule = lazy(() => import('../../modules/whatsapp/WhatsappModule'))
const InstagramModule = lazy(() => import('../../modules/instagram/InstagramModule'))
const TwitterModule = lazy(() => import('../../modules/twitter/TwitterModule'))
const LinkedinModule = lazy(() => import('../../modules/linkedin/LinkedinModule'))
const TelegramModule = lazy(() => import('../../modules/telegram/TelegramModule'))
const TiktokModule = lazy(() => import('../../modules/tiktok/TiktokModule'))
const PinterestModule = lazy(() => import('../../modules/pinterest/PinterestModule'))
const SnapchatModule = lazy(() => import('../../modules/snapchat/SnapchatModule'))
const ThreadsModule = lazy(() => import('../../modules/threads/ThreadsModule'))
const RedditModule = lazy(() => import('../../modules/reddit/RedditModule'))
const GoogleModule = lazy(() => import('../../modules/google/GoogleModule'))
const SendEmailsModule = lazy(() => import('../../modules/send-emails/SendEmailsModule'))
const AutoPointModule = lazy(() => import('../../modules/auto-point/AutoPointModule'))
const SecurityModule = lazy(() => import('../../modules/security/SecurityModule'))
const AccountModule = lazy(() => import('../../modules/account/AccountModule'))
const OtherToolsModule = lazy(() => import('../../modules/other-tools/OtherToolsModule'))
const SettingsModule = lazy(() => import('../../modules/settings/SettingsModule'))

const platformModules: Record<string, React.ComponentType> = {
  dashboard: DashboardModule,
  accounts: AccountsModule,
  facebook: FacebookModule,
  whatsapp: WhatsappModule,
  instagram: InstagramModule,
  twitter: TwitterModule,
  linkedin: LinkedinModule,
  telegram: TelegramModule,
  tiktok: TiktokModule,
  pinterest: PinterestModule,
  snapchat: SnapchatModule,
  threads: ThreadsModule,
  reddit: RedditModule,
  google: GoogleModule,
  'send-emails': SendEmailsModule,
  'auto-point': AutoPointModule,
  security: SecurityModule,
  account: AccountModule,
  'other-tools': OtherToolsModule,
  settings: SettingsModule,
}

export default function Layout() {
  const { activePlatform } = useAppStore()
  const ActiveModule = platformModules[activePlatform] || DashboardModule

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppTitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto p-5 scroll-container"
          style={{
            /* Body already paints the soft indigo/violet wash; main reads
               through with subtle layered radials for depth. */
            background:
              'radial-gradient(ellipse 70% 50% at 18% 0%, rgba(99,102,241,0.06), transparent 60%), radial-gradient(ellipse 70% 50% at 82% 100%, rgba(168,85,247,0.05), transparent 60%), linear-gradient(180deg, #f7f8ff 0%, #ecedfa 100%)',
          }}
        >
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-4 mx-auto mb-3" style={{ borderColor: 'rgba(99,102,241,0.25)', borderTopColor: '#7c3aed' }} /><p className="text-secondary-400 text-xs">جاري التحميل...</p></div></div>}>
              <ActiveModule />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}