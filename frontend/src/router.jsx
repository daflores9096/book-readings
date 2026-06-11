import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import { HomeRedirect, RequireAuth, RequireRole } from './auth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import ChallengesPage from './pages/ChallengesPage.jsx';
import LibraryPage from './pages/LibraryPage.jsx';
import AddBookPage from './pages/AddBookPage.jsx';
import ManualBookPage from './pages/ManualBookPage.jsx';
import BookDetailPage from './pages/BookDetailPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'home', element: <HomePage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'friends', element: <FriendsPage /> },
      { path: 'challenges', element: <ChallengesPage /> },
      { path: 'books/add', element: <AddBookPage /> },
      { path: 'books/add/manual', element: <ManualBookPage /> },
      { path: 'books/:userBookId', element: <BookDetailPage /> },
      {
        path: 'users',
        element: (
          <RequireRole roles={['admin']}>
            <UsersPage />
          </RequireRole>
        ),
      },
      { path: '*', element: <Navigate to="/library" replace /> },
    ],
  },
]);
