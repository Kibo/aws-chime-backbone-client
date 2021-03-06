<template>

</template>

<script>
import {MeetingSessionStatusCode} from 'amazon-chime-sdk-js';
import Utils from "../tools/Utils.js"

export default {
	emits: ['metricsDidReceive', 'videoTileDidUpdate', 'videoTileWasRemoved'],
	props: ['meetingSession', 'alerts'],
	data() {
		return {
			logger:this.$store.state.logger,
			role: this.$store.getters.role,

			//@see AudioVideoObserver.videoAvailabilityDidChange
			//@see AudioVideoObserver.videoSendDidBecomeUnavailable
			isVideoAvailable:true
		}
	},
	mounted() {
		this.meetingSession.audioVideo.addObserver( this.getAudioVideoObserver() );
	},
	beforeUnmount(){
		this.meetingSession.audioVideo.removeObserver( this.getAudioVideoObserver() )
	},
	methods: {

		/*
		 * Audio Video observer
		 *
		 * @see https://aws.github.io/amazon-chime-sdk-js/interfaces/audiovideoobserver.html
		 */
		getAudioVideoObserver(){
			let audioVideoObserver = {

				/*
				 * Called when the session has started.
				 */
				audioVideoDidStart: () => {
					this.logger.info('audioVideoObserver: audioVideoDidStart()')
				},

				/*
				 * Called when the session is connecting or reconnecting.
				 */
				audioVideoDidStartConnecting: reconnecting => {
				    if (reconnecting) {
				      // e.g. the WiFi connection is dropped.
				      this.logger.warn('audioVideoObserver: audioVideoDidStartConnecting()')
				    }
				},

				/*
				 * Called when the session has stopped from a started state with the reason provided in the status.
				 *
				 * @param sessionStatus - https://aws.github.io/amazon-chime-sdk-js/classes/meetingsessionstatus.html
				 */
				audioVideoDidStop: sessionStatus => {
					const sessionStatusCode = sessionStatus.statusCode();
					if (sessionStatusCode === MeetingSessionStatusCode.Left) {
						/*
							- You called meetingSession.audioVideo.stop().
							- When closing a browser window or page, Chime SDK attempts to leave the session.
						*/
						this.logger.info('You left the session')
					} else {
						this.logger.info('Stopped with a session status code: ', sessionStatusCode)
					}
				},

				/*
				 * Called when connection has changed to good from poor.
				 */
				connectionDidBecomeGood: () =>{
					this.logger.info('audioVideoObserver: connectionDidBecomeGood()')
				},

				/*
				 * Called when the connection has been poor for a while if meeting only uses audio.
				 */
				connectionDidBecomePoor: () =>{
					this.logger.warn('audioVideoObserver: connectionDidBecomePoor()')
					this.alerts.push({text:"Your connection is poor.", type:"alert-danger"})
				},

				/*
				 * Called when the connection has been poor if meeting uses video so that the observer can prompt the user about turning off video.
				 */
				connectionDidSuggestStopVideo: () =>{
					this.logger.warn('audioVideoObserver: connectionDidSuggestStopVideo()')
					this.alerts.push({text:"It is recommended to turn off the video.", type:"alert-danger"})
				},

				/*
				 * Called when connection health has changed.
				 *
				 * @param connectionHealthData
				 * @see https://aws.github.io/amazon-chime-sdk-js/classes/connectionhealthdata.html
				 */
				connectionHealthDidChange: connectionHealthData =>{
					this.logger.info('audioVideoObserver: connectionHealthDidChange()')
				},

				/*
				 * Called when simulcast is enabled and simulcast uplink encoding layers get changed.
				 *
				 * @param simulcastLayers
				 * @see https://aws.github.io/amazon-chime-sdk-js/enums/simulcastlayers.html
				 */
				encodingSimulcastLayersDidChange: simulcastLayers =>{
					this.logger.info('audioVideoObserver: encodingSimulcastLayersDidChange()')
				},

				/*
				 * Called when total downlink video bandwidth estimation is less than required video bitrates.
				 *
				 * @param {Number} estimatedBandwidth
				 * @param {Number} requiredBandwidth
				 */
				estimatedDownlinkBandwidthLessThanRequired: ( estimatedBandwidth, requiredBandwidth ) =>{
					this.logger.warn('audioVideoObserver: estimatedDownlinkBandwidthLessThanRequired()')
				},

				/*
				 * Called when specific events occur during the meeting and includes attributes of the event.
				 * This can be used to create analytics around meeting metric.
				 *
				 * @param name - https://aws.github.io/amazon-chime-sdk-js/globals.html#eventname
				 * @param attributes - https://aws.github.io/amazon-chime-sdk-js/interfaces/eventattributes.html
				 *
				 */
				eventDidReceive: (name, attributes) =>{
					this.logger.info(`eventDidReceive: ${name}`)
				},

				/*
				 * Called when the media stats are available.
				 *
				 * @param clientMetricReport
				 * @see https://aws.github.io/amazon-chime-sdk-js/interfaces/clientmetricreport.html
				 */
				metricsDidReceive: clientMetricReport =>{
					const metricReport = clientMetricReport.getObservableMetrics()
					let uplink=0;
					let downlink=0;

					if (typeof metricReport.availableSendBandwidth === 'number'
						&& !isNaN(metricReport.availableSendBandwidth)){
							uplink = Math.floor(metricReport.availableSendBandwidth / 1000)

				    }else if(typeof metricReport.availableOutgoingBitrate === 'number'
				    	&& !isNaN(metricReport.availableOutgoingBitrate)){
				    		uplink = Math.floor(metricReport.availableOutgoingBitrate / 1000)
				    }

				    if (typeof metricReport.availableReceiveBandwidth === 'number'
				    	&& !isNaN(metricReport.availableReceiveBandwidth)){
								downlink = Math.floor(metricReport.availableReceiveBandwidth / 1000)

				    }else if(typeof metricReport.availableIncomingBitrate === 'number'
				    	&& !isNaN(metricReport.availableIncomingBitrate)){
				    		downlink = Math.floor(metricReport.availableIncomingBitrate / 1000)
				    }


				    this.$emit('metricsDidReceive', {up:uplink, down:downlink})
				},

				/*
				 * Called when the remote video sending sources get changed.
				 */
				remoteVideoSourcesDidChange: videoSources => {
					this.logger.info('audioVideoObserver: remoteVideoSourcesDidChange()')
				},

				/*
				 * Called when video availability has changed.
				 * This information can be used to decide whether to switch the connection type to video and whether or
				 * not to offer the option to start the local video tile.
				 *
				 * @param availability - https://aws.github.io/amazon-chime-sdk-js/classes/meetingsessionvideoavailability.html
				 */
				videoAvailabilityDidChange: videoAvailability =>{
					if (videoAvailability.canStartLocalVideo) {
						this.isVideoAvailable = true
					}
				},

				/*
				 *	Chime SDK allows a total of 16 simultaneous videos per meeting.
				 *	If you try to share more video, this method will be called.
				 *	This can be used to trigger a message to the user about the situation.
				 *
				 * @see 'videoAvailabilityDidChange' to find out when it becomes available.
				 */
				videoSendDidBecomeUnavailable: () =>{
					this.isVideoAvailable = false
				},

				/*
				 * Called when one or more remote video streams do not meet expected average bitrate.
				 */
				videoNotReceivingEnoughData: receivingDataMap => {
					this.logger.warn('audioVideoObserver: videoNotReceivingEnoughData()')
				},

				/*
				 * Called when available video receiving bandwidth changed to trigger video subscription if needed.
				 */
				videoReceiveBandwidthDidChange: ( newBandwidthKbps, oldBandwidthKbps ) => {
					this.logger.info(`Receiving bandwidth changed from ${oldBandwidthKbps} to ${newBandwidthKbps}`)
				},

				/*
				 * Called when available video sending bandwidth changed.
				 */
				videoSendBandwidthDidChange: ( newBandwidthKbps, oldBandwidthKbps ) => {
					this.logger.info(`Sending bandwidth changed from ${oldBandwidthKbps} to ${newBandwidthKbps}`)
				},

				/*
				 * Called when metric of video outbound traffic is received.
				 */
				videoSendHealthDidChange: (bitrateKbps, packetsPerSecond) =>{
					this.logger.info(`Sending bitrate in kilobits per second: ${bitrateKbps} and ${packetsPerSecond}`)
				},

				/*
				* Called whenever a tile has been created or updated.
				*
				* States:
				* @see https://aws.github.io/amazon-chime-sdk-js/classes/videotilestate.html
				*/
				videoTileDidUpdate: tileState => {
					// Ignore a tile without attendee ID
				 	if (!tileState.boundAttendeeId) {
						return;
				 	}

					this.$emit('videoTileDidUpdate', tileState)
					return
				},

				/*
				* Called whenever a tile has been removed.
				*/
				videoTileWasRemoved: tileId => {
					this.$emit('videoTileWasRemoved', tileId)
					return
			  }
			}

			/*
			 * Remove unwanted callbacks from observer
			 */
			Utils.getSetting('AUDIO_VIDEO_OBSERVER_CALLBACKS_FOR_REMOVE', this.role).forEach(function( functionName ){

				if( audioVideoObserver[functionName] && typeof audioVideoObserver[functionName] === 'function' ){
					delete audioVideoObserver[functionName]
					this.logger.info('Callback ' + functionName + ' has been remove.')
				}
			})

			return audioVideoObserver;
		}
	}
}
</script>
