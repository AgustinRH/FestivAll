export interface User {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  rol: 'admin' | 'cliente';
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
}

export interface Imagen {
  id: number;
  url: string;
  esPrincipal: boolean;
}

export interface Evento {
  id: number;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin?: string;
  horaInicio?: string;
  horaFin?: string;
  precio: number;
  stock: number;
  idCategoria: number;
  idUbicacion: number;
  categoria?: Categoria;
  ubicacion?: Ubicacion;
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
