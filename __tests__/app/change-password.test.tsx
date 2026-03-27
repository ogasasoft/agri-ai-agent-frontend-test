// FILE: __tests__/app/change-password.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChangePasswordPage from '@/app/change-password/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  redirect: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('ChangePasswordPage', () => {
  let mockRouter: any;
  let mockSearchParams: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup
    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
    };

    mockSearchParams = {
      get: jest.fn(),
    };

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
      render(<ChangePasswordPage />);
    });

    it('shows change password heading', async () => {
      render(<ChangePasswordPage />);
      await screen.findByText('パスワード変更');
    });

    it('shows security icon', async () => {
      render(<ChangePasswordPage />);
      await screen.findByText('🔒');
    });

    it('shows current password input field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('現在のパスワード');
      expect(input).toBeInTheDocument();
    });

    it('shows new password input field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('新しいパスワード');
      expect(input).toBeInTheDocument();
    });

    it('shows confirm password input field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('パスワード確認');
      expect(input).toBeInTheDocument();
    });

    it('shows change password button', async () => {
      render(<ChangePasswordPage />);
      const button = await screen.findByRole('button', { name: 'パスワード変更' });
      expect(button).toBeInTheDocument();
    });

    it('shows cancel button when not forced', async () => {
      mockSearchParams.get.mockReturnValue(null);

      render(<ChangePasswordPage />);
      await screen.findByText('キャンセル');
    });

    it('shows back link when not forced', async () => {
      mockSearchParams.get.mockReturnValue(null);

      render(<ChangePasswordPage />);
      await screen.findByText(/戻る|戻るページ/);
    });

    it('shows back to login link when forced', async () => {
      mockSearchParams.get.mockReturnValue('true');

      render(<ChangePasswordPage />);
      await screen.findByText('ログイン画面に戻る');
    });
  });

  describe('form interactions', () => {
    it('allows typing in current password field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('現在のパスワード');
      fireEvent.change(input, { target: { value: 'current123' } });
      expect(input).toHaveValue('current123');
    });

    it('allows typing in new password field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('新しいパスワード');
      fireEvent.change(input, { target: { value: 'newpass123' } });
      expect(input).toHaveValue('newpass123');
    });

    it('allows typing in confirm password field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('パスワード確認');
      fireEvent.change(input, { target: { value: 'newpass123' } });
      expect(input).toHaveValue('newpass123');
    });
  });

  describe('password visibility toggle', () => {
    it('toggles current password visibility', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('現在のパスワード');
      expect(input).toHaveAttribute('type', 'password');

      // Find and click the toggle button (icon)
      const toggleIcon = screen.getByText('👁️');
      fireEvent.click(toggleIcon);
      expect(input).toHaveAttribute('type', 'text');

      fireEvent.click(toggleIcon);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('toggles new password visibility', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('新しいパスワード');
      expect(input).toHaveAttribute('type', 'password');

      const toggleIcon = screen.getByText('👁️');
      fireEvent.click(toggleIcon);
      expect(input).toHaveAttribute('type', 'text');
    });

    it('toggles confirm password visibility', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('パスワード確認');
      expect(input).toHaveAttribute('type', 'password');

      const toggleIcon = screen.getByText('👁️');
      fireEvent.click(toggleIcon);
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  describe('form validation', () => {
    it('shows error when passwords do not match', async () => {
      render(<ChangePasswordPage />);

      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');
      const submitBtn = await screen.findByRole('button', { name: 'パスワード変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'different' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await screen.findByText(/パスワードが一致しません|確認用パスワードが一致しません/);
    });

    it('shows error when current password is empty', async () => {
      render(<ChangePasswordPage />);

      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');
      const submitBtn = await screen.findByRole('button', { name: 'パスワード変更' });

      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await screen.findByText(/現在のパスワードを入力してください|現在のパスワードが空です/);
    });

    it('shows error when new password is empty', async () => {
      render(<ChangePasswordPage />);

      const currentInput = await screen.findByLabelText('現在のパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');
      const submitBtn = await screen.findByRole('button', { name: 'パスワード変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(confirmInput, { target: { value: 'current123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await screen.findByText(/新しいパスワードを入力してください|新しいパスワードが空です/);
    });

    it('shows error when confirm password is empty', async () => {
      render(<ChangePasswordPage />);

      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const submitBtn = await screen.findByRole('button', { name: 'パスワード変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await screen.findByText(/確認用パスワードを入力してください|パスワード確認が空です/);
    });
  });

  describe('form submission – success', () => {
    it('calls fetch with change password endpoint on form submit', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { id: 1, username: 'testuser' } }),
        });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');
      const submitBtn = await screen.findByRole('button', { name: 'パスワード変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('shows success message after successful password change', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { id: 1, username: 'testuser' } }),
        });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');
      const submitBtn = await screen.findByRole('button', { name: 'パスワード変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await screen.findByText(/パスワード変更が完了しました|パスワードを変更しました/);
    });

    it('redirects to home after password change when not forced', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { id: 1, username: 'testuser' } }),
        });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');
      const submitBtn = await screen.findByRole('button', { name: 'パスワード変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    it('redirects to login after password change when forced', async () => {
      mockSearchParams.get.mockReturnValue('true');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { id: 1, username: 'testuser' } }),
        });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');
      const submitBtn = await screen.findByRole('button', { name: 'パスワード変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('form submission – error', () => {
    it('shows error message when password change fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: '現在のパスワードが正しくありません。' }),
      });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');
      const submitBtn = await screen.findByRole('button', { name: 'パスワード変更' });

      fireEvent.change(currentInput, { target: { value: 'wrong' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await screen.findByText('現在のパスワードが正しくありません。');
    });

    it('shows login error heading when error occurs', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'エラー発生' }),
      });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');

      fireEvent.change(currentInput, { target: { value: 'user' } });
      fireEvent.change(newInput, { target: { value: 'pass' } });
      fireEvent.change(confirmInput, { target: { value: 'pass' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: 'パスワード変更' }).closest('form')!);
      });

      await screen.findByText('パスワード変更エラー');
    });

    it('shows server error message when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText('パスワード確認');

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: 'パスワード変更' }).closest('form')!);
      });

      await screen.findByText('サーバーエラーが発生しました。');
    });

    it('redirects to login when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ChangePasswordPage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('fetch user info', () => {
    it('fetches user info on mount', async () => {
      render(<ChangePasswordPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });
    });

    it('redirects to login when fetch user info fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ChangePasswordPage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login');
      });
    });
  });
});
