import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore"; // Make sure useAuthStore is properly imported for socket access

export const useChatStore = create((set, get) => ({
  chats: [], // This might eventually become a unified list of all chats (1-on-1 and group)
  setChats: (chats) => set({ chats }),

  selectedChat: null,
  setSelectedChat: (selectedChat) => set({ selectedChat }),

  // User chat state (for 1-on-1)
  messages: [], // Messages for the currently selected 1-on-1 chat
  users: [], // List of available users for 1-on-1 chats
  selectedUser: null,

  // Group chat state
  groups: [], // List of group chats the user is a member of
  selectedGroup: null, // The currently selected group chat
  groupMessages: [], // Messages for the currently selected group chat

  // Loading states
  isUsersLoading: false,
  isMessagesLoading: false,
  isGroupsLoading: false, // New loading state for groups

  // ========= SETTERS =========
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  setSelectedGroup: (selectedGroup) => set({ selectedGroup }), // Clear 1-on-1 messages when group is selected

  setUsers: (users) => set({ users }),
  setGroups: (groups) => set({ groups }),
  setGroupMessages: (messages) => {
    set({ groupMessages: messages });
    console.log(
      "setGroupMessages called. groupMessages:",
      messages,
      "selectedGroup:",
      get().selectedGroup
    );
  },
  setMessages: (messages) => {
    set({ messages });
    console.log(
      "setMessages called. messages:",
      messages,
      "selectedUser:",
      get().selectedUser
    );
  }, // Explicit setter for 1-on-1 messages

  // ========= FETCH USERS (for 1-on-1 contacts) =========
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users"); // Assuming this fetches users for 1-on-1 chats
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // ========= FETCH GROUPS =========
  getGroups: async () => {
    console.log("useChatStore: >>> INVOKING getGroups <<<");
    set({ isGroupsLoading: true });
    console.log("useChatStore: -> START fetching groups.");
    try {
      // 🚨 CORRECTED URL: Matches 'GET /api/group/'
      const res = await axiosInstance.get("/group");
      console.log(
        "useChatStore: Groups API call successful. Raw Data received:",
        res.data
      );
      console.log(
        "useChatStore: Type of res.data:",
        typeof res.data,
        Array.isArray(res.data) ? "is Array" : "not Array"
      );

      if (Array.isArray(res.data) && res.data.length > 0) {
        set({ groups: res.data });
        console.log("useChatStore: Groups state updated with:", res.data);
      } else {
        set({ groups: [] });
        console.log(
          "useChatStore: No groups data received or data is empty/not array."
        );
      }
    } catch (error) {
      console.error(
        "useChatStore: Failed to fetch groups. Error:",
        error.response?.data?.message || error.message,
        error.toJSON ? error.toJSON() : error,
        error.response
      );
      toast.error(error.response?.data?.message || "Failed to fetch groups");
      set({ groups: [] });
    } finally {
      set({ isGroupsLoading: false });
      console.log(
        "useChatStore: <- END fetching groups. isGroupsLoading:",
        get().isGroupsLoading
      );
    }
  },

  // ========= FETCH MESSAGES (Unified for 1-on-1 and Group) =========
  // This needs to be smarter to handle whether it's a 1-on-1 or group chat ID
  getMessages: async (chatOrRecipientId, isGroup = false) => {
    set({ isMessagesLoading: true });
    try {
      let res;
      if (isGroup) {
        // 🚨 CORRECTED URL: Matches 'GET /api/messages/group/:groupId'
        res = await axiosInstance.get(`/messages/group/${chatOrRecipientId}`); // Example group message API
        console.log("Fetched group messages:", res.data);
        set({ groupMessages: Array.isArray(res.data) ? res.data : [] });
      } else {
        // Assuming you have an API for fetching 1-on-1 messages by recipientId
        res = await axiosInstance.get(`/messages/${chatOrRecipientId}`);
        set({ messages: Array.isArray(res.data) ? res.data : [] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
      // On error, also set to empty array to avoid undefined/null
      if (isGroup) {
        set({ groupMessages: [] });
      } else {
        set({ messages: [] });
      }
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // ========= SEND MESSAGE (Unified for 1-on-1 and Group) =========
  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup, messages, groupMessages } = get();
    console.log(
      "sendMessage called. selectedUser:",
      selectedUser,
      "selectedGroup:",
      selectedGroup
    );

    let endpoint;
    // `recipientId` isn't strictly needed here for the endpoint, but `chatId` for group messages is.

    if (selectedGroup) {
      // 🚨 CORRECTED URL: Matches 'POST /api/messages/group/send'
      endpoint = "/messages/group/send";
      messageData.chatId = selectedGroup._id; // Add chatId to the messageData for group messages
    } else if (selectedUser) {
      endpoint = `/messages/send/${selectedUser._id}`; // Matches 'POST /api/messages/send/:id'
    } else {
      toast.error("No recipient or group selected");
      return;
    }

    try {
      const res = await axiosInstance.post(endpoint, messageData);
      const newMessage = res.data;

      // Optimistically update the UI with the new message
      if (selectedGroup) {
        set({ groupMessages: [...groupMessages, newMessage] });
      } else {
        set({ messages: [...messages, newMessage] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // ========= SOCKET MESSAGE HANDLING =========
  // This needs careful adjustment for group messages
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn("Socket not available in subscribeToMessages.");
      return;
    }

    socket.off("newMessage");
    socket.off("messageDeleted");

    socket.on("newMessage", (newMessage) => {
      // Always use the latest selectedGroup from the store
      const currentGroupId = get().selectedGroup?._id;
      const currentUser = get().selectedUser;
      const authUser = useAuthStore.getState().authUser;

      if (
        newMessage.chat &&
        currentGroupId &&
        newMessage.chat === currentGroupId
      ) {
        set({ groupMessages: [...get().groupMessages, newMessage] });
      } else if (
        currentUser &&
        ((newMessage.senderId === currentUser._id &&
          newMessage.receiverId === authUser._id) ||
          (newMessage.senderId === authUser._id &&
            newMessage.receiverId === currentUser._id))
      ) {
        set({ messages: [...get().messages, newMessage] });
      }
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({
        messages: Array.isArray(state.messages)
          ? state.messages.filter(
              (msg) => String(msg._id) !== String(messageId)
            )
          : [],
        groupMessages: Array.isArray(state.groupMessages)
          ? state.groupMessages.filter(
              (msg) => String(msg._id) !== String(messageId)
            )
          : [],
      }));
    });
  },
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messageDeleted");
    }
  },

  // ========= GROUP CHAT ACTIONS =========
  createGroupChat: async (groupName, userIds) => {
    console.log("Inside store createGroupChat with:", groupName, userIds);
    try {
      const res = await axiosInstance.post("/group/creategroup", {
        // Adjusted URL
        name: groupName,
        users: JSON.stringify(userIds),
      });

      const newGroup = res.data;
      console.log("useChatStore: New group created by API:", newGroup);

      // Add new group to existing groups list
      set((state) => {
        const updatedGroups = [newGroup, ...state.groups];
        console.log(
          "useChatStore: Groups state after new group creation (optimistic update):",
          updatedGroups
        );
        return {
          groups: updatedGroups,
        };
      });

      toast.success("Group chat created");
      return newGroup;
    } catch (error) {
      console.error(
        "useChatStore: Error creating group:",
        error.response?.data?.message || error.message
      );
      toast.error(
        error.response?.data?.message || "Failed to create group chat"
      );
    }
  },

  addToGroup: async (chatId, userId) => {
    try {
      const res = await axiosInstance.put("/group/groupadd", {
        // Adjusted URL
        chatId,
        userId,
      });
      // Update the selected group in state after adding a user
      set({ selectedGroup: res.data });
      // You might also want to update the 'groups' array if that's how you display them
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === chatId ? res.data : group
        ),
      }));
      toast.success("User added to group");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add user");
    }
  },

  removeFromGroup: async (chatId, userId) => {
    try {
      const res = await axiosInstance.put("/group/groupremove", {
        // Adjusted URL
        chatId,
        userId,
      });
      // Update the selected group in state after removing a user
      set({ selectedGroup: res.data });
      // You might also want to update the 'groups' array if that's how you display them
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === chatId ? res.data : group
        ),
      }));
      toast.success("User removed from group");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove user");
    }
  },
}));
