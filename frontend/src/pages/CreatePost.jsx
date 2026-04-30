import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/client';

export default function CreatePost() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/api/content', { project_id: projectId, title, prompt });
      navigate(`/projects/${projectId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-post">
      <h2>Generate New Post</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Describe the content to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>
    </div>
  );
}
