'use strict';

// Objection.js plugins are class mixins. Read this excellent article for detailed description:
// http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
//
// A plugin should be a function that takes a model class as an argument. A plugin then needs to
// extends that model and return it. A plugin should never modify the model directly!
module.exports = Model => {
  // If your plugin extends the QueryBuilder, you need to extend `Model.QueryBuilder`
  // since it may have already been extended by other plugins.
  class SessionQueryBuilder extends Model.QueryBuilder {
    // A custom method that stores a session object to the query context. In this example
    // plugin a session represents the logged-in user as in passport.js session.
    session(session) {
      // Save the session to the query context so that it will be available in all
      // queries created by this builder and also in the model hooks. `session` is
      // not a reserved word or some objection.js concept. You can store any data
      // to the query context.
      return this.mergeContext({
        session: session
      });
    }
  }

  // A Plugin always needs to return the extended model class.
  //
  // IMPORTANT: Don't give a name for the returned class! This way the returned
  // class inherits the super class's name (starting from node 8).
  return class extends Model {
    // Make our model use the extended QueryBuilder.
    static get QueryBuilder() {
      return SessionQueryBuilder;
    }

    $beforeUpdate(opt, context) {
      // If you extend existing methods like this one, always remember to call the
      // super implementation. Check the documentation to see if the function can be
      // async and prepare for that also.
      const maybePromise = super.$beforeUpdate(opt, context);

      return Promise.resolve(maybePromise).then(() => {
        if (context.session) {
          this.modifiedAt = new Date().toISOString();
          this.modifiedBy = context.session.userId;
        }
      });
    }

    $beforeInsert(context) {
      // If you extend existing methods like this one, always remember to call the
      // super implementation. Check the documentation to see if the function can be
      // async and prepare for that also.
      const maybePromise = super.$beforeInsert(context);

      return Promise.resolve(maybePromise).then(() => {
        if (context.session) {
          this.createdAt = new Date().toISOString();
          this.createdBy = context.session.userId;
        }
      });
    }
  };
};
