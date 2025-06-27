/**
 * Función para leer el contenido de un archivo como texto
 * @param file Archivo a leer
 * @returns Promesa que resuelve con el contenido del archivo como texto
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(reader.error);
    reader.readAsText(file);
  });
};

/**
 * Analiza el contenido del documento usando la API de Ollama
 * @param text Contenido del documento a analizar
 * @param prompt Instrucciones para el análisis
 * @returns Promesa que resuelve con la respuesta del análisis
 */
export const analyzeWithOllama = async (text: string, prompt: string): Promise<string> => {
  try {
    const response = await fetch('/api/ollama/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        prompt: prompt
      }),
    });

    if (!response.ok) {
      throw new Error('Error al analizar el texto con Ollama');
    }

    const data = await response.json();
    return data.response || 'No se pudo analizar el contenido';
  } catch (error) {
    console.error('Error en analyzeWithOllama:', error);
    return 'Lo siento, no pude analizar el contenido. Error: ' + 
           (error instanceof Error ? error.message : 'Error desconocido');
  }
};

/**
 * Procesa un archivo subido y devuelve su análisis
 * @param file Archivo a procesar
 * @param userInput Entrada del usuario para el análisis
 * @returns Objeto con el resultado del análisis o error
 */
export const processUploadedFile = async (file: File, userInput: string) => {
  try {
    // Leer el contenido del archivo
    const text = await readFileAsText(file);
    
    // Definir el prompt para el análisis
    const analysisPrompt = userInput.trim() || 'Analiza este documento y proporciona un resumen detallado';
    
    // Analizar el contenido con Ollama
    const analysis = await analyzeWithOllama(text, analysisPrompt);
    
    return {
      success: true,
      fileName: file.name,
      content: text.substring(0, 1000) + (text.length > 1000 ? '...' : ''),
      analysis: analysis
    };
  } catch (error) {
    console.error(`Error procesando ${file.name}:`, error);
    return {
      success: false,
      fileName: file.name,
      error: `Error al procesar el archivo ${file.name}. Asegúrate de que sea un archivo de texto o PDF válido.`
    };
  }
};
