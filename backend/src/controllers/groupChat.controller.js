import Chat from "../models/groupChat.model.js";
import Message from "../models/message.model.js";
import { io } from "../lib/socket.js";

export const createGroupChat = async (req, res) => {
  try {
    const { users, name, currentUserId } = req.body;

    if (!users || !name) {
      console.log("Missing fields:", { users, name });
      return res.status(400).send({ message: "Please fill all the fields" });
    }

    let usersArray;

    try {
      usersArray = JSON.parse(users);
    } catch (parseErr) {
      console.log("Failed to parse users:", users);
      return res.status(400).json({ message: "Invalid user format" });
    }

    if (usersArray.length < 2) {
      console.log("Not enough users to create a group:", usersArray);
      return res
        .status(400)
        .send("More than 2 users are required to form a group chat");
    }

    const currentUser = req.user?._id || currentUserId;

    if (!currentUser) {
      console.log("Missing current user:", {
        reqUser: req.user,
        currentUserId,
      });
      return res.status(400).json({ message: "No current user provided" });
    }

    if (!usersArray.includes(currentUser)) {
      usersArray.push(currentUser);
    }

    console.log("Creating chat with:", { name, usersArray, currentUser });

    const groupChat = await Chat.create({
      chatName: name,
      users: usersArray,
      isGroupChat: true,
      groupAdmin: currentUser,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    return res.status(200).json(fullGroupChat);
  } catch (error) {
    console.error("❌ Error in createGroupChat:", error);
    return res.status(500).json({ message: error.message });
  }
};


export const addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $push: { users: userId } },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404).send("Chat Not Found");
  } else {
    res.json(updatedChat);
  }
};


export const removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { users: userId } },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404).send("Chat Not Found");
  } else {
    res.json(updatedChat);
  }
};


export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated." });
    }

    
    const groups = await Chat.find({
      users: { $elemMatch: { $eq: userId } },
      isGroupChat: true,
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });
    return res.status(200).json(groups);
  } catch (error) {
    console.error("❌ Error in getGroups:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const deleteGroupChat = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    
    const group = await Chat.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    
    if (group.groupAdmin.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the group admin can delete this group." });
    }

    
    await Message.deleteMany({ chat: groupId });

    
    await Chat.findByIdAndDelete(groupId);

    
    io.to(groupId).emit("groupDeleted", { groupId });

    res.status(200).json({ message: "Group chat deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete group chat" });
  }
};

export const exitGroup = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    const group = await Chat.findById(chatId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    
    if (group.groupAdmin.toString() === userId.toString()) {
      return res
        .status(403)
        .json({
          message: "Admin cannot exit the group. Delete the group instead.",
        });
    }

    
    group.users = group.users.filter((u) => u.toString() !== userId.toString());
    await group.save();

    res.status(200).json({ message: "Exited group successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Failed to exit group" });
  }
};
