const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const sqlDbFactory = require("knex");   //it's like a factory function, it creates the connection

const sqlDb = sqlDbFactory({
  client: "sqlite3",
  debug: true,
  connection: {
    filename: "./doctorsdb.sqlite"   //we're gonna find in our directory this db, it's getting created with this
  },
   useNullAsDefault: true  //this line resolved the error, I added it watching on the internet
});

function initDb() {   //we first have to specify the schema of the database
  return sqlDb.schema.hasTable("doctors").then(exists => {
    if (!exists) {   //if it does not exist we're gonna populate it
      sqlDb.schema
        .createTable("doctors", table => {   //this function creates the table
          table.increments();   //each new row numbers itself automatically, this is a sort of id
          table.string("name");    //specifiying fields of the table
          table.integer("date").unsigned();
          table.enum("sex", ["male", "female"]);
          table.integer("phone");
          table.string("email");
          table.string("location");
          table.string("area");
          table.string("service");
        })
        .then(() => {     //we populate with the data we had last time
          return Promise.all(   //ritorna la lista di promises
            _.map(doctorsList, p => {
              delete p.id;
              return sqlDb("doctors").insert(p); //every insert returns a promise, we need a wwait to wait for all the promises, we use a std javascript function (promise.all)
            })
          );
        });
    } else {
      return true;
    }
  });
}

const _ = require("lodash");

let serverPort = process.env.PORT || 5000;

let doctorsList = require("./doctorstoredata.json");

app.use(express.static(__dirname + "/public"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// /* Register REST entry point */
app.get("/doctors", function(req, res) {
  let start = parseInt(_.get(req, "query.start", 0));
  let limit = parseInt(_.get(req, "query.limit", 10));   //il numero era 5
  let sortby = _.get(req, "query.sort", "none");
  let myQuery = sqlDb("doctors");

  if (sortby === "age") {
    myQuery = myQuery.orderBy("date", "asc");
  } else if (sortby === "-age") {
    myQuery = myQuery.orderBy("date", "desc");
  }
  myQuery.limit(limit).offset(start).then(result => {
    res.send(JSON.stringify(result));
  });
});

app.delete("/doctors/:id", function(req, res) {
  let idn = parseInt(req.params.id);
  sqlDb("doctors").where("id", idn).del().then(() => {
    res.status(200);
    res.send({ message: "ok!!!" });
  });
});

app.delete("/doctors/:id",function(req,res){   //callback function
let idn= parseInt(req.params.id);  //id contains the :id that we specified
doctorsList=_.filter(doctorsList, p=>p.id !==idn);   //filter takes the array , p freccia vuol dire che fa una funzione
             //everything that is not in idn whould be kept in the petlist
res.status(200);     //status code
res.send({message:"ok"}); //json object associated with the request
}) //if i want an additional variable, i have to specify the parameter


app.post("/doctors", function(req, res) {
  let toappend = {
    name: req.body.name,
    sex: req.body.sex,
    date: req.body.date,
    phone: req.body.phone,
    email: req.body.email,
    location: req.body.location,
    area: req.body.area,
    service: req.body.service
  };
  sqlDb("doctors").insert(toappend).then(ids => {
    let id = ids[0];
    res.send(_.merge({ id, toappend }));
  });
});

// app.use(function(req, res) {
//   res.status(400);
//   res.send({ error: "400", title: "404: File Not Found" });
// });

app.set("port", serverPort);

initDb();

/* Start the server on port 5000 */
app.listen(serverPort, function() {
  console.log(`Your app is ready at port ${serverPort}`);
});
