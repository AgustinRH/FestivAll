import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Evento } from './evento.entity';

@Entity('compra')
export class Compra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_usuario' })
  idUsuario: number;

  @Column({ name: 'id_evento' })
  idEvento: number;

  @Column()
  cantidad: number;

  @Column({ name: 'total_pago', type: 'decimal', precision: 10, scale: 2 })
  totalPago: number;

  @Column({ name: 'fecha_compra', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCompra: Date;

  @Column({ name: 'codigo_acceso', length: 100, unique: true })
  codigoAcceso: string;

  @Column({
    name: 'stripe_checkout_session_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripeCheckoutSessionId?: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.compras)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @ManyToOne(() => Evento, (evento) => evento.compras)
  @JoinColumn({ name: 'id_evento' })
  evento: Evento;
}
