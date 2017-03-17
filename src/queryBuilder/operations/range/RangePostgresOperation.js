import RangeOperation from './RangeOperation'

const totalCountCol = 'objectiontmptotalcount';

export default class RangePostgresOperation extends RangeOperation {

  constructor(name, opt) {
    super(name, opt);
    this.count = 0;
  }

  onBefore(knexBuilder, builder) {
    // Do nothing.
  }

  onBuild(knexBuilder, builder) {
    const knex = builder.knex();
    knexBuilder.select(knex.raw(`count(*) over () as ${totalCountCol}`));
  }

  onRawResult(builder, rows) {
    if (Array.isArray(rows) && rows.length && typeof rows[0] === 'object') {
      this.count = rows[0][totalCountCol];

      for (let i = 0, l = rows.length; i < l; ++i) {
        delete rows[i][totalCountCol];
      }
    } else if (rows && typeof rows === 'object') {
      this.count = rows[totalCountCol];
      delete rows[totalCountCol];
    }

    return rows;
  }

  onAfter(builder, result) {
    return {
      results: result,
      total: parseInt(this.count, 10)
    };
  }
}
