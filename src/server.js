const express = require("express");
const compression = require("compression");
const path = require("path");
const fs = require("fs");


// Server var
const app = express();
const router = express.Router();

// View engine setup
app.set("views", path.join(__dirname,"views"));
app.set("view engine", "ejs");

// Middleware
app.use(compression());
app.use(express.static(__dirname + "/public"));
app.get('/blog/:name', async (req, res) => {
        res.status(200).render('pages/index', {name: req.params.name, 
        data: JSON.parse(fs.readFileSync(path.resolve(__dirname,`../${req.params.name}-output.json`)))
        });
    });
app.get('/', (req,res) => {
    res.send("<html><body><p>Welcome to the Tumblr Threadinator!</p><p>All pages can be found under /blog/{blogname}.</p></body></html>")
})

const port = process.env.PORT || 3000;

app.listen(port, function listenHandler() {
    console.info(`Running on ${port}`)
});
