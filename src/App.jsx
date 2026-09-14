import { Routes, Route } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import BookDetail from './pages/BookDetail';
import MyBorrows from './pages/MyBorrows';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import BorrowRequests from './pages/admin/BorrowRequests';
import Returns from './pages/admin/Returns';
import ManageBooks from './pages/admin/ManageBooks';
import ManageUsers from './pages/admin/ManageUsers';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={
        <PrivateRoute><Home /></PrivateRoute>
      } />
      <Route path="/books/:id" element={
        <PrivateRoute><BookDetail /></PrivateRoute>
      } />
      <Route path="/my-borrows" element={
        <PrivateRoute><MyBorrows /></PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute><Profile /></PrivateRoute>
      } />

      <Route path="/admin/dashboard" element={
        <PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>
      } />
      <Route path="/admin/borrow-requests" element={
        <PrivateRoute adminOnly><BorrowRequests /></PrivateRoute>
      } />
      <Route path="/admin/returns" element={
        <PrivateRoute adminOnly><Returns /></PrivateRoute>
      } />
      <Route path="/admin/manage-books" element={
        <PrivateRoute adminOnly><ManageBooks /></PrivateRoute>
      } />
      <Route path="/admin/manage-users" element={
        <PrivateRoute adminOnly><ManageUsers /></PrivateRoute>
      } />
    </Routes>
  );
}
