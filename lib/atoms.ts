import { RefObject } from "react"


import { atom } from "jotai"

import { NavItem } from "./types"
import { AvatarQuality } from "@heygen/streaming-avatar"

//Stream Atoms
export const mediaStreamActiveAtom = atom<Boolean>(false)
export const sessionDataAtom = atom<any | undefined>(undefined)
export const streamAtom = atom<MediaStream | undefined>(undefined)
export const debugAtom = atom<string>("")
export const inputTextAtom = atom<string>("")
export const avatarIdAtom = atom<string>("")
export const voiceIdAtom = atom<string>("")
export const qualityAtom = atom<AvatarQuality>()
export const mediaStreamRefAtom =
  atom<RefObject<HTMLVideoElement | null> | null>(null);
export const mediaCanvasRefAtom =
  atom<RefObject<HTMLCanvasElement | null> | null>(null);
export const avatarAtom = atom<RefObject<any> | undefined>(
  undefined
)

//UI Atoms
export const selectedNavItemAtom = atom<NavItem>({
  label: "Playground",
  icon: "",
  ariaLabel: "Playground",
  content: "",
})
export const publicAvatarsAtom = atom([])
export const removeBGAtom = atom(false)
export const isRecordingAtom = atom(false)
export const chatModeAtom = atom(false)
export const customBgPicAtom = atom<string>("")

//LLMs Atoms
export const providerModelAtom = atom("openai:gpt-4-turbo")
export const temperatureAtom = atom(1)
export const maxTokensAtom = atom(256)
