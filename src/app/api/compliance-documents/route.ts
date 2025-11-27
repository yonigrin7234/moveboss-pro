import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-server';
import { createDocument } from '@/data/compliance-documents';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const result = await createDocument(user.id, {
      company_id: body.company_id,
      partnership_id: body.partnership_id,
      document_type: body.document_type,
      document_name: body.document_name,
      description: body.description,
      file_url: body.file_url,
      file_name: body.file_name,
      file_size: body.file_size,
      file_type: body.file_type,
      effective_date: body.effective_date,
      expiration_date: body.expiration_date,
      insurance_company: body.insurance_company,
      policy_number: body.policy_number,
      coverage_amount: body.coverage_amount,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating compliance document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create document' },
      { status: 500 }
    );
  }
}
