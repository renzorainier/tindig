"use client";

import React from "react";

// import PoseEstimator from './PoseEstimator';
// import DepthEstimator from './DepthEstimator';
// import Depth from './depth/Depth';

import Login from "./login/page";
import Register from "./register/page";
import Dashboard from "./dashboard/page";

import { AuthProvider } from "./contexts/authContext";

// import WebcamTest from './WebcamTest'
// import './App.css';

function App() {
  return (
    <div>
      <header>
        {/* <PoseEstimator /> */}
        {/* <DepthEstimator /> */}
        <Login />
        {/* <WebcamTest /> */}
      </header>
    </div>
  );
}

export default App;
