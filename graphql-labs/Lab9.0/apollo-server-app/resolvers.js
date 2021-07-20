const db = require('./db')

const Query = {
   //resolver function for students returns list
   students:() => db.students.list(),
}

const Student = {
   college:(root) => {
      return db.colleges.get(root.collegeId);
   }
}
module.exports = {Query,Student}