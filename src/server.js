const express = require("express");
const compression = require("compression");
const path = require("path");
const fs = require("fs");
var bodyParser = require('body-parser');
const tumblr = require('tumblr.js');
const updateTags = require('./update-tags');
const { resolveSoa } = require("dns");

var MongoClient = require('mongodb').MongoClient;

if (process.env.NODE_ENV =="development") {
    require('dotenv').config();
}


// Server var
const app = express();
const router = express.Router();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


// View engine setup
app.set("views", path.join(__dirname,"views"));
app.set("view engine", "ejs");

// Middleware
app.use(compression());
app.use(express.static(__dirname + "/public"));
app.get('/blog/:blogname', async (req, res) => {

    const client = await MongoClient.connect(process.env.MONGODB_URI);

    const db = client.db(process.env.DB_NAME);
    const cursor = db.collection("blogs").find({blogname: req.params.blogname});
    if (await cursor.hasNext()) {
        const blog = await cursor.next();   
        res.status(200).render('pages/index', {blogname: req.params.blogname, 
            data: blog.postCollection
            });
    } else {
        await updateTags(req.params.blogname, [], true);
        const blog = await db.collection("blogs").find({blogname: req.params.blogname}).next();
        console.log("blog: " + blog);
        res.status(200).render('pages/index', {blogname: req.params.blogname, 
            data: blog.postCollection
        });
    } 
});


app.get("/likes/:username/page/:num", async(req,res) => {
    var client = tumblr.createClient({
        returnPromises: true,
        credentials: {
            consumer_key: process.env.consumer_key,
            consumer_secret: process.env.consumer_secret,
            token: process.env.token,
            token_secret: process.env.token_secret
        }
      });
    
      try {
      var data = await client.blogLikes(req.params.username, {offset: 20 * (req.params.num - 1)});
      res.status(200).render('pages/likes', {name: req.params.username, 
        data: data});
      } catch (err) {
        res.send("Something went wrong. Make sure your likes are publicly accessible and that the blog name you're using is your main blog.")
      }
});

app.get("/likes/:username/before/:date", async(req,res) => {
        var client = tumblr.createClient({
            returnPromises: true,
            credentials: {
                consumer_key: process.env.consumer_key,
                consumer_secret: process.env.consumer_secret,
                token: process.env.token,
                token_secret: process.env.token_secret
            }
        });
        
        try {
            var myDate = new Date(req.params.date);
                var myEpoch = req.params.date.includes("-") ? myDate.getTime()/1000.0 : req.params.date;
            var data = await client.blogLikes(req.params.username, {before: myEpoch});
            res.status(200).render('pages/likes', {name: req.params.username, 
                data: data})
        } catch (err) {
            res.send("Something went wrong. Make sure your likes are publicly accessible and that the blog name you're using is your main blog.")
        }
    });

app.get("/likes/:username/after/:date", async(req,res) => {
        var client = tumblr.createClient({
            returnPromises: true,
            credentials: {
                consumer_key: process.env.consumer_key,
                consumer_secret: process.env.consumer_secret,
                token: process.env.token,
                token_secret: process.env.token_secret
            }
        });
        
        try {
            var myDate = new Date(req.params.date); 
            var myEpoch = req.params.date.includes("-") ? myDate.getTime()/1000.0 : req.params.date;
            var data = await client.blogLikes(req.params.username, {after: myEpoch});
            res.status(200).render('pages/likes', {name: req.params.username, 
                data: data})
        } catch (err) {
            res.send("Something went wrong. Make sure your likes are publicly accessible and that the blog name you're using is your main blog.")
        }
    });


app.get("/likes/:username", async(req,res) => {

        var client = tumblr.createClient({
            returnPromises: true,
            credentials: {
                consumer_key: process.env.consumer_key,
                consumer_secret: process.env.consumer_secret,
                token: process.env.token,
                token_secret: process.env.token_secret
            }
          });
        
          var data = await client.blogLikes(req.params.username);
          res.status(200).render('pages/likes', {name: req.params.username, 
            data: data})
        });

app.post("/api/tags", async(req,res) => {
    await updateTags(req.body.blogname, req.body.tags, false);
    res.sendStatus(204);
});
        
app.get('/', (req,res) => {
    res.send("<html><body><ul><li>/likes/YOUR-BLOG-NAME - see the first page of your likes</li><li>/likes/YOUR-BLOG-NAME/page/NUMBER - see page #NUMBER of your likes (only works up through page 51)</li><li>/likes/YOUR-BLOG-NAME/before/MM-DD-YYYY - see the page of your before the date MM-DD-YYYY</li><li>/likes/YOUR-BLOG-NAME/after/MM-DD-YYYY - see the page of your after the date MM-DD-YYYY</li></ul></body></html>")
})

const port = process.env.PORT || 3000;
MongoClient.connect(process.env.MONGODB_URI, function(err, client) {
    if (err) throw err;
    client.close();
    app.listen(port, function listenHandler() {
        console.info(`Running on ${port}`)
    });
});


