import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/youtube';
import { cacheService } from '@/lib/cache';
import { getConfig } from '@/lib/config';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

async function getChatModel(): Promise<BaseChatModel> {
  const config = getConfig();
  
  // Use the same model configuration as the main chat
  if (config.API_KEYS.OPENAI) {
    return new ChatOpenAI({
      openAIApiKey: config.API_KEYS.OPENAI,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.3,
    });
  } else if (config.API_KEYS.ANTHROPIC) {
    return new ChatAnthropic({
      anthropicApiKey: config.API_KEYS.ANTHROPIC,
      modelName: 'claude-3-haiku-20240307',
      temperature: 0.3,
    });
  } else {
    throw new Error('No AI model configured');
  }
}

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
    const cachedSummary = await cacheService.getSummary(videoId);
    if (cachedSummary) {
      return NextResponse.json({
        videoId,
        summary: cachedSummary,
        cached: true,
      });
    }

    // Get transcript
    let transcript = await cacheService.getTranscript(videoId);
    if (!transcript) {
      transcript = await youtubeService.getTranscript(videoId);
      if (!transcript) {
        return NextResponse.json(
          { error: 'Transcript not available for this video' },
          { status: 404 }
        );
      }
      await cacheService.cacheTranscript(videoId, transcript);
    }

    // Get video info for context
    let videoInfo = await cacheService.getVideoInfo(videoId);
    if (!videoInfo) {
      videoInfo = await youtubeService.getVideoInfo(videoId);
      if (videoInfo) {
        await cacheService.cacheVideoInfo(videoId, videoInfo);
      }
    }

    // Generate summary using AI
    const chatModel = await getChatModel();
    
    const prompt = `Please provide a comprehensive summary of this YouTube video transcript. Include the main topics, key points, and important insights.

Video Title: ${videoInfo?.title || 'Unknown'}
Channel: ${videoInfo?.channelName || 'Unknown'}
Duration: ${videoInfo?.duration || 'Unknown'}

Transcript:
${transcript.text}

Please structure your summary with:
1. **Overview**: Brief description of the video's main topic
2. **Key Points**: Main arguments or topics discussed
3. **Important Details**: Specific facts, numbers, or examples mentioned
4. **Conclusion**: Final thoughts or takeaways

Keep the summary concise but comprehensive, around 200-400 words.`;

    const response = await chatModel.invoke(prompt);
    const summary = response.content as string;

    // Cache the summary
    await cacheService.cacheSummary(videoId, summary);

    return NextResponse.json({
      videoId,
      summary,
      cached: false,
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
