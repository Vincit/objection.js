import { UpsertGraphOptions } from '../../../typings/objection';
import { Person } from '../fixtures/person';

(async () => {
  await Person.query().upsertGraph({
    // This updates the `Jennifer Aniston` person since the id property is present.
    id: 1,
    firstName: 'Jonnifer',

    parent: {
      // This also gets updated since the id property is present. If no id was given
      // here, Nancy Dow would get deleted, a new Person John Aniston would
      // get inserted and related to Jennifer.
      id: 2,
      firstName: 'John',
      lastName: 'Aniston'
    },

    // Notice that Kat the Cat is not listed in `pets`. It will get deleted.
    pets: [
      {
        // Jennifer just got a new pet. Insert it and relate it to Jennifer. Notice
        // that there is no id!
        name: 'Wolfgang',
        species: 'Dog'
      },
      {
        // It turns out Doggo is a cat. Update it.
        id: 1,
        species: 'Cat'
      }
    ],

    // Notice that Wanderlust is missing from the list. It will get deleted.
    // It is also worth mentioning that the Wanderlust's `reviews` or any
    // other relations are NOT recursively deleted (unless you have
    // defined `ON DELETE CASCADE` or other hooks in the db).
    movies: [
      {
        id: 1,

        // Upsert graphs can be arbitrarily deep. This modifies the
        // reviews of "Horrible Bosses".
        reviews: [
          {
            // Update a review.
            id: 1,
            stars: 2,
            text: 'Even more Meh'
          },
          {
            // And insert another one.
            stars: 5,
            title: 'Loved it',
            text: 'Best movie ever'
          },
          {
            // And insert a third one.
            stars: 4,
            title: '4 / 5',
            text: 'Would see again'
          }
        ]
      }
    ]
  });

  let options: UpsertGraphOptions = {
    relate: true,
    unrelate: true
  };

  await Person.query().upsertGraph(
    {
      // This updates the `Jennifer Aniston` person since the id property is present.
      id: 1,
      firstName: 'Jonnifer',

      // Unrelate the parent. This doesn't delete it.
      parent: null,

      // Notice that Kat the Cat is not listed in `pets`. It will get unrelated.
      pets: [
        {
          // Jennifer just got a new pet. Insert it and relate it to Jennifer. Notice
          // that there is no id!
          name: 'Wolfgang',
          species: 'Dog'
        },
        {
          // It turns out Doggo is a cat. Update it.
          id: 1,
          species: 'Cat'
        }
      ],

      // Notice that Wanderlust is missing from the list. It will get unrelated.
      movies: [
        {
          id: 1,

          // Upsert graphs can be arbitrarily deep. This modifies the
          // reviews of "Horrible Bosses".
          reviews: [
            {
              // Update a review.
              id: 1,
              stars: 2,
              text: 'Even more Meh'
            },
            {
              // And insert another one.
              stars: 5,
              title: 'Loved it',
              text: 'Best movie ever'
            }
          ]
        },
        {
          // This is some existing movie that isn't currently related to Jennifer.
          // It will get related.
          id: 1253
        }
      ]
    },
    options
  );

  options = {
    // Only enable `unrelate` functionality for these two paths.
    unrelate: ['pets', 'movies.reviews'],
    // Only enable `relate` functionality for 'movies' relation.
    relate: ['movies'],
    // Disable deleting for movies.
    noDelete: ['movies']
  };

  await Person.query().upsertGraph(
    {
      id: 1,

      // This gets deleted since `unrelate` list doesn't have 'parent' in it
      // and deleting is the default behaviour.
      parent: null,

      // Notice that Kat the Cat is not listed in `pets`. It will get unrelated.
      pets: [
        {
          // It turns out Doggo is a cat. Update it.
          id: 1,
          species: 'Cat'
        }
      ],

      // Notice that Wanderlust is missing from the list. It will NOT get unrelated
      // or deleted since `unrelate` list doesn't contain `movies` and `noDelete`
      // list does.
      movies: [
        {
          id: 1,

          // Upsert graphs can be arbitrarily deep. This modifies the
          // reviews of "Horrible Bosses".
          reviews: [
            {
              // Update a review.
              id: 1,
              stars: 2,
              text: 'Even more Meh'
            },
            {
              // And insert another one.
              stars: 5,
              title: 'Loved it',
              text: 'Best movie ever'
            }
          ]
        },
        {
          // This is some existing movie that isn't currently related to Jennifer.
          // It will get related.
          id: 1253
        }
      ]
    },
    options
  );
})();
