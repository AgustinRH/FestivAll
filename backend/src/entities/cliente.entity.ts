import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Evento } from './evento.entity';

@Entity('cliente')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ name: 'nombre_fiscal', type: 'varchar', length: 200, nullable: true })
  nombreFiscal: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cif: string | null;

  @Column({ name: 'email_contacto', type: 'varchar', length: 120, nullable: true })
  emailContacto: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => Evento, (e) => e.cliente)
  eventos: Evento[];
}
