const db = require('./db')

const Query = {
   greetingWithAuth:(root,args,context,info) => {

      //check if the context.user is null
      if (!context.user) {
         throw new Error('Unauthorized');
      }
      return "Hello from Fenago, welcome back : "+context.user.firstName;
   }
}

module.exports = {Query}