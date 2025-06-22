import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import Chat from "../models/groupChat.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await Message.find({ chat: groupId })
      .populate("senderId", "name email avatar") // <-- Populate sender details
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ message: "Failed to fetch group messages" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      //upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    const newMessage = await Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { chatId, text, image } = req.body;
    const senderId = req.user._id;

    // Step 3: Restrict to members only
    const groupChat = await Chat.findById(chatId);
    if (!groupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const isMember = groupChat.users.includes(senderId);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this group" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Create message
    const newMessage = await Message.create({
      senderId,
      text,
      image: imageUrl,
      chat: chatId,
    });

    // Step 1: Populate user details
    const populatedMessage = await newMessage.populate(
      "senderId",
      "name email avatar"
    );

    // Step 2: Update latest message in chat
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: populatedMessage._id,
    });

    // Emit to group room for real-time update
    io.to(chatId.toString()).emit("newMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ message: "Failed to send group message" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only the sender can delete their message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    await Message.findByIdAndDelete(messageId);

    // Notify all relevant users via socket.io
    if (message.chat) {
      // Group chat: notify all group members
      io.to(message.chat.toString()).emit("messageDeleted", { messageId });
    } else {
      // 1-to-1 chat: notify both sender and receiver
      io.to(message.senderId.toString()).emit("messageDeleted", { messageId });
      if (message.receiverId) {
        io.to(message.receiverId.toString()).emit("messageDeleted", { messageId });
      }
    }

    res.status(200).json({ message: "Message deleted", messageId });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message" });
  }
};

export const deleteOneToOneChat = async (req, res) => {
  try {
    const { userId } = req.params; // The other user's ID
    const myId = req.user._id;

    // Delete all messages between these two users
    await Message.deleteMany({
      $or: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
    });

    // Notify both users in real-time
    io.to(myId.toString()).emit("chatDeleted", { userId });
    io.to(userId.toString()).emit("chatDeleted", { userId: myId });

    res.status(200).json({ message: "Chat deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete chat" });
  }
};

