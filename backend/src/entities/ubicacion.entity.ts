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

  @OneToMany(() => Evento, (evento) => evento.ubicacion)
  eventos: Evento[];
}
