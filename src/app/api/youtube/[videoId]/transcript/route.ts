import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/youtube';
import { cacheService } from '@/lib/cache';

export async function GET(
  req: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cachedTranscript = await cacheService.getTranscript(videoId);
    if (cachedTranscript) {
      return NextResponse.json({
        videoId,
        transcript: cachedTranscript,
        cached: true,
      });
    }

    // Get transcript from YouTube
    const transcript = await youtubeService.getTranscript(videoId);
    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not available for this video' },
        { status: 404 }
      );
    }

    // Cache the result
    await cacheService.cacheTranscript(videoId, transcript);

    return NextResponse.json({
      videoId,
      transcript,
      cached: false,
    });
  } catch (error) {
    console.error('Error getting transcript:', error);
    return NextResponse.json(
      { error: 'Failed to get transcript' },
      { status: 500 }
    );
  }
}
