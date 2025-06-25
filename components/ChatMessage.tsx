// components/ChatMessage.tsx
import { useState } from 'react';

interface ChatMessageProps {
  message: string;
  question: string;
  from: 'user' | 'nexus';
}

export default function ChatMessage({ message, question, from }: ChatMessageProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleFeedback = async (action: 'verify' | 'remove') => {
    setFeedback(action);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, action }),
    });
  };

  return (
    <div style={{
      background: from === 'nexus' ? '#f0f4ff' : '#e2ffe2',
      margin: '12px 0',
      padding: 12,
      borderRadius: 8,
      maxWidth: 600,
      alignSelf: from === 'nexus' ? 'flex-start' : 'flex-end',
      position: 'relative',
    }}>
      <div>{message}</div>
      {from === 'nexus' && question && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => handleFeedback('verify')}
            disabled={feedback === 'verify'}
            title="Respuesta correcta"
            style={{ marginRight: 8 }}
          >✅</button>
          <button
            onClick={() => handleFeedback('remove')}
            disabled={feedback === 'remove'}
            title="Respuesta incorrecta"
          >❌</button>
          {feedback && (
            <span style={{ marginLeft: 12, color: feedback === 'verify' ? 'green' : 'red' }}>
              {feedback === 'verify' ? '¡Marcada como correcta!' : '¡Eliminada de memoria!'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
