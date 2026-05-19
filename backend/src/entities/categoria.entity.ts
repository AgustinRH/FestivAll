import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Evento } from './evento.entity';

@Entity('categoria')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre_categoria', length: 50 })
  nombreCategoria: string;

  @OneToMany(() => Evento, (evento) => evento.categoria)
  eventos: Evento[];
}
