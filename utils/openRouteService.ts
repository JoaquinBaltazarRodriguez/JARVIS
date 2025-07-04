// Utilidad para consultar rutas reales en OpenRouteService
// Puedes usarla directamente desde el MapViewer

const ORS_API_KEY = "5b3ce3597851110001cf62488c6003c0d6c64f55961dd955e63db2bf";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

export interface RouteResult {
  geometry: any;
  steps: RouteStep[];
  distance: number;
  duration: number;
}

export async function getRouteORS(
  start: LatLng,
  end: LatLng
): Promise<RouteResult | null> {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}`;
  const body = {
    coordinates: [
      [start.lng, start.lat],
      [end.lng, end.lat],
    ],
    instructions: true,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.features[0];
    const geometry = route.geometry;
    const summary = route.properties.summary;
    const steps: RouteStep[] = route.properties.segments[0].steps.map((step: any) => ({
      instruction: step.instruction,
      distance: step.distance,
      duration: step.duration,
    }));
    return {
      geometry,
      steps,
      distance: summary.distance,
      duration: summary.duration,
    };
  } catch (err) {
    console.error("Error al consultar ORS:", err);
    return null;
  }
}
