export const API_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://infinity-book-1.onrender.com');

console.log("API URL:", API_URL);
