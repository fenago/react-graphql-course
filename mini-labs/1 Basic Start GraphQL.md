# Mini Lab 1:  Getting Started

To create a new project and install GraphQL.js in your current directory:
Do this:
```bash
npm init
npm install graphql --save
```

Writing Code
To handle GraphQL queries, we need a schema that defines the Query type, and we need an API root with a function called a “resolver” for each API endpoint. For an API that just returns “Hello world!”, we can put this code in a file named server.js:

**Do this:**

```javascript
var { graphql, buildSchema } = require('graphql');
 
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
 
// Run the GraphQL query '{ hello }' and print out the response
graphql(schema, '{ hello }', root).then((response) => {
  console.log(response);
});
```

If you run this with:

**Do this:**

`node server.js`

You should see the GraphQL response printed out:

`{ data: { hello: 'Hello world!' } }`

**Congratulations - you just executed a GraphQL query!**