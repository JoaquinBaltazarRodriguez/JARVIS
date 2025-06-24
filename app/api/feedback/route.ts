// app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyQA, removeQA } from '../../../utils/jarvisMemory';

export async function POST(req: NextRequest) {
  const { question, action } = await req.json();
  if (!question || !action) {
    return NextResponse.json({ error: 'Missing question or action.' }, { status: 400 });
  }

  if (action === 'verify') {
    verifyQA(question);
    return NextResponse.json({ success: true, message: 'Respuesta marcada como verificada.' });
  }
  if (action === 'remove') {
    removeQA(question);
    return NextResponse.json({ success: true, message: 'Respuesta eliminada de la memoria.' });
  }
  return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
}
