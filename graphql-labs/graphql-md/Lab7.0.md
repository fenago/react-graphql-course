<img align="right" src="./logo.png">

#### Lab 7.0: GraphQL - Validation


While adding or modifying data, it is important to validate the user
input. For example, we may need to ensure that the value of a field is
always not null. We can use **! (non-nullable)** type marker in GraphQL
to perform such validation.

The syntax for using the **!** type marker is as given below −

```
type TypeName {
   field1:String!,
   field2:String!,
   field3:Int!
}
```

The above syntax ensures that all the fields are not null.

If we want to implement additional rules like checking a string\'s
length or checking if a number is within a given range, we can define
custom validators. The custom validation logic will be a part of the
resolver function. Let us understand this with the help of an example.

Illustration - Implementing Custom Validators
---------------------------------------------

Let us create a signup form with basic validation. The form will have
email, firstname and password fields.

### Step 1 − Download and Install Required Dependencies for the Project

Create a folder named **validation-app**. Change the directory
to validation-app from the terminal. Follow steps 3 to 5 explained in
the Environment Setup lab.

### Step 2 − Create a Schema

Add **schema.graphql** file in the project folder **validation-app** and
add the following code −

``` {.prettyprint .notranslate .prettyprinted style=""}
type Query {
   greeting:String
}

type Mutation {
   signUp(input:SignUpInput):String
}

input SignUpInput {
   email:String!,
   password:String!,
   firstName:String!
}
```

**Note** − We can use the input type SignUpInput to reduce the number of
parameters in signUp function. So, signUp function takes only one
parameter of type SignUpInput.

### Step 3 − Create Resolvers

Create a file **resolvers.js** in the project folder and add the
following code −

``` {.prettyprint .notranslate .prettyprinted style=""}
const Query = {
   greeting:() => "Hello"
}

const Mutation ={
   signUp:(root,args,context,info) => {

      const {email,firstName,password} = args.input;

      const emailExpression = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      
      const isValidEmail =  emailExpression.test(String(email).toLowerCase())
      if(!isValidEmail)
      throw new Error("email not in proper format")

      if(firstName.length > 15)
      throw new Error("firstName should be less than 15 characters")

      if(password.length < 8 )
      throw new Error("password should be minimum 8 characters")
      
      return "success";
   }
}
module.exports = {Query,Mutation}
```

The resolver function, signUp accepts parameters email,
password and firstName. These will be passed through input variable so
that it can be accessed through args.input.

### Step 4 − Run the Application

Create a server.js file. Refer step 8 in the Environment Setup Lab.
Execute the command *npm start* in the terminal. The server will be up
and running on 9000 port. Here, we will use GraphiQL as a client to test
the application.

Open the browser and enter the
URL **http://localhost:9000/graphiql**. Type the following query in the
editor −

``` {.prettyprint .notranslate .prettyprinted style=""}
mutation doSignUp($input:SignUpInput) {
   signUp(input:$input)
}
```

Since input to signup function is a complex type, we need to use query
variables in graphiql. For this, we need to first give a name to the
query and call it doSignUp, the \$input is a query variable.

The following query variable must be entered in query variables tab of
graphiql −

``` {.prettyprint .notranslate .prettyprinted style=""}
{
   "input":{
      "email": "abc@abc",
      "firstName": "kannan",
      "password": "pass@1234"
   }
}
```

The errors array contains the details of validation errors as shown
below −

``` {.prettyprint .notranslate .prettyprinted style=""}
{
   "data": {
      "signUp": null
   },
   
   "errors": [
      {
         "message": "email not in proper format",
         "locations": [
            {
               "line": 2,
               "column": 4
            }
         ],
         "path": [
            "signUp"
         ]
      }
   ]
}
```

We have to enter a proper input for each field as given below −

``` {.prettyprint .notranslate .prettyprinted style=""}
{
   "input":{
      "email": "abc@abc.com",
      "firstName": "kannan",
      "password": "pass@1234"
   }
}
```

The response is as follows −

``` {.prettyprint .notranslate .prettyprinted style=""}
{
   "data": {
      "signUp": "success"
   }
}
```

Here, in the below query, we are not assigning any password.

``` {.prettyprint .notranslate .prettyprinted style=""}
{
   "input":{
      "email": "abc@abc.com",
      "firstName": "kannan"
   }
}
```

If a required field is not provided, then qraphql server will display
the following error −

``` {.prettyprint .notranslate .prettyprinted style=""}
{
   "errors": [
      {
         "message": "Variable \"$input\" got invalid value {\"email\":\"abc@abc.com\",\"firstName\":\"kannan\"}; Field value.password of required type String! was not provided.",
         "locations": [
            {
               "line": 1,
               "column": 19
            }
         ]
      }
   ]
}
```

