const { initNode } = require('plasmid-core').promise
const Replicator = require('plasmid-replicator')
const express = require('express')
const cors = require('cors')
const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const fs = require('fs')

const setupHttp = require('./http-interface')

const swaggerDocOpts = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Plasmid Daemon',
      version: '0.0.1'
    }
  },
  apis: ['./src/http-interface.js']
}

async function main () {
  if (!process.argv[2]) {
    console.error('No persistence storage path provided (first arg)')
    process.exit(1)
  }
  const persistencePath = process.cwd() + '/' + process.argv[2]
  if (!process.argv[3]) {
    console.error('No port provided (second arg)')
    process.exit(1)
  }
  const port = process.argv[3]
  console.log('Setting up node persistence dir...', persistencePath)
  if (!fs.existsSync(persistencePath)) {
    fs.mkdirSync(persistencePath, { recursive: true })
  }

  console.log('Starting plasmid node...')
  const node = await initNode(persistencePath)
  console.log('Starting replicator...')
  const replicator = new Replicator(node)
  console.log('Stating HTTP interface')
  const app = express()
  app.use(cors())
  setupHttp(app, node, replicator)
  const swaggerSpec = swaggerJSDoc(swaggerDocOpts)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  app.listen(port, () => console.log(`Listening for commands on HTTP ${port}`))
}

(async () => {
  await main()
})().catch(e => {
  console.error(e)
})
