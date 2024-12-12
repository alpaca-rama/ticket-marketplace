import { ConvexHttpClient } from "convex/browser";

// CREATE A CLIENT FOR SERVE_SIDE HTTP REQUESTS
export const getConvexClient = () => {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  }

  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
}