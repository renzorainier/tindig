"use client";

import React from "react";
import LandingPage from "./landing/page";
import Head from "next/head.js";


export default function Home() {
  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest.json" />

        <title>Tindig</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
          {/* <meta property="og:image" content="https://dvbs.vercel.app/target.png" /> */}
      </Head>
      <div style={{ userSelect: "none" }}>
        <div>
          <LandingPage />
        </div>
      </div>
    </>
  );
}

// function App() {
//   return (
//     <div>
//       <Head>

//        <link rel="manifest" href="/manifest.json" />
//            <title>Tindig</title>
//         <meta name="viewport" content="width=device-width, initial-scale=1" />

//         {/* Open Graph meta tags */}
//         <meta property="og:title" content="Tindig" />
//         {/* <meta property="og:image" content="https://dvbs.vercel.app/target.png" /> */}
//         {/* Add more Open Graph meta tags as needed */}
//       </Head>
//       <header>
//         <LandingPage />

//       </header>
//     </div>
//   );
// }
