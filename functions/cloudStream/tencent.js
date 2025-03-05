const { getEncryptedKeyValue } = require('./libs')

const getPushParams = (streamConfig) => {
  const { key, channelId = 'PK10' } = streamConfig
  if (!key) return channelId

  const { encrypted, hexTime, secret, time } = getEncryptedKeyValue(channelId, key, 'tencent')

  return `${channelId}?${secret}=${encrypted}&${time}=${hexTime}`
}

const getPullParams = (streamConfig, format = 'rtmp') => {
  const { key, channelId } = streamConfig
  const { encrypted, hexTime, secret, time } = getEncryptedKeyValue(channelId, key, 'tencent')

  switch (format) {
  case 'rtmp':
  case 'webrtc':
    return key ? `${channelId}?${secret}=${encrypted}&${time}=${hexTime}` : `${channelId}`
  case 'flv':
    return key ? `${channelId}.flv?${secret}=${encrypted}&${time}=${hexTime}` : `${channelId}.flv`
  case 'hls':
    return key ? `${channelId}.m3u8?${secret}=${encrypted}&${time}=${hexTime}` : `${channelId}.m3u8`
  }
}

const getPushUrl = (streamConfig) => {
  const { pushUrl } = streamConfig

  return pushUrl ? `${pushUrl}/${getPushParams(streamConfig)}` : null
}

const getAllUrl = (streamConfig, isNeedPush) => {
  const { ssl, liveUrl } = streamConfig

  return {
    isPlayable: {
      rtmp: true,
      hls: true,
      flv: true,
      webrtc: true,
      web: false,
    },
    rtmp: `rtmp://${liveUrl}/${getPullParams(streamConfig, 'rtmp')}`,
    hls: `${ssl ? 'https' : 'http'}://${liveUrl}/${getPullParams(streamConfig, 'hls')}`,
    flv: `${ssl ? 'https' : 'http'}://${liveUrl}/${getPullParams(streamConfig, 'flv')}`,
    webrtc: `webrtc://${liveUrl}/${getPullParams(streamConfig, 'webrtc')}`,

    push: isNeedPush ? getPushUrl(streamConfig) : undefined,
  }
}

module.exports = {
  getPushUrl, getAllUrl
}
