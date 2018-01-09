import {Model} from 'objection';

export interface Person extends Model {
  readonly id: number;
  parentId: number | null;
  firstName: string;
  lastName: string;
  age: number;
  address: Address;
  createdAt: Date;
  updatedAt: Date;

  // Optional eager relations.
  parent?: Person;
  children?: Person[];
  pets?: Animal[];
  movies?: Movie[];
}

export interface Address {
  street: string;
  city: string;
  zipCode: string;
}

export interface Animal extends Model {
  readonly id: number;
  ownerId: number | null;
  name: string;
  species: string;

  // Optional eager relations.
  owner?: Person;
}

export interface Movie extends Model {
  readonly id: number;
  name: string;

  // Optional eager relations.
  actors?: Person[];
}
