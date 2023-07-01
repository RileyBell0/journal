import axios, { type AxiosInstance } from 'axios';

const backend: AxiosInstance = axios.create({
	baseURL: 'https://devrileydev.com/api',
	headers: {
		withCredentials: true,
		secure: true
	}
});

export default backend;
