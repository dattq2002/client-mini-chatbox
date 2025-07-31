import { useEffect, useState, useRef, useCallback } from 'react'
import { SearchAllUser, GetAllMessage } from '../../apis/user.api'
import { io, Socket } from 'socket.io-client'
import { Mic } from 'lucide-react'

type Message = {
  id: number | string
  sender: string
  senderId: string
  time: string
  text: string
  audioUrl?: string
  messageType: 'text' | 'voice'
}

type User = {
  id: string
  username: string
  name: string
  online: boolean
  avatar: string
  message?: string // Thêm thuộc tính message
  time?: string // Thêm thuộc tính time
}

type MessageData = {
  _id: string
  senderId: string
  createdAt: string
  content: string
  audioUrl?: string
  type: 'text' | 'voice'
  roomId?: string // Thêm thuộc tính roomId
}

type ApiUser = {
  _id: string
  username: string
}

export default function Chatbox() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const receivedAudioChunksRef = useRef<Map<string, ArrayBuffer[]>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)

  const currentUserId = localStorage.getItem('user_id')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Socket connection setup
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

  // Socket event handlers

  useEffect(() => {
    if (!socket || !currentUserId) return

    socket.on('updateOnlineUsers', (onlineIds: string[]) => {
      setOnlineUserIds(onlineIds)
    })

    const handleReceiveAudioChunk = (data: {
      chunk: ArrayBuffer
      senderId: string
      roomId: string
      audioId: string
      isFinal?: boolean
    }) => {
      if (data.roomId === currentRoom && data.senderId !== currentUserId) {
        console.log('Received audio chunk:', data.audioId, 'isFinal:', data.isFinal)

        // Store chunks for this audio message
        if (!receivedAudioChunksRef.current.has(data.audioId)) {
          receivedAudioChunksRef.current.set(data.audioId, [])
        }
        receivedAudioChunksRef.current.get(data.audioId)!.push(data.chunk)

        // If final chunk, play the complete audio
        if (data.isFinal) {
          playReceivedAudio(data.audioId)
        }
      }
    }

    const playReceivedAudio = async (audioId: string) => {
      try {
        const chunks = receivedAudioChunksRef.current.get(audioId)
        if (!chunks || chunks.length === 0) return

        // Combine all chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
        const combinedBuffer = new ArrayBuffer(totalLength)
        const combinedView = new Uint8Array(combinedBuffer)

        let offset = 0
        for (const chunk of chunks) {
          const chunkView = new Uint8Array(chunk)
          combinedView.set(chunkView, offset)
          offset += chunk.byteLength
        }

        // Create and play audio
        const audioContext = audioContextRef.current || new AudioContext()
        audioContextRef.current = audioContext

        const audioBuffer = await audioContext.decodeAudioData(combinedBuffer)
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)
        source.start()

        // Clean up
        receivedAudioChunksRef.current.delete(audioId)
        console.log('Audio played successfully')
      } catch (error) {
        console.error('Error playing received audio:', error)
      }
    }

    socket.on('receiveAudioChunk', handleReceiveAudioChunk)

    const handleReceiveMessage = (message: MessageData) => {
      console.log('Received new message:', message)

      if (currentRoom && message.roomId === currentRoom) {
        setMessages((prev) => {
          const messageExists = prev.some((msg) => msg.id === message._id)
          if (messageExists) {
            console.log('Message already exists, skipping...')
            return prev
          }

          const newMessage: Message = {
            id: message._id || Date.now(),
            sender: message.senderId === currentUserId ? 'Bạn' : selectedUser?.name || 'Unknown',
            senderId: message.senderId,
            time: new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            text: message.content || '',
            audioUrl: message.audioUrl,
            messageType: message.type
          }

          console.log('Adding new message:', newMessage)
          return [...prev, newMessage]
        })
      }
    }

    const handleUserTyping = (data: { userId: string; roomId: string }) => {
      if (selectedUser && data.userId === selectedUser.id && data.roomId === currentRoom) {
        setIsTyping(true)
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false)
        }, 3000)
      }
    }

    const handleUserStopTyping = (data: { userId: string; roomId: string }) => {
      if (selectedUser && data.userId === selectedUser.id && data.roomId === currentRoom) {
        setIsTyping(false)
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
      }
    }

    socket.on('receiveMessage', handleReceiveMessage)
    socket.on('userTyping', handleUserTyping)
    socket.on('userStopTyping', handleUserStopTyping)

    return () => {
      socket.off('receiveMessage', handleReceiveMessage)
      socket.off('userTyping', handleUserTyping)
      socket.off('userStopTyping', handleUserStopTyping)
      socket.off('receiveAudioChunk', handleReceiveAudioChunk)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [socket, selectedUser, currentUserId, currentRoom])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)

    if (!socket || !selectedUser || !currentUserId || !currentRoom) return

    socket.emit('typing', { roomId: currentRoom, userId: currentUserId })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { roomId: currentRoom, userId: currentUserId })
    }, 1000)
  }

  const handleSend = useCallback(() => {
    if (!input.trim() || !selectedUser || !socket || !currentUserId || !currentRoom) {
      return
    }

    const messageData = {
      roomId: currentRoom,
      senderId: currentUserId,
      receiverId: selectedUser.id,
      content: input.trim(),
      timestamp: new Date().toISOString(),
      messageType: 'text' as const
    }

    socket.emit('sendMessage', messageData)
    setInput('')
    socket.emit('stopTyping', { roomId: currentRoom, userId: currentUserId })
  }, [input, selectedUser, socket, currentUserId, currentRoom])

  const handleSelectUser = async (user: User) => {
    if (!socket || !currentUserId) return

    setIsTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    const roomId = [currentUserId, user.id].sort().join('_')
    setCurrentRoom(roomId)

    try {
      const response = await GetAllMessage({
        senderId: currentUserId,
        receiverId: user.id
      })

      const messages = response.data?.users && Array.isArray(response.data.users) ? response.data.users : []

      const formattedMessages = messages
        .sort((a: MessageData, b: MessageData) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((msg: MessageData) => ({
          id: msg._id,
          sender: msg.senderId === currentUserId ? 'Bạn' : user.name,
          senderId: msg.senderId,
          time: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          text: msg.content,
          audioUrl: msg.audioUrl,
          messageType: msg.type
        }))

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
      const usersFromApi: User[] = allUsers.data.user.users.map((user: ApiUser) => ({
        id: user._id,
        username: user.username,
        name: user.username,
        online: false, // Giá trị mặc định nếu không có từ API
        avatar: `https://i.pravatar.cc/50?u=${user._id}`
      }))

      const filteredUsers: User[] = usersFromApi.filter((user) => user.id !== currentUserId)

      const mappedUsers: User[] = filteredUsers.map((user) => ({
        ...user,
        message: 'Bấm để bắt đầu trò chuyện',
        time: 'now',
        online: onlineUserIds.includes(user.id)
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
        const filteredUsers = allUsers.data.user.users.filter((user: ApiUser) => user._id !== currentUserId)

        const mappedUsers = filteredUsers.map((user: ApiUser) => ({
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

  // Cleanup on unmount
  useEffect(() => {
    // Store refs in variables at effect creation time
    const typingTimeout = typingTimeoutRef.current
    const audioStream = audioStreamRef.current
    const recordingTimer = recordingTimerRef.current
    const audioContext = audioContextRef.current
    const websocket = wsRef.current
    const mediaRecorder = mediaRecorderRef.current

    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }

      // Stop MediaRecorder if it exists (fallback)
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }

      // Stop Web Audio processing
      if (audioContext) {
        const audioContextWithProcessor = audioContext as AudioContext & { processor?: ScriptProcessorNode }
        if (audioContextWithProcessor.processor) {
          audioContextWithProcessor.processor.disconnect()
          delete audioContextWithProcessor.processor
        }
        audioContext.close()
      }

      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
      }
      if (recordingTimer) {
        clearInterval(recordingTimer)
      }
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close()
      }
    }
  }, [])

  const handleRealTimeAudio = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert('Trình duyệt không hỗ trợ ghi âm.')
      return
    }

    if (!socket || !currentRoom || !selectedUser || !currentUserId) {
      alert('Vui lòng chọn người nhận trước khi ghi âm.')
      return
    }

    if (!isRecording) {
      try {
        // Start WebSocket connection
        const ws = new WebSocket('ws://127.0.0.1:8000/ws/real-time-transcribe/')
        wsRef.current = ws

        ws.onopen = () => {
          console.log('[CLIENT] WebSocket connection established')
        }

        ws.onmessage = (event) => {
          console.log('[CLIENT] Real-time transcription:', event.data)

          // Hiển thị transcription trong chat
          const messageData: Message = {
            id: Date.now(),
            sender: 'Bạn',
            senderId: currentUserId,
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            text: event.data,
            audioUrl: undefined,
            messageType: 'text'
          }

          setMessages((prev) => [...prev, messageData])
        }

        ws.onerror = (error) => {
          console.error('[CLIENT] WebSocket error:', error)
          // Stop recording if WebSocket fails
          if (isRecording) {
            setIsRecording(false)
            setRecordingTime(0)
          }
        }

        ws.onclose = (event) => {
          console.log('[CLIENT] WebSocket connection closed:', event.code, event.reason)
          wsRef.current = null
        }

        // Start audio recording
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000 // Set to match the server config
          }
        })

        const audioContext = new AudioContext({ sampleRate: 16000 })
        audioContextRef.current = audioContext
        audioStreamRef.current = stream

        console.log('Starting real-time recording with Web Audio API')

        let chunkCounter = 0
        const CHUNK_SIZE = 16000 // ~1 seconds at 16kHz

        // Use Web Audio API for direct PCM capture
        const source = audioContext.createMediaStreamSource(stream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)

        let audioBuffer: Float32Array[] = []
        let bufferSampleCount = 0

        processor.onaudioprocess = (event) => {
          // Check if WebSocket is still valid and open
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not available, skipping audio processing')
            return
          }

          const inputBuffer = event.inputBuffer
          const inputData = inputBuffer.getChannelData(0)

          // Copy input data to our buffer
          const chunk = new Float32Array(inputData.length)
          chunk.set(inputData)
          audioBuffer.push(chunk)
          bufferSampleCount += inputData.length

          // When we have enough samples, send a chunk
          if (bufferSampleCount >= CHUNK_SIZE) {
            chunkCounter++

            // Combine buffer chunks into single array
            const combinedBuffer = new Float32Array(bufferSampleCount)
            let offset = 0
            for (const bufferChunk of audioBuffer) {
              combinedBuffer.set(bufferChunk, offset)
              offset += bufferChunk.length
            }

            // Double-check WebSocket before sending
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              // Send PCM data
              const pcmBuffer = combinedBuffer.buffer
              wsRef.current.send(pcmBuffer)
              console.log(`[CLIENT] Sent PCM chunk #${chunkCounter} to server:`, bufferSampleCount, 'samples')
            } else {
              console.log('WebSocket closed, stopping audio processing')
              return
            }

            // Reset buffer
            audioBuffer = []
            bufferSampleCount = 0
          }
        }

        // Connect audio nodes
        source.connect(processor)
        processor.connect(audioContext.destination)

        // Store processor reference for cleanup
        audioContextRef.current = audioContext
        // Store processor for cleanup (we'll handle this in stop logic)
        const audioContextWithProcessor = audioContextRef.current as AudioContext & { processor?: ScriptProcessorNode }
        audioContextWithProcessor.processor = processor
        setIsRecording(true)
        setRecordingTime(0)

        // Timer for recording duration
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1)
        }, 1000)
      } catch (error) {
        console.error('Error starting recording:', error)
        alert('Không thể bắt đầu ghi âm. Hãy thử lại.')
      }
    } else {
      // Stop recording - Web Audio API version
      console.log('Stopping real-time recording')

      // Update UI state first to prevent further interactions
      setIsRecording(false)
      setRecordingTime(0)

      // Close WebSocket first to stop accepting new data
      if (wsRef.current) {
        console.log('WebSocket state before close:', wsRef.current.readyState)
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          console.log('Closing WebSocket connection')
          wsRef.current.close()
        }
        wsRef.current = null
        console.log('WebSocket reference cleared')
      }

      // Stop Web Audio processing
      if (audioContextRef.current) {
        const audioContextWithProcessor = audioContextRef.current as AudioContext & { processor?: ScriptProcessorNode }
        if (audioContextWithProcessor.processor) {
          console.log('Disconnecting audio processor')
          audioContextWithProcessor.processor.disconnect()
          delete audioContextWithProcessor.processor
        }
      }

      // Stop audio stream
      if (audioStreamRef.current) {
        console.log('Stopping audio tracks')
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop()
          console.log('Stopped track:', track.kind)
        })
        audioStreamRef.current = null
      }

      // Clear timer
      if (recordingTimerRef.current) {
        console.log('Clearing recording timer')
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }

      console.log('Recording stopped successfully')
    }
  }

  return (
    <div className='h-screen w-screen flex text-white font-sans'>
      <div className='w-[320px] bg-white p-4 flex flex-col'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold text-black'>Chats</h1>
          <div className='flex items-center gap-2'>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className='text-xs text-black'>{isConnected ? 'Online' : 'Offline'}</span>
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
          className='p-2 mb-4 rounded-md text-black outline-none border border-gray-800 bg-white'
        />
        <div className='flex-1 overflow-y-auto space-y-2'>
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer text-black ${
                selectedUser?.id === user.id ? 'bg-gray-300 border border-blue-500' : ''
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

      <div className='flex-1 bg-[#ecebeb] flex flex-col border-l border-[#333]'>
        {selectedUser ? (
          <>
            <div className='flex items-center gap-3 px-4 py-2 border-b border-[#333]'>
              <img src={selectedUser.avatar} alt={selectedUser.name} className='w-10 h-10 rounded-full' />
              <div>
                <div className='font-semibold text-black'>{selectedUser.name}</div>
                <div className='text-sm text-black'>
                  {isTyping ? 'Đang nhập tin nhắn...' : selectedUser.online ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>

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
                          msg.senderId === currentUserId ? ' text-black border border-black' : 'bg-[#333] text-white'
                        }`}
                      >
                        <div className='text-xs text-black mb-1'>{msg.sender}</div>
                        {msg.messageType === 'voice' && msg.audioUrl ? (
                          <audio controls className='w-full rounded-md'>
                            <source src={`http://localhost:4000${msg.audioUrl}`} type='audio/webm' />
                            Trình duyệt của bạn không hỗ trợ audio.
                          </audio>
                        ) : (
                          <p className='text-sm'>{msg.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className='p-3 border-t border-[#333] flex items-center'>
              <button
                className={`text-gray-400 hover:text-white mr-2 ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                onClick={handleRealTimeAudio}
                disabled={!selectedUser || !socket || !isConnected}
                title={isRecording ? 'Dừng ghi âm' : 'Ghi âm'}
              >
                <Mic size={24} />
                {isRecording && <span className='ml-1 text-xs'>{recordingTime}s</span>}
              </button>

              <input
                type='text'
                placeholder='Aa'
                className='flex-1 px-4 py-2 rounded-full border border-black text-black outline-none'
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                className='ml-2 text-black hover:text-gray-400 disabled:text-gray-500'
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
