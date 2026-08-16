export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined"
    ? `ws://${window.location.hostname || "localhost"}:2567`
    : "ws://localhost:2567");
