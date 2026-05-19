import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Evento } from './evento.entity';

@Entity('imagen')
export class Imagen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_evento' })
  idEvento: number;

  @Column({ length: 255 })
  url: string;

  @Column({ name: 'es_principal', default: false })
  esPrincipal: boolean;

  @ManyToOne(() => Evento, (evento) => evento.imagenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_evento' })
  evento: Evento;
}
