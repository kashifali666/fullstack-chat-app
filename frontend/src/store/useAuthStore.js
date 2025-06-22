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
  // The socket instance will now be managed by getSocket/connectSocket from lib/socket.js
  // We can still store it here if we want to directly access it from the store state,
  // but the connect/disconnect logic will defer to the lib/socket.js functions.
  // For simplicity, let's keep it here for direct access if needed, but ensure it's synced.
  socket: null, // This will hold the reference to the *global* socket instance

  checkAuth: async () => {
    set({ isCheckingAuth: true }); // Set loading state at the start
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });

      // Connect socket after successful authentication
      const connectedSocket = connectSocket(res.data._id);
      set({ socket: connectedSocket }); // Update store with the connected socket instance

      // Emit join event
      connectedSocket.emit("join", res.data._id);

      // Listen for online users only after socket is connected
      connectedSocket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });
    } catch (error) {
      console.log("Error in checkAuth: ", error.message);
      set({ authUser: null });
      // Disconnect socket if auth fails and there's a connected socket
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

      // Connect socket after successful signup
      const connectedSocket = connectSocket(res.data._id);
      set({ socket: connectedSocket }); // Update store with the connected socket instance

      // Emit join event
      connectedSocket.emit("join", res.data._id);

      // Listen for online users
      connectedSocket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });
    } catch (error) {
      toast.error(error.response.data.message);
      // Ensure socket is disconnected if signup fails but a connection was attempted
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

      // Connect socket after successful login
      const connectedSocket = connectSocket(res.data._id);
      set({ socket: connectedSocket }); // Update store with the connected socket instance

      // Emit join event
      connectedSocket.emit("join", res.data._id);

      // Listen for online users
      connectedSocket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });
    } catch (error) {
      toast.error(error.response.data.message);
      // Ensure socket is disconnected if login fails
      get().disconnectSocket(); // Added this in case of login failure
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      // Disconnect socket using the utility function
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data }); // Assuming response has updated user data
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in updateProfile: ", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // Use the connectSocket from lib/socket.js
  connectSocket: () => {
    const { authUser } = get();
    // Only connect if authUser exists AND a socket isn't already connected
    // This prevents multiple connections if connectSocket is called multiple times
    if (!authUser || getSocket()?.connected) {
      // Use getSocket() from lib/socket.js
      return;
    }

    const connectedSocket = connectSocket(authUser._id); // Call the lib/socket.js function
    set({ socket: connectedSocket }); // Store the reference in Zustand

    // Set up the online users listener ONCE when the socket connects
    connectedSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
    // You might also want to add error listeners for the socket here if needed
    connectedSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      toast.error("Socket connection failed. Please refresh.");
    });
  },

  // Use the disconnectSocket by calling disconnect() on the socket instance
  disconnectSocket: () => {
    const currentSocket = getSocket(); // Get the current socket instance
    if (currentSocket?.connected) {
      currentSocket.disconnect(); // Call disconnect method on the socket
    }
    // Optionally clear online users when socket disconnects on logout
    set({ onlineUsers: [] });
  },
}));
