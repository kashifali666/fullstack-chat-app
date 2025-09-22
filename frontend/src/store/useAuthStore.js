import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

import { connectSocket, getSocket } from "../lib/socket";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });

      
      const connectedSocket = connectSocket(res.data._id);
      set({ socket: connectedSocket }); 
      
      connectedSocket.emit("join", res.data._id);

      
      connectedSocket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });
    } catch (error) {
      console.log("Error in checkAuth: ", error.message);
      set({ authUser: null });
      
      get().disconnectSocket();
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");

      
      const connectedSocket = connectSocket(res.data._id);
      set({ socket: connectedSocket });

      
      connectedSocket.emit("join", res.data._id);

      
      connectedSocket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });
    } catch (error) {
      toast.error(error.response.data.message);
      
      get().disconnectSocket();
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      
      const connectedSocket = connectSocket(res.data._id);
      set({ socket: connectedSocket });

      
      connectedSocket.emit("join", res.data._id);

      
      connectedSocket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });
    } catch (error) {
      toast.error(error.response.data.message);
      
      get().disconnectSocket();
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in updateProfile: ", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  
  connectSocket: () => {
    const { authUser } = get();
    
    if (!authUser || getSocket()?.connected) {
      
      return;
    }

    const connectedSocket = connectSocket(authUser._id); 
    set({ socket: connectedSocket });

    
    connectedSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
    
    connectedSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      toast.error("Socket connection failed. Please refresh.");
    });
  },

  
  disconnectSocket: () => {
    const currentSocket = getSocket();
    if (currentSocket?.connected) {
      currentSocket.disconnect();
    }
    
    set({ onlineUsers: [] });
  },
}));
