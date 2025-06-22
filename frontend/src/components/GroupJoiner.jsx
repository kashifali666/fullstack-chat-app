import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";

const GroupJoiner = () => {
  const socket = useAuthStore((state) => state.socket);
  const groups = useChatStore((state) => state.groups); // or whatever your group state is called

  useEffect(() => {
    if (socket && groups && groups.length > 0) {
      groups.forEach((group) => {
        socket.emit("joinGroup", group._id);
      });
    }
  }, [socket, groups]);

  return null;
};

export default GroupJoiner;
