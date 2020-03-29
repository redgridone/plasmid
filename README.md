# Plasmid

PubSub messaging protocol based on Hypercore/Hyperswarm. It is inspired by both SecureScuttlebutt (SSB) and Holochain but takes into account the requirements of lightweight IoT devices. 

[Read the docs here](https://redgridone.github.io/plasmid/)

## Overview

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

### Entries

Similar to SSB and Holochain, feed entries are arbitrary JSON. Certain types of entries are understood by the protocol and some only understood at the application layer. Entries must have the following basic format (almost identical to SSB but with some fields removed)

```json
{
  "author": "<author-public-key-hash>",
  "sequence": 99, // number entry in the log
  "timestamp": 1584849485319, // unix timestamp in ms of authorship
  "content": {
    "type": "<some entry type>", // the content MUST have a type field
    "data1": "blah" // all other fields are free-form!
  }
}
```

#### System Entries

System entries are understood by the protocol itself and will cause a node to change its state or behaviour. System entries begin with a `%` sign

##### %subscribe

A node can subscribe to the feed of another node to replicate historical data and/or receive updates in real time. A subscribe feed entry has the following content:

```json
"content": {
    "type": "%subscribe",
    "feedKey": "<public-key>",
    "details": {}, // a free-form json object passed to every event callback from this subscription.
    //This could be used to add an alias or other data useful to identify the events
    "options": {
        "alias": "some-short-name",
        "store": "full | tail | none",
        "replication": "full | tail | none",
        ...
    }
}
```

The `store` and `replication` options specify how much of the feed should be stored and how much should be made availble to other peers respectively. Full means try to obtain all the data, tail means entries made after the timestamp of this subscribe entry, and none means only take action on events and don't persist. The replication must be >= store. (e.g. you can't store none and replicate the tail). 

##### %unsubscribe

As expected this is how a node can unsubscrbe from a feed. This will also remove all of its data and stop replicating it

```json
"content": {
    "type": "%unsubscribe",
    "feedKey": "<public-key>",
}
```

##### %delegate

It is possible for a node to grant permission for another node to control its feed. In Plasmid this is called 'delegation'. It is similar to subscribing but the delegating node re-authors the entries to its own feed. This is done similar to subscribe:

```json
"content": {
    "type": "%delegate",
    "feedKey": "<public-key>",
    "details": {},
    "options": {
        "store": "full | tail | none",
        "replication": "full | tail | none",
        ...
    }}
```

Now every time a node receives an entry from this author (after the timestamp) it will author the entry to its own feed but with an added field `"delegateFrom"` which contains the public key of the original authoring feed.

Details and options are the same as for subscribe

Entries commited to a nodes local feed as a result of delegation must contain an additional field at the top level `onBehalfOf` which is the feed key of the node which this one delegated to.

##### %undelegate

```json
"content": {
    "type": "%undelegate",
    "feedKey": "<public-key>",
}
```