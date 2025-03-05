const { createHash } = require('crypto')
const moment = require('moment')

function md5(str) {
  const md5sum = createHash('md5')
  md5sum.update(str)

  return md5sum.digest('hex')
}

function timeToHex(time) {
  return Math.floor(time / 1000).toString(16).toUpperCase()
}

function md5Encrypt(streamName, key, type = 'tencent') {
  const time = moment().add(1, 'd').valueOf()
  const hexTime = timeToHex(time)
  const timeFloor = Math.floor(time / 1000)

  let encrypted = ''
  switch (type) {
    case 'wangsu':
      encrypted = md5(`${streamName}${key}${hexTime}`)
      break

    case 'aliyun':
      encrypted = md5(`${streamName}-${timeFloor}-0-0-${key}`)
      break

    case 'tencent':
    default:
      encrypted = md5(`${key}${streamName}${hexTime}`)
  }

  return { encrypted, hexTime, timeFloor }
}

function getCloudKeyName(type = 'tencent') {
  switch (type) {
    case 'wangsu':
      return { secret: 'wsSecret', time: 'wsTime' }

    case 'aliyun':
      return { secret: 'auth_key' }

    case 'tencent':
    default:
      return { secret: 'txSecret', time: 'txTime' }
  }
}

function getEncryptedKeyValue(streamName, key, type = 'tencent') {
  const { encrypted, hexTime, timeFloor } = md5Encrypt(streamName, key, type)
  const { secret, time } = getCloudKeyName(type)

  return { encrypted, hexTime, timeFloor, secret, time }
}

module.exports = {
  getEncryptedKeyValue,
  md5sum: md5
}
