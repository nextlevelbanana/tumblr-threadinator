import express from "express";
const fs = require("fs");
const path = require("path")
const router = express.Router();

router.get('/blog/:name', async (req, res) => {
    console.log(req.params.name);
    res.status(200).render('pages/index', {name: req.params.name, 
    data: JSON.parse(fs.readFileSync(path.resolve(__dirname,`../../${req.params.name}-output.json`)))
    });
});

export default router;
