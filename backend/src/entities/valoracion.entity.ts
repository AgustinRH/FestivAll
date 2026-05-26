import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Evento } from './evento.entity';

export enum EstadoModeracionValoracion {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
}

@Entity('valoracion')
export class Valoracion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_usuario' })
  idUsuario: number;

  @Column({ name: 'id_evento' })
  idEvento: number;

  @Column({ type: 'tinyint' })
  puntuacion: number;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @Column({ default: true })
  verificada: boolean;

  @Column({
    name: 'estado_moderacion',
    type: 'enum',
    enum: EstadoModeracionValoracion,
    default: EstadoModeracionValoracion.PENDIENTE,
  })
  estadoModeracion: EstadoModeracionValoracion;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @ManyToOne(() => Evento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_evento' })
  evento: Evento;
}
