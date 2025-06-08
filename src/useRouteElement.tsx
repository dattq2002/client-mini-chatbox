import { useRoutes } from 'react-router-dom'
import Register from './pages/register'
import Login from './pages/login'
import Chatbox from './pages/chatbox'

export default function useRouteElement() {
  const routeElement = useRoutes([
    {
      path: '/',
      element: <Login />
    },
    {
      path: '/register',
      element: <Register />
    },
    {
      path: '/chatbox',
      element: <Chatbox />
    }
  ])
  return routeElement
}
