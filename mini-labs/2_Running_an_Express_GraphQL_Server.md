### Lab 2:  Running Express + GraphQL

**Lab Solution** Solution is present in `Lab2` directory. Run `npm install` before running solution.

The simplest way to run a GraphQL API server is to use Express, a popular web application framework for Node.js. You will need to install two additional dependencies:

**Do this:**

```
npm init

npm install express@4.17.1 express-graphql@0.12.0 graphql@15.5.0 --save
```

Let's modify our "hello world" example so that it's an API server rather than a script that runs a single query. We can use the 'express' module to run a webserver, and instead of executing a query directly with the graphql function, we can use the express-graphql library to mount a GraphQL API server on the "/graphql" HTTP endpoint:

**Do this:**

```javascript
var express = require('express');
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Query {
    hello: String
  }
`);

// The root provides a resolver function for each API endpoint
var root = {
  hello: () => {
    return 'Hello world!';
  },
};

var app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at http://localhost:4000/graphql');
```

You can run this GraphQL server with:

**Do this:**

`node server.js`

Since we configured graphqlHTTP with graphiql: true, you can use the GraphiQL tool to manually issue GraphQL queries. If you navigate in a **Midori** web browser to http://localhost:4000/graphql, you should see an interface that lets you enter queries. It should look like:

![](./images/901b54ad-82f6-45ae-9e63-ca4891502784.001.png)

This screen shot shows the GraphQL `query { hello }` being issued and giving a result of `{ data: { hello: 'Hello world!' } }`. GraphiQL is a great tool for debugging and inspecting a server, so we recommend running it whenever your application is in development mode.
