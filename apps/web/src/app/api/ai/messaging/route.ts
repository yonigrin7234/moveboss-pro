import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  AI_TOOL_SCHEMAS,
  executeAITool,
  type AIToolName,
  type AIToolContext,
} from '@/lib/ai/communication-tools';

// GET /api/ai/messaging
// Get available AI tools and their schemas
export async function GET() {
  return NextResponse.json({
    tools: Object.values(AI_TOOL_SCHEMAS),
  });
}

// POST /api/ai/messaging
// Execute an AI tool
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tool, params, driver_id } = body;

    if (!tool || typeof tool !== 'string') {
      return NextResponse.json({ error: 'tool is required' }, { status: 400 });
    }

    if (!Object.keys(AI_TOOL_SCHEMAS).includes(tool)) {
      return NextResponse.json(
        { error: `Unknown tool: ${tool}`, available_tools: Object.keys(AI_TOOL_SCHEMAS) },
        { status: 400 }
      );
    }

    // Get user's company and role
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No company membership found' }, { status: 400 });
    }

    const context: AIToolContext = {
      userId: user.id,
      companyId: membership.company_id,
      role: membership.role,
      driverId: driver_id,
    };

    const result = await executeAITool(tool as AIToolName, context, params ?? {});

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, metadata: result.metadata },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI messaging API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute AI tool' },
      { status: 500 }
    );
  }
}
