import { INSTAGRAM_URL } from '../constants/social-links';

export function buildFestivallOrganizationJsonLd(siteUrl: string): Record<string, unknown> {
  const origin = siteUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FestivAll',
    url: origin,
    email: 'info@festivall.club',
    sameAs: [INSTAGRAM_URL],
  };
}
