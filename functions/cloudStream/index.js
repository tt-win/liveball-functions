const tencent = require('./tencent')
const youtube = require( './youtube')
const twitch = require('./twitch')

const { getPushUrl: getTencentPushUrl, getAllUrl: getTencentAllUrl } = tencent
const { getPushUrl: getYoutubePushUrl, getAllUrl: getYoutubeAllUrl } = youtube
const { getPushUrl: getTwitchPushUrl, getAllUrl: getTwitchAllUrl } = twitch

const Platform = {
  youtube: 'YOUTUBE',
  twitch: 'TWITCH',
  tencent: 'TENCENT',
}

const getUserChannel = (streamConfig, isNeedPush = false) => {
  if (streamConfig) {
    const { platform, liveUrl, pushUrl, ssl, channelId } = streamConfig

    switch (platform) {
      case Platform.tencent:
        return getTencentAllUrl(streamConfig, isNeedPush)
      case Platform.youtube:
        return getYoutubeAllUrl(streamConfig, isNeedPush)
      case Platform.twitch:
        return getTwitchAllUrl(streamConfig, isNeedPush)
      default:
        return {
          rtmp: `rtmp://${liveUrl}/${channelId}`,
          hls: `${ssl ? 'https' : 'http'}://${liveUrl}/${channelId}/playlist.m3u8`,

          push: isNeedPush ? `rtmp://${pushUrl}/${channelId}` : undefined,
        }
    }
  }
}

const getPushUrl = (streamConfig) => {
  const { platform } = streamConfig

  switch (platform) {
    case Platform.tencent:
      return getTencentPushUrl(streamConfig)
    case Platform.youtube:
      return getYoutubePushUrl(streamConfig)
    case Platform.twitch:
      return getTwitchPushUrl(streamConfig)
    default:
      return null
  }
}

module.exports = {
  Platform, getUserChannel, getPushUrl,
}
