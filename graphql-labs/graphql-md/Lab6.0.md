<img align="right" src="./logo.png">

#### Lab 6.0: GraphQL - Mutation


In this lab, we will learn mutation queries in GraphQL.

Mutation queries modify data in the data store and returns a value. It
can be used to insert, update, or delete data. Mutations are defined as
a part of the schema.

The syntax of a mutation query is given below −

```
mutation{
   someEditOperation(dataField:"valueOfField"):returnType
}
```

Illustration
------------

Let us understand how to add new student record into the datastore using
a mutation query.

### Step 1 − Download and Install Required Dependencies for the Project

Create a project folder by the name mutation-app. Change your directory
to mutation-app from the terminal. Follow steps 3 to 5 explained in the
Environment Setup lab.

### Step 2 − Create a schema.graphql File

Add **schema.graphql** file in the project folder mutation-app and add
the following code −

``` {.prettyprint .notranslate .prettyprinted style=""}
type Query {
   greeting:String
}

type Mutation {
   createStudent(collegeId:ID,firstName:String,lastName:String):String
}
```

Note that the function createStudent returns a String type. This is a
unique identifier (ID) which is generated after creating a student.

### Step 3 − Create a resolver.js File

Create a file resolvers.js in the project folder and add the following
code −

``` {.prettyprint .notranslate .prettyprinted style=""}
const db = require('./db')
const Mutation = {
   createStudent:(root,args,context,info) => {
      return db.students.create({collegeId:args.collegeId,
      firstName:args.firstName,
      lastName:args.lastName})
   }
}
const Query = {
   greeting:() => "hello"
}

module.exports = {Query,Mutation}
```

The mutation function points to students collection in the datastore. To
add a new *student*, invoke the create method in students collection.
The *args* object will contain the parameters which are passed in the
query. The create method of *students* collection will return the id of
a newly created student object.

### Step 4 − Run the Application

Create a **server.js** file. Refer to step 8 in the Environment Setup
Lab. Execute the command npm start in the terminal. The server will
be up and running on 9000 port. Here, we use GraphiQL as a client to
test the application.

Next step is to open browser and type the
URL **http://localhost:9000/graphiql**. Type the following query in the
editor −

``` {.prettyprint .notranslate .prettyprinted style=""}
//college Id should be matched with data from colleges.json for easy retrieval

mutation {
   createStudent(collegeId:"col-2",firstName:"Tim",lastName:"George")
}
```

The above query will create a student object in student.json file. The
query will return a unique identifier. The response of the query is as
shown below −

``` {.prettyprint .notranslate .prettyprinted style=""}
{
   "data": {
      "createStudent": "SkQtxYBUm"
   }
}
```

To verify if the student object is created, we can use
the studentById query. You can also open the students.json file
from data folder to verify the id.

To use studentById query, edit the **schema.graphql** as given below −

``` {.prettyprint .notranslate .prettyprinted style=""}
type Query {
   studentById(id:ID!):Student
}

type Student {
   id:ID!
   firstName:String
   lastName:String
   collegeId:String
}
```

Edit the **resolver.js** file as given below −

``` {.prettyprint .notranslate .prettyprinted style=""}
const db = require('./db')
const Query = {
   studentById:(root,args,context,info) => {
      return db.students.get(args.id);
   }
}

const Mutation = {
   createStudent:(root,args,context,info) => {
      return db.students.create({collegeId:args.collegeId,
      firstName:args.firstName,
      lastName:args.lastName})
   }
}

module.exports = {Query,Mutation}
```

Given below is the query to get student by unique id returned from the
mutation query −

``` {.prettyprint .notranslate .prettyprinted style=""}
{
    studentById(id:"SkQtxYBUm") {
    id
    firstName
    lastName
  }
}
```

The response from the server is as follows −

``` {.prettyprint .notranslate .prettyprinted style=""}
{
   "data": {
      "studentById": {
         "id": "SkQtxYBUm",
         "firstName": "Tim",
         "lastName":"George"
      }
   }
}
```

Returning an Object in Mutation
-------------------------------

It is best practice to return an object in mutation. For example, the
client application wants to fetch student and college details. In this
case, rather than making two different requests, we can create a query
that returns an object containing students and their college details.

### Step 1 − Edit Schema File

Add a new method named **addStudent** which returns object in mutation
type of **schema.graphql**.

Let us learn how to access the college details through student details.
Add college type in the schema file.

``` {.prettyprint .notranslate .prettyprinted style=""}
type Mutation {
   addStudent_returns_object(collegeId:ID,firstName:String,lastName:String):Student

   createStudent(collegeId:ID,firstName:String,lastName:String):String
}

type College {
   id:ID!
   name:String
   location:String
   rating:Float
}

type Student {
   id:ID!
   firstName:String
   lastName:String
   college:College
}
```

### Step 2 − Update the resolvers.js File

Update a file **resolvers.js** in the project folder and add the
following code −

``` {.prettyprint .notranslate .prettyprinted style=""}
const Mutation = {
   createStudent:(root,args,context,info) => {

      return db.students.create({
         collegeId:args.collegeId,
         firstName:args.firstName,
         lastName:args.lastName
      })
   },
   
   // new resolver function
   addStudent_returns_object:(root,args,context,info) => {
      const id = db.students.create({
         collegeId:args.collegeId,
         firstName:args.firstName,
         lastName:args.lastName
      })

      return db.students.get(id)
   }
}

//for each single student object returned,resolver is invoked
const Student = {
   college:(root) => {
      return db.colleges.get(root.collegeId);
   }
}

module.exports = {Query,Student,Mutation}
```

### Step 3 − Start the Server and Type the Request Query in GraphiQL

Next, we shall start the server and request query in GraphiQL with the
following code −

``` {.prettyprint .notranslate .prettyprinted style=""}
mutation {
   addStudent_returns_object(collegeId:"col-101",firstName:"Susan",lastName:"George") {
      id
      firstName
      college{
         id
         name
      }
   }
}
```

The above query adds a new student and retrieves the student object
along with college object. This saves round trips to the server.

The response is as given below −

``` {.prettyprint .notranslate .prettyprinted style=""}
{
   "data": {
      "addStudent_returns_object": {
         "id": "rklUl08IX",
         "firstName": "Susan",
         "college": {
            "id": "col-101",
            "name": "AMU"
         }
      }
   }
}
```

