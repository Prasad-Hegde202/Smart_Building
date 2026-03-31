import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000"
});

export const getHistory = () => API.get("/history");
export const sendReading = (data) => API.post("/iot", data);