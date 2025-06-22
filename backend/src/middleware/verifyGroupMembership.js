import Chat from "../models/groupChat.model.js";

const verifyGroupMembership = async (req, res, next) => {
  const { chatId } = req.body;

  const groupChat = await Chat.findById(chatId);
  if (!groupChat) return res.status(404).json({ error: "Group not found" });

  const isMember = groupChat.users.some(
    (userId) => userId.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return res.status(403).json({ error: "Access denied" });
  }

  next();
};
export default verifyGroupMembership;
