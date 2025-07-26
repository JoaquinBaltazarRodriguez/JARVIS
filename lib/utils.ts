import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Devuelve el tratamiento adecuado según el género
 * @param gender El género del perfil ('masculine' o 'feminine')
 * @returns 'Señor' o 'Señora' según corresponda
 */
export function getGenderTreatment(gender?: string): string {
  if (gender === "feminine") {
    return "Señora"
  }
  return "Señor" // Por defecto o masculino
}
