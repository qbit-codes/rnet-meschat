<template>
  <div class="w-full h-full bg-black relative" ref="parentRef">
    <!-- Video Display -->
    <div v-if="isReady && videoRef" class="relative overflow-hidden">
      <VideoAscii
          :video-streaming="videoRef"
          :parent-ref="parentRef"
          :art-type="useColor ? 'ASCII' : 'ASCII_COLOR_BG_IMAGE'"
          :chars-per-line="75"
          :chars-per-column="60"
          :font-color="'white'"
          :background-color="'black'"
          :flip-y="false"
          :pre-tag-ref="preTagRef"
          :on-frame-capture="isRecording ? handleFrameCapture : undefined"
      />
    </div>
    <div v-else>
      <p class="text-white text-center">
        {{ isReady ? 'Video stream not available.' : 'Click Initialize to start camera' }}
      </p>
    </div>

    <div class="bg-black text-center mt-5">
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
          {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
        </button>
      </div>

      <button
          v-else
          class="px-4 py-2 bg-white text-black rounded-md hover:bg-gray-700
         transition-colors duration-200 focus:outline-none focus:ring-2
         focus:ring-blue-500 focus:ring-offset-2"
          @click="initializeMediaDevices"
      >
        Initialize Camera
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
      videoRef: undefined,
      parentRef: null,
      mediaRecorderRef: undefined,
      audioContextRef: undefined,
      audioWorkletNode: undefined,
      streamRef: undefined,
      frameInterval: 1000 / 60, // 30 fps
      fps: 0
    }
  },

  methods: {
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

    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        this.$emit('copied')
      } catch (err) {
        console.error('Failed to copy text:', err)
      }
    }
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
  }
}
</script>

<style scoped>
.camera-panel {
  @apply w-full h-full bg-black flex flex-col;
}

.controls {
  @apply flex justify-center gap-2 p-4;
}

.control-btn {
  @apply px-4 py-2 bg-white text-white rounded-md hover:bg-gray-700
  transition-colors duration-200 focus:outline-none focus:ring-2
  focus:ring-blue-500 focus:ring-offset-2;
}

.control-btn.recording {
  @apply bg-red-600 hover:bg-red-700;
}

.video-container {
  @apply flex-1 relative;
}

.waiting-message {
  @apply text-white text-xl text-center absolute inset-0
  flex items-center justify-center;
}
</style>
