import { useState } from "react";
import { useChatStore } from "../store/useChatStore.js";

const CreateGroupModal = ({ users, onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const { createGroupChat } = useChatStore();

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName || selectedUserIds.length < 2)
      return alert("Select at least 2 users");
    console.log(
      "Creating group with name:",
      groupName,
      "users:",
      selectedUserIds
    );
    await createGroupChat(groupName, selectedUserIds);
    onClose(); // Close modal
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg w-[90%] max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create Group</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="input input-bordered w-full mb-4"
          />

          <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
            {users.map((user) => (
              <label key={user._id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user._id)}
                  onChange={() => toggleUser(user._id)}
                />
                <span>{user.fullName}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm bg-gray-400 text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-sm bg-yellow-600 text-white"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
