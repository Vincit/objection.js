import { Person } from '../fixtures/person';
import { UniqueViolationError } from 'db-errors';
import { Animal } from '../fixtures/animal';
import { Model, transaction } from '../../../typings/objection';

(async () => {
  const debugResult = Person.query()
    .joinRelation('children')
    .where('age', '>', '21')
    .debug();

  const personId = 1;
  const pets = await Person.relatedQuery('pets').for(personId);

  const builder = Person.query().context({ something: 'hello' });
  const context = builder.context();

  Person.query().context({
    runBefore(result: any, builder: any) {
      return result;
    },
    runAfter(result: any, builder: any) {
      return result;
    },
    onBuild(builder: any) {}
  });

  Person.query()
    .withGraphFetched('[movies, children.movies]')
    .context({
      onBuild(builder: any) {
        builder.withSchema('someSchema');
      }
    });

  builder.mergeContext({
    foo: 'bar'
  });

  builder.tableNameFor(Person);
  builder.tableRefFor(Person);

  builder.reject('something went wrong');
  builder.resolve({});

  builder.isExecutable();

  builder.isFind();
  builder.isInsert();
  builder.isUpdate();
  builder.isDelete();
  builder.isRelate();
  builder.isUnrelate();
  builder.isInternal();

  builder.hasWheres();
  builder.hasSelects();
  builder.hasWithGraph();
  builder.has('range');
  builder.clear('orderBy').has('orderBy');

  Person.query()
    .runBefore(async result => {
      console.log('hello 1');

      console.log('hello 2');
      return result;
    })
    .runBefore(result => {
      console.log('hello 3');
      return result;
    });

  Person.query()
    .onBuild(builder => {
      builder.where('id', 1);
    })
    .onBuild(builder => {
      builder.orWhere('id', 2);
    });

  Person.query().onBuildKnex((knexBuilder, objectionBuilder) => {
    knexBuilder.where('id', 1);
  });

  Person.query()
    .runAfter(async (models, queryBuilder) => {
      return models;
    })
    .runAfter(async (models, queryBuilder) => {
      models.push(Person.fromJson({ firstName: 'Jennifer' }));
      return models;
    });

  Person.query()
    .onError(async (error, queryBuilder) => {
      if (error instanceof UniqueViolationError) {
        return { error: 'some error occurred' };
      } else {
        return Promise.reject(error);
      }
    })
    .where('age', '>', 30);

  await Person.query()
    .joinRelation('children.children.pets')
    .select('children:children:pets.*')
    .castTo(Animal);

  await Person.query()
    .joinRelation('children.pets')
    .select(['children:pets.id as animalId', 'children.firstName as childFirstName'])
    .castTo(Model);

  const modelClass = builder.modelClass();

  builder.toString();

  Person.query()
    .skipUndefined()
    .where('firstName', 'something');

  const trx = await transaction.start(Person);
  builder.transacting(trx);

  builder.clone();
  builder.execute();

  builder.then(
    () => {
      console.log('success');
    },
    () => {
      console.log('error');
    }
  );

  // builder.map((obj) => obj);
  // builder.reduce()

  builder.catch(error => {
    console.log(error);
  });

  // builder.bind()
  // builder.asCallback();
  // builder. nodeify()

  const query = Person.query().where('age', '>', 20);

  const [total, models] = await Promise.all([query.resultSize(), query.offset(100).limit(50)]);

  await Person.query()
    .where('age', '>', 20)
    .page(5, 100);

  await Person.query()
    .where('age', '>', 20)
    .range(0, 100);

  await Person.query()
    .where('age', '>', 20)
    .limit(10)
    .range();

  await Person.query().first();

  await Person.query()
    .where('name', 'Java')
    .andWhere('isModern', true)
    .throwIfNotFound();

  builder.timeout(2000, {
    cancel: true
  });

  builder.connection(Person.knex());

  Person.query().modify('someModifier', 'foo', 1);
  Person.query().modify(['someModifier', 'someOtherModifier'], 'foo', 1);

  function modifierFunc(query: any, arg1: any, arg2: any) {
    query.where(arg1, arg2);
  }

  Person.query().modify(modifierFunc, 'foo', 1);

  await Person.query()
    .modifiers({
      selectFields: query => query.select('id', 'name'),
      // In the following modifier, `filterGender` is a modifier
      // registered in Person.modifiers object. Query modifiers
      // can be used to bind arguments to model modifiers like this.
      filterWomen: query => query.modify('filterGender', 'female')
    })
    .modify('selectFields')
    .withGraphFetched('children(selectFields, filterWomen)');

  Person.query().modifiers();
})();
