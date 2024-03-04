import "./App.css";
import { useState} from "react";
import { VideoRecorder, AudioRecorder } from "../src/recorder";


const App = () => {

  const [videoBlob, setVideoBlob] = useState(null);
  const [showCamera, toggleCamera] = useState(false);


  const handleStartRecord = () => {
    setVideoBlob(null);

    captureVideo();
    console.log("Recording started");
  };
  
  const handleStopRecord = (url) => {
    setVideoBlob(url);
    captureVideo();
    console.log("Recording stopped video url: ", url);
  }

  const captureVideo = () => {
    toggleCamera( (prevShowCamera) => !prevShowCamera );
  }

  const handleClose = () => {
    setVideoBlob(null);
    toggleCamera( (prevShowCamera) => !prevShowCamera );
  }


  return (
    <div className="app">

      <button onClick={captureVideo}> Capture Video</button>

      
      {showCamera && (
       <VideoRecorder
       onStartRecord={handleStartRecord}
       onStopRecord={handleStopRecord}
       onClose={handleClose}
     />
      )}
      

      {videoBlob && (
        <a download href={videoBlob}>
          Download Recording
        </a>
      )}
    </div>
  );
};
export default App;
