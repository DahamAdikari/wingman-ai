import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import ClientView from './pages/ClientView';
import ProtectedRoute from './components/common/ProtectedRoute';
import { ROLES } from './utils/roles';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={[ROLES.MANAGER, ROLES.TEAM_MEMBER]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute roles={[ROLES.MANAGER, ROLES.TEAM_MEMBER]}>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/:projectId/posts/new"
          element={
            <ProtectedRoute roles={[ROLES.MANAGER, ROLES.TEAM_MEMBER]}>
              <CreatePost />
            </ProtectedRoute>
          }
        />

        <Route
          path="/posts/:id"
          element={
            <ProtectedRoute>
              <PostDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client"
          element={
            <ProtectedRoute roles={[ROLES.CLIENT]}>
              <ClientView />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
