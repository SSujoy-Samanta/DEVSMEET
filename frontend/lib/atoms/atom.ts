import { atom } from "recoil";
//notification

export const ScreenSharingState = atom<boolean>({
  key: "ScreenSharingState",
  default: false,
});

export const isAudioMutedState = atom<boolean>({
  key: "isAudioMutedState",
  default: false,
});

export const isVideoMutedState = atom<boolean>({
  key: "isVideoMutedState",
  default: false,
});
