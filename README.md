# Plasmid

PubSub messaging protocol based on Hypercore/Hyperswarm. It is inspired by both SecureScuttlebutt (SSB) and Holochain but takes into account the requirements of lightweight IoT devices. 

[Read the docs here](https://redgridone.github.io/plasmid/)

## About this repo

This monorepo uses [Lerna.js](https://lerna.js.org/) to manage multiple js packages and dependencies. 

- `plasmid-core` is the base layer over Hypercore. This includes specifications of entry formats, entry validation and handling of system entries (subscribe/unsubscribe etc). It predominantly uses a stream interface and node events. It has no networking capabilities.
- `plasmid-replicator` uses Hyperswarm to replicate a nodes feed and also the feeds it is subscribed to.
- `plasmid-daemon` is a higher level executable that combines the above to create a running plasmid node which can be communicated with over HTTP. 

To get up and running requires the following commands

```bash
npm install # installs lerna
npm run bootstrap # installs other dependencies and links packages together
```

You can start a plasmid daemon that persists to a local dir and listens on port 3000 by running the following: 

```bash
lerna run start --stream --scope plasmid-daemon -- ./scratch/persist/ 3000
```

This hosts it own swagger docs at [http://localhost:3000/api-docs/](http://localhost:3000/api-docs/)!

Run tests over all modules by running from the project root
```bash
lerna run test
```

## Examples running a plasmid node

```javascript
const { Node } = require('plasmid-core')
const { initNode, subscribe } = require('plasmid-core').promise
const Replicator = require('plasmid-replicator')

// Create a new node that persists to './store'
// This will create new keys the first time and reboot on subsequent runs
const node = await initNode('./store')

// Create a replicator. This handles the discovery of peers and syncing data.
// This also emits events (such as when a new peer joins)
const replicator = new Replicator(node)

// subscribe to another node to copy their feed and register events when they publish new data
const remoteFeedKey = '0000000000000000000000000000000000000000000000000000000000000000' 
await subscribe(node, node.feed.length, {}, {})
node.on(`newData:${remoteFeedKey}`, data => {
  console.log('Our friend just added new data!', data)
})
```

## Project Overview

Being based on Hypercore/Hyperswarm which are major components of the DAT protocol it shares much of its codebase. DAT adds a filesystem abstraction on top of single-author message feeds while Plasmid adds dynamic multi-feed PubSub style subscriptions and messaging based events.

## Functionality inherited from DAT

### Hypercore

Hypercore is a protocol for contructing and replicating single-author append-only feeds based on a Merkle tree. Public key crypytograhy is used to ensure single authorship and data integrity.

The Merkle tree structure has an added advantage over hash-chain based append only feeds in that it allows partial replication with data integrity. This is important for edge devices which cannot store the large quantites of data required to effectively participate. The only requirement is that an author must have access to the entirety of their feed history in order to compute the root hash (although they do not have to store it themselves).

A non-author wishing to verify part of the feed must request a subset of the tree hashes signed by the author. This allows them to verify ordering and authorship on a partial chunk. This is similar to how file chunks are verified in BitTorrent. 

A messaging protocol allows peers to request subsets of the feed from the author or from each other. It also allows peers to notify each other of new messages as they are created so they can be propagated in close to real time.

### Hyperswarm

This is the peer-to-peer networking and discovery layer. Without going into too much detail it allows the discovery of peers via a number of different methods (both distributed and centralised) and connects them over a socket connection. Peers advertise the topic they have and different topics they are interested in to connect with other peers.

In this protocol (similar to DAT) the topic is the public key of the feed.
    
## Added Functionality

Using the above as the fundamental building blocks, Plasmid adds PubSub style messaging and the ability to delegate authorship to another node. The feed represents the source of truth in every case allowing a device state to be reconstructed by another at any point in time.
