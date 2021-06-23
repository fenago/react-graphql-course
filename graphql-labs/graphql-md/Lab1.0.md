<img align="right" src="./logo.png">


Lab 1.0: Build GraphQL Server with Nodejs
======================================


We will use a step by step approach to build a GraphQL server with Nodejs.

Hint:  Use VSCode for all exercises because it supports copy and paste in the containerized environment.

**Note:** 

- VCode is already installed in the lab environment, you can open solution folder in vscode.
- Use Midori browser installed in the lab environment for accessing application.

![](./images/vscode1.png)


### Lab Solution

Complete solution for this lab is available in the following directory:

`cd ~/Desktop/react-graphql-course/graphql-labs/Lab1.0/test-app`


Before we begin - please go to:  https://graphql.org/swapi-graphql/

<img align="right" src="./images/SWAPIGraphQLAPI.png">

From here, Search Root and explore the root schema.
Add this REQUEST:
```
{
person(personID: 4) {
name
birthYear
}
}
```

Installing and configuring Node.js
==================================


Following commands will install Node.js and the build tools for native modules (it is ok if the curl command does not work): 

```
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash –
sudo apt-get install -y nodejs build-essential
```

<span style="color:red;">Node 12 has been installed already in the lab environment.</span>


## Step 1 − Verify Node and Npm Versions
Verify the version of node and npm using following commands on the terminal −

```
node -v


npm -v
```
## Step 2 − Create a Project Folder and Open in VSCode
The root folder of project can be named as test-app.

Create and open the folder using visual studio code editor by using the instructions below −

```
mkdir test-app
cd test-app
```

### Step 3 − Create package.json and Install the Dependencies
Create a package.json file which will contain all the dependencies of the GraphQL server application.
```
{
   "name": "hello-world-server",
   "private": true,
   "scripts": {
      "start": "nodemon --ignore data/ server.js"
   },
   
   "dependencies": {
      "apollo-server-express": "^1.4.0",
      "body-parser": "^1.18.3",
      "cors": "^2.8.4",
      "express": "^4.16.3",
      "graphql": "^0.13.2",
      "graphql-tools": "^3.1.1"
   },
   
   "devDependencies": {
      "nodemon": "1.17.1"
   }
}
```
Install the dependencies by using the command as given below −

```
npm install
```

## Step 4 − Create Flat File Database in Data Folder
In this step, we use flat files to store and retrieve data. Create a folder data and add two files ***students.json and colleges.json*.**

Following is the **colleges.json** file −


```json
[
   {
      "id": "col-101",
      "name": "AMU",
      "location": "Uttar Pradesh",
      "rating":5.0
   },
   
   {
      "id": "col-102",
      "name": "CUSAT",
      "location": "Kerala",
      "rating":4.5
   }
]
```

Following is the **students.json** file −

```json
[
   {
      "id": "S1001",
      "firstName":"Ernesto",
      "lastName":"Lee",
      "email": "ernesto@ernesto.net",
      "password": "pass123",
      "collegeId": "col-102"
   },
   
   {
      "id": "S1002",
      "email": "khalil.lyones@vt.edu",
      "firstName":"Khalil",
      "lastName":"Lyons",
      "password": "pass123",
      "collegeId": "col-101"
   },
   
   {
      "id": "S1003",
      "email": "jordan.lee@barry.edu",
      "firstName":"Jordan",
      "lastName":"Lee",
      "password": "pass123",
      "collegeId": "col-101"
   }
]
```

## Step 5 − Create a Data Access Layer
We need to create a datastore that loads the data folder contents. In this case, we need collection variables, students and colleges. Whenever the application needs data, it makes use of these collection variables.

Create file **db.js** with in the project folder as follows −

```javascript
const { DataStore } = require('notarealdb');

const store = new DataStore('./data');

module.exports = {
   students:store.collection('students'),
   colleges:store.collection('colleges')
};
```
## Step 6 − Create Schema File, schema.graphql
Create a schema file named **schema.graphql** in the current project folder and add the following contents −

```json
type Query  {
   test: String
}
```
## Step 7 − Create Resolver File, resolvers.js
Create a resolver file in the current project folder and add the following contents −

```javascript
const Query = {
   test: () => 'Test Success, GraphQL server is up & running !!'
}
module.exports = {Query}
```
## Step 8 − Create Server.js and Configure GraphQL
Create a server - **Server.js** - file and configure GraphQL as follows −

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
## Step 9 − Run the Application and Test with GraphiQL
Verify the folder structure of project test-app as follows −

```
 test-app /
   -->package.json
   -->db.js
   -->data
      students.json
      colleges.json
   -->resolvers.js
   -->schema.graphql
   -->server.js
```

Run the command npm start as given below −

`npm start`
The server is running in 9000 port, so we can test the application using GraphiQL tool. Open the browser and enter the URL http://localhost:9000/graphiql. Type the following query in the editor −

```javascript
{
   test 
}
```
The response from the server is given below −

```javascript
{
   "data": {
      "test": "Test Success, GraphQL server is running !!"
   }
}
```


![](./images/graphiql.jpg)
