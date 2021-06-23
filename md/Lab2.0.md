<img align="right" src="./logo.png">


Lab 2.0: Build Node, Express, Apollo Servers
======================================


We will create a simple API that returns a greeting message, HelloWorld, and access it using GraphiQL.

Hint:  Use VSCode for all exercises because it supports copy and paste in the containerized environment.

**Note:** 

- VSCode is already installed in the lab environment, you can open solution folder in vscode.
- Use Midori browser installed in the lab environment for accessing application.

![](./images/vscode1.png)


NodeJS, ExpressJS, and Apollo
==================================
## Step 1 − Setting up Express
ExpressJS is a web application framework that helps to build websites and web applications. In this lab, we will build a GraphQL API on top of the Express framework.

Next step is to create a folder hello-world-server and navigate to the same folder from the terminal. Add **package.json**, and give a name to the package. Since this package is only used internally, we can declare it private.

```json
{
   "name":"hello-world-server",
   "private":true
}
```
Install the dependencies for Express server as shown below −

`npm install express body-parser cors`
body-parser is a middleware package which helps Express to handle HTTP Post requests efficiently. cors is another middleware package that handles cross-origin resource sharing.

Create a **server.js** file within the project folder and type the following in it −

```javascript
const bodyParser = require('body-parser')
   const cors = require('cors')
   const express = require('express')
   const port = process.env.PORT|| 9000
   const app = express()
   
   //register middleware
   app.use(bodyParser.json() , cors())
   app.listen(port, () =>  console.log(`server is up and running at ${port}`)
```
To verify if the Express server is up and running, execute the following code in the terminal window −

`node server.js`
The following output is displayed in the server console. This shows that the express server is running on port 9000.

server is up and running at 9000
If you open the browser and type http://localhost:9000, you will get the following screen −
<img align="right" src="./images/lab2_1.jpg">
Running Epress Server
To stop the server, press Ctrl + C.

## Step 2 − Install GraphQL and Apollo Server
Now that Express is configured, the next step is to download the following GraphQL dependencies −

- graphql
- graphql-tools
- apollo-server-express@1
We shall use Apollo server v1.0 as it is a stable release. Type the following commands to install these dependencies −

`npm install graphql graphql-tools apollo-server-express@1`
We can verify if these dependencies are installed successfully by checking the **package.json** file that we created previously.

```json
{
   "name": "hello-world-server",
   "private": true,
   
   "dependencies": {
      "apollo-server-express": "^1.4.0",
      "body-parser": "^1.18.3",
      "cors": "^2.8.4",
      "express": "^4.16.3",
      "graphql": "^0.13.2",
      "graphql-tools": "^3.1.1"
   }
}
```
## Step 3 − Define the Schema
A GraphQL schema defines what kind of object can be fetched from a service, and what fields it has. The schema can be defined using GraphQL Schema Definition Language. Now, add the following code snippet in the **server.js** file −

```javascript
// Adding Type Definitions
const typeDefinition = `
   type Query  {
      greeting: String
   }
```
Here, the query contains a greeting attribute that returns a string value.

## Step 4 − Create a Resolver
The first step in creating a resolver is to add some code to process the request for greeting field. This is specified in a resolver. The structure of the resolver function must match the schema. Add the following code snippet in the **server.js** file.

```javascript
// Adding resolver
const  resolverObject = {
   Query : {
      greeting: () => 'Hello GraphQL  From TutorialsPoint !!'
   }
}
```
The second step is to bind the schema and resolver using makeExecutableSchema. This function is pre-defined in the graphql-tools module. Add the following code snippet in the **server.js** file.

```javascript
const {makeExecutableSchema} = require('graphql-tools')
const schema = makeExecutableSchema({typeDefs:typeDefinition, resolvers:resolverObject})
```
## Step 5 − Define Routes to Fetch Data from ReactJS/GraphiQL Application
Add the following code snippet in the **server.js** file −

```javascript
const {graphqlExpress, graphiqlExpress} = require('apollo-server-express')

   //create routes for graphql and graphiql
   app.use('/graphql',graphqlExpress({schema}))
   
   app.use('/graphiql',graphiqlExpress({endpointURL:'/graphql'}))
```
The graphqlExpress function helps to register the route http://localhost:9000/graphql. The ReactJS application can use this endpoint to query data. Similarly, the graphqliExpress function helps to register the route http://localhost:9000/graphiql. This will be used by the GraphiQL browser client to test the API.

The **complete server.js code**** is as given below −

```javascript
const bodyParser = require('body-parser')
const cors = require('cors')
const express = require('express')
const port = process.env.PORT||9000
const app = express()

app.use(bodyParser.json() , cors())
const typeDefinition = `
type Query  {
   greeting: String
}`
const  resolverObject = {
   Query : {
      greeting: () => 'Hello GraphQL  From Ernesto.Net !!'
   }
}
const {makeExecutableSchema} = require('graphql-tools')

const schema = makeExecutableSchema({typeDefs:typeDefinition, resolvers:resolverObject})

const {graphqlExpress,graphiqlExpress} = require('apollo-server-express')

app.use('/graphql',graphqlExpress({schema}))
app.use('/graphiql',graphiqlExpress({endpointURL:'/graphql'}))
app.listen(port, () =>  console.log(`server is up and running ${port}`))
```
## Step 6 − Start the Application
Execute **server.js** using Node.js as follows −

`node server.js`
## Step 7 − Test the GraphQL API
Open the browser and type http://localhost:9000/graphiql. In the query tab of GraphiQL, enter the following −

```json
{
   greeting
}
```
The response from the server is given below −

```json
{
   "data": {
      "greeting": "Hello GraphQL From Ernesto.Net !!"
   }
}
```
