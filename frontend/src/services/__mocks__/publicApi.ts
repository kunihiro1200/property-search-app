import axios from 'axios';

const publicApi = axios.create({
  baseURL: 'http://localhost:3000/api/public',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default publicApi;
