import Button from '../../components/Button'
import Input from '../../components/input'
import { useForm } from 'react-hook-form'
import { type Schema } from '../../utils/rules'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LoginAccount } from '../../apis/auth.api'

type FormData = Pick<Schema, 'username' | 'password'>

export default function Login() {
  const year = new Date().getFullYear()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({})
  const loginAccountMutation = useMutation({
    mutationFn: (body: FormData) => LoginAccount(body)
  })
  const onSubmit = handleSubmit((body) => {
    loginAccountMutation.mutate(body, {
      onSuccess: (data) => {
        console.log('data', data.data)
        const res = data.data.result
        if (res) {
          localStorage.setItem('access_token', res.access_token)
          localStorage.setItem('refresh_token', res.refresh_token)
          console.log('access_token', res.access_token)
          console.log('refresh_token', res.refresh_token)
        } else {
          console.error('Response data is undefined')
        }
        navigate('/chatbox')
      },
      onError: (error) => {
        console.log('error', error)
      }
    })
  })
  return (
    <>
      <div className='min-h-screen flex items-center justify-center bg-gray-200 min-w-[375px]'>
        <div className='bg-white p-8 rounded-lg w-full max-w-md shadow-2xl'>
          <div className='w-40 h-33 mx-auto'>{/* <img src='/logo.png' alt='Workflow' /> */}</div>
          <h1 className='text-2xl font-bold mb-6 text-center'>Sign In</h1>
          <form onSubmit={onSubmit}>
            <div className='mb-1'>
              <label htmlFor='email' className='block text-sm font-medium text-gray-700'>
                User Name
              </label>
              <Input
                name='username'
                register={register}
                type='email'
                id='email'
                placeholder='Enter your User Name'
                errorMessage={errors.username?.message}
              />
            </div>
            <div className='mb-4'>
              <label htmlFor='password' className='block text-sm font-medium text-gray-700'>
                Password
              </label>
              <Input
                name='password'
                register={register}
                type='password'
                id='password'
                placeholder='Enter your password'
                errorMessage={errors.password?.message}
              />
              <div className='pr-1'>
                <p className='text-sm text-gray-600 text-right'>
                  Don't have an account?{' '}
                  <a href='/register' className='font-medium text-blue-400 hover:text-blue-400'>
                    Sign up
                  </a>
                </p>
              </div>
            </div>
            <Button
              onClick={onSubmit}
              className='w-full flex justify-center py-2 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-blue-400 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            >
              Sign in
            </Button>
          </form>
          <div className='relative flex items-center my-6'>
            <div className='flex-grow border-t border-gray-300'></div>
            <span className='flex-shrink mx-4 text-gray-500'>or</span>
            <div className='flex-grow border-t border-gray-300'></div>
          </div>
          <button className='w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mb-4'>
            <img src='https://www.google.com/favicon.ico' alt='Google' className='w-4 h-4 mr-2' />
            Sign in with Google
          </button>
          {/* <button className='w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mb-4'>
          Sign in with Single Sign On
        </button> */}
          <p className='mt-6 text-center text-sm text-gray-600'>© {year} Dat Trang. All Rights Reserved.</p>
        </div>
      </div>
    </>
  )
}
