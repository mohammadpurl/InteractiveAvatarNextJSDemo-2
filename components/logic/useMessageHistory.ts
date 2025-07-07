import { useStreamingAvatarContext } from "./context";

export const useMessageHistory = () => {
  const { messages } = useStreamingAvatarContext();
  console.log("messages", messages);
  return { messages };
};
