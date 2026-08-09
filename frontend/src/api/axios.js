import axios from "axios";

// Set REACT_APP_API_URL in .env to point at a local backend during development.
const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  "https://optimal-desicion-maker-app-backend.onrender.com/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
  // The session lives in an httpOnly cookie, so every request has to carry it.
  // Setting it here rather than per-call means a new endpoint can't forget to.
  withCredentials: true,
});

export default axiosInstance;
 