module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      database: 'objection-jsonb-example'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};
