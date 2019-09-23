import * as objection from '../../../';

export class Review extends objection.Model {
  id!: number;
  title?: string;
  stars!: number;
  text!: string;
}
