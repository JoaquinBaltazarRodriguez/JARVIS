import { ChromaClient, Collection } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Utiliza Ollama para generar embeddings (vector semántico)
async function getEmbedding(text: string): Promise<number[]> {
  // Ollama embedding endpoint (requiere modelo compatible, ej: llama3)
  try {
    const response = await axios.post('http://localhost:11434/api/embeddings', {
      model: 'phi3', // Usa el mismo modelo que para respuestas
      prompt: text
    });
    return response.data.embedding;
  } catch (error) {
    console.error('Error generando embedding:', error);
    return [];
  }
}

const client = new ChromaClient();
let collection: Collection | null = null;

export async function initMemory() {
  if (!collection) {
    collection = await client.getOrCreateCollection({
      name: 'nexus-memory',
      embeddingFunction: undefined // No usar embeddingFunction por defecto
    });
  }
}

export async function saveQA(question: string, answer: string) {
  await initMemory();
  const embedding = await getEmbedding(question);
  await collection!.add({
    ids: [uuidv4()],
    embeddings: [embedding],
    documents: [JSON.stringify({ question, answer, date: new Date().toISOString() })],
    metadatas: [{ type: 'qa' }],
  });
}

export async function findSimilar(question: string, topK = 1): Promise<string | null> {
  await initMemory();
  const embedding = await getEmbedding(question);
  const results = await collection!.query({
    queryEmbeddings: [embedding],
    nResults: topK,
  });
  if (results.documents && results.documents[0] && results.documents[0][0]) {
    const doc = JSON.parse(results.documents[0][0]);
    return doc.answer;
  }
  return null;
}
