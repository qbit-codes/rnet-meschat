<template>
  <div class="w-full h-full bg-black relative" data-testid="camera-ascii-test" ref="parentRef">
    <div v-if="currentFrame" class="relative">
      <VideoAsciiFromAscii
          :text="currentFrame"
          :parent-ref="parentRef"
          :art-type="useColor ? 'ASCII' : 'ASCII_COLOR_BG_IMAGE'"
          :chars-per-line="charsPerLine"
          :chars-per-column="charsPerColumn"
          font-color="white"
          background-color="black"
          :flip-y="false"
          :pre-tag-ref="preTagRef"
      />
    </div>
    <p v-else class="text-white text-center">
      There is no video found to play!
    </p>
    <div>
      <div class="flex w-full absolute bottom-0 text-center items-center justify-center z-50">
        <button @click="handlePlayPause">
          <svg v-if="isPlaying" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
        </button>
      </div>
      <audio id="audio-element" style="display: none"/>
    </div>

  </div>
</template>

<script>
import VideoAsciiFromAscii from './VideoAsciiFromAscii.vue';
import {binaryToUint8Array, blobToBase64, loadCompressedAudio, loadCompressedFrames} from '../../js/Compression';
import Utils from '../../js/Utils';

export default {
  name: 'TextAsciiPanel',
  components: {
    VideoAsciiFromAscii
  },
  props: {
    compressedFrames: {
      default: ''
    },
    compressedAudio: {
      default: ''
    }
  },
  data() {
    return {
      charsPerLine: 75,
      charsPerColumn: 60,
      useColor: true,
      frames: [],
      currentFrameIndex: 0,
      isPlaying: false,
      fps: 25,
      audio: undefined,
      audioDuration: undefined,
      decoded: undefined,
      wavAudio: undefined,
      preTagRef: null,
      parentRef: null,
      animationInterval: null
    }
  },
  computed: {
    currentFrame() {
      return this.frames[this.currentFrameIndex] || '';
    }
  },
  methods: {
    calculateCharsPerColumn() {
      return Math.round(this.charsPerLine * (480 / 640));
    },
    base64ToArrayBuffer: function (base64) {
      return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    },

    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        console.log('Text copied to clipboard');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    },
    handlePlayPause() {
      this.isPlaying = !this.isPlaying;
    },
    setupAudioPlayback() {
      if (this.isPlaying && this.audio && this.audioDuration) {
        const frameTime = this.audioDuration / this.frames.length;
        const targetTime = frameTime * this.currentFrameIndex;

        if (isFinite(targetTime) && targetTime >= 0 && targetTime <= this.audioDuration) {
          this.audio.currentTime = targetTime;
        }

        this.audio.play().catch(e => {
          console.error('Error playing audio:', e);
        });
      } else if (!this.isPlaying && this.audio) {
        this.audio.pause();
      }
    },
    startAnimation() {
      if (this.isPlaying && this.frames.length > 0) {
        this.animationInterval = setInterval(() => {
          this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;

          if (this.audio && this.audioDuration) {
            const frameTime = this.audioDuration / this.frames.length;
            const targetTime = frameTime * this.currentFrameIndex;

            if (isFinite(targetTime) && targetTime >= 0 && targetTime <= this.audioDuration) {
              this.audio.currentTime = targetTime;
            }
          }
        }, 1000 / this.fps);
      }
    },
    stopAnimation() {
      if (this.animationInterval) {
        clearInterval(this.animationInterval);
      }
    },
    async loadInitialData() {
      console.log('Loading initial data');
      const loadedFrames = this.compressedFrames;
      const loadedAudio = this.compressedAudio;
      if (loadedFrames) {
        this.frames = loadCompressedFrames(new Uint8Array(loadedFrames));
      }

      try {
        const decoded = await Codec2Lib.runDecode('3200', new Uint8Array(loadedAudio));
        const wavAudio = await Codec2Lib.rawToWav(decoded);

        const blob = new Blob([wavAudio], {type: 'audio/wav'});
        const audioElement = document.getElementById('audio-element');
        audioElement.src = URL.createObjectURL(blob);
        audioElement.onloadedmetadata = () => {
          this.audioDuration = audioElement.duration;
          this.audio = audioElement;
        };

        this.startAnimation();
      } catch (error) {
        console.error('Error processing audio:', error);
      }
    }
  },
  watch: {
    isPlaying: {
      handler(newVal) {
        this.setupAudioPlayback();
        if (newVal) {
          this.startAnimation();
        } else {
          this.stopAnimation();
        }
      }
    },
    currentFrameIndex: {
      handler(newVal) {
        if (this.isPlaying && newVal === this.frames.length - 1 && this.audio) {
          this.isPlaying = false;
          this.currentFrameIndex = 0;
          this.audio.load();
        }
      }
    }
  },
  mounted() {
    this.loadInitialData();
  },
  beforeUnmount() {
    this.stopAnimation();
  }
}
</script>

