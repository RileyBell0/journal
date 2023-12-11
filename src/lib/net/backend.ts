import axios, { type AxiosInstance } from 'axios';

const backend_url = 'https://dev.com'
const backend: AxiosInstance = axios.create({
    baseURL: `${backend_url}/api`,
    headers: {
        withCredentials: true,
        secure: true
    }
});

export { backend, backend_url };
