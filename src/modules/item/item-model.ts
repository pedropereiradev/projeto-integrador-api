import BaseModel from '@src/core/models/base';
import { currencyTransformer } from '@src/core/utils/currency-transformer';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import List from '../list/list-model';

@Entity({ name: 'items' })
class Item extends BaseModel {
  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'int', transformer: currencyTransformer, nullable: true })
  price?: number;

  @Column({ type: 'decimal', nullable: true })
  quantity?: number;

  @Column({ type: 'boolean', default: false })
  checked: boolean;

  @Column({
    name: 'unit_price',
    type: 'int',
    transformer: currencyTransformer,
    nullable: true,
  })
  unitPrice?: number;

  @Column({ name: 'measurement_unit', nullable: true })
  measurementUnit?: string;

  @ManyToOne(
    () => List,
    (list) => list.items,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'list_id' })
  list: List;
}

export default Item;
