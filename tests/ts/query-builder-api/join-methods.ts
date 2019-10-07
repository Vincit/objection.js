import { Person } from '../fixtures/person';
import { raw } from '../../..';

(async () => {
  await Person.query()
    .joinRelation('pets')
    .where('pets.species', 'dog');

  await Person.query()
    .joinRelation('pets', { alias: 'p' })
    .where('p.species', 'dog');

  await Person.query()
    .joinRelation('[pets, parent]')
    .where('pets.species', 'dog')
    .where('parent.name', 'Arnold');

  await Person.query()
    .joinRelation({
      pets: true,
      parent: true
    })
    .where('pets.species', 'dog')
    .where('parent.name', 'Arnold');

  await Person.query()
    .select('persons.id', 'parent:parent.name as grandParentName')
    .joinRelation('[pets, parent.[pets, parent]]')
    .where('parent:pets.species', 'dog');

  await Person.query()
    .select('persons.id', 'pr:pr.name as grandParentName')
    .joinRelation('[pets, parent.[pets, parent]]', {
      aliases: {
        parent: 'pr',
        pets: 'pt'
      }
    })
    .where('pr:pt.species', 'dog');

  await Person.query()
    .select('persons.id', 'pr:pr.name as grandParentName')
    .joinRelation('[pets as pt, parent as pr.[pets as pt, parent as pr]]')
    .where('pr:pt.species', 'dog');

  await Person.query().innerJoinRelation('pets');
  await Person.query().outerJoinRelation('pets');
  await Person.query().leftJoinRelation('pets');
  await Person.query().leftOuterJoinRelation('pets');
  await Person.query().rightJoinRelation('pets');
  await Person.query().rightOuterJoinRelation('pets');
  await Person.query().fullOuterJoinRelation('pets');
  await Person.query().join(raw('pets'));
  await Person.query().joinRaw('pets');
  await Person.query().innerJoin(raw('pets'));
  await Person.query().leftJoin(raw('pets'));
  await Person.query().leftOuterJoin(raw('pets'));
  await Person.query().rightJoin(raw('pets'));
  await Person.query().rightOuterJoin(raw('pets'));
  await Person.query().outerJoin(raw('pets'));
  await Person.query().fullOuterJoin(raw('pets'));
  await Person.query().crossJoin(raw('pets'));
})();
