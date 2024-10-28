<template>
  <div class="w-full h-full bg-black relative overflow-hidden flex flex-col justify-between">
    <!-- Video Display -->
    <div ref="parentRef" class="w-full h-full overflow-hidden">
      <div v-if="isReady && videoRef">
        <VideoAscii
          :video-streaming="videoRef"
          :parent-ref="$refs.parentRef"
          :art-type="useColor ? 'ASCII' : 'ASCII_COLOR_BG_IMAGE'"
          :chars-per-line="charsPerLine"
          :chars-per-column="charsPerColumn"
          :font-color="'white'"
          :background-color="'black'"
          :flip-y="true"
          :pre-tag-ref="preTagRef"
          :on-frame-capture="isRecording ? handleFrameCapture : undefined"
        />
      </div>
      <div v-else>
        <p class="text-white text-center">
          {{ isReady ? 'Video stream not available.' : 'Click Initialize to start camera' }}
        </p>
      </div>
    </div>

    <div class="bg-black text-center mt-5 z-50">
      <div
          v-if="isReady"
          class="text-white">
        <span v-if="isRecording">
          <span>Recording at {{ fps.toFixed(2) }} FPS</span>
        </span>
        <button
            class="px-4 py-2 bg-white text-black rounded-md hover:bg-gray-700
         transition-colors duration-200 focus:outline-none focus:ring-2
         focus:ring-blue-500 focus:ring-offset-2"
            :class="{ 'bg-red-600 hover:bg-red-700': isRecording }"
            @click="toggleRecording"
        >
          <svg v-if="isRecording" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </button>
      </div>

      <button
          v-else
          class="px-4 py-2 bg-white text-black rounded-md hover:bg-gray-700
         transition-colors duration-200 focus:outline-none focus:ring-2
         focus:ring-blue-500 focus:ring-offset-2"
          @click="initializeMediaDevices"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
        </svg>
      </button>
    </div>

  </div>
</template>

<script>
import {MediaRecorder, register} from "extendable-media-recorder";
import {connect} from "extendable-media-recorder-wav-encoder";
import {encodeWav} from "../../js/WavEncoder";
import {saveCompressedFrames} from "../../js/Compression";
import VideoAscii from './VideoAscii.vue'

export default {
  name: 'CameraAsciiPanel',

  components: {
    VideoAscii
  },

  data() {
    return {
      useColor: true,
      frames: [],
      audioChunks: [],
      isReady: false,
      isRecording: false,
      lastCaptureTime: 0,
      preTagRef: null,
      videoRef: null,
      parentRef: null,
      mediaRecorderRef: null,
      audioContextRef: null,
      audioWorkletNode: null,
      streamRef: null,
      fps: 0,
      charsPerLine: 100,
      charsPerColumn: 0,
    }
  },
  
  methods: {
    calculateCharsPerColumn(video) {
      return Math.round(this.charsPerLine * (video.videoHeight / video.videoWidth));
    },

    async initializeMediaDevices() {
      try {
        await register(await connect())
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        this.streamRef = stream

        if (!this.videoRef) {
          const videoElement = document.createElement('video')
          videoElement.playsInline = true
          videoElement.muted = true
          this.videoRef = videoElement
        }

        // Set up video stream
        this.videoRef.srcObject = stream
        await this.videoRef.play()
        this.charsPerColumn = this.calculateCharsPerColumn(this.videoRef);
 
        // Initialize audio context and worklet
        this.audioContextRef = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 8000
        })

        await this.audioContextRef.audioWorklet.addModule('assets/js/codec2-emscripten/processor.js')
        this.audioWorkletNode = new AudioWorkletNode(this.audioContextRef, 'audio-processor')

        // Connect audio nodes
        const sourceNode = this.audioContextRef.createMediaStreamSource(stream)
        sourceNode.connect(this.audioWorkletNode)

        this.isReady = true
      } catch (err) {
        console.error('Error initializing camera:', err)
      }
    },

    startRecording() {
      if (!this.streamRef || this.isRecording) return

      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(this.streamRef)
      this.mediaRecorderRef = mediaRecorder

      // Reset recording arrays
      this.audioChunks = []
      this.frames = []

      // Set up audio processing
      if (this.audioWorkletNode) {
        this.audioWorkletNode.port.onmessage = async event => {
          this.audioChunks.push(event.data)
        }
      }

      try {
        mediaRecorder.start(1000)
        this.isRecording = true
        this.lastCaptureTime = performance.now()
      } catch (error) {
        console.error('Error starting MediaRecorder:', error)
        this.isRecording = false
      }
    },

    async stopRecording() {
      if (!this.mediaRecorderRef || !this.isRecording) return

      try {
        this.mediaRecorderRef.stop()
        this.isRecording = false

        if (this.streamRef) {
          this.streamRef.getTracks().forEach(track => track.stop())
        }

        if (this.audioWorkletNode) {
          this.audioWorkletNode.disconnect()
        }

        if (this.audioContextRef && this.audioContextRef.state !== 'closed') {
          this.audioContextRef.close()
        }

        // Process audio data
        let fullAudioChunks = []
        this.audioChunks.forEach(chunk => {
          fullAudioChunks = [...fullAudioChunks, ...chunk]
        })

        // Encode audio
        const audioBuffer = WavEncoder.encodeWAV(fullAudioChunks, 8000)
        const rawBuffer = await Codec2Lib.audioFileToRaw(audioBuffer, 'audio.wav')
        const encoded = await Codec2Lib.runEncode('3200', rawBuffer)
        const audioBlob = new Blob([encoded])

        // Save data
        const compressedFrames = saveCompressedFrames(this.frames)

        // Emit recording data to parent
        this.$emit('recording-complete', {
          frames: compressedFrames,
          audio: audioBlob
        })
      } catch (error) {
        console.error('Error stopping recording:', error)
      }
    },

    toggleRecording() {
      if (this.isRecording) {
        this.stopRecording()
      } else {
        this.startRecording()
      }
    },

    handleFrameCapture(frame) {
      if (this.isRecording) {
        // Limit frame capture to 30 fps
        const now = performance.now()
        const delta = (now - this.lastCaptureTime) / 1000;
        if (delta >= 1 / 30) {
          this.frames.push(frame)
          this.lastCaptureTime = now
          this.fps = 1 / delta
        }
      }
    },
  },

  beforeUnmount() {
    if (this.streamRef) {
      this.streamRef.getTracks().forEach(track => track.stop())
    }

    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect()
    }

    if (this.audioContextRef && this.audioContextRef.state !== 'closed') {
      this.audioContextRef.close()
    }

    if (this.mediaRecorderRef) {
      this.mediaRecorderRef.disconnect();
    }

    if (this.videoRef) {
      this.videoRef = null;
    }
  }
}
</script>

<style scoped>

</style>
