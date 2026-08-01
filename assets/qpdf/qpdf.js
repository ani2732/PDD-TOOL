/* eslint-env browser */
/* QPDF.js — main-thread API wrapper. Source: https://github.com/j3k0/qpdf.js (Apache-2.0).
   Self-hosted so the Worker() same-origin requirement is satisfied.
   The worker script (qpdf-worker.js, also self-hosted) loads the heavy
   emscripten/WASM build from jsDelivr via importScripts(), which is allowed cross-origin. */

(function () {
  // The QPDF Module
    function QPDF (options) {
      const {
        logger = console.log.bind(console),
        ready,
        path = QPDF.path || '',
        keepAlive = false,
      } = options;
      let worker = new Worker(path + 'qpdf-worker.js');

      const listeners = {};
      let nListeners = 0;
      const addListener = function (id, fn) {
        listeners[id] = fn;
        nListeners += 1;
      };
      const callListener = function (id, err, arg) {
        const fn = listeners[id];
        if (fn) {
          delete listeners[id];
          fn(err, arg);
        }
        nListeners -= 1;

        if (!keepAlive && nListeners === 0) {
          setTimeout(function () {
            // No new commands after 1 second?
            // Then we terminate the worker (unless keepAlive is true).
            if (worker !== null && nListeners === 0) {
              worker.terminate();
              worker = null;
            }
          }, 1000);
        }
      };

      const qpdf = {
        save (filename, arrayBuffer, callback) {
          if (!worker) { return callback(new Error('worker terminated')); }
          if (callback) {
            addListener(filename, callback);
          }
          worker.postMessage({
            type: 'save',
            filename,
            arrayBuffer
          });
        },
        load (filename, callback) {
          if (!worker) { return callback(new Error('worker terminated')); }
          if (callback) {
            addListener(filename, callback);
          }
          worker.postMessage({
            type: 'load',
            filename
          });
        },
        execute (args, callback) {
          if (!worker) { return callback(new Error('worker terminated')); }
          if (callback) {
            addListener('execute', callback);
          }
          worker.postMessage({
            type: 'execute',
            args
          });
        },
        terminate() {
          if (worker) {
            worker.terminate();
            worker = null;
          }
        }
      };

      worker.onmessage = function (event) {
        const message = event.data;

        switch (message.type) {
          case 'ready': {
            logger('[qpdf] ready');
            if (ready) {
              ready(qpdf);
            }
            break;
          }

          case 'stdout':
            logger('[qpdf.worker] ' + message.line);
            break;

          case 'saved': {
            const filename = message.filename;
            logger('[qpdf] ' + filename + ' saved');
            callListener(filename, null);
            break;
          }

          case 'loaded': {
            const { filename, arrayBuffer } = message;
            logger('[qpdf] ' + filename + ' loaded (' + (arrayBuffer ? arrayBuffer.length : 0) + ')');
            if (arrayBuffer) {
              callListener(filename, null, arrayBuffer);
            } else {
              callListener(filename, new Error('File not found'));
            }
            break;
          }

          case 'error': {
            logger('[qpdf] error: ' + message.message);
            break;
          }

          case 'executed': {
            const { status, error, output } = message;
            logger('[qpdf] exited with status ' + status);
            if (output) {
              if (output.stdout) logger('[qpdf] stdout: ' + output.stdout);
              if (output.stderr) logger('[qpdf] stderr: ' + output.stderr);
            }
            if (status !== 0) {
              callListener('execute', new Error(error || 'QPDF exited with status ' + status));
            } else {
              callListener('execute', null);
            }
            break;
          }
        }
      };

      worker.onerror = function (err) {
        logger('[qpdf] worker error: ' + (err && err.message ? err.message : err));
      };
    }

    QPDF.encrypt = function ({
      logger,
      arrayBuffer,
      userPassword,
      ownerPassword,
      keyLength,
      callback,
    }) {
      const safeCallback = function (err, arg) {
        if (callback) {
          if (err || arg) {
            callback(err, arg);
            callback = null;
          }
        }
      };
      QPDF({
        logger,
        ready: function (qpdf) {
          qpdf.save('input.pdf', arrayBuffer, function(err){ if (err) safeCallback(err); });
          qpdf.execute([
            '--encrypt',
            userPassword || '',
            ownerPassword || '',
            String(keyLength || 256),
            '--',
            'input.pdf',
            'output.pdf'
          ], function(err){ if (err) safeCallback(err); else qpdf.load('output.pdf', safeCallback); });
        }
      });
    };

    QPDF.decrypt = function ({
      logger,
      arrayBuffer,
      password,
      callback,
    }) {
      const safeCallback = function (err, arg) {
        if (callback) {
          if (err || arg) {
            callback(err, arg);
            callback = null;
          }
        }
      };
      QPDF({
        logger,
        ready: function (qpdf) {
          qpdf.save('input.pdf', arrayBuffer, function(err){ if (err) safeCallback(err); });
          qpdf.execute([
            '--decrypt',
            '--password=' + (password || ''),
            '--',
            'input.pdf',
            'output.pdf'
          ], function(err){ if (err) safeCallback(err); else qpdf.load('output.pdf', safeCallback); });
        }
      });
    };

    QPDF.help = function (logger) {
      QPDF({
        logger,
        ready: function (qpdf) {
          qpdf.execute(['--help']);
        }
      });
    };

    QPDF.base64ToArrayBuffer = function (base64) {
      const binary = window.atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    };

    QPDF.arrayBufferToBase64 = function (buffer) {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    window.QPDF = QPDF;
  })();
