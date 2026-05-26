import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Categoria } from './categoria.entity';
import { Ubicacion } from './ubicacion.entity';
import { Imagen } from './imagen.entity';
import { Compra } from './compra.entity';
import { Cliente } from './cliente.entity';

@Entity('evento')
export class Evento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_categoria' })
  idCategoria: number;

  @Column({ name: 'id_ubicacion' })
  idUbicacion: number;

  @Column({ name: 'id_cliente' })
  idCliente: number;

  @Column({ length: 150 })
  titulo: string;

  @Column({ type: 'varchar', length: 180, unique: true, nullable: true })
  slug: string | null;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date' })
  fechaFin: string;

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

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => Categoria, (categoria) => categoria.eventos)
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;

  @ManyToOne(() => Ubicacion, (ubicacion) => ubicacion.eventos)
  @JoinColumn({ name: 'id_ubicacion' })
  ubicacion: Ubicacion;

  @ManyToOne(() => Cliente, (c) => c.eventos)
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @OneToMany(() => Imagen, (imagen) => imagen.evento)
  imagenes: Imagen[];

  @OneToMany(() => Compra, (compra) => compra.evento)
  compras: Compra[];
}
