# Plasmid-Core

### Entries

Similar to SSB and Holochain, feed entries are arbitrary JSON. Certain types of entries are understood by the protocol and some only understood at the application layer. Entries must have the following basic format (almost identical to SSB but with some fields removed)

```javascript
{
  "author": "<author-public-key-hash>",
  "sequence": 99, // number entry in the log
  "timestamp": 1584849485319, // unix timestamp in ms of authorship
  "remoteAuthor": "<optional-remote-author-key-hash>"
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

```javascript
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

The `alias` option allows registering this subscription with a name other than the feedKey. Events triggered by this foreign feed will be posted to the alias name as well as the feed key. This is particularly useful for the consuming code and allows for dynamic configuration. For example if the consuming code is listening to events from the 'pricing-provider' alias it is possible to change which foreign feed is subscribed under this alias to change the devices behavious.

The `store` and `replication` options specify how much of the feed should be stored and how much should be made availble to other peers respectively. Full means try to obtain all the data, tail means entries made after the timestamp of this subscribe entry, and none means only take action on events and don't persist. The replication must be >= store. (e.g. you can't store none and replicate the tail). 

##### %unsubscribe

As expected this is how a node can unsubscrbe from a feed. This will also remove all of its data and stop replicating it

```javascript
"content": {
    "type": "%unsubscribe",
    "feedKey": "<public-key>",
}
```

#### Granting authoring access to remote nodes

Another feature of Plasmid is the ability a node to grant authoring capabilities to other nodes. This is a particularly useful feature for remote IoT devices as it allows a managing device to modify its state (if it has the required permission). For remote authored messages to work you must also subscribe to the authoring node.

##### %grant

The granting process requires a node to author a `%grant` entry to its feed. This is a regular feed entry with the following content
```javascript
"content": {
    "type": "%grant",
    "feedKey": "<remote-node-feed-key>"
    "contentValidationSchema": <json-schema->
}
```

`feedKey` is the public key of the remote node this is granting permission to write.

`contentValidationSchema` is a JSON schema. Only content that passes validation against this schema will be authored onto the granting nodes feed. This allows for quite fine grained control over the types of entries the node is granting permission to author.

Granting a node permission will also cause this node to listen for messages from it but does not follow the other feed in the sense that it doesn't trigger external events or store the data.

##### %revoke

```javascript
"content": {
    "type": "%revoke",
    "feedKey": "<remote-node-feed-key>"
}
```

##### %remoteAuthor

This is the entry a node can publish to request another node that has granted it permission write an entry to its feed. 

```javascript
"content": {
    "type": "%remoteAuthor",
    "target": "<feed-key-of-target>" // this is optional. None is a multicast
    "remoteContent": //can be anything. Will be validated against the grant schema
}
```

If the `remoteContent` passes validation it will be authored as a new entry in the granting nodes feed. When this is done an additional top level property `remoteAuthor` is added to the entry object which contains the feed key of the original authoring node.
