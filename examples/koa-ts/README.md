# Koa typescript example project

This is an example project that targets node 8.0.0 and up. The project is a simple Koa server with a REST API that demonstrates the basic functionalities of objection like models, queries, relations, eager loading and graph inserts.

This server binds to localhost and has no authentication or per-user authorization. It is for local use only; add application-specific access controls before exposing it to a network or reusing its routes.

Note that this is not an example of how to build a web server. It's an example of how to use objection in a web server. All other aspects are kept as simple and minimal as possible.

# Install and run

```sh
git clone git@github.com:Vincit/objection.js.git objection
cd objection/examples/koa-ts
npm install
npm start
node client.js
```
