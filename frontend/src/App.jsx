import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFile, setEditFile] = useState(null);

  useEffect(() => {
  if (error || success) {
    const timer = setTimeout(() => {
      setError("");
      setSuccess("");
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [error, success]);

  const fetchData = async () => {
    const res = await axios.get("/api/items");
    setItems(res.data);
  };

  const addItem = async () => {
  setError("");
  setSuccess("");

  // ❗ Validasi file wajib ada
  if (!file) {
    setError("⚠️ Silakan pilih file terlebih dahulu");
    return;
  }

  // ❗ Validasi tipe file
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

  if (!allowedTypes.includes(file.type)) {
    setError("❌ Hanya file JPG, JPEG, atau PNG yang diperbolehkan");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("file", file);

    await axios.post("/api/items", formData);

    setSuccess("✅ File berhasil diupload!");
    setName("");
    setEmail("")
    setFile(null);
    fetchData();
  } catch (err) {
    setError("❌ Upload gagal, coba lagi");
  }
};

  const deleteItem = async (id) => {
    await axios.delete(`/api/items/${id}`);
    fetchData();
  };

    const startEdit = (item) => {
      setEditingId(item.id);
      setEditName(item.name);
      setEditEmail(item.email);
      setEditFile(null);
  };

  const updateItem = async (id) => {
  setError("");
  setSuccess("");

  try {
    const formData = new FormData();
    formData.append("name", editName);

    if (editFile) {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

      if (!allowedTypes.includes(editFile.type)) {
        setError("❌ Hanya JPG/JPEG/PNG");
        return;
      }

      formData.append("email", editEmail)
      formData.append("file", editFile);
    }

    await axios.put(`/api/items/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    setSuccess("✅ Data berhasil diupdate");
    setEditingId(null);
    fetchData();
  } catch (err) {
    console.error("UPDATE ERROR:", err?.response?.data || err.message);
    setError("❌ Update gagal");
  }
};

  useEffect(() => {
    fetchData();
  }, []);

  return (
  <div className="container">
    {error && <div className="popup error">{error}</div>}
    {success && <div className="popup success">{success}</div>}
    
      <h1>🚀 User Management System</h1>
   
    <div className="card">
      <input
        placeholder="Nama item..."
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="example123@gmail.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={addItem}>Tambah</button>
    </div>

    <div className="list">
      {items.map((item) => (
        <div className="item" key={item.id}>
          {editingId === item.id ? (
            <>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)} 
              />

              <input
                type="file"
                onChange={(e) => setEditFile(e.target.files[0])}
              />

              <div className="item-actions">
                <button
                  className="save-btn"
                  onClick={() => updateItem(item.id)}
                >
                  💾 Save
                </button>

                <button
                  className="cancel-btn"
                  onClick={() => setEditingId(null)}
                >
                  ❌ Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <span>{item.name}</span>
              <span>{item.email}</span>

              <div className="item-actions">
                <button
                  className="edit-btn"
                  onClick={() => startEdit(item)}
                >
                  ✏️
                </button>

                <button
                  className="delete-btn"
                  onClick={() => deleteItem(item.id)}
                >
                  ❌
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
)};

export default App;