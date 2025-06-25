// utils/mcpMemory.ts
// MCP Memory module: stores prompts, context, and answers for hybrid Nexus.
import fs from 'fs';
import path from 'path';

export type MCPMemoryEntry = {
  prompt: string;
  context: string | null;
  answer: string | null;
  date: string;
};

const MCP_MEMORY_FILE = path.join(process.cwd(), 'mcp-memory.json');

function loadMemory(): MCPMemoryEntry[] {
  if (!fs.existsSync(MCP_MEMORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(MCP_MEMORY_FILE, 'utf-8')) || [];
  } catch {
    return [];
  }
}

function saveMemory(memory: MCPMemoryEntry[]) {
  fs.writeFileSync(MCP_MEMORY_FILE, JSON.stringify(memory, null, 2));
}

export function addMCPEntry(prompt: string, context: string | null, answer: string | null) {
  const memory = loadMemory();
  memory.push({ prompt, context, answer, date: new Date().toISOString() });
  saveMemory(memory);
}

// Simple similarity (can upgrade to embeddings/vector search)
function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  // Jaccard similarity on words
  const aWords = new Set(a.split(/\s+/));
  const bWords = new Set(b.split(/\s+/));
  const intersection = new Set([...aWords].filter(x => bWords.has(x)));
  const union = new Set([...aWords, ...bWords]);
  return intersection.size / union.size;
}

export function findBestMatch(prompt: string, threshold = 0.7): MCPMemoryEntry | null {
  const memory = loadMemory();
  let best: { entry: MCPMemoryEntry; score: number } | null = null;
  for (const entry of memory) {
    const score = stringSimilarity(prompt, entry.prompt);
    if (score >= threshold && (!best || score > best.score)) {
      best = { entry, score };
    }
  }
  return best ? best.entry : null;
}

export function getAllMCPMemory(): MCPMemoryEntry[] {
  return loadMemory();
}
