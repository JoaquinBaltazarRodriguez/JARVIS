import { useEffect, useRef } from "react"

export function useNexusStartupAnimation(isStartup: boolean, onEnd?: () => void) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (isStartup) {
      document.body.classList.add("nexus-startup")
      if (onEnd) {
        timeoutRef.current = setTimeout(() => {
          onEnd()
        }, 3500) // Duración de animación
      }
    } else {
      document.body.classList.remove("nexus-startup")
    }
    return () => {
      clearTimeout(timeoutRef.current)
      document.body.classList.remove("nexus-startup")
    }
  }, [isStartup, onEnd])
}
