import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  chats: [], 
  setChats: (chats) => set({ chats }),

  selectedChat: null,
  setSelectedChat: (selectedChat) => set({ selectedChat }),

  
  messages: [],
  users: [],
  selectedUser: null,

  
  groups: [],
  selectedGroup: null,
  groupMessages: [], 

  
  isUsersLoading: false,
  isMessagesLoading: false,
  isGroupsLoading: false,

  
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  setSelectedGroup: (selectedGroup) => set({ selectedGroup }), 

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
  }, 

  
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users"); 
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  
  getGroups: async () => {
    console.log("useChatStore: >>> INVOKING getGroups <<<");
    set({ isGroupsLoading: true });
    console.log("useChatStore: -> START fetching groups.");
    try {
      
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

 
  getMessages: async (chatOrRecipientId, isGroup = false) => {
    set({ isMessagesLoading: true });
    try {
      let res;
      if (isGroup) {
        
        res = await axiosInstance.get(`/messages/group/${chatOrRecipientId}`); 
        console.log("Fetched group messages:", res.data);
        set({ groupMessages: Array.isArray(res.data) ? res.data : [] });
      } else {
        
        res = await axiosInstance.get(`/messages/${chatOrRecipientId}`);
        set({ messages: Array.isArray(res.data) ? res.data : [] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
      
      if (isGroup) {
        set({ groupMessages: [] });
      } else {
        set({ messages: [] });
      }
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  
  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup, messages, groupMessages } = get();
    console.log(
      "sendMessage called. selectedUser:",
      selectedUser,
      "selectedGroup:",
      selectedGroup
    );

    let endpoint;
    

    if (selectedGroup) {
      
      endpoint = "/messages/group/send";
      messageData.chatId = selectedGroup._id; 
    } else if (selectedUser) {
      endpoint = `/messages/send/${selectedUser._id}`; 
    } else {
      toast.error("No recipient or group selected");
      return;
    }

    try {
      const res = await axiosInstance.post(endpoint, messageData);
      const newMessage = res.data;

      
      if (selectedGroup) {
        set({ groupMessages: [...groupMessages, newMessage] });
      } else {
        set({ messages: [...messages, newMessage] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

 
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn("Socket not available in subscribeToMessages.");
      return;
    }

    socket.off("newMessage");
    socket.off("messageDeleted");

    socket.on("newMessage", (newMessage) => {
      
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

  
  createGroupChat: async (groupName, userIds) => {
    console.log("Inside store createGroupChat with:", groupName, userIds);
    try {
      const res = await axiosInstance.post("/group/creategroup", {
        
        name: groupName,
        users: JSON.stringify(userIds),
      });

      const newGroup = res.data;
      console.log("useChatStore: New group created by API:", newGroup);

     
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
        
        chatId,
        userId,
      });
      
      set({ selectedGroup: res.data });
      
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
        
        chatId,
        userId,
      });
     
      set({ selectedGroup: res.data });
      
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
