export function extractYouTubeId(url) {
  
  const regex = /(?:youtube\.com.*(?:\?|&)v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}