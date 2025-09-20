import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/youtube';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const urls = youtubeService.detectYouTubeUrls(text);
    const videoIds = urls
      .map(url => youtubeService.extractVideoId(url))
      .filter(Boolean) as string[];

    return NextResponse.json({
      urls,
      videoIds,
      hasYouTubeContent: videoIds.length > 0,
    });
  } catch (error) {
    console.error('Error detecting YouTube URLs:', error);
    return NextResponse.json(
      { error: 'Failed to detect YouTube URLs' },
      { status: 500 }
    );
  }
}
