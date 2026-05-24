import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Compra } from './compra.entity';

export enum RolUsuario {
  ADMIN = 'admin',
  CLIENTE = 'cliente',
}

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nombre: string;

  @Column({ length: 100 })
  apellidos: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 255, select: false })
  password: string;

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.CLIENTE })
  rol: RolUsuario;

  @Column({ name: 'email_verificado', type: 'boolean', default: false })
  emailVerificado: boolean;

  @Column({ name: 'email_verification_token', type: 'varchar', length: 64, nullable: true, select: false })
  emailVerificationToken: string | null;

  @Column({ name: 'email_verification_expires', type: 'datetime', nullable: true, select: false })
  emailVerificationExpires: Date | null;

  @Column({ name: 'fecha_registro', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fechaRegistro: Date;

  @OneToMany(() => Compra, (compra) => compra.usuario)
  compras: Compra[];
}
