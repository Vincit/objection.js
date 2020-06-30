import Koa, { Context } from 'koa'
import KoaRouter from 'koa-router'
import bodyParser from 'koa-bodyparser'
import Knex from 'knex'
import knexConfig from './knexfile'
import registerApi from './api'
import { Model, ForeignKeyViolationError, ValidationError } from 'objection'

// Initialize knex.
const knex = Knex(knexConfig.development)

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex() method.
Model.knex(knex)

const router = new KoaRouter()
const app = new Koa()

// Register our REST API.
registerApi(router)

app.use(errorHandler)
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

const port = 8641
app.listen(port, () => {
  console.log('Example app listening at port %s', port)
})

// Error handling.
//
// NOTE: This is not a good error handler, this is a simple one. See the error handing
//       recipe for a better handler: http://vincit.github.io/objection.js/recipes/error-handling.html
async function errorHandler(ctx: Context, next: () => Promise<any>) {
  try {
    await next()
  } catch (err) {
    if (err instanceof ValidationError) {
      ctx.status = 400
      ctx.body = {
        error: 'ValidationError',
        errors: err.data
      }
    } else if (err instanceof ForeignKeyViolationError) {
      ctx.status = 409
      ctx.body = {
        error: 'ForeignKeyViolationError'
      }
    } else {
      ctx.status = 500
      ctx.body = {
        error: 'InternalServerError',
        message: err.message || {}
      }
    }
  }
}
