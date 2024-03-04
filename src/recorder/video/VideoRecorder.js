import React, { createRef } from "react";
import "./video.css";

const mimeType = "video/webm;codecs=h264";
const outputMimeType = 'video/mp4';

export default class VideoRecorder extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      isBrowserCompatible: false,
      isPermissionGranted: false,
      stream: null,
      isFrontCamera: true,
      recordingStatus: "inactive", // active | paused | inactive
      recordedVideo: null,
    };
    this.mediaRecorder = createRef();
    this.liveVideoFeed = createRef();
    this.videoChunks = [];
    this.localVideoChunks = [];
    this.timerObject = null;
  }

  checkPermissionStatus() {
    
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then(
        (stream) => {
          stream.getTracks().forEach((track) => track.stop());
          this.setState({ isLoading: false });
          this.previewCamera();
        },
        (err) => console.warn("navigator.mediaDevices.getUserMedia error:", err)
      );
  }


  componentDidMount() {
    const that = this;
    checkDeviceSupport(function ({
      hasWebcam,
      hasMicrophone,
      hasSpeakers,
      isMicrophoneAlreadyCaptured,
      isWebcamAlreadyCaptured,
    }) {
      console.log(
        "Browser support for media:  cam: ",
        hasWebcam,
        " mic: ",
        hasMicrophone
      );
      console.log(
        "isMicrophoneAlreadyCaptured: ",
        isMicrophoneAlreadyCaptured,
        " isWebcamAlreadyCaptured: ",
        isWebcamAlreadyCaptured
      );

      if (hasMicrophone && hasWebcam) {
        that.setState({ isBrowserCompatible: true });
        that.checkPermissionStatus(that);
      }
    });
  }

  componentWillUnmount() {
    const {stream} = this.state;
     // Release all media tracks
     if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
  }


  previewCamera = async () => {
    this.setState({ recordedVideo: null });
    if ("MediaRecorder" in window) {
      try {
        const videoConstraints = {
          audio: true,
          video: true,
        };
        const audioConstraints = { audio: true };
        // create audio and video streams separately
        const audioStream = await navigator.mediaDevices.getUserMedia(
          audioConstraints
        );
        const videoStream = await navigator.mediaDevices.getUserMedia(
          videoConstraints
        );

        // combine both audio and video streams
        const combinedStream = new MediaStream();
        audioStream.getAudioTracks().forEach((track) => {
          combinedStream.addTrack(track);
        });
        videoStream.getVideoTracks().forEach((track) => {
          combinedStream.addTrack(track);
        });

        this.setState({ stream: combinedStream });

        // set video stream to live feed player
        if (this.liveVideoFeed.current) {
          this.liveVideoFeed.current.srcObject = combinedStream;
        }
      } catch (err) {
        this.setState({ isPermissionGranted: false });
      }
    } else {
      this.setState({ isBrowserCompatible: false });
    }
  };

  handleDataAvailable = (event) => {
    if (typeof event.data === "undefined") return;
    if (event.data.size === 0) return;
    this.localVideoChunks.push(event.data);
  };

  handleRecordingStop = () => {
    const { onStopRecord } = this.props;
    const videoBlob = new Blob(this.localVideoChunks, {
      type: outputMimeType,
    });
    const videoUrl = URL.createObjectURL(videoBlob);
    this.setState({ recordedVideo: videoUrl }, onStopRecord(videoUrl));

    //reset the local chunk to restart the flow
    this.localVideoChunks = [];
  };

  toggleTimer = (counter) => {

    const that = this;
    
    const timerContainer = document.querySelector(".video-timer");
    const timerElement = document.querySelector(".video-timer-ele");
    const recordButton = document.querySelector(".record");
    const recordBtn = document.querySelector(".record-button");

    let i = counter;

    timerElement.innerHTML = `${i}s`;

    if (this.timerObject || counter === 0) {
      clearInterval(this.timerObject);

      this.timerObject = null;
      timerContainer.style.backgroundColor = "#00000088";

      that.stopRecording();
    } else {
      this.timerObject = setInterval(function () {
        timerElement.innerHTML = `${i}s`;

        if (i === 0) {
          console.log(i);
          timerContainer.style.backgroundColor = "#00000088";

          that.stopRecording();
          clearInterval(that.timerObject);
        }

        if (10 >= i && i > 5) {
          recordButton.setAttribute("data-enable", "false");
        }

        if (i <= 5) {
          recordButton.setAttribute("data-enable", "true");
          timerContainer.style.backgroundColor = "#FF0000BB";
        }

        i -= 1;
      }, 1000);
    }
  };

  startRecording = () => {
    this.setState({ recordingStatus: "recording" });

    const newStream = this.liveVideoFeed.current.srcObject;

    this.mediaRecorder = new MediaRecorder(newStream, { mimeType });

    this.toggleTimer(10);
    this.mediaRecorder.start();

    this.mediaRecorder.ondataavailable = this.handleDataAvailable;
    this.mediaRecorder.onstop = this.handleRecordingStop;
  };

  stopRecording = () => {
    this.setState({ recordingStatus: "inactive" });
    this.mediaRecorder.stop();
  };

  switchCamera = async () => {
    const { isFrontCamera } = this.state;

    const currentStream = this.liveVideoFeed.current.srcObject;

    if (currentStream) {
      if (
        this.mediaRecorder.current &&
        this.mediaRecorder.current.state === "recording"
      ) {
        this.mediaRecorder.current.pause(); // Pause the ongoing recording if it exists
      }
      currentStream.getTracks().forEach((track) => track.stop()); // Stop the current stream tracks
    }

    this.setState({ isFrontCamera: !isFrontCamera });

    try {
      const videoConstraints = {
        audio: true,
        video: { facingMode: isFrontCamera ? "environment" : "user" },
      };
      const audioConstraints = { audio: true };

      const audioStream = await navigator.mediaDevices.getUserMedia(
        audioConstraints
      );
      const videoStream = await navigator.mediaDevices.getUserMedia(
        videoConstraints
      );

      const combinedStream = new MediaStream();

      audioStream.getAudioTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });
      videoStream.getVideoTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });

      this.setState({ stream: combinedStream });

      if (this.liveVideoFeed.current) {
        this.liveVideoFeed.current.srcObject = combinedStream;
      }

      if (
        this.mediaRecorder.current &&
        this.mediaRecorder.current.state === "paused"
      ) {
        this.mediaRecorder.current.resume(); // Resume the recording with the updated stream if it was previously paused
      }
    } catch (error) {
      document.getElementById("test-debugger").innerHTML = error.message;
      console.error("Error accessing media devices:", error);
    }
  };

  renderLoader = () => {
    const { isLoading, isBrowserCompatible, isPermissionGranted } = this.state;
    //keep loading till get UserMedia() promise resolves or rejects
    if (!isLoading) {
      if (!isBrowserCompatible) {
        console.log(
          "Sorry, your browser is not compatible with video recording."
        );
      } else if (!isPermissionGranted) {
        console.log("Please grant permission to access media devices.");
      }
    }

    return <></>;
  };

  handleBackButton = () => {
    const { onClose } = this.props;
    onClose();
  };

  render() {
    const { isLoading, recordingStatus } = this.state;

    return (
      <div className="video-wrapper">
        {isLoading && this.renderLoader()}

        {!isLoading && (
          <div className="video-container">
            <div className="video-header">
              <div className="backButton" onClick={this.handleBackButton}>
                <svg
                  viewBox="0 0 448 512"
                  width="100"
                  title="arrow-left"
                  fill="currentColor"
                >
                  <path d="M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z" />
                </svg>
              </div>

              <div className="video-timer">
                <span className="video-timer-ele"> </span>
              </div>

              <div className="video-instruction" onClick={this.switchCamera}>
                <svg
                  viewBox="0 0 512 512"
                  width="100"
                  title="question-circle"
                  fill="currentColor"
                >
                  <path d="M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zM262.655 90c-54.497 0-89.255 22.957-116.549 63.758-3.536 5.286-2.353 12.415 2.715 16.258l34.699 26.31c5.205 3.947 12.621 3.008 16.665-2.122 17.864-22.658 30.113-35.797 57.303-35.797 20.429 0 45.698 13.148 45.698 32.958 0 14.976-12.363 22.667-32.534 33.976C247.128 238.528 216 254.941 216 296v4c0 6.627 5.373 12 12 12h56c6.627 0 12-5.373 12-12v-1.333c0-28.462 83.186-29.647 83.186-106.667 0-58.002-60.165-102-116.531-102zM256 338c-25.365 0-46 20.635-46 46 0 25.364 20.635 46 46 46s46-20.636 46-46c0-25.365-20.635-46-46-46z" />
                </svg>
              </div>
            </div>
            <video
              className="video-feeder"
              ref={this.liveVideoFeed}
              autoPlay
              muted
            />

            <div className="video-footer">
              <div
                className="record"
                onClick={
                  recordingStatus === "inactive"
                    ? this.startRecording
                    : this.stopRecording
                }
                data-enable="true"
              >
                <div
                  className="record-button"
                  data-recording={
                    recordingStatus === "inactive" ? "false" : "true"
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

function checkDeviceSupport(callback) {
  let canEnumerate = false;
  let MediaDevices = [];
  const isHTTPs = window.location.protocol === "https:";

  let hasMicrophone = false;
  let hasSpeakers = false;
  let hasWebcam = false;

  let isMicrophoneAlreadyCaptured = false;
  let isWebcamAlreadyCaptured = false;

  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    // Firefox 38+ seems having support of enumerateDevicesx
    navigator.enumerateDevices = function (cb) {
      navigator.mediaDevices.enumerateDevices().then(cb);
    };
  }

  if (
    typeof MediaStreamTrack !== "undefined" &&
    "getSources" in MediaStreamTrack
  ) {
    canEnumerate = true;
  } else if (
    navigator.mediaDevices &&
    !!navigator.mediaDevices.enumerateDevices
  ) {
    canEnumerate = true;
  }

  if (!canEnumerate) {
    return;
  }

  if (
    !navigator.enumerateDevices &&
    window.MediaStreamTrack &&
    window.MediaStreamTrack.getSources
  ) {
    navigator.enumerateDevices = window.MediaStreamTrack.getSources.bind(
      window.MediaStreamTrack
    );
  }

  if (!navigator.enumerateDevices && navigator.enumerateDevices) {
    navigator.enumerateDevices = navigator.enumerateDevices.bind(navigator);
  }

  if (!navigator.enumerateDevices) {
    if (callback) {
      callback({
        hasWebcam,
        hasMicrophone,
        isMicrophoneAlreadyCaptured,
        isWebcamAlreadyCaptured,
      });
    }
    return;
  }

  MediaDevices = [];

  navigator.enumerateDevices(function (devices) {
    devices.forEach(function (_device) {
      let device = {};
      for (let d in _device) {
        device[d] = _device[d];
      }

      if (device.kind === "audio") {
        device.kind = "audioinput";
      }

      if (device.kind === "video") {
        device.kind = "videoinput";
      }

      let skip;
      MediaDevices.forEach(function (d) {
        if (d.id === device.id && d.kind === device.kind) {
          skip = true;
        }
      });

      if (skip) {
        return;
      }

      if (!device.deviceId) {
        device.deviceId = device.id;
      }

      if (!device.id) {
        device.id = device.deviceId;
      }

      if (!device.label) {
        device.label = "Please invoke getUserMedia once.";
        if (!isHTTPs) {
          device.label =
            "HTTPs is required to get label of this " +
            device.kind +
            " device.";
        }
      } else {
        if (device.kind === "videoinput" && !isWebcamAlreadyCaptured) {
          isWebcamAlreadyCaptured = true;
        }

        if (device.kind === "audioinput" && !isMicrophoneAlreadyCaptured) {
          isMicrophoneAlreadyCaptured = true;
        }
      }

      if (device.kind === "audioinput") {
        hasMicrophone = true;
      }

      if (device.kind === "audiooutput") {
        hasSpeakers = true;
      }

      if (device.kind === "videoinput") {
        hasWebcam = true;
      }

      // there is no 'videoouput' in the spec.

      MediaDevices.push(device);
    });

    if (callback) {
      callback({
        hasWebcam,
        hasMicrophone,
        isMicrophoneAlreadyCaptured,
        isWebcamAlreadyCaptured,
      });
    }
  });
}
