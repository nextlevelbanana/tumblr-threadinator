const fs = require("fs");
const path = require("path");
const makeList = require("./make-list");

const update = async (blogname, tags) => {
    console.log(blogname);
    const MongoClient = require('mongodb').MongoClient;

    const tagArray = tags.split(",");

    if (!tagArray || !tagArray.length) return;

    const relevantTags = tagArray.filter(t => t.substring(0,3).toLowerCase() === "rp:");
    console.log(relevantTags);

    if (!relevantTags || !relevantTags.length) return;

    try {
        const client = await MongoClient.connect(process.env.MONGODB_URI);

        const db = client.db(process.env.DB_NAME);
        let newTags;
        console.log("connectioned")
        const cursor = db.collection("blogs").find({blogname: blogname});
        let postCollection;

        if (await cursor.hasNext()) {
            //todo: replace with useful things
            const blog = await cursor.next();
            console.log(blog.blogname + " found");
            newTags = getUpdatedTags(blog.tags, relevantTags);
            postCollection = await makeList(blogname, newTags);

            if (newTags.length > blog.tags.length) {
                const r = await db.collection("blogs").updateOne({blogname:blogname},
                    { $set: { "tags": newTags, "postCollection": postCollection } } 
                );
            }
        } else {
            console.log("blog not found");
            newTags = getUpdatedTags(JSON.parse(fs.readFileSync(path.resolve(__dirname,`../tagLists/${blogname}.json`), 'utf-8')).tags, relevantTags);
            postCollection = await makeList(blogname, newTags);

            const r = await db.collection("blogs").insertOne({
                blogname: blogname,
                tags: newTags,
                postCollection: postCollection
            });
        }

        console.log("done with makeList");
        return true;
    } catch (err) {
        console.log(err);
        return err;
    }

    //call script that checks for relevant tags, and adds them to the db, and then re-gens the link list if necessary
}

const getUpdatedTags = (oldTags, newTags) => {

    let updatedTags = new Set(oldTags.filter(t => t.substring(0,3).toLowerCase() === "rp:"));
    newTags.forEach(tag => updatedTags.add(tag))

    return Array.from(updatedTags);
}

module.exports = update;