import { Animal } from '../fixtures/animal';

export class Dog extends Animal {
  species!: 'Canis familiaris';
}

export function isDog(animal: Animal): animal is Dog {
  return animal.species === 'Canis familiaris';
}
