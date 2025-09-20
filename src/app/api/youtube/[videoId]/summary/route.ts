import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/youtube';
import { cacheService } from '@/lib/cache';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cachedSummary = await cacheService.getSummary(videoId);
    if (cachedSummary) {
      return NextResponse.json({
        videoId,
        summary: cachedSummary,
        cached: true,
      });
    }

    // Get video info using YouTube API
    const videoInfo = await youtubeService.getVideoInfo(videoId);
    if (!videoInfo) {
      return NextResponse.json(
        { error: 'Video information not available' },
        { status: 404 }
      );
    }

    // Generate summary based on video metadata
    const summary = `**${videoInfo.title}**

**Channel:** ${videoInfo.channelName}
**Duration:** ${videoInfo.duration}
**Published:** ${videoInfo.publishedDate}
**Views:** ${parseInt(videoInfo.viewCount).toLocaleString()}

**Description:**
${videoInfo.description}

*Note: This summary is based on video metadata. For detailed content analysis, transcript access would be required.*`;

    // Cache the summary
    await cacheService.cacheSummary(videoId, summary);

    return NextResponse.json({
      videoId,
      summary,
      cached: false,
    });
  } catch (error) {
    console.error('Error generating YouTube summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}