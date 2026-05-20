export const API_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://infinity-book-1.onrender.com";

console.log("API URL:", API_URL);
