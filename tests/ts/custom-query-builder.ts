import { Model, QueryBuilder, Page, TransactionOrKnex } from '../../';

class CustomQueryBuilder<M extends Model, R = M[]> extends QueryBuilder<M, R> {
  ArrayQueryBuilderType!: CustomQueryBuilder<M, M[]>;
  SingleQueryBuilderType!: CustomQueryBuilder<M, M>;
  NumberQueryBuilderType!: CustomQueryBuilder<M, number>;
  PageQueryBuilderType!: CustomQueryBuilder<M, Page<M>>;

  someCustomMethod(): this {
    return this;
  }

  delete() {
    return super.delete();
  }
}

class BaseModel extends Model {
  QueryBuilderType!: CustomQueryBuilder<this>;

  $query(trxOrKnex?: TransactionOrKnex) {
    return super.$query(trxOrKnex);
  }
}

class Animal extends BaseModel {
  id!: number;
  name!: string;
  owner!: Person;
}

class Person extends BaseModel {
  firstName!: string;
  pets!: Animal[];
}

const people: Promise<Person[]> = Person.query()
  .someCustomMethod()
  .where('firstName', 'lol')
  .someCustomMethod()
  .with('someAlias', qb =>
    qb
      .someCustomMethod()
      .from('lol')
      .select('id')
  )
  .modifyEager<Animal>('pets', qb =>
    qb
      .someCustomMethod()
      .where('id', 1)
      .someCustomMethod()
  );

const pets: Promise<Animal> = new Person()
  .$relatedQuery('pets')
  .someCustomMethod()
  .where('id', 1)
  .first()
  .someCustomMethod();

const numUpdated: Promise<number> = Person.query()
  .someCustomMethod()
  .patch({ firstName: 'test' })
  .someCustomMethod();

const allPets: Promise<Animal[]> = Person.relatedQuery('pets')
  .for(Person.query().select('id'))
  .someCustomMethod();
