// /pages/api/spotify/auth.js
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-library-read',
    'user-library-modify',
    'user-read-playback-state',
    'user-modify-playback-state',
    'playlist-read-private',
    'playlist-read-collaborative'
  ];

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scopes.join(' '),
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    state: 'jarvis-auth'
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  
  res.redirect(authUrl);
}