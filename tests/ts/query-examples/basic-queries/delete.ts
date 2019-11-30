import { raw } from '../../../../';
import { Person } from '../../fixtures/person';

(async () => {
  await Person.query().deleteById(1);

  const numDeleted: number = await Person.query()
    .delete()
    .where(raw('lower("firstName")'), 'like', '%ennif%');

  console.log(numDeleted, 'people were deleted');

  await Person.query()
    .delete()
    .whereIn(
      'id',
      Person.query()
        .select('persons.id')
        .joinRelated('pets')
        .where('pets.name', 'Fluffy')
    );

  await Person.query()
    .delete()
    .whereExists(Person.relatedQuery('pets').where('pets.name', 'Fluffy'));

  await Person.fromJson({ firstName: 'Jennifer' })
    .$query()
    .delete();
})();
