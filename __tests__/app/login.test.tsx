// FILE: __tests__/app/login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';

// Mock next/navigation after imports - this is required for jest.setup.js to export actual mock functions
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    forward: jest.fn(),
  }),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
  usePathname: jest.fn().mockReturnValue('/login'),
  redirect: jest.fn(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// lucide-react icons render fine in jsdom – no need to mock them

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: successful login response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
      }),
    });
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<LoginPage />);
    });

    it('shows the application title', async () => {
      render(<LoginPage />);
      await screen.findByText('Agri AI');
    });

    it('shows the system subtitle', async () => {
      render(<LoginPage />);
      await screen.findByText('EC統合管理システム');
    });

    it('shows the login heading', async () => {
      render(<LoginPage />);
      await screen.findByText('アカウントにログイン');
    });

    it('renders username input field', async () => {
      render(<LoginPage />);
      const input = await screen.findByLabelText('ユーザー名');
      expect(input).toBeInTheDocument();
    });

    it('renders password input field', async () => {
      render(<LoginPage />);
      const input = await screen.findByLabelText('パスワード');
      expect(input).toBeInTheDocument();
    });

    it('renders Remember Me checkbox', async () => {
      render(<LoginPage />);
      const checkbox = await screen.findByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('renders submit button with login label', async () => {
      render(<LoginPage />);
      const button = await screen.findByRole('button', { name: 'ログイン' });
      expect(button).toBeInTheDocument();
    });

    it('shows login help text', async () => {
      render(<LoginPage />);
      await screen.findByText(/ユーザーIDとパスワードがご不明な場合は、/);
    });

    it('shows security feature description', async () => {
      render(<LoginPage />);
      await screen.findByText(/パスワードハッシュ化/);
    });

    it('password field is type password by default', async () => {
      render(<LoginPage />);
      const input = await screen.findByLabelText('パスワード');
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('form interactions', () => {
    it('allows typing in username field', async () => {
      render(<LoginPage />);
      const input = await screen.findByLabelText('ユーザー名');
      fireEvent.change(input, { target: { value: 'admin' } });
      expect(input).toHaveValue('admin');
    });

    it('allows typing in password field', async () => {
      render(<LoginPage />);
      const input = await screen.findByLabelText('パスワード');
      fireEvent.change(input, { target: { value: 'secret123' } });
      expect(input).toHaveValue('secret123');
    });

    it('toggles password visibility when eye button is clicked', async () => {
      render(<LoginPage />);
      const passwordInput = await screen.findByLabelText('パスワード');
      expect(passwordInput).toHaveAttribute('type', 'password');

      // The toggle button is the only type="button" sibling next to password field
      const buttons = screen.getAllByRole('button');
      const toggleBtn = buttons.find(
        (btn) => btn.getAttribute('type') === 'button',
      );
      expect(toggleBtn).toBeDefined();
      fireEvent.click(toggleBtn!);
      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('toggles password back to hidden when eye button is clicked again', async () => {
      render(<LoginPage />);
      const passwordInput = await screen.findByLabelText('パスワード');
      const buttons = screen.getAllByRole('button');
      const toggleBtn = buttons.find((btn) => btn.getAttribute('type') === 'button')!;

      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');
      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('allows checking Remember Me checkbox', async () => {
      render(<LoginPage />);
      const checkbox = await screen.findByRole('checkbox');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('form submission – success', () => {
    it('calls fetch with login endpoint on form submit', async () => {
      // /api/auth/me check for role after login
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, isAdmin: false }),
        });

      render(<LoginPage />);
      const usernameInput = await screen.findByLabelText('ユーザー名');
      const passwordInput = await screen.findByLabelText('パスワード');
      const submitBtn = await screen.findByRole('button', { name: 'ログイン' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('shows success message after successful login', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, isAdmin: false }),
        });

      render(<LoginPage />);
      const usernameInput = await screen.findByLabelText('ユーザー名');
      const passwordInput = await screen.findByLabelText('パスワード');
      const submitBtn = await screen.findByRole('button', { name: 'ログイン' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await screen.findByText('ログインしました。');
    });

    it('redirects admin user to /admin after login', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, isAdmin: true }),
        });

      render(<LoginPage />);
      const usernameInput = await screen.findByLabelText('ユーザー名');
      const passwordInput = await screen.findByLabelText('パスワード');
      const submitBtn = await screen.findByRole('button', { name: 'ログイン' });

      fireEvent.change(usernameInput, { target: { value: 'superadmin' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        const router = require('next/navigation').useRouter();
        expect(router.push).toHaveBeenCalledWith('/admin');
      });
    });

    it('redirects to /change-password when password change is required', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, requiresPasswordChange: true }),
      });

      render(<LoginPage />);
      const usernameInput = await screen.findByLabelText('ユーザー名');
      const passwordInput = await screen.findByLabelText('パスワード');
      const submitBtn = await screen.findByRole('button', { name: 'ログイン' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        const router = require('next/navigation').useRouter();
        expect(router.push).toHaveBeenCalledWith('/change-password?forced=true');
      });
    });
  });

  describe('form submission – error', () => {
    it('shows error message when credentials are invalid', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'ユーザー名またはパスワードが正しくありません。' }),
      });

      render(<LoginPage />);
      const usernameInput = await screen.findByLabelText('ユーザー名');
      const passwordInput = await screen.findByLabelText('パスワード');
      const submitBtn = await screen.findByRole('button', { name: 'ログイン' });

      fireEvent.change(usernameInput, { target: { value: 'wrong' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await screen.findByText('ユーザー名またはパスワードが正しくありません。');
    });

    it('shows login error heading when error occurs', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'エラー発生' }),
      });

      render(<LoginPage />);
      const usernameInput = await screen.findByLabelText('ユーザー名');
      const passwordInput = await screen.findByLabelText('パスワード');

      fireEvent.change(usernameInput, { target: { value: 'user' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: 'ログイン' }).closest('form')!);
      });

      await screen.findByText('ログインエラー');
    });

    it('shows server error message when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<LoginPage />);
      const usernameInput = await screen.findByLabelText('ユーザー名');
      const passwordInput = await screen.findByLabelText('パスワード');

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: 'ログイン' }).closest('form')!);
      });

      await screen.findByText('サーバーエラーが発生しました。');
    });

    it('clears previous error when user starts typing again', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'エラー' }),
      });

      render(<LoginPage />);
      const usernameInput = await screen.findByLabelText('ユーザー名');
      const passwordInput = await screen.findByLabelText('パスワード');

      fireEvent.change(usernameInput, { target: { value: 'wrong' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: 'ログイン' }).closest('form')!);
      });

      await screen.findByText('エラー');

      // Typing in username clears the error
      fireEvent.change(usernameInput, { target: { value: 'new' } });
      expect(screen.queryByText('エラー')).not.toBeInTheDocument();
    });
  });
});
