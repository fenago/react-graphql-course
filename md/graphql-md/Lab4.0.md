<img align="right" src="./logo.png">


Lab 4.0: Resolver Lab
======================================


We will create a RESOLVER using GraphiQL.

Hint:  Use VSCode for all exercises because it supports copy and paste in the containerized environment.

**Note:** 

- VSCode is already installed in the lab environment, you can open solution folder in vscode.
- Use Midori browser installed in the lab environment for accessing application.

![](./images/vscode1.png)


Resolvers
==================================
We will create a simple application to understand the resolver. This will create the schema for querying a student by id from the server. The student data will be stored in a flat file and we will use a node module called notarealdb to fake a database and read from flat file.

The following is a step-wise process to create this simple application −

## Step 1 − Download and Install Required Dependencies for the Project
Create a folder named resolver-app. Change your directory to resolver-app from the terminal. Later, follow steps 3 to 5 in Lab1.0.

## Step 2 − Create a Schema
Add **schema.graphql** file in the project folder resolver-app and add the following code −

```json
type Query { 
   greeting:String
   students:[Student]
   studentById(id:ID!):Student 
}

type Student {
   id:ID!
   firstName:String
   lastName:String
   password:String
   collegeId:String
}
```
The schema file shows that user can query for greeting, students and studentById. To retrieve students with specific id, we use data type ID! which shows a non nullable unique identifier field. The students field returns an array of students, and greeting returns a simple string value.

## Step 3 − Create Resolver
Create a file **resolvers.js** in the project folder and add the following code −

```javascript
const db = require('./db')
const Query = {
   //resolver function for greeting
   greeting:() => {
      return "hello from  TutorialsPoint !!!"
   },
   
   //resolver function for students returns list
   students:() => db.students.list(),

   //resolver function for studentbyId
   studentById:(root,args,context,info) => {
      //args will contain parameter passed in query
      return db.students.get(args.id);
   }
}
module.exports = {Query}
```
Here, studentById takes in three parameters. As discussed in this lab, the studentId can be retrieved from args; root will contain the Query object itself. To return a specific student, we need to call get method with id parameter in the students collection.

Here greeting, students, studentById are the resolvers that handle the query. students resolver function returns a list of students from the data access layer. To access resolver functions outside the module, Query object has to be exported using module.exports.

## Step 4 − Run the Application
Create a **server.js** file. Refer step 8 in Lab1.0 which says to add this to server.js:

```javascript
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const db = require('./db');

const port = process.env.PORT || 9000;
const app = express();

const fs = require('fs')
const typeDefs = fs.readFileSync('./schema.graphql',{encoding:'utf-8'})
const resolvers = require('./resolvers')

const {makeExecutableSchema} = require('graphql-tools')
const schema = makeExecutableSchema({typeDefs, resolvers})

app.use(cors(), bodyParser.json());

const  {graphiqlExpress,graphqlExpress} = require('apollo-server-express')
app.use('/graphql',graphqlExpress({schema}))
app.use('/graphiql',graphiqlExpress({endpointURL:'/graphql'}))

app.listen(
   port, () => console.info(
      `Server started on port ${port}`
   )
);

```

Execute the command 
`npm start`
in the terminal. The server will be up and running on 9000 port. Here, we use GraphiQL as a client to test the application.

Open the browser and enter the url, http://localhost:9000/graphiql. Type the following query in the editor −

```json
{  
   studentById(id:"S1001") {
      id
      firstName
      lastName
   }
}
```
The output for the above query should be similar to what is shown below (it may not be exact) −

```json
{
   "data": {
      "studentById": {
         "id": "S1001",
         "firstName": "Ernesto",
         "lastName": "Lee"
      }
   }
}
```
