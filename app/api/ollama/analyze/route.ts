import { NextResponse } from 'next/server';
import { askOllama } from '@/utils/ollama';

export async function POST(request: Request) {
  try {
    const { text, prompt } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'No se proporcionó texto para analizar' },
        { status: 400 }
      );
    }

    // Usar el prompt proporcionado o uno por defecto
    const analysisPrompt = prompt || 'Analiza el siguiente texto y proporciona un resumen detallado';
    
    // Enviar a Ollama para análisis
    const response = await askOllama(`${analysisPrompt}:\n\n${text}`);
    
    return NextResponse.json({
      success: true,
      response: response.response
    });
    
  } catch (error) {
    console.error('Error en el análisis con Ollama:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
