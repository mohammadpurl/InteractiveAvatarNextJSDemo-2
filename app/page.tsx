"use client";

import InteractiveAvatarWrapper from "@/components/InteractiveAvatar";
import InteractiveAvatar from "@/components/InteractiveAvatar";
export default function App() {
  return (
    // <div className="w-screen h-screen flex flex-col">
    //   <div className="w-full h-screen flex flex-col items-start justify-start gap-5 mx-auto pt-4 pb-20">
    //     <div className="w-full h-screen">
    //       <InteractiveAvatarWrapper />
    //     </div>
    //   </div>
    // </div>
    <div className="relative w-screen h-screen overflow-hidden">
      <InteractiveAvatarWrapper />
    </div>
  );
}
