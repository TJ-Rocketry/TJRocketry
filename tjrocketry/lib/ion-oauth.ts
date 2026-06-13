import { AuthorizationCode } from 'simple-oauth2';

const ion_client_id = process.env.ION_CLIENT_ID;
const ion_client_secret = process.env.ION_CLIENT_SECRET;
const ion_redirect_uri = process.env.ION_REDIRECT_URI;

if (!ion_client_id || !ion_client_secret || !ion_redirect_uri) {
  // We don't throw here to avoid crashing during build, but we should log or handle it
  console.warn("Missing Ion OAuth environment variables.");
}

export const client = new AuthorizationCode({
  client: {
    id: ion_client_id || '',
    secret: ion_client_secret || '',
  },
  auth: {
    tokenHost: 'https://ion.tjhsst.edu',
    authorizePath: '/oauth/authorize',
    tokenPath: '/oauth/token/',
  },
});

export const redirect_uri = ion_redirect_uri || '';
