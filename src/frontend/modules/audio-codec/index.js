/**
 * Converts hex string to ArrayBuffer
 */
export const hexToArrayBuffer = (hex) => {
    const matches = hex.match(/[\da-f]{2}/gi);
    return new Uint8Array(matches ? matches.map(h => parseInt(h, 16)) : []).buffer;
};

/**
 * Converts ArrayBuffer to hex string
 */
export const arrayBufferToHex = (buffer) => {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Converts ArrayBuffer to base64 string
 */
export const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return window.btoa(binary);
};

/**
 * Converts base64 string to ArrayBuffer
 */
export const base64ToArrayBuffer = (base64) => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * Converts base64 string to text
 */
export const base64ToString = (base64) => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
};

/**
 * Runs the decoder on provided data
 */
export const runDecode = async (mode, data) => new Promise((resolve, reject) => {
    const module = {
        arguments: [mode, 'input.bit', 'output.raw'],
        preRun() {
            module.FS.writeFile('input.bit', new Uint8Array(data));
        },
        postRun() {
            const buffer = module.FS.readFile('output.raw', {
                encoding: 'binary'
            });
            resolve(buffer.buffer);
        },
        FS: {} // Will be populated by createC2Dec
    };

    window.createC2Dec(module).catch(error => {
        reject(new CodecError(
            'Decoder initialization failed',
            CodecErrorCode.DECODE_FAILED,
            error
        ));
    });
});

/**
 * Runs the encoder on provided data
 */
export const runEncode = async (mode, data) => new Promise((resolve, reject) => {
    const module = {
        arguments: [mode, 'input.raw', 'output.bit'],
        preRun() {
            module.FS.writeFile('input.raw', new Uint8Array(data));
        },
        postRun() {
            const buffer = module.FS.readFile('output.bit', {
                encoding: 'binary'
            });
            resolve(buffer);
        },
        FS: {} // Will be populated by createC2Enc
    };

    window.createC2Enc(module).catch(error => {
        reject(new CodecError(
            'Encoder initialization failed',
            CodecErrorCode.ENCODE_FAILED,
            error
        ));
    });
});

/**
 * Converts raw audio data to WAV format
 */
export const rawToWav = async (buffer) => new Promise((resolve, reject) => {
    const module = {
        arguments: [
            '-r', '8000',
            '-L',
            '-e', 'signed-integer',
            '-b', '16',
            '-c', '1',
            'input.raw',
            'output.wav'
        ],
        preRun() {
            module.FS.writeFile('input.raw', new Uint8Array(buffer));
        },
        postRun() {
            const output = module.FS.readFile('output.wav', {
                encoding: 'binary'
            });
            resolve(output.buffer);
        },
        FS: {} // Will be populated by SOXModule
    };

    window.SOXModule(module).catch(error => {
        reject(new CodecError(
            'WAV conversion failed',
            CodecErrorCode.CONVERSION_ERROR,
            error
        ));
    });
});

/**
 * Converts audio file to raw format
 */
export const audioFileToRaw = async (buffer, filename) => new Promise((resolve, reject) => {
    const module = {
        arguments: [
            filename,
            '-r', '8000',
            '-L',
            '-e', 'signed-integer',
            '-b', '16',
            '-c', '1',
            'output.raw'
        ],
        preRun() {
            module.FS.writeFile(filename, new Uint8Array(buffer));
        },
        postRun() {
            const output = module.FS.readFile('output.raw', {
                encoding: 'binary'
            });
            resolve(output);
        },
        FS: {} // Will be populated by SOXModule
    };

    window.SOXModule(module).catch(error => {
        reject(new CodecError(
            'Raw conversion failed',
            CodecErrorCode.CONVERSION_ERROR,
            error
        ));
    });
});

/**
 * Reads a file as ArrayBuffer
 */
export const readFileAsArrayBuffer = async (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
        } else {
            reject(new Error('Failed to read file as ArrayBuffer'));
        }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
});

export const DEFAULT_VALUE = 'dOmBUOGFQjDhwIHwchQBIHIJQWDhxUHwRintQFH78RDBYKkwwUnpUAQ/fZDFj32wTl69oH4jOXBExliwK4pgwC3OYNBActjAGL8o8JCS8QCxpIAQN+oAgIS73AB4kKAQowK9gBYbdUBwXoQQkFaEAFl/gRCmrRSg4bBAAOHHQRBGKekwRlClEMPagMA6TMDQK9T1QC2zrTBtroVA/KhBAAG5QNDN99gA2QggALnlcWAlWr1QLxl9MIQ++RAf9+AA3YWkAF8fAADI3ohgmoLAANyGAAB7IxigjFVc4IwN1JCMDdBAa63QEHhdjABfKRAAu0ncALteGABIdcAAq/kBIOH/gSCT9gIQcj9BkOHDgADhsMFw4fEC0PrXQSByGoFw7qnCQKu3gYDh/4MQ';