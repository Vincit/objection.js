import { Person } from '../fixtures/person';
import { raw } from '../../..';

(async () => {
  await Person.query()
    .joinRelated('pets')
    .where('pets.species', 'dog');

  await Person.query()
    .joinRelated('pets', { alias: 'p' })
    .where('p.species', 'dog');

  await Person.query()
    .joinRelated('[pets, parent]')
    .where('pets.species', 'dog')
    .where('parent.name', 'Arnold');

  await Person.query()
    .joinRelated({
      pets: true,
      parent: true
    })
    .where('pets.species', 'dog')
    .where('parent.name', 'Arnold');

  await Person.query()
    .select('persons.id', 'parent:parent.name as grandParentName')
    .joinRelated('[pets, parent.[pets, parent]]')
    .where('parent:pets.species', 'dog');

  await Person.query()
    .select('persons.id', 'pr:pr.name as grandParentName')
    .joinRelated('[pets, parent.[pets, parent]]', {
      aliases: {
        parent: 'pr',
        pets: 'pt'
      }
    })
    .where('pr:pt.species', 'dog');

  await Person.query()
    .select('persons.id', 'pr:pr.name as grandParentName')
    .joinRelated('[pets as pt, parent as pr.[pets as pt, parent as pr]]')
    .where('pr:pt.species', 'dog');

  await Person.query().innerJoinRelated('pets');
  await Person.query().outerJoinRelated('pets');
  await Person.query().leftJoinRelated('pets');
  await Person.query().leftOuterJoinRelated('pets');
  await Person.query().rightJoinRelated('pets');
  await Person.query().rightOuterJoinRelated('pets');
  await Person.query().fullOuterJoinRelated('pets');
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

  await Person.query().innerJoin('pets', 'pets.foo', 'persons.bar');
  await Person.query().innerJoin(Person.query(), 'persons.foo', 'persons.bar');
  await Person.query().innerJoin(qb => qb.from('pets').as('pets'), 'pets.foo', 'persons.bar');
})();
