const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY as string

export async function searchYouTube(query: string): Promise<{ videoId: string; title: string } | null> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.items && data.items.length > 0) {
    const item = data.items[0]
    return { videoId: item.id.videoId, title: item.snippet.title }
  }

  return null
}
