# eyeson Streamrecorder Package

The streamrecorder package provides a minimal interface to start and stop
recordings, as well as to switch streams during an active recording.

The client application requires to have an auth token - received from the
streamrecorder service `/auth/` endpoint - and a client identifier.

## Setup

Add the local package and in the project e.g. as streamrecorder-package and
locally configure the package in packages.json file.

```json
{
  "name": "streamrecorder-ui",
  ...
  "dependencies": {
    ...
    "eyeson-streamrec": "./streamrecorder-package"
    ...
  },
  ...
}
```

## Usage

```javascript
eyeson.connect(token); // Auth Token gathered by the streamrec service.
eyeson
  .startRecording(stream, clientId, uploadUrl, webhookUrl)
  .then((recordingId) => {
    console.debug('recording started', recordingId);
  })
  .catch((err) => {
    // ...
  });
eyeson.stopRecording();
eyeson.switchStream(stream);
```
