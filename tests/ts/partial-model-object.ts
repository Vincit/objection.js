// Type tests for PartialModelObject, the data accepted by `insert()`,
// `patch()` and the other mutating methods.

import { Model, PartialModelObject, raw } from '../../';

class Pet extends Model {
  id!: number;
  name!: string;
  owner?: Owner;
}

class Owner extends Model {
  id!: number;
  name!: string;
  pets?: Pet[];
  partner?: Owner;
  parent?: Owner | null;
}

// Relations accept model instances and partial objects, recursively.
const a: PartialModelObject<Owner> = {
  name: 'Jennifer',
  pets: [{ name: 'Doggo', owner: { id: 1 } }],
  partner: { name: 'Sylvester' },
};

// So do nullable to-one relations, which also accept `null`.
const b: PartialModelObject<Owner> = { parent: { name: 'Arnold' } };
const c: PartialModelObject<Owner> = { parent: { pets: [{ name: 'Doggo' }] } };
const d: PartialModelObject<Owner> = { parent: null };
const e: PartialModelObject<Owner> = { parent: new Owner() };
const f: PartialModelObject<Owner> = { parent: raw('null') };

// Wrong field types are still rejected.
// @ts-expect-error
const g: PartialModelObject<Owner> = { parent: { name: 1 } };
// @ts-expect-error
const h: PartialModelObject<Owner> = { parent: { unknown: 'Arnold' } };
// @ts-expect-error
const i: PartialModelObject<Owner> = { partner: { name: 1 } };
// @ts-expect-error
const j: PartialModelObject<Owner> = { partner: null };
// @ts-expect-error
const k: PartialModelObject<Owner> = { parent: 'Arnold' };

async function queries() {
  await Owner.query().patch({ parent: { name: 'Arnold' } });
  await Owner.query().insert({ name: 'Jennifer', parent: null });
}
