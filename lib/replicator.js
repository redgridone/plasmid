const hyperswarm = require('hyperswarm')
const pump = require('pump')

module.exports.replicator = function(node, options) {
  const swarm = hyperswarm(options)

  swarm.on('connection', function (connection, info) {
    const stream = node.createReplicationStream(null, info.client, {})
    pump(connection, stream, connection)
  })

  node.on('subscribed', feedKey => {

  })

  node.on('unsubscribed', feedKey => {
  })

}