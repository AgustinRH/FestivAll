import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Evento } from './evento.entity';

@Entity('ubicacion')
export class Ubicacion {
  @PrimaryGeneratedColumn({ name: 'id_ubicacion' })
  idUbicacion: number;

  @Column({ length: 255 })
  direccion: string;

  @Column({ length: 100 })
  localidad: string;

  @Column({ length: 100, default: 'Almería' })
  provincia: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitud: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitud: number | null;

  @OneToMany(() => Evento, (evento) => evento.ubicacion)
  eventos: Evento[];
}
