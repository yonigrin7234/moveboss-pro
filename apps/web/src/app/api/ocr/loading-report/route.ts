import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    // Call Claude Vision API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Extract from this moving company loading report:
1. The balance due on delivery (the dollar amount the customer pays at delivery)
2. The job/reference number (company's internal reference)

Important: The balance due is what the customer owes at delivery, not the total estimate.

Return ONLY a JSON object in this exact format, no other text:
{"balance_due": <number or null>, "job_number": "<string or null>"}

If you cannot find a value, use null. For balance_due, return just the number without $ sign.`,
            },
          ],
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        error: 'Could not parse document. Please enter details manually.',
      });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: {
        balance_due: extracted.balance_due,
        job_number: extracted.job_number,
      },
    });
  } catch (error) {
    console.error('[ocr/loading-report] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process document',
      },
      { status: 500 }
    );
  }
}
