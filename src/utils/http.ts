import axios, { type AxiosInstance } from "axios";

class Http {
  instance: AxiosInstance;
  constructor() {
    this.instance = axios.create({
      baseURL: "http://localhost:4000/api",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }
}

const http = new Http().instance;

export default http;
