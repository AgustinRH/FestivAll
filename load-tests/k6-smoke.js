/**
 * Smoke test — poca carga, comprueba que la API responde.
 *
 * Uso:
 *   BASE_URL=http://localhost k6 run load-tests/k6-smoke.js
 *   BASE_URL=https://festivall.club k6 run load-tests/k6-smoke.js  # con precaución
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost';
const API = `${BASE}${__ENV.API_PREFIX || '/api'}`;

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const resList = http.get(`${API}/eventos?limit=10`);
  check(resList, {
    'listado eventos 200': (r) => r.status === 200,
  });

  const resCat = http.get(`${API}/catalogo/categorias`);
  check(resCat, {
    'categorías 200': (r) => r.status === 200,
  });

  const resPop = http.get(`${API}/eventos/popular?limit=5`);
  check(resPop, {
    'popular 200': (r) => r.status === 200,
  });

  sleep(1);
}
