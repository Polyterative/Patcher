export interface HomeTextSegment {
  highlighted: boolean;
  text: string;
}

export const buildHomeTextSegments = (text: string, keywords: string[] = []): HomeTextSegment[] => {
  if (!text) {
    return [];
  }
  
  const normalizedKeywords = keywords
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 0)
    .sort((a, b) => b.length - a.length);
  
  if (!normalizedKeywords.length) {
    return [{highlighted: false, text}];
  }
  
  const escapedKeywords = normalizedKeywords.map(keyword => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const matcher = new RegExp(`(${ escapedKeywords.join('|') })`, 'gi');
  const segments: HomeTextSegment[] = [];
  
  let cursor = 0;
  for (const match of text.matchAll(matcher)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      segments.push({
        highlighted: false,
        text: text.slice(cursor, matchIndex)
      });
    }
    
    segments.push({
      highlighted: true,
      text: match[0]
    });
    
    cursor = matchIndex + match[0].length;
  }
  
  if (cursor < text.length) {
    segments.push({
      highlighted: false,
      text: text.slice(cursor)
    });
  }
  
  return segments;
};