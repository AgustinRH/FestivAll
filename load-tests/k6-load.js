/**
 * Prueba de carga gradual — ajusta `stages` según tu entorno.
 * Preferible en local: BASE_URL=http://localhost
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost';
const API = `${BASE}${__ENV.API_PREFIX || '/api'}`;

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  const endpoints = [
    `${API}/eventos?limit=20&page=1`,
    `${API}/eventos/popular`,
    `${API}/catalogo/categorias`,
    `${API}/catalogo/ubicaciones`,
    `${API}/eventos/mapa?lat=36.8381&lng=-2.4597&radio=30`,
  ];
  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(url);
  check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  sleep(0.5 + Math.random() * 0.5);
}
