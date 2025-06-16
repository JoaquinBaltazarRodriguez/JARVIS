interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition
}

interface Window {
  SpeechRecognition: SpeechRecognitionStatic
  webkitSpeechRecognition: SpeechRecognitionStatic
}

declare var SpeechRecognition: SpeechRecognitionStatic
declare var webkitSpeechRecognition: SpeechRecognitionStatic
