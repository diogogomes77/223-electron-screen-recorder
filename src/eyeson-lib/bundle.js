!(function (e, t) {
  'object' == typeof exports && 'object' == typeof module
    ? (module.exports = t())
    : 'function' == typeof define && define.amd
    ? define('eyeson', [], t)
    : 'object' == typeof exports
    ? (exports.eyeson = t())
    : (e.eyeson = t());
})(global, function () {
  return (function (e) {
    const t = {};

    function n(o) {
      if (t[o]) return t[o].exports;
      const i = (t[o] = { i: o, l: !1, exports: {} });

      return e[o].call(i.exports, i, i.exports, n), (i.l = !0), i.exports;
    }

    return (
      (n.m = e),
      (n.c = t),
      (n.d = function (e, t, o) {
        n.o(e, t) || Object.defineProperty(e, t, { enumerable: !0, get: o });
      }),
      (n.r = function (e) {
        'undefined' != typeof Symbol &&
          Symbol.toStringTag &&
          Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
          Object.defineProperty(e, '__esModule', { value: !0 });
      }),
      (n.t = function (e, t) {
        if ((1 & t && (e = n(e)), 8 & t)) return e;
        if (4 & t && 'object' == typeof e && e && e.__esModule) return e;
        const o = Object.create(null);

        if (
          (n.r(o),
          Object.defineProperty(o, 'default', { enumerable: !0, value: e }),
          2 & t && 'string' != typeof e)
        )
          for (const i in e)
            n.d(
              o,
              i,
              function (t) {
                return e[t];
              }.bind(null, i)
            );

        return o;
      }),
      (n.n = function (e) {
        const t =
          e && e.__esModule
            ? function () {
                return e.default;
              }
            : function () {
                return e;
              };

        return n.d(t, 'a', t), t;
      }),
      (n.o = function (e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }),
      (n.p = ''),
      n((n.s = 0))
    );
  })([
    function (e, t, n) {
      'use strict';
      n.r(t);
      const o = class {
        constructor(e, t) {
          (this._auth = t), (this._endpoint = e);
        }
        authenticate(e) {
          const t = { method: 'POST', body: JSON.stringify({ client_id: e }) };

          return this._request('/api/session', t);
        }
        get _headers() {
          return new Headers({ Authorization: 'Bearer ' + this._auth });
        }
        _request(e, t) {
          return (
            (t = Object.assign(t, { headers: this._headers })),
            fetch(this._endpoint + e, t).then((e) => e.json())
          );
        }
      };
      const i = { audio: !1, video: { width: 1280, height: 720 } };
      const s = class {
        connect({ localVideo: e, remoteVideo: t }) {
          console.debug('[RemoteConnection::connect]'),
            (this.localVideo = e),
            (this.remoteVideo = t),
            this.start();
        }
        set localStream(e) {
          this.localVideo && (this.localVideo.current.srcObject = e), (this._localStream = e);
        }
        get localStream() {
          return this._localStream;
        }
        disconnect() {
          console.debug('[RemoteConnection::disconnect]'), this.pc && this.pc.close();
        }
        async start(e) {
          console.debug('[RemoteConnection::start]');
          try {
            const t = await navigator.mediaDevices.getUserMedia(i);

            console.debug('[RemoteConnection::start]', 'stream started'),
              (this.localStream = t),
              this.startPeerConnection(e);
          } catch (e) {
            throw (console.warn('[RemoteConnection::start]', e), e);
          }
        }
        async startPeerConnection(e) {
          this.pc = new RTCPeerConnection(e);
          const [t] = this.localStream.getVideoTracks();

          this.pc.addTrack(t),
            (this.pc.ontrack = ({ streams: [e] }) => {
              this.remoteVideo && (this.remoteVideo.current.srcObject = e);
            }),
            (this.pc.onicecandidate = this.onicecandidate),
            (this.pc.onremovetrack = (e) => console.debug('[PC::onremovetrack]', e)),
            (this.pc.onnegotiationneeded = (e) => console.debug('[PC::onnegotiationneeded]', e)),
            (this.pc.oniceconnectionstatechange = (e) =>
              console.debug('[PC::oniceconnectionstatechange]', e)),
            (this.pc.onicegatheringstatechange = (e) =>
              console.debug('[PC::onicegatheringstatechange]', e)),
            (this.pc.onsignalingstatechange = (e) =>
              console.debug('[PC::onsignalingstatechange]', e)),
            console.debug('PC::before::createOffer', this.pc.signalingState);
          const n = await this.pc.createOffer();

          return await this.pc.setLocalDescription(new RTCSessionDescription(n)), n;
        }
        changeStream(e) {
          console.debug('PC::before::changeStream'), (this.localStream = e);
          const [t] = this.localStream.getVideoTracks();

          return this.pc
            .getSenders()
            .find((e) => 'video' === e.track.kind)
            .replaceTrack(t)
            .then(() => console.debug('PC::after::changeStream'));
        }
        async handleSdp(e) {
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(e));
          } catch (e) {
            console.warn('[RemoteConnection::setRemoteDescription]', e);
          }
        }
        handleCandidate(e) {
          this.pc.addIceCandidate(e);
        }
      };
      const r = class {
        constructor(e, t = 'https://streamrec.eyeson.com') {
          (this.token = e), (this.endpoint = t);
        }
        start({ stream: e, client_id: t, upload_url: n, webhook_url: o }) {
          return new Promise(async (i, r) => {
            try {
              const {
                recording_id: r,
                ice_credentials: c,
                ws_endpoint: a,
              } = await this._api().authenticate(t);

              (this.client = t), (this.recording = r);
              const d = a.replace('https://', 'wss://');

              (this.ws = new WebSocket(d + '?auth_token=' + this.token)),
                (this.ws.onmessage = this._dispatch.bind(this)),
                (this.ws.onclose = (e) => {
                  console.debug('[StreamRecorder]::disconnect', e),
                    this.onDisconnect && this.onDisconnect(e);
                }),
                (this.ws.onopen = async () => {
                  (this.rc = new s()),
                    (this.rc.onicecandidate = (e) => {
                      this.ws.send(
                        JSON.stringify({
                          type: 'candidate',
                          client_id: t,
                          rec_id: r,
                          data: { candidate: e.candidate },
                        })
                      );
                    }),
                    (this.rc.localStream = e);
                  const i = await this.rc.startPeerConnection(c);

                  this.ws.send(
                    JSON.stringify({
                      type: 'recording_start',
                      client_id: t,
                      rec_id: r,
                      data: { sdp: i, upload_url: n, webhook_url: o },
                    })
                  );
                }),
                i(r);
            } catch (e) {
              r(e);
            }
          });
        }
        stop() {
          console.debug('[StreamRecorder]::stop', this.recording),
            this.ws &&
              (this.ws.send(
                JSON.stringify({
                  type: 'recording_stop',
                  rec_id: this.recording,
                  client_id: this.client,
                })
              ),
              (this.ws.onclose = () => {}),
              this.ws.close()),
            this.rc && this.rc.disconnect(),
            (this.recording = null),
            (this.rc = null),
            (this.ws = null);
        }
        change(e) {
          return this.rc.changeStream(e);
        }
        _api() {
          return console.debug(this.endpoint, this.token), new o(this.endpoint, this.token);
        }
        _dispatch(e) {
          try {
            const { type: t, data: n } = JSON.parse(e.data);

            switch (t) {
              case 'sdp_update':
                this.rc.handleSdp(n.sdp);
                break;
              case 'candidate':
                this.rc.handleCandidate(n.candidate);
                break;
              case 'recording_stop':
                this.stop();
                break;
              default:
                console.warn('[StreamRecorder]::dispatch', 'received unknown msg', e);
            }
          } catch (t) {
            console.error('[StreamRecorder]::dispatch', e, t);
          }
        }
      };

      t.default = {
        connect(e, t) {
          this._recorder = new r(e, t);
        },
        onDisconnect(e) {
          this._recorder.onDisconnect = e;
        },
        startRecording: function (e, t, n, o) {
          return (
            this._assertAuth(),
            this._recorder.start({ stream: e, client_id: t, upload_url: n, webhook_url: o })
          );
        },
        stopRecording: function () {
          return this._assertAuth(), this._recorder.stop();
        },
        switchStream: function (e) {
          return this._assertAuth(), this._recorder.change(e);
        },
        _assertAuth: function () {
          if (!this._recorder) throw new Error('Authentication missing, use `connect`.');
        },
      };
    },
  ]);
});
