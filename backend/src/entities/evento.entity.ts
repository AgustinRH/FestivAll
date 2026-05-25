import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Categoria } from './categoria.entity';
import { Ubicacion } from './ubicacion.entity';
import { Imagen } from './imagen.entity';
import { Compra } from './compra.entity';

@Entity('evento')
export class Evento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_categoria' })
  idCategoria: number;

  @Column({ name: 'id_ubicacion' })
  idUbicacion: number;

  @Column({ length: 150 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: string | null;

  @Column({ name: 'hora_inicio', type: 'time', nullable: true })
  horaInicio: string | null;

  @Column({ name: 'hora_fin', type: 'time', nullable: true })
  horaFin: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column()
  stock: number;

  @Column({ default: false })
  destacado: boolean;

  @Column({ name: 'solo_mayores_edad', default: false })
  soloMayoresEdad: boolean;

  @ManyToOne(() => Categoria, (categoria) => categoria.eventos)
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;

  @ManyToOne(() => Ubicacion, (ubicacion) => ubicacion.eventos)
  @JoinColumn({ name: 'id_ubicacion' })
  ubicacion: Ubicacion;

  @OneToMany(() => Imagen, (imagen) => imagen.evento)
  imagenes: Imagen[];

  @OneToMany(() => Compra, (compra) => compra.evento)
  compras: Compra[];
}
