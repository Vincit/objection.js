import { Person } from '../fixtures/person';

(async () => {
  await Person.query().insertGraph({
    firstName: 'Sylvester',
    lastName: 'Stallone',

    children: [
      {
        firstName: 'Sage',
        lastName: 'Stallone',

        pets: [
          {
            name: 'Fluffy',
            species: 'dog'
          }
        ]
      }
    ]
  });

  await Person.query().insertGraph([
    {
      firstName: 'Jennifer',
      lastName: 'Lawrence',

      movies: [
        {
          '#id': 'silverLiningsPlaybook',
          title: 'Silver Linings Playbook',
          duration: 122
        }
      ]
    },
    {
      firstName: 'Bradley',
      lastName: 'Cooper',

      movies: [
        {
          '#ref': 'silverLiningsPlaybook'
        }
      ]
    }
  ]);

  await Person.query().insertGraph([
    {
      '#id': 'jenni',
      firstName: 'Jennifer',
      lastName: 'Lawrence',

      pets: [
        {
          name: 'I am the dog of #ref{jenni.firstName} whose id is #ref{jenni.id}',
          species: 'dog'
        }
      ]
    }
  ]);

  await Person.query().insertGraph(
    [
      {
        firstName: 'Jennifer',
        lastName: 'Lawrence',

        movies: [
          {
            id: 2636
          }
        ]
      }
    ],
    {
      relate: true
    }
  );

  await Person.query().insertGraph(
    [
      {
        firstName: 'Jennifer',
        lastName: 'Lawrence',

        movies: [
          {
            id: 2636
          }
        ]
      }
    ],
    {
      relate: ['movies']
    }
  );

  await Person.query().insertGraph(
    [
      {
        firstName: 'Jennifer',
        lastName: 'Lawrence',

        movies: [
          {
            title: 'Silver Linings Playbook',
            duration: 122,

            actors: [
              {
                id: 2516
              }
            ]
          }
        ]
      }
    ],
    {
      relate: ['movies.actors']
    }
  );

  await Person.query().insertGraph([
    {
      firstName: 'Jennifer',
      lastName: 'Lawrence',

      movies: [
        {
          '#dbRef': 2636
        },
        {
          // This will be inserted with an id.
          id: 100,
          title: 'New movie'
        }
      ]
    }
  ]);
})();
