const fs = require("fs");
const path = require("path");

const tumblr = require('tumblr.js');
const { filter } = require("compression");

  
const getTagList = async (thisBlog, filteredTags) => {
    var client = tumblr.createClient({
        returnPromises: true,
        credentials: {
            consumer_key: process.env.consumer_key,
            consumer_secret: process.env.consumer_secret,
            token: process.env.token,
            token_secret: process.env.token_secret
        }
      });
    
    const startTime = new Date();
    var postCollection = {};
    console.log("fetching for " + filteredTags.length + "tags");
    const timeOut = filteredTags.length > 300 ? 12000 : 0;

    for (let i = 0; i < filteredTags.length; i += 300) {
        console.log("starting at " + i);
        for (let j = 0; j < 300 && i+j < filteredTags.length; j++) {
            let tag = filteredTags[i+j];
            console.log(tag);
            var partners = new Set();
            const response = await client.blogPosts(thisBlog, { tag: tag})
            await onGetOne(response, thisBlog, partners, postCollection, tag)
        }
        if (filteredTags.length > i)
            await new Promise(r => setTimeout(r, 60000));
    }

    console.log("done with loop");

    var jsonContent = JSON.stringify(postCollection);
 
    fs.writeFile(`${thisBlog}-output.json`, jsonContent, 'utf8', function (err) { 
        return postCollection;
    });
};

const onGetOne = async (resp, thisBlog, partners, postCollection, tag) => {
    if (resp.total_posts > 20) console.log("!!! "+ tag + " total posts: " + resp.total_posts)
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
                console.log(`no reblog info for ${tag}. Using ID: ${p.id}`);
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
            console.log(tag);
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

module.exports = getTagList;