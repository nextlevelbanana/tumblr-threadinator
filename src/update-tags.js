const fs = require("fs");
const path = require("path");
const makeList = require("./make-list");

const update = async (blogname, tags, forceUpdate) => {
    console.log(blogname);
    const MongoClient = require('mongodb').MongoClient;

    const tagArray = tags.split ? tags.split(",") : [];

    if (!forceUpdate && (!tagArray || !tagArray.length)) return;

    const relevantTags = tagArray.filter ? tagArray.filter(t => t.substring(0,3).toLowerCase() === "rp:"): [];
    console.log(relevantTags);

    if (!forceUpdate && (!relevantTags || !relevantTags.length)) return;

    try {
        const client = await MongoClient.connect(process.env.MONGODB_URI);

        const db = client.db(process.env.DB_NAME);
        let newTags;
        console.log("connectioned")
        const cursor = db.collection("blogs").find({blogname: blogname});
        let postCollection;


        if (await cursor.hasNext()) {
            const blog = await cursor.next();
            console.log(blog.blogname + " found");

            //blog exists but no tag list? regenerate entire list from json
            if (!blog.tags && !relevantTags) {
                console.log("trying to re-parse tags")
                relevantTags = JSON.parse(fs.readFileSync(path.resolve(__dirname,`../tagLists/${blogname}.json`), 'utf-8')).tags
            }
            newTags = getUpdatedTags(blog.tags, relevantTags);
            //otherwise, just update the link list for the new tags
            postCollection = await makeList(blogname, relevantTags, blog.postCollection);

            if (newTags.length > blog.tags.length) {
                const r = await db.collection("blogs").updateOne({blogname:blogname},
                    { $set: { "tags": newTags, "postCollection": postCollection } } 
                );
            }
        } else {
            //blog doesn't exist? Create from scratch, using the json tag list
            console.log("blog not found");
            newTags = getUpdatedTags(JSON.parse(fs.readFileSync(path.resolve(__dirname,`../tagLists/${blogname}.json`), 'utf-8')).tags, relevantTags);
            console.log(newTags.length)
            postCollection = await makeList(blogname, newTags);

            const r = await db.collection("blogs").insertOne({
                blogname: blogname,
                tags: newTags,
                postCollection: postCollection
            });
        }

        console.log("done with makeList");
        return postCollection;
    } catch (err) {
        console.log(err);
        return err;
    }

    //call script that checks for relevant tags, and adds them to the db, and then re-gens the link list if necessary
}

const getUpdatedTags = (oldTags, newTags) => {
    let updatedTags = new Set(oldTags.filter(t => t.substring(0,3).toLowerCase() === "rp:"));
    newTags.forEach(tag => updatedTags.add(tag))
    console.log(updatedTags.size)

    return Array.from(updatedTags);
}

module.exports = update;