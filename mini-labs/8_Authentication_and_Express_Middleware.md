### Lab 8:  Authentication and Express Middleware

**Lab Solution** Solution is present in `Lab8` directory. Run `npm install` before running solution.

To use middleware with a GraphQL resolver, just use the middleware like you would with a normal Express app. The request object is then available as the second argument in any resolver.

For example, let's say we wanted our server to log the IP address of every request, and we also want to write an API that returns the IP address of the caller. We can do the former with middleware, and the latter by accessing the request object in a resolver. Here's server code that implements this:

**Do this:**

```javascript
var express = require('express');
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');

var schema = buildSchema(`
  type Query {
    ip: String
  }
`);

const loggingMiddleware = (req, res, next) => {
  console.log('ip:', req.ip);
  next();
}

var root = {
  ip: function (args, request) {
    return request.ip;
  }
};

var app = express();
app.use(loggingMiddleware);
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');
```

In a REST API, authentication is often handled with a header, that contains an auth token which proves what user is making this request. Express middleware processes these headers and puts authentication data on the Express request object. Some middleware modules that handle authentication like this are Passport, express-jwt, and express-session. Each of these modules works with express-graphql.

http://localhost:4000/graphql

You can run this GraphQL server with:

`node server.js`

Navigate in a web browser to http://localhost:4000/graphql . You will see following logs in console.

![](./images/9.png)

If you aren't familiar with any of these authentication mechanisms, we recommend using express-jwt because it's simple without sacrificing any future flexibility.
