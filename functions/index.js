const {onRequest} = require("firebase-functions/v2/https")
// const logger = require("firebase-functions/logger")
const admin = require('firebase-admin')
admin.initializeApp()
const db = admin.firestore()

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

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
      return res.status(400).send({ error: 'Bad Request' });
    }
    const { platform, key, channelId } = req.body

    if (!platform || !key || !channelId) {
      return res.status(400).send({ error: 'Missing required fields' })
    }

    const newStream = {
      platform: platform.toUpperCase(),
      key,
      channelId,
      isValid: true,
    }

    const isExist = await checkCollectionExists('streams')
    if (!isExist) {
      await createCollection('streams')
    }
    const id = `${platform.toUpperCase()}-${key}`
    const docRef = await db.collection('streams').doc(id).set(newStream)

    res.send({ id: docRef.id, message: 'Stream created successfully' })
  } catch (error) {
    console.error('Error creating stream:', error)
    res.status(500).send({ error: 'Failed to create stream' })
  }
})

exports.getStreams = onRequest(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(400).send({ error: 'Bad Request' });
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
      }
      streams.push(streamWithId)
    })

    res.send(streams)
  } catch (error) {
    console.error('Error getting streams:', error)
    res.status(500).send({ error: 'Failed to get streams' })
  }
})

// 主要用來修改isValid 通知此組推流設定失效
exports.updateStream = onRequest(async (req, res) => {
  try {
    if (req.method !== 'PUT') {
      return res.status(400).send({ error: 'Bad Request' });
    }
    const streamId = req.params[0]
    if (!streamId) {
      return res.status(400).send({ error: 'Id is required' })
    }
    const { platform, key, channelId, isValid } = req.body

    if (!platform && !key && !channelId && isValid == undefined) {
      return res.status(400).send({ error: 'Missing required fields' })
    }

    const updatedStream = {}
    if(platform != undefined && typeof platform === "string") updatedStream.platform = platform.toUpperCase()
    if(key != undefined) updatedStream.key = key
    if(channelId != undefined) updatedStream.channelId = channelId
    if(isValid != undefined) updatedStream.isValid = isValid

    await db.collection('streams').doc(streamId).update(updatedStream)

    res.send({ message: 'Stream updated successfully' })
  } catch (error) {
    console.error('Error updating stream:', error)
    res.status(500).send({ error: 'Failed to update stream' })
  }
})

exports.setLive = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(400).send({ error: 'Bad Request' });
    }
    const game = req.params[0]
    const { url } = req.body

    if (!game || !url) {
      return res.status(400).send({ error: 'Missing required fields' })
    }

    const newLive = {
      game,
      url,
    }

    const isExist = await checkCollectionExists('lives')
    if (!isExist) {
      await createCollection('lives')
    }

    const querySnapshot = await db.collection('lives').where('game', '==', game).get()
    if (querySnapshot.empty) {
      const docRef = await db.collection('lives').doc(game).set(newLive)
      res.send({ message: 'Live created successfully', id: docRef.id })
    } else {
      const docId = querySnapshot.docs[0].id
      await db.collection('lives').doc(docId).update(newLive)
      res.send({ message: 'Live updated successfully', id: docId })
    }
  } catch (error) {
    console.error('Error creating live:', error)
    res.status(500).send({ error: 'Failed to set live' })
  }
})

// 這支API不適合讓彩票前端直接使用(會打得太頻繁)
exports.getLives = onRequest(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(400).send({ error: 'Bad Request' });
    }
    const { game } = req.query

    let query = db.collection('lives')

    if (game) {
      query = query.where('game', '==', game)
    }

    const snapshot = await query.get()
    const lives = []

    snapshot.forEach((doc) => {
      const liveData = doc.data()
      const liveWithId = {
        id: doc.id,
        ...liveData,
      }
      lives.push(liveWithId)
    })

    res.send(lives)
  } catch (error) {
    console.error('Error getting streams:', error)
    res.status(500).send({ error: 'Failed to get streams' })
  }
})
