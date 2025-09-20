import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/youtube';
import { cacheService } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    const { videoId } = await req.json();

    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Check if already processing
    const processingStatus = await cacheService.getProcessingStatus(videoId);
    if (processingStatus === 'processing') {
      return NextResponse.json({
        status: 'processing',
        message: 'Video is currently being processed',
      });
    }

    // Check cache first
    const cachedInfo = await cacheService.getVideoInfo(videoId);
    const cachedTranscript = await cacheService.getTranscript(videoId);

    if (cachedInfo && cachedTranscript) {
      return NextResponse.json({
        status: 'completed',
        data: {
          videoInfo: cachedInfo,
          transcript: cachedTranscript,
        },
      });
    }

    // Set processing status
    await cacheService.setProcessingStatus(videoId, 'processing');

    try {
      // Get video info
      const videoInfo = await youtubeService.getVideoInfo(videoId);
      if (!videoInfo) {
        await cacheService.setProcessingStatus(videoId, 'failed');
        return NextResponse.json(
          { error: 'Video not found or invalid video ID' },
          { status: 404 }
        );
      }

      // Get transcript (optional)
      const transcript = await youtubeService.getTranscript(videoId);
      // Continue even if transcript is not available

      // Cache the results
      const cachePromises = [
        cacheService.cacheVideoInfo(videoId, videoInfo),
        cacheService.setProcessingStatus(videoId, 'completed'),
      ];

      if (transcript) {
        cachePromises.push(cacheService.cacheTranscript(videoId, transcript));
      }

      await Promise.all(cachePromises);

      return NextResponse.json({
        status: 'completed',
        data: {
          videoInfo,
          transcript,
        },
      });
    } catch (error) {
      await cacheService.setProcessingStatus(videoId, 'failed');
      throw error;
    }
  } catch (error) {
    console.error('Error processing YouTube video:', error);
    return NextResponse.json(
      { error: 'Failed to process YouTube video' },
      { status: 500 }
    );
  }
}
