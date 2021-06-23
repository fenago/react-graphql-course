const db = require('./db')
const Query = {
   greeting:() => {
      return "hello from  Ernesto.Net !!!"
   },
   students:() => db.students.list()
}

module.exports = {Query}