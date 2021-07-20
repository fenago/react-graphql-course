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

/*
Comment above code and then uncomment following code.
*/

// const db = require('./db')
// const Query = {
//    studentById:(root,args,context,info) => {
//       return db.students.get(args.id);
//    }
// }

// const Mutation = {
//    createStudent:(root,args,context,info) => {
//       return db.students.create({collegeId:args.collegeId,
//       firstName:args.firstName,
//       lastName:args.lastName})
//    }
// }

// module.exports = {Query,Mutation}



/*
Comment above code and then uncomment following code.
*/


// const Mutation = {
//     createStudent:(root,args,context,info) => {
 
//        return db.students.create({
//           collegeId:args.collegeId,
//           firstName:args.firstName,
//           lastName:args.lastName
//        })
//     },
    
//     // new resolver function
//     addStudent_returns_object:(root,args,context,info) => {
//        const id = db.students.create({
//           collegeId:args.collegeId,
//           firstName:args.firstName,
//           lastName:args.lastName
//        })
 
//        return db.students.get(id)
//     }
//  }
 
//  //for each single student object returned,resolver is invoked
//  const Student = {
//     college:(root) => {
//        return db.colleges.get(root.collegeId);
//     }
//  }
 
//  module.exports = {Query,Student,Mutation}