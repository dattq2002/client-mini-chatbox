/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useCallback } from 'react'
import { SearchAllUser, GetAllMessage } from '../../apis/user.api'
import { io, Socket } from 'socket.io-client'

type Message = {
  id: number | string
  sender: string
  senderId: string
  time: string
  text: string
}

export default function Chatbox() {
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentUserId = localStorage.getItem('user_id')
  // const currentUsername = localStorage.getItem('username')
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Khởi tạo socket connection
  useEffect(() => {
    if (!currentUserId) return

    const newSocket = io('http://localhost:4000', {
      auth: {
        token: localStorage.getItem('access_token'),
        userId: currentUserId
      }
    })

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server')
      setIsConnected(true)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server')
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [currentUserId])

  // Xử lý socket events
  useEffect(() => {
    if (!socket || !currentUserId) return
    socket.on('updateOnlineUsers', (onlineIds: string[]) => {
      setOnlineUserIds(onlineIds)
    })
    // Lắng nghe tin nhắn mới
    const handleReceiveMessage = (message: any) => {
      console.log('Received new message:', message)

      // Chỉ hiển thị tin nhắn nếu thuộc phòng hiện tại
      if (currentRoom && message.roomId === currentRoom) {
        setMessages((prev) => {
          // Kiểm tra tin nhắn đã tồn tại chưa
          const messageExists = prev.some((msg) => {
            if (msg.id === message._id) return true

            // Kiểm tra tin nhắn duplicate dựa trên nội dung và thời gian
            const timeDiff = Math.abs(new Date(msg.time).getTime() - new Date(message.timestamp).getTime())
            return (
              msg.senderId === message.senderId && msg.text === message.content && timeDiff < 2000 // 2 giây
            )
          })

          if (messageExists) {
            console.log('Message already exists, skipping...')
            return prev
          }

          const newMessage: Message = {
            id: message._id || Date.now(),
            sender: message.senderId === currentUserId ? 'Bạn' : selectedUser?.name || 'Unknown',
            senderId: message.senderId,
            time: new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            text: message.content
          }

          console.log('Adding new message:', newMessage)
          return [...prev, newMessage]
        })
      }
    }

    // Xử lý typing events
    const handleUserTyping = (data: { userId: string; roomId: string }) => {
      console.log('User typing:', data)
      if (selectedUser && data.userId === selectedUser.id && data.roomId === currentRoom) {
        setIsTyping(true)
        // Tự động tắt typing sau 3 giây
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false)
        }, 3000)
      }
    }

    const handleUserStopTyping = (data: { userId: string; roomId: string }) => {
      console.log('User stop typing:', data)
      if (selectedUser && data.userId === selectedUser.id && data.roomId === currentRoom) {
        setIsTyping(false)
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
      }
    }

    // Đăng ký event listeners
    socket.on('receiveMessage', handleReceiveMessage)
    socket.on('userTyping', handleUserTyping)
    socket.on('userStopTyping', handleUserStopTyping)

    // Cleanup
    return () => {
      socket.off('receiveMessage', handleReceiveMessage)
      socket.off('userTyping', handleUserTyping)
      socket.off('userStopTyping', handleUserStopTyping)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [socket, selectedUser, currentUserId, currentRoom])

  // Xử lý typing với debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)

    if (!socket || !selectedUser || !currentUserId || !currentRoom) return

    // Gửi typing event
    socket.emit('typing', { roomId: currentRoom, userId: currentUserId })

    // Clear timeout cũ và tạo timeout mới
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Sau 1 giây không nhập gì thì gửi stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { roomId: currentRoom, userId: currentUserId })
    }, 1000)
  }

  const handleSend = useCallback(() => {
    if (!input.trim() || !selectedUser || !socket || !currentUserId || !currentRoom) {
      console.log('Cannot send message:', {
        input: !!input.trim(),
        selectedUser: !!selectedUser,
        socket: !!socket,
        currentUserId: !!currentUserId,
        currentRoom: !!currentRoom
      })
      return
    }

    // Tạo message data để gửi
    const messageData = {
      roomId: currentRoom,
      senderId: currentUserId,
      receiverId: selectedUser.id,
      content: input.trim(),
      timestamp: new Date().toISOString()
    }

    console.log('Sending message:', messageData)

    // Gửi tin nhắn qua socket - server sẽ broadcast lại cho tất cả
    socket.emit('sendMessage', messageData)

    // Clear input
    setInput('')

    // Gửi stop typing
    socket.emit('stopTyping', { roomId: currentRoom, userId: currentUserId })
  }, [input, selectedUser, socket, currentUserId, currentRoom])

  // Xử lý khi chọn người dùng để chat
  const handleSelectUser = async (user: any) => {
    if (!socket || !currentUserId) return

    setIsTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    const roomId = [currentUserId, user.id].sort().join('_')
    setCurrentRoom(roomId)
    console.log('Joining room:', roomId)

    try {
      const response = await GetAllMessage({
        senderId: currentUserId,
        receiverId: user.id
      })

      console.log('API Response:', response.data)

      const messages = response.data?.users && Array.isArray(response.data.users) ? response.data.users : []

      const formattedMessages = messages
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((msg: any) => ({
          id: msg._id,
          sender: msg.senderId === currentUserId ? 'Bạn' : user.name,
          senderId: msg.senderId,
          time: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          text: msg.content,
          timestamp: msg.timestamp // Lưu timestamp để sắp xếp sau
        }))

      console.log('Formatted Messages:', formattedMessages)
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    }

    socket.emit('joinRoom', { roomId, userId: currentUserId })
    setSelectedUser(user)
  }

  const handleLogout = () => {
    if (socket) {
      socket.disconnect()
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('username')
    window.location.href = '/'
  }

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value
    setSearch(keyword)

    try {
      const allUsers = await SearchAllUser()
      const filteredUsers = allUsers.data.user.users.filter(
        (user: any) => user.username.toLowerCase().includes(keyword.toLowerCase()) && user._id !== currentUserId
      )

      const mappedUsers = filteredUsers.map((user: any) => ({
        id: user._id,
        name: user.username,
        message: 'Bấm để bắt đầu trò chuyện',
        time: 'now',
        online: onlineUserIds.includes(user._id),
        avatar: `https://i.pravatar.cc/50?u=${user._id}`
      }))
      setUsers(mappedUsers)
    } catch (error) {
      console.error('Lỗi tìm kiếm user:', error)
    }
  }

  // Load danh sách users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await SearchAllUser()
        console.log('allUsers:', allUsers.data.user.users)

        // Loại bỏ user hiện tại khỏi danh sách
        const filteredUsers = allUsers.data.user.users.filter((user: any) => user._id !== currentUserId)

        const mappedUsers = filteredUsers.map((user: any) => ({
          id: user._id,
          name: user.username,
          message: 'Bấm để bắt đầu trò chuyện',
          time: 'now',
          online: onlineUserIds.includes(user._id),
          avatar: `https://i.pravatar.cc/50?u=${user._id}`
        }))
        setUsers(mappedUsers)
      } catch (err) {
        console.error('Lỗi khi lấy danh sách user:', err)
      }
    }

    if (currentUserId) {
      fetchUsers()
    }
  }, [currentUserId, onlineUserIds])

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className='h-screen w-screen flex text-white font-sans'>
      {/* Sidebar */}
      <div className='w-[320px] bg-[#1E1E1E] p-4 flex flex-col'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold'>Chats</h1>
          <div className='flex items-center gap-2'>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className='text-xs'>{isConnected ? 'Online' : 'Offline'}</span>
            <button className='text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded' onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
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
              onClick={() => handleSelectUser(user)}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#333] ${
                selectedUser?.id === user.id ? 'bg-[#333]' : ''
              }`}
            >
              <div className='relative'>
                <img src={user.avatar} alt={user.name} className='w-10 h-10 rounded-full' />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#1E1E1E] rounded-full ${
                    user.online ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                  title={user.online ? 'Online' : 'Offline'}
                ></span>
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
              <img src={selectedUser.avatar} alt={selectedUser.name} className='w-10 h-10 rounded-full' />
              <div>
                <div className='font-semibold'>{selectedUser.name}</div>
                <div className='text-sm text-gray-400'>
                  {isTyping ? 'Đang nhập tin nhắn...' : selectedUser.online ? 'Online' : 'Offline'}
                </div>
              </div>
              {/* <div className='ml-auto text-xs text-gray-500'>Room: {currentRoom}</div> */}
            </div>

            {/* Messages */}
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              {messages.length === 0 ? (
                <div className='flex items-center justify-center h-full text-gray-400'>
                  Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={`${msg.id}-${index}`}
                    className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${msg.senderId === currentUserId ? 'order-2' : 'order-1'}`}>
                      <div className='text-center text-xs text-gray-500 mb-1'>{msg.time}</div>
                      <div
                        className={`p-3 rounded-lg whitespace-pre-wrap ${
                          msg.senderId === currentUserId ? 'bg-blue-600 text-white' : 'bg-[#333] text-white'
                        }`}
                      >
                        <div className='text-xs text-gray-300 mb-1'>{msg.sender}</div>
                        <p className='text-sm'>{msg.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className='p-3 border-t border-[#333] flex items-center'>
              <input
                type='text'
                placeholder='Aa'
                className='flex-1 px-4 py-2 rounded-full bg-[#2A2A2A] text-white outline-none'
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                className='ml-2 text-blue-500 hover:text-blue-400 disabled:text-gray-500'
                onClick={handleSend}
                disabled={!input.trim() || !selectedUser || !socket || !isConnected}
              >
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
