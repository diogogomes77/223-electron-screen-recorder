const AWS = require('aws-sdk');

const credentials = {
  accessKeyId: getEnv('ACCESS_KEY_ID'),
  secretAccessKey: getEnv('SECRET_ACCESS_KEY'),
};
const bucket = getEnv('BUCKET');
const region = getEnv('REGION');

const eyeson = require('./eyeson-lib').default;

const eyesonToken = getEnv('EYESON_TOKEN');

const clientId = getEnv('CLIENT_ID');

const console = require('console');
const {desktopCapturer, remote} = require('electron');

const {writeFile} = require('fs');
const {setTimeout} = require('globalthis/implementation');

const {dialog, Menu} = remote;

let stream;

// Global state
let mediaRecorder; // MediaRecorder instance to capture footage
const recordedChunks = [];

// Buttons
const videoElement = document.querySelector('video');

const startBtn = document.getElementById('startBtn');

const preSignedWriteUrl = getS3WriteUrl('test.webm');

startBtn.onclick = (e) => {
  mediaRecorder.start();
  startBtn.classList.add('is-danger');
  startBtn.innerText = 'Recording';

  // Send stream to Eyeson
  const webhookUrl = new URL(getEnv('WEB_HOOK_URL'));

  eyeson
    .startRecording(
      stream,
      clientId, // string jwtExtractor
      preSignedWriteUrl, // string
      webhookUrl, // callback
    )
    .then((externalRecordingId) => {
      console.log('externalRecordingId: ', externalRecordingId);
    });
};

const stopBtn = document.getElementById('stopBtn');

stopBtn.onclick = (e) => {
  mediaRecorder.stop();
  startBtn.classList.remove('is-danger');
  startBtn.innerText = 'Start';

  eyeson.stopRecording();
  const urlSpan = document.getElementById('urlSpan');
  urlSpan.innerHTML = getS3ReadUrl('test.webm');
};

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

// Connect to Eyeson

eyeson.connect(eyesonToken);

// Get the available video sources
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.name,
        click: () => selectSource(source),
      };
    }),
  );

  videoOptionsMenu.popup();
}

// Change the videoSource window to record
async function selectSource(source) {
  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
        maxFrameRate: 5,
        minFrameRate: 1,
      },
    },
  };

  // Create a Stream
  stream = await navigator.mediaDevices.getUserMedia(constraints);

  // Preview the source in a video element
  videoElement.srcObject = stream;
  videoElement.play();

  // Create the Media Recorder
  const options = {mimeType: 'video/webm; codecs=vp8'};
  mediaRecorder = new MediaRecorder(stream, options);

  // Register Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;

  // Updates the UI
}

// Captures all recorded chunks
function handleDataAvailable(e) {
  console.log('video data available');
  recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: 'video/webm; codecs=vp9',
  });

  const buffer = Buffer.from(await blob.arrayBuffer());

  const {filePath} = await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defaultPath: `vid-${Date.now()}.webm`,
  });

  if (filePath) {
    writeFile(filePath, buffer, () => console.log('video saved successfully!'));
  }
}

function getS3WriteUrl(fileName) {
  if (!credentials.accessKeyId || !credentials.secretAccessKey)
    throw 'ERROR!!!!\nPlease setup accesskey and scret at src/s3.js';

  AWS.config.update(credentials);
  AWS.config.update({region});

  const s3 = new AWS.S3();
  const myKey = fileName;
  const signedUrlExpireSeconds = 60 * 60 * 8;

  const url = s3.getSignedUrl('putObject', {
    Bucket: bucket,
    Key: myKey,
    Expires: signedUrlExpireSeconds,
    ContentType: 'video/webm',
  });

  console.log('Url generated: ', url);

  return url;
}

function getS3ReadUrl(fileName) {
  if (!credentials.accessKeyId || !credentials.secretAccessKey)
    throw 'ERROR!!!!\nPlease setup accesskey and scret at src/s3.js';

  AWS.config.update(credentials);
  AWS.config.update({region});

  const s3 = new AWS.S3();
  const myKey = fileName;
  const signedUrlExpireSeconds = 60 * 60 * 8;

  const url = s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: myKey,
    Expires: signedUrlExpireSeconds,
    // ContentType: 'video/webm',
  });

  console.log('Url generated: ', url);

  return url;
}

function getEnv(env) {
  return process.env[env];
}
