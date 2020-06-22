const fs = require("fs");
const path = require("path");

const tumblr = require('tumblr.js');
var client = tumblr.createClient({
    returnPromises: true,
    credentials: {
    //lol
    }
  });
  
const getTagList = async (thisBlog) => {
    const startTime = new Date();
    var postCollection = {};
    const tags = JSON.parse(fs.readFileSync(path.resolve(__dirname,`./tagLists/${thisBlog}.json`), 'utf-8')).tags;

    const filteredTags = tags.filter(t => t.substring(0,3) === "rp:");
    console.log(filteredTags);

    console.log("fetching for " + filteredTags.length + "tags");
    const timeOut = filteredTags.length > 300 ? 12000 : 0;

    //split tags into batches of 300
    // do a promise.all 
        

    for (var i in filteredTags) {
        let tag = filteredTags[i];
        console.log(tag);
        var partners = new Set();
        await client.blogPosts(thisBlog, { tag: tag})
            .then(response => onGetOne(response, thisBlog, partners, postCollection, tag))
            .catch(err => console.log(err))
    }

    var jsonContent = JSON.stringify(postCollection);
 
    fs.writeFile(`${thisBlog}-output.json`, jsonContent, 'utf8', function (err) { 
        return postCollection;
    });

   
};

const onGetOne = (resp, thisBlog, partners, postCollection, tag) => {
    if (resp.total_posts > 20) console.log("!!! total posts: " + resp.total_posts)
    //todo: if more than 20 
    var urls = new Set();

    if (resp.total_posts === 0) {
        console.log("no posts for "+ tag);
    } else {
        var rootid;
        var rootblog;

        resp.posts.forEach(p => {
            if (!p.trail) {
                rootid = p.id;
                console.log("no reblog info. Using ID: " + p.id);
            } else {
                p.trail.forEach(t => {
                    if (t.is_root_item) {
                        rootid = t.post.id;
                        rootblog = t.blog.name;
                    }

                    if (t.blog.name !== thisBlog) {
                        partners.add(t.blog.name);
                        
                        if (!postCollection[t.blog.name]) {
                            postCollection[t.blog.name] = {};
                        }
                    }
               });

                if (!rootblog || !rootid) {
                    if (!rootblog) rootblog = p.trail[0].blog.name;
                    if (!rootid) rootid =     p.trail[0].post.id;
                }
            }

            urls.add(`http://${rootblog}.tumblr.com/post/${rootid}`);
        }); //end for each post in tag

        //so now we should have a set of partners and a set of urls.

        if (partners.size === 0)  {
            let name;
            if (!resp.posts[0].body) {
                if (resp.posts[0].type === "answer") {
                    if (resp.posts[0].asking_name === "Anonymous") {
                        name = parseForTag(resp.posts[0].answer);
                    } else {
                        name = resp.posts[0].asking_name;
                    }
                }
            } else {
                name = parseForTag(resp.posts[0].body);
            }
            partners.add(name);
            if (!postCollection[name]) {
                postCollection[name] = {};
            }
        }

        partners.forEach(p => {
            const formatTag = tag.slice(3).trim();

            urls.forEach(url => {
                if (!postCollection[p][formatTag]) {
                    postCollection[p][formatTag] = [url]
                } else {
                    postCollection[p][formatTag].push(url)
                }
            });
        });
    };
}

const parseForTag = (postBody) => {
    const step1 = postBody.split("@");
    let step2; let match;
    if (step1.length < 2) {
        console.log("can't find a tag, aborting");
        return '';
    }
    step2 = step1[1].split(/\W/);
    match = step2[0];
    console.log("suggesting match: "+ match);
    return match.trim();
}

module.exports = {
    default: getTagList,
    getTagList: getTagList
};
