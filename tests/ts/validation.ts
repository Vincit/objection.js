import { ValidationError } from '../../typings/objection';
import { Person } from './fixtures/person';

(async () => {
  Person.fromJson({ firstName: 'jennifer', lastName: 'Lawrence' });
  await Person.query().insert({ firstName: 'jennifer', lastName: 'Lawrence' });
  await Person.query()
    .update({ firstName: 'jennifer', lastName: 'Lawrence' })
    .where('id', 10);

  // Patch operation ignores the `required` property of the schema
  // and only validates the given properties. This allows a subset
  // of model's properties to be updated.
  await Person.query()
    .patch({ age: 24 })
    .where('age', '<', 24);

  await Person.query().insertGraph({
    firstName: 'Jennifer',
    pets: [
      {
        name: 'Fluffy'
      }
    ]
  });

  await Person.query().upsertGraph({
    id: 1,
    pets: [
      {
        name: 'Fluffy II'
      }
    ]
  });

  try {
    await Person.query().insert({ firstName: 'jennifer' });
  } catch (err) {
    console.log(err instanceof ValidationError); // --> true
    console.log(err.data); // --> {lastName: [{message: 'required property missing', ...}]}
  }

  try {
    await Person.query().insert({ firstName: 'jennifer' });
  } catch (err) {
    let lastNameErrors = err.data.lastName;

    for (let i = 0; i < lastNameErrors.length; ++i) {
      let lastNameError = lastNameErrors[i];

      if (lastNameError.keyword === 'required') {
        console.log('This field is required!');
      } else if (lastNameError.keyword === 'minLength') {
        console.log('Must be longer than ' + lastNameError.params.limit);
      } else {
        console.log(lastNameError.message); // Fallback to default error message
      }
    }
  }
})();
