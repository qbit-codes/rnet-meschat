/**
 * Error codes for codec operations
 */
export const CodecErrorCode = {
    INVALID_INPUT: 'INVALID_INPUT',
    ENCODE_FAILED: 'ENCODE_FAILED',
    DECODE_FAILED: 'DECODE_FAILED',
    FILE_READ_ERROR: 'FILE_READ_ERROR',
    INVALID_MODE: 'INVALID_MODE',
    CONVERSION_ERROR: 'CONVERSION_ERROR'
};

/**
 * Custom error class for codec operations
 */
export class CodecError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'CodecError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Available codec modes
 */
export const CODEC_MODES = [
    '3200',
    '2400',
    '1600',
    '1400',
    '1300',
    '1200',
    '700C',
    '450',
    '450PWB'
];

/**
 * Configuration for different codec modes
 */
export const CODEC_MODES_CONFIG = {
    '3200': { bitrate: 3200, compression: 'low' },
    '2400': { bitrate: 2400, compression: 'low' },
    '1600': { bitrate: 1600, compression: 'medium' },
    '1400': { bitrate: 1400, compression: 'medium' },
    '1300': { bitrate: 1300, compression: 'medium' },
    '1200': { bitrate: 1200, compression: 'high' },
    '700C': { bitrate: 700, compression: 'high' },
    '450': { bitrate: 450, compression: 'very-high' },
    '450PWB': { bitrate: 450, compression: 'very-high' }
};

/**
 * Audio configuration presets
 */
export const AUDIO_CONFIGS = {
    default: {
        sampleRate: 8000,
        channels: 1,
        bitDepth: 16,
        endian: 'little',
        encoding: 'signed-integer'
    },
    highQuality: {
        sampleRate: 16000,
        channels: 2,
        bitDepth: 24,
        endian: 'little',
        encoding: 'signed-integer'
    }
};

/**
 * Processing states
 */
export const PROCESSING_STATES = {
    IDLE: 'idle',
    PROCESSING: 'processing',
    COMPLETE: 'complete',
    ERROR: 'error'
};

/**
 * Utility functions for codec operations
 */
export const codecUtils = {
    isValidMode: (mode) => CODEC_MODES.includes(mode),
    getModeConfig: (mode) => CODEC_MODES_CONFIG[mode],
    getDefaultAudioConfig: () => ({ ...AUDIO_CONFIGS.default }),
    createError: (code, message, details) => new CodecError(message, code, details)
};
