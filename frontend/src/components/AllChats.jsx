import { useRef, useEffect } from "react";
import { formatMessageTime } from "../lib/utils";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const AllChats = ({ messages, selectedUser, selectedGroup }) => {
  const { authUser } = useAuthStore();
  const { setMessages, setGroupMessages } = useChatStore();
  const messageEndRef = useRef(null);

  // Handler to delete a message
  const handleDeleteMessage = async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      toast.success("Message deleted");
      if (selectedGroup) {
        setGroupMessages((prev) => {
          const updated = Array.isArray(prev)
            ? prev.filter((msg) => String(msg._id) !== String(messageId))
            : [];
          console.log("After setGroupMessages, selectedGroup:", selectedGroup);
          return updated;
        });
      } else {
        setMessages((prev) => {
          const updated = Array.isArray(prev)
            ? prev.filter((msg) => String(msg._id) !== String(messageId))
            : [];
          console.log("After setMessages, selectedUser:", selectedUser);
          return updated;
        });
      }
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  // Scroll to latest message
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Always use an array for messages
  const safeMessages = Array.isArray(messages) ? messages : [];

  console.log(
    "AllChats render: safeMessages.length =",
    safeMessages.length,
    "selectedUser =",
    selectedUser,
    "selectedGroup =",
    selectedGroup
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {safeMessages.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No messages yet. Start the conversation!
        </div>
      ) : (
        safeMessages.map((message, index) => {
          const senderId = message.senderId?._id || message.senderId;
          const isSender = senderId === authUser._id;

          let senderName = "";
          let senderAvatar = "";
          if (selectedGroup) {
            const senderObj = message.senderId?.fullName
              ? message.senderId
              : selectedGroup.users.find((u) => u._id === senderId);
            senderName = senderObj?.fullName || "Unknown";
            senderAvatar = senderObj?.profilePic || "/avatar.png";
          } else {
            senderName = isSender
              ? authUser.fullName
              : selectedUser?.fullName || "Unknown";
            senderAvatar = isSender
              ? authUser.profilePic || "/avatar.png"
              : selectedUser?.profilePic || "/avatar.png";
          }

          return (
            <div
              key={message._id || index}
              className={`chat ${isSender ? "chat-end" : "chat-start"}`}
              ref={index === safeMessages.length - 1 ? messageEndRef : null}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img src={senderAvatar} alt="profile" />
                </div>
              </div>
              <div className="chat-header mb-1 flex items-center gap-2">
                {selectedGroup && (
                  <span
                    className={`font-semibold text-xs ${
                      isSender ? "text-purple-600" : "text-blue-600"
                    }`}
                  >
                    {senderName}
                  </span>
                )}
                <time className="text-xs text-gray-700 dark:text-gray-200 font-medium ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div
                className={`chat-bubble flex flex-col transition-colors duration-200 ${
                  isSender
                    ? "bg-gradient-to-br from-purple-500 to-purple-400 text-white shadow-lg"
                    : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
                }`}
                style={{ borderRadius: "1.2em", maxWidth: 320 }}
              >
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {message.text && <p>{message.text}</p>}
                {isSender && (
                  <button
                    onClick={() => handleDeleteMessage(message._id)}
                    className="text-xs text-red-500 hover:text-red-700 mt-1 self-end"
                    title="Delete Message"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AllChats;
