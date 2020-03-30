/**
 * Helpers for setting up tests with multiple nodes
 * 
 * This takes care of 'networking' them without actually using a network.
 * All communication takes place over streams. If a node subscribes to another this will
 * ensure that the replication stream plumbing it set up correctly
 */

const { newScratchDir } = require('./test-utils')
const { initNode, subscribe, unsubscribe, head, authorEntry } = require('../lib/promise')


module.exports.bootstrapNodes = async function(nNodes) {
	const nodes = {}
	// initialize all the nodes
	for (let i = 0; i < nNodes; i++) {
		const n = await initNode(newScratchDir())
		nodes[n.feedKey()] = n
	}
	// set up handlers to network on subscribe actions
	const nodesArray = Object.values(nodes)
	nodesArray.forEach(subscriber => {
		nodesArray.forEach(target => {
			subscriber.on(`subscribed:${target.feedKey()}`, () => {
				connectNodes(subscriber, target)
			})
		})
	})
	return nodesArray
}

function connectNodes(subscriber, target) {
	let subscriberStream = subscriber.createReplicationStream(target.feedKey(), true, {})
	let targetStream = target.createReplicationStream(null, false, {})
	targetStream.pipe(subscriberStream).pipe(targetStream)	
}