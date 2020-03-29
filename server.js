require("dotenv").config();
var express = require("express");
var socket = require("socket.io");
var bodyParser = require("body-parser");

var app = express();

var server = app.listen(process.env.PORT || 8080);

app.use("/static", express.static("static"));
app.use("/assets", express.static("assets"));
app.use(bodyParser.json());

const fileDirectory = __dirname + "/assets/";

const auth = require("./routes/auth");
app.use(auth);

app.get("/", (req, res) => {
  res.sendFile("login.html", { root: fileDirectory });
});

app.get("/signup", (req, res) => {
  res.sendFile("signup.html", { root: fileDirectory });
});

app.get("/rooms/:mode/:rid/", (req, res) => {
  res.sendFile(
    "index.html",
    {
      root: fileDirectory
    },
    err => {
      res.end();
      if (err) throw err;
    }
  );
});

console.log("Server listening on port 8080");
var io = socket(server);

io.sockets.on("connection", connection);

var uids = new Map();

var rooms = new Map();

function toJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

function connection(socket) {
  console.log("New user with id " + socket.id + " has entered");

  socket.on("text", pack => {
    io.sockets.emit("text", pack);
    lastText = pack.data;
    var uid = uids.get(socket.id);
    console.log(
      "New text event by " +
        socket.id +
        "(" +
        uid +
        ") in room <" +
        pack.rid +
        ">:" +
        toJSON(pack)
    );
  });

  socket.on("msg", pack => {
    io.sockets.emit("msg", pack);
    var uid = uids.get(socket.id);
    console.log(
      "New msg event by " +
        socket.id +
        "(" +
        uid +
        ") in room <" +
        pack.rid +
        ">:" +
        toJSON(pack)
    );
  });

  socket.on("giveControl", pack => {
    io.sockets.emit("giveControl", pack);
    var uid = uids.get(socket.id);
    console.log(
      "New giveControl event by " +
        socket.id +
        "(" +
        uid +
        ") in room <" +
        pack.rid +
        ">:" +
        toJSON(pack)
    );
  });

  socket.on("registry", pack => {
    uids.set(socket.id, pack.uid);

    console.log(
      "Registering " +
        socket.id +
        ": with <" +
        pack.uid +
        ">  of room <" +
        pack.rid +
        ">: " +
        pack.data
    );

    var room = new Object();

    if (rooms.has(pack.rid)) {
      console.log("  --> Room already exists.");
      room = rooms.get(pack.rid);
      socket.emit("giveControl", {
        uid: pack.uid,
        rid: pack.rid,
        sid: socket.id,
        data: ""
      });
    } else {
      console.log("  --> New room.");
      room.users = new Array();
      room.lastText = "";
    }

    room.users.push({
      uid: pack.uid,
      sid: socket.id
    });
    rooms.set(pack.rid, room);

    console.log(" Updated room saved:" + toJSON(room));

    socket.emit("userRegistered", {
      uid: pack.uid,
      rid: pack.rid,
      sid: socket.id,
      data: room.lastText
    });
  });
}
