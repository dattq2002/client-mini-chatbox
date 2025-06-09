/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { SearchAllUser } from '../../apis/user.api'

type Message = {
  id: number
  sender: string
  time: string
  text: string
}
export default function Chatbox() {
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<any[]>([])

  const handleSend = () => {
    if (!input.trim()) return
    const newMessage = {
      id: messages.length + 1,
      sender: 'Bạn',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: input
    }
    setMessages((prev) => [...prev, newMessage])
    setInput('')

    setTimeout(() => {
      const botReply = {
        id: messages.length + 2,
        sender: 'ChatBot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Bạn vừa nói: "${input}". Đây là phản hồi tự động.`
      }
      setMessages((prev) => [...prev, botReply])
    }, 1000)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    window.location.href = '/'
  }

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value
    setSearch(keyword)

    try {
      const allUsers = await SearchAllUser()
      const filteredUsers = allUsers.data.user.users.filter((user: any) =>
        user.username.toLowerCase().includes(keyword.toLowerCase())
      )

      const mappedUsers = filteredUsers.map((user: any) => ({
        id: user._id,
        name: user.username,
        message: 'Bấm để bắt đầu trò chuyện',
        time: 'now',
        online: true,
        avatar: `https://i.pravatar.cc/50?u=${user._id}`
      }))
      setUsers(mappedUsers)
    } catch (error) {
      console.error('Lỗi tìm kiếm user:', error)
    }
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await SearchAllUser()
        console.log('allUsers:', allUsers.data.user.users)
        const mappedUsers = allUsers.data.user.users.map((user: any) => ({
          id: user._id,
          name: user.username,
          message: 'Bấm để bắt đầu trò chuyện',
          time: 'now',
          online: true,
          avatar: `https://i.pravatar.cc/50?u=${user._id}`
        }))
        setUsers(mappedUsers)
      } catch (err) {
        console.error('Lỗi khi lấy danh sách user:', err)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className='h-screen w-screen flex text-white font-sans'>
      {/* Sidebar */}
      <div className='w-[320px] bg-[#1E1E1E] p-4 flex flex-col'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold'>Chats</h1>
          <button className='text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded' onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
        <input
          type='text'
          value={search}
          onChange={handleSearch}
          placeholder='Search Messenger'
          className='p-2 mb-4 rounded-md bg-[#3A3A3A] text-white outline-none'
        />
        <div className='flex-1 overflow-y-auto space-y-2'>
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#333] ${
                selectedUser?.id === user.id ? 'bg-[#333]' : ''
              }`}
            >
              <div className='relative'>
                <img src={user.avatar} className='w-10 h-10 rounded-full' />
                {user.online && (
                  <span className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1E1E1E] rounded-full'></span>
                )}
              </div>
              <div className='flex-1'>
                <div className='font-semibold truncate'>{user.name}</div>
                <div className='text-sm text-gray-400 truncate'>{user.message}</div>
              </div>
              <div className='text-xs text-gray-400'>{user.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat View */}
      <div className='flex-1 bg-[#101010] flex flex-col'>
        {selectedUser ? (
          <>
            {/* Header */}
            <div className='flex items-center gap-3 px-4 py-2 border-b border-[#333]'>
              <img src={selectedUser.avatar} className='w-10 h-10 rounded-full' />
              <div>
                <div className='font-semibold'>{selectedUser.name}</div>
                <div className='text-sm text-gray-400'>{selectedUser.message}</div>
              </div>
            </div>

            {/* Messages */}
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className='text-center text-xs text-gray-500 mb-2'>{msg.time}</div>
                  <div
                    className={`p-3 rounded-lg whitespace-pre-wrap max-w-[70%] ${
                      msg.sender === 'Bạn' ? 'bg-blue-600 ml-auto' : 'bg-[#333]'
                    }`}
                  >
                    <strong>{msg.sender}</strong>
                    <p className='text-sm mt-1'>{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className='p-3 border-t border-[#333] flex items-center'>
              <input
                type='text'
                placeholder='Aa'
                className='flex-1 px-4 py-2 rounded-full bg-[#2A2A2A] text-white outline-none'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button className='ml-2 text-blue-500' onClick={handleSend}>
                Gửi
              </button>
            </div>
          </>
        ) : (
          <div className='flex-1 flex items-center justify-center text-gray-400 text-xl'>
            Chọn một người để bắt đầu trò chuyện
          </div>
        )}
      </div>
    </div>
  )
}
