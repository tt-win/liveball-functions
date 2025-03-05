const getPushUrl = (streamConfig) => {
  const { pushUrl, key } = streamConfig
  if(!pushUrl|| !key) return null

  return `${pushUrl}/${key}`
}

const getAllUrl = (streamConfig, isNeedPush) => {
  const { channelId } = streamConfig

  return {
    isPlayable: {
      rtmp: false,
      hls: false,
      flv: false,
      webrtc: false,
      web: true,
    },
    web: `https://www.twitch.tv/${channelId}`,

    push: isNeedPush ? getPushUrl(streamConfig) : undefined,
  }
}

module.exports = {
  getPushUrl, getAllUrl
}
