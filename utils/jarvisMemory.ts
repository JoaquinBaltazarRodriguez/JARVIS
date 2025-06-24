// utils/jarvisMemory.ts
import fs from 'fs';
import path from 'path';
import stringSimilarity from 'string-similarity';

const MEMORY_FILE = path.join(process.cwd(), 'jarvis-memory.json');

// Carga la memoria desde archivo o crea una nueva si no existe
function loadMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify([]));
  }
  try {
    const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
    if (!data.trim()) {
      fs.writeFileSync(MEMORY_FILE, JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  } catch (e) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify([]));
    return [];
  }
}

// Guarda la memoria en disco
function saveMemory(memory: any[]) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// Busca respuesta exacta
export function findAnswer(question: string): string | null {
  const memory = loadMemory();
  const found = memory.find((item: any) => item.question.toLowerCase() === question.toLowerCase());
  return found ? found.answer : null;
}

// Extrae entidad de la pregunta para comparación semántica
function extractEntity(text: string): string | null {
  if (!text) return null;
  const entityRegex = /(camioneta|ford ranger|ferreter[íi]a|tesla|citro[eé]n|auto|veh[íi]culo|modelo|bater[íi]a|pantalla|llaves|toyota|prius|sol|coche|pickup|ranger|empresa|negocio|taller|producto|catálogo|cliente|servicio|motor|v6|diesel|eléctrico|híbrido|suv|sedán|hatchback)/i;
  const match = text.match(entityRegex);
  return match ? match[0].toLowerCase() : null;
}

// Determina si una pregunta es ambigua (requiere contexto)
export function isAmbiguousQuestion(question: string): boolean {
  const ambiguousQ = /qué más|acerca de esto|acerca de esta|dime más|cuéntame más|háblame más|algo más|puedes agregar|puedes decirme más|podrías ampliar|podrías agregar/i;
  return ambiguousQ.test(question.toLowerCase());
}

// Busca respuesta similar (fuzzy) SOLO si está verificada
export function findFuzzyAnswer(question: string): string | null {
  const memory = loadMemory().filter((item: any) => item.verified === true);
  const questions = memory.map((item: any) => item.question);
  if (!questions.length) return null;

  const { bestMatch } = stringSimilarity.findBestMatch(question, questions);

  if (bestMatch.rating > 0.85) {
    const found = memory.find((item: any) => item.question === bestMatch.target);
    if (found) {
      const entityQ = extractEntity(question);
      const entityMem = extractEntity(found.question);
      if (entityQ && entityMem && entityQ === entityMem) {
        return found.answer;
      }
    }
  }
  return null;
}

// Normaliza texto: quita tildes, minúsculas, quita espacios extra
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^\w\s]/gi, "") // quita signos
    .replace(/\s+/g, " ") // espacios únicos
    .trim()
    .toLowerCase();
}

// Elimina todas las entradas de memoria por pregunta similar (ignora tildes, mayúsculas, espacios)
export function removeQA(question: string) {
  const normQ = normalizeText(question);
  let memory = loadMemory();
  console.log('[DEBUG] Memoria antes de eliminar:', JSON.stringify(memory, null, 2));
  console.log('[DEBUG] Pregunta recibida:', question);
  console.log('[DEBUG] Pregunta normalizada:', normQ);
  const before = memory.length;
  memory = memory.filter((item: any) => normalizeText(item.question) !== normQ);
  const after = memory.length;
  try {
    saveMemory(memory);
    console.log('[DEBUG] Memoria después de eliminar:', JSON.stringify(memory, null, 2));
    console.log(`[MEM] Entradas eliminadas por feedback: ${before - after}. Pregunta base:`, question);
  } catch (err) {
    console.error('[ERROR] No se pudo guardar la memoria:', err);
  }
}

// Marca una entrada como verificada
export function verifyQA(question: string) {
  let memory = loadMemory();
  memory = memory.map((item: any) => {
    if (item.question === question) {
      return { ...item, verified: true };
    } else {
      return item;
    }
  });
  saveMemory(memory);
  console.log('[MEM] Entrada marcada como verificada:', question);
}

// Determina si una entrada es válida para guardar en memoria
export function isValidMemoryEntry(question: string, answer: string): boolean {
  if (!answer || typeof answer !== 'string') return false;
  const trimmed = answer.trim().toLowerCase();
  const ambiguousQ = /qué más|acerca de esto|acerca de esta|dime más|cuéntame más|háblame más|algo más|puedes agregar|puedes decirme más|podrías ampliar|podrías agregar/i;

  if (trimmed.length < 15) return false;
  if (trimmed === question.trim().toLowerCase()) return false;
  if (/modelo xyz|no sé|no tengo información|como ia|soy una ia|no puedo responder|no dispongo de datos|no estoy seguro|no tengo datos|no existe información|no tengo conocimiento|no cuento con información|no tengo detalles|no puedo ayudarte|no puedo contestar|quizá|posiblemente|tal vez|no estoy seguro|no se sabe|no hay datos|no encuentro información/.test(trimmed)) return false;
  if (ambiguousQ.test(question.toLowerCase())) return false;

  return true;
}

// Agrega una entrada si es válida
export function saveQA(question: string, answer: string) {
  if (!isValidMemoryEntry(question, answer)) {
    console.log('[MEM] Entrada NO guardada por baja calidad o irrelevancia:', { question, answer });
    return;
  }
  const memory = loadMemory();
  memory.push({ question, answer, date: new Date().toISOString(), verified: false });
  saveMemory(memory);
}

// Limpia toda la memoria local
export function clearMemory() {
  saveMemory([]);
}
