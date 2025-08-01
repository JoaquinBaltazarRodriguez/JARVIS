import axios from 'axios';

export async function askOllama(prompt: string, model = 'phi3') {
  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model,
      prompt,
      stream: false
    });
    return { response: response.data.response.trim() };
  } catch (error) {
    console.error('Error comunicando con Ollama:', error);
    return { response: 'Lo siento, Señor. No pude comunicarme con mi modelo local.' };
  }
}