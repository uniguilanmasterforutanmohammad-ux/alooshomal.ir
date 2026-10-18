/**
 * Map an admin notification link (`/admin?section=…`) to the equivalent
 * limited «کاربر ادمین» review queue. A moderator has no access to `/admin`, so
 * without this the bell/inbox links would dead-end on a redirect.
 */
const ADMIN_SECTION_TO_SCOPE: Record<string, string> = {
  biolinks: 'BIOLINK',
  'business-cards': 'BUSINESS_CARD',
  feeds: 'FEED',
  news: 'NEWS',
  subscriptions: 'SUBSCRIPTION_REQUESTS',
  ads: 'AD_REQUESTS',
  boosts: 'BOOST_REQUESTS',
};

export function moderatorNotificationLink(link: string): string {
  const match = /^\/admin\?(?:.*&)?section=([^&]+)/.exec(link);
  const section = match?.[1];
  // Directory ads share the `ads` section but belong to their own queue.
  if (section === 'ads' && /placement=directory/.test(link)) {
    return '/moderator?scope=DIRECTORY_AD_REQUESTS';
  }
  if (section && ADMIN_SECTION_TO_SCOPE[section]) {
    return `/moderator?scope=${ADMIN_SECTION_TO_SCOPE[section]}`;
  }
  return link;
}
