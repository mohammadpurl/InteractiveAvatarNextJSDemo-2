import { StartAvatarRequest } from "@heygen/streaming-avatar";

export interface ExtendedStartAvatarRequest extends StartAvatarRequest {
  version: string;
}
