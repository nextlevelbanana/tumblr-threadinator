// Require the framework and instantiate it
const fastify = require('fastify')({ logger: true })
const index = require("./index")
const path = require("path")
const fs = require ("fs")


fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'public')
    // prefix: '/public/',
  })


fastify.get("/api/blog/:name", async (request, reply) => {
    let file = JSON.parse(fs.readFileSync(path.resolve(__dirname,`${request.params.name}-output.json`), 'utf-8'));
    reply.send(file);
})  
fastify.get('/blog/:name', async (request, reply) => {

    reply.sendFile(`${request.params.name}.html`)
});

  fastify.get('/', function (req, reply) {
    reply.sendFile('index.html') // serving path.join(__dirname, 'public', 'myHtml.html') directly
  })


// Run the server!
const start = async () => {
  try {
    await fastify.listen(3000)
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()