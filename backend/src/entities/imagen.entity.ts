import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Evento } from './evento.entity';

export type ImagenTipo = 'principal' | 'cartelera' | 'galeria';

@Entity('imagen')
export class Imagen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_evento' })
  idEvento: number;

  @Column({ length: 255 })
  url: string;

  @Column({
    type: 'enum',
    enum: ['principal', 'cartelera', 'galeria'],
    default: 'galeria',
  })
  tipo: ImagenTipo;

  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  orden: number | null;

  @Column({ name: 'es_principal', default: false })
  esPrincipal: boolean;

  @ManyToOne(() => Evento, (evento) => evento.imagenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_evento' })
  evento: Evento;
}
