// /app/api/transcribe/route.ts (自包含的最终版本)

import { NextRequest, NextResponse } from 'next/server';

// 所有逻辑都在这个文件里，不再导入 'lib' 里的任何东西

export async function POST(request: NextRequest) {
  // 为了方便调试，每次请求都在终端打印一些空行和标题
  console.log("\n\n\n--- [最终版API] 收到新的转录请求 ---");

  // 1. 检查 API Key 是否存在
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.error("[最终版API] 致命错误: 环境变量 DEEPGRAM_API_KEY 未设置!");
    return NextResponse.json({ success: false, error: '服务器配置错误，API密钥丢失。' }, { status: 500 });
  }
  console.log("[最终版API] API Key 加载成功。");

  try {
    // 2. 获取表单数据
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;
    const languageFromForm = formData.get('language') as string | null;

    if (!file) {
      console.error("[最终版API] 错误: 表单中没有找到 'audio' 文件。");
      return NextResponse.json({ success: false, error: '未收到音频文件' }, { status: 400 });
    }

    console.log(`[最终版API] 收到文件: ${file.name}`);
    console.log(`[最终版API] 从前端接收到的语言是: ${languageFromForm}`);

    // 3. 决定要发给 Deepgram 的语言
    // 如果前端传来 'zh'，就用 'zh-CN'，否则一律用 'en-US'
    const deepgramLanguage = languageFromForm === 'zh' ? 'zh-CN' : 'en-US';
    console.log(`[最终版API] 最终决定发给 Deepgram 的语言是: ${deepgramLanguage}`);

    // 4. 构建 Deepgram API 的请求 URL
    const params = new URLSearchParams({
      model: 'nova-2-general',
      language: deepgramLanguage,
      smart_format: 'true',
      punctuate: 'true',
    });
    const url = `https://api.deepgram.com/v1/listen?${params}`;
    console.log(`[最终版API] 正在请求 URL: ${url}`);

    // 5. 直接调用 Deepgram API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': file.type, // 使用文件自己的 MIME 类型
      },
      body: file,
    });

    // 6. 检查 Deepgram 的响应
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[最终版API] Deepgram API 错误 (状态码: ${response.status}):`, errorBody);
        throw new Error(`转录服务失败，状态码: ${response.status}`);
    }

    const result = await response.json();
    console.log("[最终版API] Deepgram 响应成功。");

    // 7. 从结果中提取所需信息
    const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
    const confidence = result.results?.channels[0]?.alternatives[0]?.confidence || 0;
    const duration = result.metadata?.duration || 0;

    console.log(`[最终版API] 转录结果预览: "${transcript.substring(0, 70)}..."`);
    console.log("--- [最终版API] 请求处理完毕 ---");

    // 8. 将成功结果返回给前端
    return NextResponse.json({
      success: true,
      transcript,
      confidence,
      duration,
    });

  } catch (error) {
    console.error("[最终版API] CATCH 捕获到全局错误:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '发生未知内部错误' },
      { status: 500 }
    );
  }
}