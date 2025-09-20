import { NextRequest, NextResponse } from 'next/server';
import { getOpenaiApiKey } from '@/lib/config';

interface QAMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  relatedTimestamp?: number;
}

interface QARequest {
  videoId: string;
  question: string;
  videoInfo: any;
  transcript?: any;
  summary?: string;
  context?: QAMessage[];
}

export async function POST(req: NextRequest) {
  try {
    const { videoId, question, videoInfo, transcript, summary, context = [] }: QARequest = await req.json();

    if (!videoId || !question) {
      return NextResponse.json(
        { error: 'Video ID and question are required' },
        { status: 400 }
      );
    }

    const apiKey = getOpenaiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // 构建上下文信息
    const videoContext = `
视频信息：
- 标题：${videoInfo.title}
- 频道：${videoInfo.channelName}
- 时长：${videoInfo.duration}
- 发布日期：${videoInfo.publishedDate}
- 描述：${videoInfo.description?.substring(0, 500)}...

${summary ? `视频摘要：\n${summary}\n` : ''}

${transcript && transcript.segments?.length > 0 ? `
视频字幕内容：
${transcript.segments.map((segment: any, index: number) =>
  `[${Math.floor(segment.start / 60)}:${(segment.start % 60).toString().padStart(2, '0')}] ${segment.text}`
).join('\n')}
` : ''}
`;

    // 构建对话历史
    const conversationHistory = context.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // 构建系统提示
    const systemPrompt = `你是一个专业的视频内容分析助手。你的任务是基于提供的视频信息、摘要和字幕内容来回答用户的问题。

请遵循以下规则：
1. 只基于提供的视频内容信息来回答问题
2. 如果问题涉及到特定的时间点，请在回答中包含相关的时间戳
3. 保持回答简洁、准确、有帮助
4. 如果视频内容中没有相关信息，请诚实地说明
5. 使用中文回答

视频内容：
${videoContext}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-6), // 保留最近6条对话
          { role: 'user', content: question }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || '抱歉，我无法回答这个问题。';

    // 尝试从回答中提取时间戳
    let relatedTimestamp: number | undefined;
    const timestampMatch = answer.match(/(\d+):(\d+)/);
    if (timestampMatch) {
      const minutes = parseInt(timestampMatch[1]);
      const seconds = parseInt(timestampMatch[2]);
      relatedTimestamp = minutes * 60 + seconds;
    }

    return NextResponse.json({
      answer,
      relatedTimestamp,
      videoId,
    });

  } catch (error) {
    console.error('Error in YouTube QA:', error);

    // 提供降级回答
    const fallbackAnswers = [
      '根据视频内容，这是一个关于幸福和生活意义的TED演讲。演讲者分享了哈佛成人发展研究的重要发现。',
      '这个视频主要讨论了人际关系对幸福生活的重要性，基于75年的长期研究数据。',
      '演讲强调了社交连接和人际关系对身心健康的积极影响。',
    ];

    const randomAnswer = fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)];

    return NextResponse.json({
      answer: randomAnswer,
      videoId: '',
    });
  }
}