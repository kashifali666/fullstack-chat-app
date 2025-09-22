import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import AllChats from "./AllChats";
import { getSocket } from "../lib/socket";
import { Trash2 } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    setSelectedUser,
    groups,
    getGroups,
    isGroupsLoading,
    selectedGroup,
    setSelectedGroup,
    groupMessages,
    setMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, []);

  useEffect(() => {
    getGroups();
  }, [getGroups]);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id, false);
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }
  }, [
    selectedUser?._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (selectedGroup?._id) {
      getMessages(selectedGroup._id, true);
      getSocket().emit("joinGroup", selectedGroup._id);
    }
    return () => {
      if (selectedGroup?._id) {
        getSocket().emit("leaveGroup", selectedGroup._id);
      }
    };
  }, [selectedGroup?._id, getMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, groupMessages]);

  useEffect(() => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    const handler = ({ groupId }) => {
      setSelectedGroup(null);
      getGroups();
      toast("This group was deleted by the admin.", { icon: "⚠️" });
    };
    socket.on("groupDeleted", handler);
    return () => socket.off("groupDeleted", handler);
  }, []);

  useEffect(() => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    const handler = ({ userId }) => {
      if (useChatStore.getState().selectedUser?._id === userId) {
        useChatStore.getState().setMessages([]);
        useChatStore.getState().setSelectedUser(null);
        toast("This chat was deleted.", { icon: "🗑️" });
      }
    };
    socket.on("chatDeleted", handler);
    return () => socket.off("chatDeleted", handler);
  }, []);

  
  const handleSearch = async (e) => {
    setSearch(e.target.value);
    try {
      const { data } = await axiosInstance.get(
        `/users/search?search=${e.target.value}`
      );
      setSearchResults(data);
    } catch (err) {
      toast.error("Search failed");
    }
  };

  const handleAddToGroup = async (userId) => {
    try {
      const { data } = await axiosInstance.put("/group/groupadd", {
        chatId: selectedGroup._id,
        userId,
      });
      setSelectedGroup(data);
      setSearch("");
      setSearchResults([]);
      toast.success("User added to group");
      getMessages(data._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add user");
    }
  };

  const handleRemoveFromGroup = async (userId) => {
    try {
      const { data } = await axiosInstance.put("/group/groupremove", {
        chatId: selectedGroup._id,
        userId,
      });
      setSelectedGroup(data);
      toast.success("User removed from group");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove user");
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete the group "${selectedGroup.chatName}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeletingGroup(true);
    try {
      await axiosInstance.delete(`/group/${selectedGroup._id}`);
      toast.success("Group deleted");
      setSelectedGroup(null);
      getGroups();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete group");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedUser) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete your entire chat with "${selectedUser.fullName}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeletingChat(true);
    try {
      await axiosInstance.delete(`/messages/chat/${selectedUser._id}`);
      toast.success("Chat deleted");
      setSelectedUser(null);
      setMessages([]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete chat");
    } finally {
      setIsDeletingChat(false);
    }
  };

  const handleExitGroup = async () => {
    if (!selectedGroup) return;
    const confirmed = window.confirm(
      `Are you sure you want to exit the group "${selectedGroup.chatName}"?`
    );
    if (!confirmed) return;

    try {
      await axiosInstance.put("/group/exitgroup", {
        chatId: selectedGroup._id,
      });
      toast.success("You have exited the group.");
      setSelectedGroup(null);
      getGroups();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to exit group");
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md">
      
      <div className="p-2 border-b bg-white dark:bg-gray-900 flex flex-wrap gap-2 overflow-x-auto items-center">
        <button
          onClick={() => {
            setSelectedUser(null);
            setSelectedGroup(null);
          }}
          className={`text-xs px-3 py-1 rounded-full font-bold transition-colors duration-200 ease-in-out
                      ${
                        !selectedUser && !selectedGroup
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      }`}
        >
          All Groups:
        </button>
        {isGroupsLoading ? (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Loading groups...
          </span>
        ) : groups.length === 0 ? (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            No groups to display.
          </span>
        ) : (
          groups.map((group) => (
            <button
              key={group._id}
              onClick={() => {
                setSelectedGroup(group);
                setSelectedUser(null);
              }}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors duration-200 ease-in-out
                          ${
                            selectedGroup?._id === group._id
                              ? "bg-purple-600 text-white shadow-md"
                              : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                          }`}
            >
              {group.chatName}
            </button>
          ))
        )}
      </div>

      <ChatHeader />

      
      {selectedUser && !selectedGroup && (
        <div className="flex justify-end px-4 py-2">
          <button
            onClick={handleDeleteChat}
            disabled={isDeletingChat}
            className="flex items-center gap-2 px-4 py-2 rounded bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeletingChat ? "Deleting..." : <Trash2 size={18} />}
            Delete Chat
          </button>
        </div>
      )}

      
      {selectedGroup && (
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-b-lg mb-4 mx-2">
          <h2 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">
            Group Members:
          </h2>
          <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {selectedGroup.users.map((u) => (
              <div
                key={u._id}
                className="flex items-center justify-between px-2 py-1 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {u.fullName}
                </span>
                {authUser._id === selectedGroup.groupAdmin._id &&
                  u._id !== authUser._id && (
                    <button
                      onClick={() => handleRemoveFromGroup(u._id)}
                      className="text-red-600 text-sm hover:text-red-700 focus:outline-none"
                    >
                      Remove
                    </button>
                  )}
              </div>
            ))}
          </div>

          
          {authUser._id === selectedGroup.groupAdmin._id && (
            <>
              <input
                type="text"
                placeholder="Search users to add"
                className="w-full mt-3 p-2 border border-gray-300 rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-200"
                value={search}
                onChange={handleSearch}
              />
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                  {searchResults.map((userToAdd) =>
                    !selectedGroup.users.some(
                      (u) => u._id === userToAdd._id
                    ) ? (
                      <div
                        key={userToAdd._id}
                        className="flex items-center justify-between px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-sm text-gray-800 dark:text-gray-200"
                      >
                        <span className="text-sm">{userToAdd.fullName}</span>
                        <button
                          onClick={() => handleAddToGroup(userToAdd._id)}
                          className="text-green-600 text-sm hover:text-green-700 focus:outline-none"
                        >
                          Add
                        </button>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              
              <button
                onClick={handleDeleteGroup}
                disabled={isDeletingGroup}
                className="mt-6 flex items-center gap-2 px-4 py-2 rounded bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed w-full justify-center"
              >
                {isDeletingGroup ? "Deleting..." : "Delete Group"}
              </button>
            </>
          )}

          
          {authUser._id !== selectedGroup.groupAdmin._id && (
            <button
              onClick={handleExitGroup}
              className="mt-6 flex items-center gap-2 px-4 py-2 rounded bg-yellow-500 text-white font-semibold shadow hover:bg-yellow-600 transition w-full justify-center"
            >
              Exit Group
            </button>
          )}
        </div>
      )}

      
      <AllChats
        messages={selectedGroup ? groupMessages : messages}
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
      />

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
