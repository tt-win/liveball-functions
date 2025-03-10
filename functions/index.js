const {onRequest} = require("firebase-functions/v2/https")
// const logger = require("firebase-functions/logger")
const {Platform, getUserChannel, getPushUrl} = require('./cloudStream')

const admin = require('firebase-admin')
admin.initializeApp()
const db = admin.firestore()

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started


function stripProtocol(url) {
  if (!url || typeof url !== 'string') {
    return ''
  }
  const protocolRegex = /^[^:]+:\/\//
  return url.replace(protocolRegex, '')
}

async function checkCollectionExists(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get()
    return !snapshot.empty
  } catch (error) {
    console.error("Error checking collection:", error)
    return false
  }
}

async function createCollection(collectionName) {
  try {
    await db.collection(collectionName).doc('dummy').set({})
    await db.collection(collectionName).doc('dummy').delete()
    console.log(`Collection "${collectionName}" created successfully.`)
  } catch (error) {
    console.error(`Error creating collection "${collectionName}":`, error)
  }
}


exports.createStream = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(400).send({ error: 'Bad Request' })
    }
    const { platform, key, channelId, pushUrl, liveUrl, ssl } = req.body

    if (!platform || !key || !channelId || !pushUrl) {
      return res.status(400).send({ error: 'Missing required fields' })
    }

    const platforms = Object.values(Platform)
    if (platforms.every(p => p !== platform.toUpperCase())) {
      return res.status(400).send({ error: 'Invalid platform' })
    }

    const newStream = {
      platform: platform.toUpperCase(),
      key,
      channelId,
      isValid: true,
      pushUrl: stripProtocol(pushUrl),
      liveUrl: stripProtocol(liveUrl),
      ssl: typeof ssl === 'boolean' ? ssl : true,
    }

    const isExist = await checkCollectionExists('streams')
    if (!isExist) {
      await createCollection('streams')
    }
    const id = `${platform.toUpperCase()}-${key}`
    await db.collection('streams').doc(id).set(newStream)

    res.send({ id, message: 'Stream created successfully' })
  } catch (error) {
    console.error('Error creating stream:', error)
    res.status(500).send({ error: 'Failed to create stream' })
  }
})

exports.getStreams = onRequest(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(400).send({ error: 'Bad Request' })
    }
    const { platform, channelId } = req.query

    let query = db.collection('streams')

    if (platform && typeof platform === "string") {
      query = query.where('platform', '==', platform.toUpperCase())
    }

    if (channelId) {
      query = query.where('channelId', '==', channelId)
    }

    const snapshot = await query.get()
    const streams = []

    snapshot.forEach((doc) => {
      const streamData = doc.data()
      const streamWithId = {
        id: doc.id,
        ...streamData,
        push: getPushUrl(streamData),
      }
      streams.push(streamWithId)
    })

    res.send(streams)
  } catch (error) {
    console.error('Error getting streams:', error)
    res.status(500).send({ error: 'Failed to get streams' })
  }
})

exports.updateStream = onRequest(async (req, res) => {
  try {
    if (req.method !== 'PUT') {
      return res.status(400).send({ error: 'Bad Request' })
    }
    const streamId = req.params[0]
    if (!streamId) {
      return res.status(400).send({ error: 'Id is required' })
    }
    const { platform, key, channelId, isValid, pushUrl, liveUrl, ssl } = req.body

    if (!platform && !key && !channelId && !pushUrl && !liveUrl && isValid == undefined) {
      return res.status(400).send({ error: 'Missing required fields' })
    }

    const updatedStream = {}
    // platform & key用來當id 所以不給更新
    // if(platform != undefined && typeof platform === "string") updatedStream.platform = platform.toUpperCase()
    // if(key != undefined) updatedStream.key = key
    if(channelId != undefined) updatedStream.channelId = channelId
    if(isValid != undefined) updatedStream.isValid = isValid
    if(pushUrl != undefined) updatedStream.pushUrl = pushUrl
    if(liveUrl != undefined) updatedStream.liveUrl = liveUrl
    if(ssl != undefined) updatedStream.ssl = ssl

    await db.collection('streams').doc(streamId).update(updatedStream)

    res.send({ message: 'Stream updated successfully' })
  } catch (error) {
    console.error('Error updating stream:', error)
    res.status(500).send({ error: 'Failed to update stream' })
  }
})

exports.deleteStream = onRequest(async (req, res) => {
  try {
    if (req.method !== 'DELETE') {
      return res.status(400).send({ error: 'Bad Request' })
    }
    const streamId = req.params[0]
    if (!streamId) {
      return res.status(400).send({ error: 'Id is required' })
    }
    
    const streamsSnapshot = await db.collection('streams').doc(streamId).get()
    if (!streamsSnapshot.exists) {
      return res.send({ message: 'Invalid Stream' })
    }

    await db.collection('streams').doc(streamId).delete()

    res.send({ message: 'Stream deleted successfully' })
  } catch (error) {
    console.error('Error updating stream:', error)
    res.status(500).send({ error: 'Failed to delete stream' })
  }
})

exports.setLive = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(400).send({ error: 'Bad Request' })
    }
    const game = req.params[0].toUpperCase()
    const { streamId } = req.body

    if (!game || !streamId) {
      return res.status(400).send({ error: 'Missing required fields' })
    }

    const streamsSnapshot = await db.collection('streams').doc(streamId).get()
    if (!streamsSnapshot.exists) {
      return res.send({ message: 'Invalid Stream' })
    }

    const isExist = await checkCollectionExists('lives')
    if (!isExist) {
      await createCollection('lives')
    }

    const newLive = {
      game,
      streamId,
    }
    const livesSnapshot = await db.collection('lives').where('game', '==', game).get()
    if (livesSnapshot.empty) {
      const docRef = await db.collection('lives').doc(game).set(newLive)
      res.send({ message: 'Live created successfully', id: docRef.id })
    } else {
      const docId = livesSnapshot.docs[0].id
      await db.collection('lives').doc(docId).update(newLive)
      res.send({ message: 'Live updated successfully', id: docId })
    }
  } catch (error) {
    console.error('Error creating live:', error)
    res.status(500).send({ error: 'Failed to set live' })
  }
})

// 這支API不適合讓彩票前端直接使用(會打得太頻繁)
exports.getLive = onRequest(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(400).send({ error: 'Bad Request' })
    }
    const game = req.params[0].toUpperCase()
    if (!game) {
      return res.status(400).send({ error: 'Missing required fields' })
    }

    let query = db.collection('lives').where('game', '==', game)

    const snapshot = await query.get()
    if (snapshot.empty) {
      return res.status(404).send({ error: 'No matching live stream found' });
    }

    const firstDoc = snapshot.docs[0];
    const streamId = firstDoc.data().streamId
    const streamsSnapshot = await db.collection('streams').doc(streamId).get()
    if (!streamsSnapshot.exists) {
      return res.status(404).send({ error: 'No matching stream found' })
    }
    const streamConfig = streamsSnapshot.data()

    const liveWithId = {
      id: firstDoc.id,
      ...getUserChannel(streamConfig)
    }

    res.send(liveWithId)
  } catch (error) {
    console.error('Error getting streams:', error)
    res.status(500).send({ error: 'Failed to get streams' })
  }
})
