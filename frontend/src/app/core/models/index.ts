export interface User {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  rol: 'owner' | 'admin' | 'cliente';
  emailVerificado?: boolean;
}

export interface AdminUser extends User {
  emailVerificado: boolean;
  fechaRegistro: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface Categoria {
  id: number;
  nombreCategoria: string;
}

export interface Ubicacion {
  idUbicacion: number;
  direccion: string;
  localidad: string;
  provincia: string;
  latitud?: number | null;
  longitud?: number | null;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigoPostal?: string;
  lat: number;
  lng: number;
}

export interface Imagen {
  id: number;
  url: string;
  esPrincipal: boolean;
}

export interface Cliente {
  id: number;
  nombre: string;
  nombreFiscal?: string | null;
  cif?: string | null;
  emailContacto?: string | null;
  telefono?: string | null;
  notas?: string | null;
  activo: boolean;
  createdAt?: string;
}

export interface EventosPaginatedResponse {
  items: Evento[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EventoMapa {
  id: number;
  titulo: string;
  slug: string | null;
  latitud: number;
  longitud: number;
  imagenCartel: string | null;
  precioDesde: number;
  localidad: string;
}

export interface Evento {
  id: number;
  titulo: string;
  slug?: string | null;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  horaInicio?: string;
  horaFin?: string;
  precio: number;
  stock: number;
  destacado?: boolean;
  soloMayoresEdad?: boolean;
  updatedAt?: string;
  idCategoria: number;
  idUbicacion: number;
  idCliente: number;
  categoria?: Categoria;
  ubicacion?: Ubicacion;
  cliente?: Cliente;
  imagenes?: Imagen[];
}

export interface Compra {
  id: number;
  cantidad: number;
  totalPago: number;
  fechaCompra: string;
  codigoAcceso: string;
  evento?: Evento;
}

export interface ValoracionPublica {
  id: number;
  puntuacion: number;
  comentario: string | null;
  nombreUsuario: string;
  createdAt: string;
  verificada: boolean;
}

export interface ValoracionesEventoResponse {
  resumen: { media: number; total: number };
  valoraciones: ValoracionPublica[];
}

export interface ValoracionElegibilidad {
  puedeValorar: boolean;
  eventoFinalizado: boolean;
  tieneAsistencia: boolean;
  yaValorado: boolean;
  omitido: boolean;
}

export interface EventoPendienteValorar {
  id: number;
  titulo: string;
  slug: string | null;
  fechaInicio: string;
  fechaFin: string;
  localidad: string | null;
}

export interface EventoConValoraciones {
  id: number;
  titulo: string;
  slug: string | null;
  fechaInicio: string;
  fechaFin: string;
  localidad: string | null;
  categoria: string | null;
  imagenUrl: string | null;
  resumen: { media: number; total: number };
}

export interface EventoOpinionesDetalle {
  evento: {
    id: number;
    titulo: string;
    slug: string | null;
    descripcion: string;
    fechaInicio: string;
    fechaFin: string;
    horaInicio: string | null;
    horaFin: string | null;
    localidad: string | null;
    direccion: string | null;
    provincia: string | null;
    categoria: string | null;
    imagenUrl: string | null;
  };
  resumen: { media: number; total: number };
  valoraciones: ValoracionPublica[];
}

export interface ValoracionPerfil {
  id: number;
  puntuacion: number;
  comentario: string | null;
  estadoModeracion: 'pendiente' | 'aprobado' | 'rechazado';
  verificada: boolean;
  createdAt: string;
  evento: EventoPendienteValorar | null;
}

export interface ValoracionAdmin {
  id: number;
  puntuacion: number;
  comentario: string | null;
  verificada: boolean;
  estadoModeracion: string;
  createdAt: string;
  usuario: { id: number; nombre: string; apellidos: string; email: string } | null;
  evento: {
    id: number;
    titulo: string;
    fechaInicio: string;
    localidad: string | null;
  } | null;
}

export interface EntradaAdmin {
  id: number;
  idEvento: number;
  idUsuario: number;
  cantidad: number;
  totalPago: number;
  fechaCompra: string;
  codigoAcceso: string;
  estadoEntrada?: 'pendiente' | 'asistida';
  stripeCheckoutSessionId: string | null;
  usuario: {
    id: number;
    nombre: string;
    apellidos: string;
    email: string;
  } | null;
}
